/* Updated vegaLiteAdapter.ts that renders VegaLite without going to useVega*/

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

let currentView: any = null;

export const vegaLiteAdapter: GrammarAdapter = {
  grammarId: 'vega-lite',

  validate(spec: unknown): boolean {
    try {
      const parsed = typeof spec === 'string' ? JSON.parse(spec) : spec;
      return !!parsed && typeof parsed === 'object' && !Array.isArray(parsed);
    } catch {
      return false;
    }
  },

  async render(
    container: HTMLElement,
    spec: unknown,
    data?: unknown,
    options?: { interactions?: unknown; resolutionMode?: string }
  ): Promise<any> {
    const specObj =
      typeof spec === 'string'
        ? JSON.parse(spec as string)
        : { ...(spec as any) };

    const inputData = data as any;
    const values = await parseInputData(inputData);

    specObj.data = { values, name: 'data' };
    specObj.height = 'container';
    specObj.width = 'container';

    // finalize previous view if present
    if (currentView) {
      try {
        currentView.finalize();
      } catch (e) {
        console.warn('Failed to finalize previous Vega view:', e);
      }
    }

    const vegaSpec = lite.compile(specObj).spec;

    const view = new vega.View(vega.parse(vegaSpec))
      .logLevel(vega.Warn)
      .renderer('svg')
      .initialize(container)
      .hover();

    await view.runAsync();

    // adjust parent padding if Vega bindings are present
    const parentContainer = container.parentElement;
    if (parentContainer) {
      const hasBindings = container.querySelector('.vega-bind') !== null;
      parentContainer.style.paddingBottom = hasBindings ? '25px' : '';
    }

    currentView = view;
    return view;
  },

  cleanup(): void {
    if (currentView) {
      try {
        currentView.finalize();
      } catch (e) {
        console.warn('Failed to cleanup Vega view:', e);
      } finally {
        currentView = null;
      }
    }
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

