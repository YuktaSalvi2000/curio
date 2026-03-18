import { BoxLifecycleHook } from '../../registry/types';
import { VisualizationIR } from '../../integration_layer/ir';
import { executeVisualization } from '../../integration_layer/visualizationIntegrationLayer';
import { prepareGrammarSpec, setGrammarError } from '../../utils/grammarExecution';

export const useGrammarLifecycle: BoxLifecycleHook = (data, boxState, descriptor) => {
  const applyGrammar = async (spec: string) => {
    try {
      const grammarId = descriptor.grammarId;

      if (!grammarId) {
        throw new Error(`No grammarId configured for node type: ${data.nodeType}`);
      }

      const prepared = prepareGrammarSpec(spec, grammarId);

      if (!prepared.ok) {
        setGrammarError(boxState.setOutput, prepared.message, true);
        return;
      }

      const outputId = descriptor.adapter?.editor?.outputId?.(data.nodeId);

      if (!outputId) {
        throw new Error(
          `No output container configured for node type: ${data.nodeType}`
        );
      }

      const ir: VisualizationIR = {
        grammarId,
        spec: JSON.stringify(prepared.parsedSpec),
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

      data.outputCallback(data.nodeId, data.input);
    } catch (error: any) {
      setGrammarError(
        boxState.setOutput,
        error?.message || 'Visualization execution failed',
        true
      );
    }
  };

  return {
    applyGrammar,
  };
};