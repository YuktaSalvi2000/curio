import { Environment, GrammarInterpreter } from 'utk';
import { GrammarAdapter, registerGrammarAdapter } from '../registry/grammarAdapter';

import { fetchData } from '../services/api';
import { get_camera } from '../utils/parsing';

const utkHandles = new Map<string, any>();

/**
 * ✅ Same logic as useUTK.parseInputData (simplified)
 */
async function parseInputData(input: any) {
  if (!input) {
    throw new Error("UTK requires input data");
  }

  let geojsons;

  if (input.path) {
    geojsons = await fetchData(input.path);
  } else {
    geojsons = input;
  }

  if (geojsons.dataType === "outputs") {
    return geojsons.data.map((d: any) => d.data);
  }

  return [geojsons.data];
}

/**
 * ✅ Core: your old setToLayers (trimmed but correct)
 */
async function setToLayers(geojsons: any[]) {
  const res = await fetch(process.env.BACKEND_URL + "/toLayers", {
    method: "POST",
    body: JSON.stringify({ geojsons }),
    headers: { "Content-Type": "application/json" },
  });

  const json = await res.json();

  let allCoordinates: number[] = [];

  json.layers.forEach((layer: any) => {
    layer.data.forEach((geom: any) => {
      allCoordinates = allCoordinates.concat(geom.geometry.coordinates);
    });
  });

  const camera = get_camera(allCoordinates);

  const ex_knots = json.layers.map((layer: any) => ({
    id: layer.id + "0",
    out_name: layer.id,
  }));

  const generatedGrammar = {
    components: [
      {
        id: "grammar_map",
        position: { width: [1, 12], height: [1, 4] },
      },
    ],
    knots: [],
    ex_knots,
    grid: { width: 12, height: 4 },
    grammar: false,
  };

  const components = [
    {
      id: "grammar_map",
      json: {
        camera,
        knots: ex_knots.map((k: any) => k.id),
        interactions: ex_knots.map(() => "NONE"),
        widgets: [{ type: "TOGGLE_KNOT" }],
        grammar_type: "MAP",
      },
    },
  ];

  return {
    layers: json.layers,
    joinedJsons: json.joinedJsons,
    components,
    interactionCallbacks: [], // keep simple for now
    generatedGrammar,
  };
}

async function renderUTKVisualization({
  container,
  spec,
  data,
  nodeId,
  options,
}: any) {
  container.innerHTML = '';

  // 🔴 REQUIRED for UTK
  Environment.serverless = true;

  // ✅ Restore full pipeline
  const geojsons = await parseInputData(data);
  const {
    layers,
    joinedJsons,
    components,
    interactionCallbacks,
    generatedGrammar,
  } = await setToLayers(geojsons);

  // Use provided spec OR fallback to generated
  const finalSpec =
    spec && Object.keys(spec).length > 0 ? spec : generatedGrammar;

  // 🔥 THIS FIXES YOUR ERROR
  const interpreter = new GrammarInterpreter(
    nodeId,
    finalSpec,
    container,
    layers,
    joinedJsons,
    components as any,
    interactionCallbacks
  );

  utkHandles.set(nodeId, { interpreter });

  options?.onViewReady?.(interpreter);
}

function cleanupUTKVisualization(nodeId?: string) {
  if (nodeId) {
    const handle = utkHandles.get(nodeId);
    handle?.interpreter?.destroy?.();
    utkHandles.delete(nodeId);
    return;
  }

  for (const [, handle] of utkHandles) {
    handle?.interpreter?.destroy?.();
  }

  utkHandles.clear();
}

export const utkAdapter: GrammarAdapter = {
  grammarId: 'utk',

  validate(spec: unknown): boolean {
    try {
      const parsed = typeof spec === 'string' ? JSON.parse(spec) : spec;
      return parsed && typeof parsed === 'object';
    } catch {
      return false;
    }
  },

  async render(container, spec, data, options): Promise<void> {
    const parsedSpec = typeof spec === 'string' ? JSON.parse(spec) : spec;
    const nodeId = options?.nodeId ?? container.id;

    cleanupUTKVisualization(nodeId);

    await renderUTKVisualization({
      container,
      spec: parsedSpec,
      data,
      nodeId,
      options,
    });
  },

  cleanup(): void {
    cleanupUTKVisualization();
  },

  getDefaultSpec(): unknown {
    return {
      components: [],
      grid: { width: 12, height: 4 },
      knots: [],
    };
  },
};

registerGrammarAdapter(utkAdapter);