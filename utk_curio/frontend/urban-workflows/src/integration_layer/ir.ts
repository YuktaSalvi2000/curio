/**
 * IR (Intermediate Representation) for visualization execution.
 *
 * This is a lightweight, normalized rendering request shared by:
 * - generic grammar lifecycle
 * - integration layer
 * - backend adapters
 *
 * It is NOT a universal visualization grammar.
 * It simply captures the minimum backend-agnostic information needed
 * to dispatch and execute a visualization render request.
 */

export type GrammarId = 'vega-lite' | 'utk' | string;

export interface VisualizationRenderOptions {
  /**
   * Curio node identity forwarded into options so adapters can use it
   * for provenance logging, interaction wiring, and internal handle storage.
   */
  nodeId?: string;

  /**
   * Input data passed from the lifecycle hook into the adapter.
   */
  input?: unknown;

  /**
   * Called by the adapter when output is ready to propagate downstream.
   */
  outputCallback?: (nodeId: string, input: unknown) => void;

  /**
   * Called by the adapter when interactions change.
   */
  interactionsCallback?: (interactions: unknown, nodeId: string) => void;

  /**
   * Mutable ref for persisting adapter state (view, interactions, etc.)
   * across applyGrammar calls without React re-renders.
   */
  stateRef?: { current: any };

  /**
   * Optional interaction payload used by backends that support
   * linked brushing, selection propagation, etc.
   */
  interactions?: unknown;

  /**
   * Optional strategy for resolving rendering / interaction conflicts.
   * Keep open-ended for future backends.
   */
  resolutionMode?: string;

  /**
   * Called whenever a backend signal/selection changes.
   */
  onInteraction?: (interactions: unknown, nodeId: string) => void;

  /**
   * Called once after the view is initialized.
   */
  onViewReady?: (view: unknown) => void;

  /**
   * If true, adapter/integration layer may skip strict validation.
   */
  skipValidation?: boolean;

  /**
   * Index signature to allow adapter-specific options without TS errors.
   */
  [key: string]: unknown;
}

export interface VisualizationIR {
  /**
   * Backend grammar identifier.
   * Examples: 'vega-lite', 'utk'
   */
  grammarId: GrammarId;

  /**
   * Raw visualization specification.
   * This remains backend-specific:
   * - Vega-Lite JSON for Vega
   * - UTK grammar object/string for UTK
   */
  spec: unknown;

  /**
   * Input data passed into the visualization backend.
   */
  data?: unknown;

  /**
   * Curio node identity, useful for provenance, debugging,
   * container lookup, and interaction wiring.
   */
  nodeId: string;

  /**
   * DOM container id to render into.
   * Convention: `${nodeId}-output`
   */
  containerId: string;

  /**
   * Optional direct DOM container reference.
   * This lets the integration layer skip DOM lookup if the caller
   * already resolved the container.
   */
  container?: HTMLElement | null;

  /**
   * Optional Curio box type / node type for logging, fallback routing,
   * legacy hook support, or adapter debugging.
   */
  boxType?: string;

  /**
   * Optional execution settings shared across backends.
   */
  options?: VisualizationRenderOptions;
}

export interface VisualizationRenderResult {
  /**
   * Indicates whether rendering completed without throwing.
   */
  success: boolean;

  /**
   * Backend grammar actually used to render.
   */
  grammarId: GrammarId;

  /**
   * Optional backend-specific return value.
   * For vega-lite, cast to VegaLiteHandle via getVegaLiteHandle(nodeId).
   */
  output?: unknown;

  /**
   * Optional human-readable error if rendering failed.
   */
  error?: string;
}