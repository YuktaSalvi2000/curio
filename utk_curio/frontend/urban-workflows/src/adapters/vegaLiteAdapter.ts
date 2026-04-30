// import { GrammarAdapter, registerGrammarAdapter } from '../registry/grammarAdapter';
// import { BoxType, VisInteractionType } from "../constants";
// import { fetchData } from "../services/api";
// import { parseDataframe, parseGeoDataframe } from "../utils/parsing";

// const vega = require("vega");
// const lite = require("vega-lite");

// export const vegaLiteAdapter: GrammarAdapter = {
//   grammarId: 'vega-lite',

//   validate: (spec) => {
//     try {
//       const parsed = typeof spec === 'string' ? JSON.parse(spec) : spec;
//       return !!parsed;
//     } catch {
//       return false;
//     }
//   },

//   render: async (container, spec, data, options) => {
//     const { nodeId, input, outputCallback, interactionsCallback, stateRef } = options as any;
//     console.log('vegaLiteAdapter.render called', { 
//     container, 
//     spec, 
//     input: (options as any)?.input,
//     stateRef: (options as any)?.stateRef,
//   });
//     if (!stateRef.current) {
//       stateRef.current = {
//         currentView: null,
//         interactions: {},
//         resizeObserver: null,
//         debounceTimer: null,
//       };
//     }

//     const state = stateRef.current;

//     // --- Parse input ---
//     if (!input || input === "") throw new Error("Input data must be provided");

//     const parserMap: any = {
//       dataframe: parseDataframe,
//       geodataframe: parseGeoDataframe,
//     };

//     const parser = parserMap[input.dataType];
//     if (!parser) {
//       throw new Error(`${input.dataType} is not a valid input type for Vega-Lite`);
//     }

//     let values: any;
//     if (input.path) {
//       const res = await fetchData(input.path);
//       values = parser(res.data);
//     } else {
//       values = parser(input.data);
//     }

//     // --- Hot reload: if view exists, just update data ---
//     if (state.currentView) {
//       const changeset = vega.changeset().remove(() => true).insert(values);
//       state.currentView.change("data", changeset).runAsync();
//       return;
//     }

//     const specObj = typeof spec === 'string' ? JSON.parse(spec) : { ...(spec as Record<string, unknown>) };
//     specObj.data = { values, name: "data" };
//     specObj.height = "container";
//     specObj.width = "container";

//     const vegaspec = lite.compile(specObj).spec;

//     const view = new vega.View(vega.parse(vegaspec))
//       .logLevel(vega.Warn)
//       .renderer("svg")
//       .initialize(container)
//       .hover();

//     await view.runAsync();

//     // Adjust padding for vega-bind elements
//     const parentContainer = container?.parentElement;
//     if (parentContainer) {
//        const hasBindings = container.querySelector(".vega-bind") !== null;
//        parentContainer.style.paddingBottom = hasBindings ? "25px" : "";
//     }

//     state.currentView = view;

//     // --- ResizeObserver ---
//     if (state.resizeObserver) state.resizeObserver.disconnect();
//     state.resizeObserver = new ResizeObserver(() => {
//       if (state.currentView) window.dispatchEvent(new Event("resize"));
//     });
//     state.resizeObserver.observe(container);

//     // --- Signal listeners ---
//     const signals = Object.keys(view.getState().signals);

//     for (const signal of signals) {
//       const parts = signal.split("_");
//       if (parts[1] !== "modify") continue;

//       const key = parts[0];

//       state.interactions[key] = {
//         type: VisInteractionType.UNDETERMINED,
//         data: [],
//         source: BoxType.VIS_VEGA,
//       };

//       view.addSignalListener(key, (_: any, value: any) => {
//         const attrs = Object.keys(value);

//         const buildState = (newEntry: any) => {
//           const newObj: any = {};
//           for (const k of Object.keys(state.interactions)) {
//             newObj[k] = { ...state.interactions[k], priority: 0 };
//           }
//           newObj[key] = { ...newEntry, priority: 1, source: BoxType.VIS_VEGA };
//           state.interactions = newObj;
//           interactionsCallback?.(newObj, nodeId);
//         };

//         if (attrs.length === 0) {
//           const prev = state.interactions[key];
//           const type = prev?.type ?? VisInteractionType.UNDETERMINED;
//           buildState({ type, data: type === VisInteractionType.INTERVAL ? {} : [] });
//         } else if (attrs.includes("_vgsid_")) {
//           const points = value._vgsid_.map((v: number) => (v - 1) % values.length);
//           buildState({ type: VisInteractionType.POINT, data: points });
//         } else {
//           buildState({ type: VisInteractionType.INTERVAL, data: { ...value } });
//         }

//         // Debounced backend log
//         clearTimeout(state.debounceTimer);
//         state.debounceTimer = setTimeout(() => {
//           if (state.interactions[key]?.type !== VisInteractionType.UNDETERMINED) {
//             fetch(`${process.env.BACKEND_URL}/insert_interaction`, {
//               method: "POST",
//               headers: { "Content-Type": "application/json" },
//               body: JSON.stringify({
//                 data: {
//                   activity_name: BoxType.VIS_VEGA + "-" + nodeId,
//                   int_time: new Date().toISOString(),
//                 },
//               }),
//             });
//           }
//         }, 300);
//       });
//     }

//     outputCallback?.(nodeId, input);
//   },
// };

// registerGrammarAdapter(vegaLiteAdapter);
/**
 * VegaLiteAdapter: GrammarAdapter implementation for Vega-Lite visualizations.
 *
 * Wraps the Vega-Lite compile + Vega View creation logic that was previously
 * embedded inside useVega / VegaNode. This adapter can be used standalone or
 * via the grammar adapter registry.
 */

import { GrammarAdapter, registerGrammarAdapter } from '../registry/grammarAdapter';
import { parseDataframe, parseGeoDataframe } from '../utils/parsing';
import { fetchData } from '../services/api';

const vega = require('vega');
const lite = require('vega-lite');

async function parseInputData(input: any): Promise<any[]> {
  if (!input || input === '') {
    throw new Error('Input data must be provided');
  }

  const inputType = input.dataType;
  if (inputType !== 'dataframe' && inputType !== 'geodataframe') {
    throw new Error(`${inputType} is not a valid input type for Vega-Lite`);
  }

  const parserMap: Record<string, (data: any) => any> = {
    dataframe: parseDataframe,
    geodataframe: parseGeoDataframe,
  };

  const parser = parserMap[inputType];
  if (!parser) return [];

  if (input.path) {
    const fetched = await fetchData(input.path);
    return parser(fetched.data);
  }
  return parser(input.data);
}

export const vegaLiteAdapter: GrammarAdapter = {
  grammarId: 'vega-lite',

  validate(spec: unknown): boolean {
    try {
      const parsed = typeof spec === 'string' ? JSON.parse(spec) : spec;
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed);
    } catch {
      return false;
    }
  },

  async render(
    container: HTMLElement,
    spec: unknown,
    data?: unknown,
  ): Promise<void> {
    const specObj = typeof spec === 'string' ? JSON.parse(spec as string) : { ...spec as any };
    const inputData = data as any;

    const values = await parseInputData(inputData);
    specObj.data = { values, name: 'data' };
    specObj.height = 'container';
    specObj.width = 'container';

    const vegaSpec = lite.compile(specObj).spec;
    const view = new vega.View(vega.parse(vegaSpec))
      .logLevel(vega.Warn)
      .renderer('svg')
      .initialize(container)
      .hover();

    await view.runAsync();
    return view;
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
};

registerGrammarAdapter(vegaLiteAdapter);