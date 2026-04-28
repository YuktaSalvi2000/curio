/** @jest-environment jsdom */

/**
 * mockGrammarNegative.test.ts
 *
 * This file focuses on negative test cases for grammar execution layer,
 * testing error handling and failure scenarios in the visualization integration layer.
 * It verifies that the system properly handles and reports errors when:
 * - Grammar adapters are not registered
 * - Adapter rendering throws exceptions
 * - Invalid specifications are provided
 * - And ensures robust error handling in the execution flow
 */

import { registerGrammarAdapter, GrammarAdapter } from '../../utk_curio/frontend/urban-workflows/src/registry/grammarAdapter';
import { executeVisualization } from '../../utk_curio/frontend/urban-workflows/src/integration_layer/visualizationIntegrationLayer';
import { VisualizationIR } from '../../utk_curio/frontend/urban-workflows/src/integration_layer/ir';
import { mockGrammarAdapter } from '../../utk_curio/frontend/urban-workflows/src/adapters/mockGrammarAdapter';
import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';

describe('Mock Grammar Negative Tests', () => {
  let container: HTMLElement;

  beforeEach(() => {
    // Setup a DOM container for each test
    container = document.createElement('div');
    container.id = 'test-container';
    document.body.appendChild(container);

    // Register the mock grammar adapter for tests that need it
    registerGrammarAdapter(mockGrammarAdapter);
  });

  afterEach(() => {
    // Cleanup
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  });

test('should fail when grammarId is not registered', async () => {
  const ir: VisualizationIR = {
    grammarId: 'non-existent-grammar',
    spec: { type: 'mock' },
    nodeId: 'test-node-fail-1',
    containerId: 'test-container',
    container,
  };

  const result = await executeVisualization(ir);

  expect(result.success).toBe(false);
  expect(result.error).toContain('No grammar adapter registered');
});

test('should return failure when adapter render throws error', async () => {
  const failingAdapter: GrammarAdapter = {
    grammarId: 'failing-grammar',
    validate: () => true,
    async render() {
      throw new Error('Render crashed intentionally');
    },
  };

  registerGrammarAdapter(failingAdapter);

  const ir: VisualizationIR = {
    grammarId: 'failing-grammar',
    spec: { type: 'mock' },
    nodeId: 'test-node-fail-2',
    containerId: 'test-container',
    container,
  };

  const result = await executeVisualization(ir);

  expect(result.success).toBe(false);
  expect(result.error).toContain('Render crashed intentionally');
  expect(result.grammarId).toBe('failing-grammar');
});

test('should fail when spec is invalid for adapter', async () => {
  const ir: VisualizationIR = {
    grammarId: 'mock-grammar',
    spec: null as any,
    nodeId: 'test-node-fail-3',
    containerId: 'test-container',
    container,
  };

  const result = await executeVisualization(ir);

  expect(result.success).toBe(false);
  expect(result.error).toBeDefined();
});

test('should execute successfully even when data and options are missing', async () => {
  const ir: VisualizationIR = {
    grammarId: 'mock-grammar',
    spec: { type: 'mock' },
    nodeId: 'test-node-optional',
    containerId: 'test-container',
    container,
  };

  const result = await executeVisualization(ir);

  expect(result.success).toBe(true);
  expect(result.grammarId).toBe('mock-grammar');
});

test('should handle repeated execution without breaking DOM state', async () => {
  const ir: VisualizationIR = {
    grammarId: 'mock-grammar',
    spec: { type: 'mock' },
    nodeId: 'test-node-repeat',
    containerId: 'test-container',
    container,
  };

  await executeVisualization(ir);
  await executeVisualization(ir);

  const outputs = container.querySelectorAll('.mock-grammar-output');

  expect(outputs.length).toBeGreaterThan(0);
});
});