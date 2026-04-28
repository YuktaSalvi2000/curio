import { BoxLifecycleHook } from '../../registry/types';
import { VisualizationIR } from '../../integration_layer/ir';
import { executeVisualization } from '../../integration_layer/visualizationIntegrationLayer';
import { GrammarType, prepareGrammarSpec, setGrammarError } from '../../utils/grammarExecution';

export const useGrammarLifecycle: BoxLifecycleHook = (data, boxState, descriptor) => {
  const applyGrammar = async (spec: string) => {
    try {
      const grammarId = (descriptor as { grammarId?: string }).grammarId;

      if (!grammarId) {
              throw new Error(`No grammarId configured for node type: ${data.nodeType}`);
      }

      const prepared = prepareGrammarSpec(spec, grammarId as GrammarType);

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
      
      const runs = 3;
      const latencies: number[] = [];
      let successCount = 0;
      let errors = 0;

      const totalStart = performance.now();

      for (let i = 0; i < runs; i++) {
        const runStart = performance.now();

        const result = await executeVisualization(ir);

        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

        const runEnd = performance.now();
        const renderTime = runEnd - runStart;

        latencies.push(renderTime);

        if (result.success) {
          successCount++;
        } else {
          errors++;
          console.error(result.error || 'Visualization execution failed');
       }
      }

      const totalEnd = performance.now();
      const totalTimeMs = totalEnd - totalStart;
      const totalTimeSec = totalTimeMs / 1000;

      const throughput = successCount / totalTimeSec;

      const sorted = [...latencies].sort((a, b) => a - b);

      const avg =
        latencies.reduce((sum, value) => sum + value, 0) / latencies.length;

      const p50 = sorted[Math.floor(sorted.length * 0.5)];
      const p95 = sorted[Math.floor(sorted.length * 0.95)];
      const min = sorted[0];
      const max = sorted[sorted.length - 1];

      console.log(`Runs: ${runs}`);
      console.log(
         `Success rate: ${successCount}/${runs} = ${((successCount / runs) * 100).toFixed(0)}%`
  );
      console.log(`Throughput: ${throughput.toFixed(2)} renders/sec`);
      console.log(`Avg render time/request: ${avg.toFixed(0)} ms`);
      console.log(`P50 render time/request: ${p50.toFixed(0)} ms`);
      console.log(`P95 render time/request: ${p95.toFixed(0)} ms`);
      console.log(`Min render time/request: ${min.toFixed(0)} ms`);
      console.log(`Max render time/request: ${max.toFixed(0)} ms`);
      console.log(`Total benchmark time: ${totalTimeMs.toFixed(0)} ms`);
      console.log(`Errors: ${errors}`);

      if (successCount === 0) {
        throw new Error('Visualization execution failed for all benchmark runs');
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