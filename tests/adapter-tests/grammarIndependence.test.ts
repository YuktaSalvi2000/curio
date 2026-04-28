/**
 * grammarIndependence.test.ts
 *
 * This file contains the unique, higher-order coverage for the mock grammar
 * path that is not already covered by the other adapter test files.
 *
 * It focuses on:
 * - negative independence beyond the simple Vega/UTK absence case
 * - integration-level invalid request edge cases
 * - execution failure handling and response contract shape
 */

import { registerGrammarAdapter } from '../../utk_curio/frontend/urban-workflows/src/registry/grammarAdapter';
import { executeVisualization } from '../../utk_curio/frontend/urban-workflows/src/integration_layer/visualizationIntegrationLayer';
import { VisualizationIR, VisualizationRenderResult } from '../../utk_curio/frontend/urban-workflows/src/integration_layer/ir';
import { GrammarAdapter } from '../../utk_curio/frontend/urban-workflows/src/registry/grammarAdapter';
import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';

/**
 * Mock Grammar Adapter: "mock-grammar"
 *
 * A minimal adapter that implements the shared GrammarAdapter contract.
 * The adapter exists here only for coverage of the integration-layer behavior
 * and failure paths that the other files do not exercise.
 * Verifies that the mock grammar can be executed through the shared
 * integration layer.
 * 
 * This file is focused on execution flow rather than adapter-only behavior:
 * - executeVisualization() dispatching to the registered adapter
 * - rendering into the DOM container
 * - passing generic options through the contract
 */
const mockGrammarAdapter: GrammarAdapter = {
  grammarId: 'mock-grammar',

  validate(spec: unknown): boolean {
    try {
      if (typeof spec === 'string') {
        const parsed = JSON.parse(spec);
        return !!parsed && typeof parsed === 'object' && !Array.isArray(parsed);
      }

      return !!spec && typeof spec === 'object' && !Array.isArray(spec);
    } catch {
      return false;
    }
  },

  async render(
    container: HTMLElement,
    spec: unknown,
    data?: unknown,
    options?: { interactions?: unknown; resolutionMode?: string }
  ): Promise<void> {
    const div = document.createElement('div');
    div.className = 'mock-grammar-output';
    div.setAttribute('data-spec', typeof spec === 'string' ? spec : JSON.stringify(spec));
    div.setAttribute('data-has-data', data ? 'true' : 'false');
    div.setAttribute('data-resolution-mode', options?.resolutionMode || 'default');
    div.textContent = 'Mock Grammar Rendered Successfully';
    container.appendChild(div);
  },

  getDefaultSpec(): unknown {
    return { type: 'mock' };
  },
};

describe('Grammar Independence Tests', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    container.id = 'test-container';
    document.body.appendChild(container);
    registerGrammarAdapter(mockGrammarAdapter);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  describe('Negative Independence: Backend-Specific Fields Not Required', () => {
    test('should execute without UTK-specific components/grid fields', async () => {
      const ir: VisualizationIR = {
        grammarId: 'mock-grammar',
        spec: {
          title: 'Generic Visualization',
          generic: true,
        },
        nodeId: 'test-node-5',
        containerId: 'test-container',
        container,
      };

      const result = await executeVisualization(ir);

      expect(result.success).toBe(true);
      expect(result.grammarId).toBe('mock-grammar');
    });
  });

  describe('Invalid Contract Tests', () => {
    test('should fail when grammarId is missing', async () => {
      const ir = {
        spec: { type: 'mock' },
        nodeId: 'test-node-9',
        containerId: 'test-container',
        container,
      } as any as VisualizationIR;

      const result = await executeVisualization(ir);

      expect(result.success).toBe(false);
      expect(result.error).toContain('grammarId');
    });

    test('should fail when adapter is not registered', async () => {
      const ir: VisualizationIR = {
        grammarId: 'unregistered-grammar',
        spec: { type: 'mock' },
        nodeId: 'test-node-10',
        containerId: 'test-container',
        container,
      };

      const result = await executeVisualization(ir);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No grammar adapter registered');
    });

    test('should capture render errors and return failure result', async () => {
      const errorAdapter: GrammarAdapter = {
        grammarId: 'error-grammar',
        validate(): boolean {
          return true;
        },
        async render(): Promise<void> {
          throw new Error('Render failed intentionally');
        },
      };

      registerGrammarAdapter(errorAdapter);

      const ir: VisualizationIR = {
        grammarId: 'error-grammar',
        spec: { type: 'mock' },
        nodeId: 'test-node-13',
        containerId: 'test-container',
        container,
      };

      const result = await executeVisualization(ir);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Render failed intentionally');
      expect(result.grammarId).toBe('error-grammar');
    });
  });
});

describe('Mock Grammar Execution Tests', () => {
  let container: HTMLElement;

  beforeEach(() => {
    // Setup a DOM container for each test
    container = document.createElement('div');
    container.id = 'test-container';
    document.body.appendChild(container);

    // Register the mock grammar adapter
    registerGrammarAdapter(mockGrammarAdapter);
  });

  afterEach(() => {
    // Cleanup
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  });

  test('Should execute mock-grammar through executeVisualization', async () => {
    // Intention:
    // Prove the generic execution flow works for a new grammar,
    // showing the architecture has moved from grammar-specific to generic grammar execution.
    const ir: VisualizationIR = {
      grammarId: 'mock-grammar',
      spec: { type: 'mock', nested: { value: 42 } },
      data: { values: [1, 2, 3] },
      nodeId: 'test-node-1',
      containerId: 'test-container',
      container,
    };

    const result: VisualizationRenderResult = await executeVisualization(ir);

    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.grammarId).toBe('mock-grammar');
    expect(result.error).toBeUndefined();
  });

  test('Should render mock-grammar output to container', async () => {
    // Intention:
    // Prove the new grammar does not only register, but actually renders through the shared execution path.
    const ir: VisualizationIR = {
      grammarId: 'mock-grammar',
      spec: { type: 'mock' },
      nodeId: 'test-node-2',
      containerId: 'test-container',
      container,
    };

    await executeVisualization(ir);

    const mockOutput = container.querySelector('.mock-grammar-output');
    expect(mockOutput).toBeDefined();
    expect(mockOutput?.textContent).toBe('Mock Grammar Rendered Successfully');
  });

  test('Should pass generic options through without backend specifics', async () => {
    // Intention:
    // Prove the new grammar can consume shared generic fields like data and options
    // without Vega-Lite- or UTK-specific request structure.
    const ir: VisualizationIR = {
      grammarId: 'mock-grammar',
      spec: { type: 'mock' },
      data: { sample: 'data' },
      nodeId: 'test-node-3',
      containerId: 'test-container',
      container,
      options: {
        resolutionMode: 'custom-mode',
      },
    };

    await executeVisualization(ir);

    const mockOutput = container.querySelector('.mock-grammar-output') as HTMLElement;
    expect(mockOutput).toBeDefined();
    expect(mockOutput.getAttribute('data-resolution-mode')).toBe('custom-mode');
    expect(mockOutput.getAttribute('data-has-data')).toBe('true');
  });
});