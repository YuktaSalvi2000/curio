/**
 * IR (Intermediate Representation) for visualization execution.
 */

export type GrammarId = 'vega-lite' | 'utk' | string;

export interface VisualizationRenderOptions {
  interactions?: unknown;
  resolutionMode?: string;
  skipValidation?: boolean;

  /**
   * Forwarded from VisualizationIR.nodeId.
   * Adapters use this for provenance logging, interaction wiring,
   * and keying their internal handle stores.
   */
  nodeId?: string;

  /**
   * Called whenever a Vega signal/selection changes.
   */
  onInteraction?: (interactions: unknown, nodeId: string) => void;

  /**
   * Called once after the view is initialized.
   */
  onViewReady?: (view: unknown) => void;
}

export interface VisualizationIR {
  grammarId: GrammarId;
  spec: unknown;
  data?: unknown;
  nodeId: string;
  containerId: string;
  container?: HTMLElement | null;
  boxType?: string;
  options?: VisualizationRenderOptions;
}

export interface VisualizationRenderResult {
  success: boolean;
  grammarId: GrammarId;
  /**
   * Optional backend-specific return value.
   * For vega-lite, cast to VegaLiteHandle via getVegaLiteHandle(nodeId).
   */
  output?: unknown;
  error?: string;
}