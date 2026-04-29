/**
 * IR (Intermediate Representation) for visualization execution.
 */

export type GrammarId = string;

/**
 * IR = pure execution request
 * - no semantics
 * - no grammar-specific fields
 * - no assumptions about options shape
 */
export interface VisualizationIR {
  grammarId: GrammarId;

  spec: unknown;
  data?: unknown;

  nodeId: string;

  containerId: string;
  container?: HTMLElement | null;

  boxType?: string;
  
  options?: Record<string, any>;
}