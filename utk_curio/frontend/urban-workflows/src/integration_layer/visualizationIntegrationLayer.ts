/**
 * visualizationIntegrationLayer
 *
 * Generic execution/dispatch layer for grammar-based visualizations.
 */

import { getGrammarAdapter } from '../registry/grammarAdapter';
import { VisualizationIR, VisualizationRenderResult } from './ir';

function resolveContainer(ir: VisualizationIR): HTMLElement {
  if (ir.container instanceof HTMLElement) {
    return ir.container;
  }

  const el = document.getElementById(ir.containerId);

  if (!el) {
    throw new Error(
      `Visualization container not found: ${ir.containerId} (nodeId=${ir.nodeId}, grammarId=${ir.grammarId})`
    );
  }

  return el;
}

export async function executeVisualization(
  ir: VisualizationIR
): Promise<VisualizationRenderResult> {
  try {
    if (!ir.grammarId) {
      throw new Error('Visualization request is missing grammarId');
    }

    const adapter = getGrammarAdapter(ir.grammarId);
    const container = resolveContainer(ir);

    const shouldValidate = !ir.options?.skipValidation;
    if (shouldValidate && !adapter.validate(ir.spec)) {
      throw new Error(`Invalid visualization spec for grammarId: ${ir.grammarId}`);
    }

    const output = await adapter.render(
      container,
      ir.spec,
      ir.data,
      ir.options
    );

    return {
      success: true,
      grammarId: ir.grammarId,
      output,
    };
  } catch (error: any) {
    return {
      success: false,
      grammarId: ir.grammarId,
      error: error?.message || 'Visualization execution failed',
    };
  }
}