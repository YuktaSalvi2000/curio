export function computeFingerprint(result: any) {
  return {
    // structure
    hasLayers: !!result?.layers,
    layerCount: result?.layers?.length ?? 0,

    // grammar structure
    knotCount: result?.knots?.length ?? 0,
    componentCount: result?.components?.length ?? 0,

    // DOM/side effect proxy
    hasRender: !!result?.rendered,

    // normalize for comparison
    raw: JSON.stringify(result, Object.keys(result || {}).sort())
  };
}