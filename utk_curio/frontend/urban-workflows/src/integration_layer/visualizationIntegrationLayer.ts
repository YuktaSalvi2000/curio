import { getGrammarAdapter } from '../registry/grammarAdapter';
import { VisualizationIR } from './ir';

export interface VisualizationRenderResult {
  success: boolean;
  grammarId: string;
  output?: unknown;
  error?: string;
}

/** Resolve DOM container safely */
function resolveContainer(container: HTMLElement | string): HTMLElement {
  if (container instanceof HTMLElement) return container;

  const el = document.getElementById(container);
  if (!el) {
    throw new Error(`Container not found: ${container}`);
  }

  return el;
}

export async function executeVisualization(
  ir: VisualizationIR
): Promise<VisualizationRenderResult> {
  try {
    const { grammarId, spec, data, nodeId, container, options } = ir;

    if (!grammarId) {
      throw new Error("Missing grammarId in visualization request");
    }

    const adapter = getGrammarAdapter(grammarId);
    const resolvedContainer = resolveContainer(container);

    // ✅ validation
    if (!options?.skipValidation && adapter.validate) {
      const isValid = adapter.validate(spec);
      if (!isValid) {
        throw new Error(`Invalid spec for grammarId: ${grammarId}`);
      }
    }

    // CORE RENDER CALL
    const renderResult = await adapter.render(
      resolvedContainer,
      spec,
      data,
      {
        ...options,
        nodeId,
      }
    );

    return {
      success: true,
      grammarId,
      output: renderResult ?? undefined,
    };
  } catch (error: any) {
    return {
      success: false,
      grammarId: ir?.grammarId,
      error: error?.message ?? "Visualization execution failed",
    };
  }
}