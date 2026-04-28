/**
 * VegaLiteAdapter — full-lifecycle GrammarAdapter for Vega-Lite.
 *
 * Owns: compile → render → interaction wiring → resize → handle storage.
 * Does NOT own: provenance logging, output callbacks — those belong to useVega.
 */

import { GrammarAdapter, registerGrammarAdapter } from '../registry/grammarAdapter';
import { VisualizationRenderOptions } from '../integration_layer/ir';
import { parseDataframe, parseGeoDataframe } from '../utils/parsing';
import { fetchData } from '../services/api';
import { BoxType, VisInteractionType } from '../constants';
import * as vega from 'vega';
import * as vegaLite from 'vega-lite';

// ─── Public types ─────────────────────────────────────────────────────────────

export interface VegaLiteHandle {
  /** Push new data into the live view without recompiling the spec. */
  updateData(input: unknown): Promise<void>;
  /** Disconnect ResizeObserver and finalize the Vega view. */
  destroy(): void;
  /** Direct access to the Vega View for advanced callers. */
  view: vega.View;
}

export interface SignalInteraction {
  type: string;
  data: number[] | Record<string, unknown>;
  priority: number;
  source: string;
}

export type InteractionMap = Record<string, SignalInteraction>;

// ─── Internal handle store ────────────────────────────────────────────────────

const handleStore = new Map<string, VegaLiteHandle>();

/**
 * Retrieve the VegaLiteHandle for a rendered node.
 * Call this after executeVisualization() resolves.
 */
export function getVegaLiteHandle(nodeId: string): VegaLiteHandle | undefined {
  return handleStore.get(nodeId);
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

async function parseInputData(input: any): Promise<any[]> {
  if (!input || input === '') {
    throw new Error('Input data must be provided');
  }

  const { dataType } = input;
  if (dataType !== 'dataframe' && dataType !== 'geodataframe') {
    throw new Error(`${dataType} is not a valid input type for Vega-Lite`);
  }

  const parserMap: Record<string, (d: any) => any> = {
    dataframe: parseDataframe,
    geodataframe: parseGeoDataframe,
  };

  const parser = parserMap[dataType];
  if (input.path) {
    const fetched = await fetchData(input.path);
    return parser(fetched.data);
  }
  return parser(input.data);
}

function compileSpec(
  specObj: Record<string, unknown>,
  values: any[],
  container: HTMLElement,
): vega.View {
  specObj.data = { values, name: 'data' };
  specObj.height = 'container';
  specObj.width = 'container';

  const vegaSpec = vegaLite.compile(
    specObj as unknown as vegaLite.TopLevelSpec
  ).spec;

  return new vega.View(vega.parse(vegaSpec))
    .logLevel(vega.Warn)
    .renderer('svg')
    .initialize(container)
    .hover();
}

function adjustPadding(container: HTMLElement): void {
  const parent = container.parentElement;
  if (parent) {
    parent.style.paddingBottom =
      container.querySelector('.vega-bind') !== null ? '25px' : '';
  }
}

function wireSignals(
  view: vega.View,
  values: any[],
  nodeId: string,
  interactionMap: InteractionMap,
  onInteraction: (interactions: InteractionMap, nodeId: string) => void,
): void {
  const stateAttributes = Object.keys(view.getState().signals ?? {});

  for (const attr of stateAttributes) {
    const parts = attr.split('_');
    if (parts.length <= 1 || parts[1] !== 'modify') continue;

    const signalName = parts[0];

    // Seed so downstream consumers know the signal exists
    interactionMap[signalName] = {
      type: VisInteractionType.UNDETERMINED,
      data: [],
      priority: 0,
      source: BoxType.VIS_VEGA,
    };

    view.addSignalListener(signalName, (_name: string, value: any) => {
      const keys = Object.keys(value ?? {});
      let entry: SignalInteraction;

      if (keys.length === 0) {
        // Selection cleared — preserve previous type, reset data
        const prev = interactionMap[signalName];
        const type = prev?.type ?? VisInteractionType.UNDETERMINED;
        entry = {
          type,
          data: type === VisInteractionType.INTERVAL ? {} : [],
          priority: 1,
          source: BoxType.VIS_VEGA,
        };
      } else if (keys.includes('_vgsid_')) {
        // Point / hover
        entry = {
          type: VisInteractionType.POINT,
          data: (value._vgsid_ as number[]).map((e) => (e - 1) % values.length),
          priority: 1,
          source: BoxType.VIS_VEGA,
        };
      } else {
        // Interval / brush
        entry = {
          type: VisInteractionType.INTERVAL,
          data: { ...value },
          priority: 1,
          source: BoxType.VIS_VEGA,
        };
      }

      // Lower all priorities, raise this signal
      for (const k of Object.keys(interactionMap)) {
        interactionMap[k] = { ...interactionMap[k], priority: 0 };
      }
      interactionMap[signalName] = entry;

      // Fire the callback — logging/provenance is the caller's concern
      onInteraction({ ...interactionMap }, nodeId);
    });
  }
}

// ─── Adapter ──────────────────────────────────────────────────────────────────

export const vegaLiteAdapter: GrammarAdapter = {
  grammarId: 'vega-lite',

  validate(spec: unknown): boolean {
    try {
      const parsed = typeof spec === 'string' ? JSON.parse(spec) : spec;
      return (
        parsed !== null &&
        typeof parsed === 'object' &&
        !Array.isArray(parsed)
      );
    } catch {
      return false;
    }
  },

  async render(
    container: HTMLElement,
    spec: unknown,
    data?: unknown,
    options?: VisualizationRenderOptions,
  ): Promise<void> {
    const specObj: Record<string, unknown> =
      typeof spec === 'string'
        ? JSON.parse(spec)
        : { ...(spec as Record<string, unknown>) };

    const nodeId = options?.nodeId ?? 'unknown';
    const { onInteraction, onViewReady } = options ?? {};

    // 1. Parse → compile → render
    const values = await parseInputData(data);
    const view = compileSpec(specObj, values, container);
    await view.runAsync();
    adjustPadding(container);

    // 2. Interaction wiring — caller decides what to do with signals
    const interactionMap: InteractionMap = {};
    if (onInteraction) {
      wireSignals(view, values, nodeId, interactionMap, onInteraction);
    }

    // 3. Notify caller the view is live
    onViewReady?.(view);

    // 4. ResizeObserver
    const ro = new ResizeObserver(() =>
      window.dispatchEvent(new Event('resize'))
    );
    ro.observe(container);

    // 5. Store handle — destroy any previous handle for this nodeId first
    handleStore.get(nodeId)?.destroy();
    handleStore.set(nodeId, {
      view,

      async updateData(newInput: unknown): Promise<void> {
        const newValues = await parseInputData(newInput);
        await view
          .change(
            'data',
            vega.changeset().remove(() => true).insert(newValues),
          )
          .runAsync();
      },

      destroy(): void {
        ro.disconnect();
        view.finalize();
        handleStore.delete(nodeId);
      },
    });
  },

  getDefaultSpec(): unknown {
    return {
      $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
      mark: 'point',
      encoding: {
        x: { field: 'x', type: 'quantitative' },
        y: { field: 'y', type: 'quantitative' },
      },
    };
  },

  cleanup(): void {
    for (const handle of handleStore.values()) {
      handle.destroy();
    }
    handleStore.clear();
  },
};

registerGrammarAdapter(vegaLiteAdapter);