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

    // Forward nodeId into options so adapters can use it for provenance
    // logging, interaction wiring, and internal handle storage —
    // without the adapter needing to return anything through the interface.
    await adapter.render(
      container,
      ir.spec,
      ir.data,
      {
        ...ir.options,
        nodeId: ir.nodeId,
      }
    );

    return {
      success: true,
      grammarId: ir.grammarId,
      // Callers that need the live handle use getVegaLiteHandle(ir.nodeId)
      // from vegaLiteAdapter directly — no output threading needed.
      output: undefined,
    };
  } catch (error: any) {
    return {
      success: false,
      grammarId: ir.grammarId,
      error: error?.message || 'Visualization execution failed',
    };
  }
}