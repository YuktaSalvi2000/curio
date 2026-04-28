/**
 * mockGrammarAdapter.test.ts
 *
 * Tests the full extensibility path for VIS_MOCK_GRAMMAR:
 *
 * BoxType.VIS_MOCK_GRAMMAR
 *   → descriptor
 *   → grammarId = mock-grammar
 *   → generic useGrammarLifecycle
 *   → executeVisualization()
 *   → mockGrammarAdapter.render()
 *   → DOM output
 *
 * This proves that the new grammar does not need a custom lifecycle or
 * direct adapter calls from the node. The adapter handles rendering once
 * the generic grammar pipeline routes to it.
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';

/**
 * descriptors.ts imports from ../adapters/box.
 * Some box helpers/lifecycles pull in larger Curio dependencies.
 * For this unit/integration test, we mock the barrel and keep only
 * the functions needed to check descriptor wiring.
 */
jest.mock(
  '../../utk_curio/frontend/urban-workflows/src/adapters/box',
  () => {
    const mockHandles = () => ({ inputs: [], outputs: [] });

    return {
      __esModule: true,

      standardInOut: jest.fn(mockHandles),
      outputOnly: jest.fn(mockHandles),
      inputOnly: jest.fn(mockHandles),
      withBidirectional: jest.fn((handles) => handles),
      flowSwitchHandles: jest.fn(mockHandles),

      useCodeBoxLifecycle: jest.fn(),
      useDataExportLifecycle: jest.fn(),
      useGrammarLifecycle: jest.fn(),
      useUtkLifecycle: jest.fn(),
      useTableLifecycle: jest.fn(),
      useImageLifecycle: jest.fn(),
      useTextLifecycle: jest.fn(),
      useFlowSwitchLifecycle: jest.fn(),
      useMergeFlowLifecycle: jest.fn(),
      useDataPoolLifecycle: jest.fn(),
      useVegaLifecycle: jest.fn(),
    };
  },
);

import { BoxType } from '../../utk_curio/frontend/urban-workflows/src/constants';

import {
  registerGrammarAdapter,
  getGrammarAdapter,
} from '../../utk_curio/frontend/urban-workflows/src/registry/grammarAdapter';

import { getNodeDescriptor } from '../../utk_curio/frontend/urban-workflows/src/registry/nodeRegistry';

import {
  useGrammarLifecycle,
  useVegaLifecycle,
  useUtkLifecycle,
} from '../../utk_curio/frontend/urban-workflows/src/adapters/box';

import { mockGrammarAdapter } from '../../utk_curio/frontend/urban-workflows/src/adapters/mockGrammarAdapter';

import { executeVisualization } from '../../utk_curio/frontend/urban-workflows/src/integration_layer/visualizationIntegrationLayer';

function makeContainer(id: string): HTMLElement {
  const el = document.createElement('div');
  el.id = id;
  document.body.appendChild(el);
  return el;
}

function cleanupContainers(): void {
  document.body.innerHTML = '';
}

function requireGrammarId(descriptor: any): string {
  if (!descriptor.grammarId) {
    throw new Error('VIS_MOCK_GRAMMAR descriptor is missing grammarId');
  }

  return descriptor.grammarId;
}

function getOutputContainerId(descriptor: any, nodeId: string): string {
  const outputId = descriptor.adapter?.editor?.outputId;

  if (typeof outputId === 'function') {
    return outputId(nodeId);
  }

  return `mock-output-${nodeId}`;
}

describe('VIS_MOCK_GRAMMAR extensibility path', () => {
  beforeEach(async () => {
    cleanupContainers();

    /**
     * Import descriptors so registerNode(...) runs.
     * This makes VIS_MOCK_GRAMMAR available through getNodeDescriptor(...).
     */
    await import('../../utk_curio/frontend/urban-workflows/src/registry/descriptors');

    /**
     * Register the mock grammar adapter so grammarId-based routing works.
     */
    registerGrammarAdapter(mockGrammarAdapter);
  });

  afterEach(() => {
    cleanupContainers();
    jest.clearAllMocks();
  });

  test('VIS_MOCK_GRAMMAR descriptor maps node type to mock-grammar', () => {
    const descriptor = getNodeDescriptor(BoxType.VIS_MOCK_GRAMMAR);
    const grammarId = requireGrammarId(descriptor);

    expect(descriptor).toBeDefined();
    expect(descriptor.id).toBe(BoxType.VIS_MOCK_GRAMMAR);
    expect(grammarId).toBe('mock-grammar');
  });

  test('VIS_MOCK_GRAMMAR uses generic useGrammarLifecycle, not a custom grammar lifecycle', () => {
    const descriptor = getNodeDescriptor(BoxType.VIS_MOCK_GRAMMAR);

    expect(descriptor.adapter.useLifecycle).toBe(useGrammarLifecycle);
    expect(descriptor.adapter.useLifecycle).not.toBe(useVegaLifecycle);
    expect(descriptor.adapter.useLifecycle).not.toBe(useUtkLifecycle);
  });

  test('mock-grammar adapter is selected by grammarId from the registry', () => {
    const descriptor = getNodeDescriptor(BoxType.VIS_MOCK_GRAMMAR);
    const grammarId = requireGrammarId(descriptor);

    const adapter = getGrammarAdapter(grammarId);

    expect(adapter).toBe(mockGrammarAdapter);
    expect(adapter.grammarId).toBe('mock-grammar');
  });

  test('VIS_MOCK_GRAMMAR renders DOM through descriptor grammarId and execution layer', async () => {
  const descriptor = getNodeDescriptor(BoxType.VIS_MOCK_GRAMMAR);
  const grammarId = requireGrammarId(descriptor);

  const nodeId = 'node-1';
  const containerId = getOutputContainerId(descriptor, nodeId);
  const container = makeContainer(containerId);

  const result = await executeVisualization({
    grammarId,
    spec: { type: 'mock', label: 'from-vis-mock-grammar-node' },
    data: { dataType: 'dataframe', data: [{ x: 1 }] },
    nodeId,
    containerId,
    options: { resolutionMode: 'test' },
  });

  expect(result.success).toBe(true);

  expect(container.innerHTML).not.toBe('');
  expect(container.children.length).toBeGreaterThan(0);

  expect(container.textContent).toContain('mock-grammar');
  expect(container.textContent).toContain('from-vis-mock-grammar-node');
});

  test('invalid spec is rejected before DOM rendering', async () => {
    const descriptor = getNodeDescriptor(BoxType.VIS_MOCK_GRAMMAR);
    const grammarId = requireGrammarId(descriptor);

    const nodeId = 'node-invalid';
    const containerId = getOutputContainerId(descriptor, nodeId);
    const container = makeContainer(containerId);

    const result = await executeVisualization({
      grammarId,
      spec: null,
      data: { dataType: 'dataframe', data: [{ x: 1 }] },
      nodeId,
      containerId,
      options: {},
    });

    expect(result.success).toBe(false);
    expect(container.innerHTML).toBe('');
  });
});