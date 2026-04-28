import { BoxLifecycleHook } from '../../registry/types';
import { useVega } from '../../hook/useVega';

export const useVegaLifecycle: BoxLifecycleHook = (data, boxState) => {
  const { handleCompileGrammar } = useVega({ data, code: boxState.code });

  const applyGrammar = async (spec: string) => {
    try {
      const runs = 50;
      const latencies: number[] = [];
      let successCount = 0;
      let errors = 0;

      const totalStart = performance.now();

      for (let i = 0; i < runs; i++) {
        const runStart = performance.now();

        try {
          await handleCompileGrammar(spec);

          await new Promise<void>((resolve) =>
            requestAnimationFrame(() => resolve())
          );

          const runEnd = performance.now();
          const renderTime = runEnd - runStart;

          latencies.push(renderTime);
          successCount++;
        } catch (error: any) {
          errors++;
          console.error(error?.message || 'Vega visualization execution failed');
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
        throw new Error('Vega visualization execution failed for all benchmark runs');
      }

      boxState.setOutput({ code: 'success', content: '', outputType: '' });
    } catch (error: any) {
      boxState.setOutput({ code: 'error', content: error.message, outputType: '' });
      alert(error.message);
    }
  };

  return { applyGrammar };
};