/**
 * mockGrammarAdapter.ts
 *
 * A minimal but REAL rendering grammar adapter.
 * Proves the grammar extension point works end-to-end by producing
 * actual DOM output — just like vega-lite produces SVG and UTK produces
 * a 3D canvas.
 *
 * This is intentionally trivial. The point is not what gets rendered,
 * but that something gets rendered through the exact same pipeline.
 */

import { GrammarAdapter, registerGrammarAdapter } from '../registry/grammarAdapter';
import { VisualizationRenderOptions } from '../integration_layer/ir';

export const mockGrammarAdapter: GrammarAdapter = {
  grammarId: 'mock-grammar',

  validate(spec: unknown): boolean {
    try {
      const parsed = typeof spec === 'string' ? JSON.parse(spec) : spec;
      return parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed);
    } catch {
      return false;
    }
  },

  /**
   * render() writes a real DOM element into the container.
   * This is the equivalent of vega-lite compiling a spec into SVG —
   * it proves the pipeline carried the spec all the way to actual rendering.
   */
  async render(
    container: HTMLElement,
    spec: unknown,
    data?: unknown,
    options?: VisualizationRenderOptions,
  ): Promise<void> {
    const specObj = typeof spec === 'string' ? JSON.parse(spec) : spec;

    container.innerHTML = '';

    const root = document.createElement('div');
    root.setAttribute('data-grammar', 'mock-grammar');
    root.setAttribute('data-node-id', options?.nodeId ?? 'unknown');
    root.style.cssText = 'width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-family:monospace;font-size:13px;color:#555;background:#f7f7f7;border:1px dashed #ccc;';

    // Render the spec as readable JSON so there is something visually
    // verifiable in Curio — equivalent to vega-lite rendering axes/marks
    root.innerHTML = `
      <pre data-testid="mock-grammar-output" style="margin:0;padding:16px;white-space:pre-wrap;word-break:break-word;">
mock-grammar ✓
${JSON.stringify(specObj, null, 2)}
      </pre>
    `;

    container.appendChild(root);
  },

  getDefaultSpec(): unknown {
    return { type: 'mock' };
  },

  cleanup(): void {
    // No persistent resources to clean up
  },
};

registerGrammarAdapter(mockGrammarAdapter);