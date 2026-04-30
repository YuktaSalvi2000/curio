// // /**
// //  * visualizationIntegrationLayer
// //  *
// //  * Generic execution/dispatch layer for grammar-based visualizations.
// //  */
// // import { getGrammarAdapter } from '../registry/grammarAdapter';
// // import { VisualizationIR, VisualizationRenderResult } from './ir';

// // function resolveContainer(
// //   container: HTMLElement | string | null | undefined,
// //   retries = 10,
// //   interval = 50
// // ): Promise<HTMLElement> {
// //   return new Promise((resolve, reject) => {
// //     if (container instanceof HTMLElement) return resolve(container);
// //     if (!container) return reject(new Error('Missing visualization container'));

// //     let attempts = 0;
// //     const poll = () => {
// //       const el = document.getElementById(container as string);
// //       if (el) return resolve(el);
// //       if (++attempts >= retries) return reject(new Error(`Container not found: ${container}`));
// //       setTimeout(poll, interval);
// //     };
// //     poll();
// //   });
// // }

// // export async function executeVisualization(
// //   ir: VisualizationIR
// // ): Promise<VisualizationRenderResult> {
// //   try {
// //     if (!ir.grammarId) {
// //       throw new Error('Visualization request is missing grammarId');
// //     }

// //     const adapter = getGrammarAdapter(ir.grammarId);
// //     const container = await resolveContainer(ir.container ?? ir.containerId);

// //     if (!ir.options?.skipValidation && adapter.validate) {
// //       if (!adapter.validate(ir.spec)) {
// //         throw new Error(`Invalid visualization spec for grammarId: ${ir.grammarId}`);
// //       }
// //     }

// //     await adapter.render(
// //       container,
// //       ir.spec,
// //       ir.data,
// //       {
// //         ...ir.options,
// //         nodeId: ir.nodeId, // always forward nodeId into options
// //       }
// //     );

// //     return {
// //       success: true,
// //       grammarId: ir.grammarId,
// //       output: undefined,
// //     };
// //   } catch (error: any) {
// //     return {
// //       success: false,
// //       grammarId: ir.grammarId,
// //       error: error?.message || 'Visualization execution failed',
// //     };
// //   }
// // }


// /**
//  * visualizationIntegrationLayer
//  *
//  * Generic execution/dispatch layer for grammar-based visualizations.
//  */

// import { getGrammarAdapter } from '../registry/grammarAdapter';
// import { VisualizationIR, VisualizationRenderResult } from './ir';

// function resolveContainer(ir: VisualizationIR): HTMLElement {
//   if (ir.container instanceof HTMLElement) {
//     return ir.container;
//   }

//   const el = document.getElementById(ir.containerId);

//   if (!el) {
//     throw new Error(
//       `Visualization container not found: ${ir.containerId} (nodeId=${ir.nodeId}, grammarId=${ir.grammarId})`
//     );
//   }

//   return el;
// }

// export async function executeVisualization(
//   ir: VisualizationIR
// ): Promise<VisualizationRenderResult> {
//   try {
    
//     if (!ir.grammarId) {
//       throw new Error('Visualization request is missing grammarId');
//     }

//     const adapter = getGrammarAdapter(ir.grammarId);
//     const container = resolveContainer(ir);

//     const shouldValidate = !ir.options?.skipValidation;
//     if (shouldValidate && !adapter.validate(ir.spec)) {
//       throw new Error(`Invalid visualization spec for grammarId: ${ir.grammarId}`);
//     }

//     const output = await adapter.render(
//       container,
//       ir.spec,
//       ir.data,
//       ir.options
//     );

//     return {
//       success: true,
//       grammarId: ir.grammarId,
//       output,
//     };
//   } catch (error: any) {
//     return {
//       success: false,
//       grammarId: ir.grammarId,
//       error: error?.message || 'Visualization execution failed',
//     };
//   }
// }

import { getAllGrammarAdapters, getGrammarAdapter } from '../registry/grammarAdapter';
import { VisualizationIR, VisualizationRenderResult } from './ir';
import { computeFingerprint } from './metrics';
console.log(
  'Registered adapters:',
  getAllGrammarAdapters().map(a => a.grammarId)
);

function resolveContainer(
  container: HTMLElement | string | null | undefined,
  retries = 10,
  interval = 50
): Promise<HTMLElement> {
  console.log('resolveContainer called', { container, retries, interval });
  return new Promise((resolve, reject) => {
    if (container instanceof HTMLElement) return resolve(container);
    if (!container) return reject(new Error('Missing visualization container'));

    let attempts = 0;
    const poll = () => {
      const el = document.getElementById(container as string);
      if (el) return resolve(el);
      if (++attempts >= retries) return reject(new Error(`Container not found: ${container}`));
      setTimeout(poll, interval);
    };
    poll();
  });
}

export async function executeVisualization(
  ir: VisualizationIR
): Promise<VisualizationRenderResult> {
  try {
    console.log('executeVisualization called', { 
    grammarId: ir.grammarId, 
    containerId: ir.containerId,
    nodeId: ir.nodeId,
  });
    if (!ir.grammarId) {
      throw new Error('Visualization request is missing grammarId');
    } 

    const resolvedInput = ir.container ?? ir.containerId;

    console.log('container input:', resolvedInput);

    const adapter = getGrammarAdapter(ir.grammarId);
    const container = await resolveContainer(ir.container ?? ir.containerId);

    if (!ir.options?.skipValidation && adapter.validate) {
      if (!adapter.validate(ir.spec)) {
        throw new Error(`Invalid visualization spec for grammarId: ${ir.grammarId}`);
      }
    }

    const fingerprint = computeFingerprint(await adapter.render(
      container,
      ir.spec,
      ir.data,
      {
        ...ir.options,
        nodeId: ir.nodeId, // always forward nodeId into options
      }
    ));

    console.log("📊 FINGERPRINT", fingerprint);

    return {
      success: true,
      grammarId: ir.grammarId,
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