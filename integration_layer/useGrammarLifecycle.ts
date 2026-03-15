/**
 * useGrammarLifecycle
 *
 * Generic lifecycle hook for grammar-based visualization nodes.
 * Replaces grammar-specific lifecycle branching at the box level.
 *
 * Responsibilities:
 * 1. Read grammarId from descriptor
 * 2. Build VisualizationIR
 * 3. Call integration layer
 * 4. Handle generic execution state
 */

import { BoxLifecycleHook } from '../../registry/types';
import { getNodeDescriptor } from '../../registry/nodeRegistry';
import { VisualizationIR } from '../../integration/ir';
import { executeVisualization } from '../../integration/visualizationIntegrationLayer';

export const useGrammarLifecycle: BoxLifecycleHook = (data, boxState) => {
  const applyGrammar = async (spec: string) => {
    try {
      const descriptor = getNodeDescriptor(data.nodeType);

      if (!descriptor?.grammarId) {
        throw new Error(`No grammarId configured for node type: ${data.nodeType}`);
      }

      const outputId = descriptor.adapter?.editor?.outputId?.(data.nodeId);

      if (!outputId) {
        throw new Error(
          `No output container configured for node type: ${data.nodeType}`
        );
      }

      const ir: VisualizationIR = {
        grammarId: descriptor.grammarId,
        spec,
        data: data.input,
        nodeId: data.nodeId,
        containerId: outputId,
        boxType: data.nodeType,
      };

      boxState.setOutput({
        code: 'exec',
        content: '',
        outputType: '',
      });

      const result = await executeVisualization(ir);

      if (!result.success) {
        throw new Error(result.error || 'Visualization execution failed');
      }

      boxState.setOutput({
        code: 'success',
        content: '',
        outputType: '',
      });

      // Preserve current Curio behavior:
      // visualization boxes forward their input as output
      data.outputCallback(data.nodeId, data.input);
    } catch (error: any) {
      boxState.setOutput({
        code: 'error',
        content: error?.message || 'Visualization execution failed',
        outputType: '',
      });
    }
  };

  return {
    applyGrammar,
  };
};