import { BoxLifecycleHook } from '../../registry/types';
import { executeVisualization } from '../../integration_layer/visualizationIntegrationLayer';
import { VisualizationIR } from '../../integration_layer/ir';

export const useGrammarLifecycle: BoxLifecycleHook = (
  data,
  boxState,
  descriptor
) => {
  const grammarId = (descriptor as { grammarId?: string }).grammarId;

  if (!grammarId) {
    throw new Error('Missing grammarId for grammar lifecycle.');
  }

  const applyGrammar = async (spec: string) => {
    try {
      const ir: VisualizationIR = {
        grammarId,
        spec,
        data,
        nodeId: data.nodeId,
        container: boxState.output?.content,
        options: {
          // fully optional — can be anything
        },
      };

      const result = await executeVisualization(ir);

      if (!result.success) {
        throw new Error(result.error || 'Visualization failed');
      }

      // optional: if adapter returned something useful
      const lifecycleExtras = result.output?.options ?? {};

      boxState.setOutput({
        code: 'success',
        content: '',
        outputType: '',
      });

      return lifecycleExtras;
    } catch (e: any) {
      boxState.setOutput({
        code: 'error',
        content: e.message,
        outputType: '',
      });
    }
  };

  return {
    applyGrammar
  };
};