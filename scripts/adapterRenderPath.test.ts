import { describe, test, expect, jest, beforeAll } from '@jest/globals';

let getNodeDescriptor: any;
let BoxType: any;
let useGrammarLifecycle: any;
let useUtkLifecycle: any;
let useVegaLifecycle: any;

beforeAll(async () => {
  jest.resetModules();

  jest.doMock(
    'utk',
    () => ({
      __esModule: true,
      Environment: jest.fn(),
      GrammarInterpreter: jest.fn(),
    }),
    { virtual: true }
  );

  const nodeRegistry = await import(
    '../../utk_curio/frontend/urban-workflows/src/registry/nodeRegistry'
  );
  const constants = await import(
    '../../utk_curio/frontend/urban-workflows/src/constants'
  );
  const grammarLifecycle = await import(
    '../../utk_curio/frontend/urban-workflows/src/adapters/box/useGrammarLifecycle'
  );
  const utkLifecycle = await import(
    '../../utk_curio/frontend/urban-workflows/src/adapters/box/utkLifecycle'
  );
  const vegaLifecycle = await import(
    '../../utk_curio/frontend/urban-workflows/src/adapters/box/vegaLifecycle'
  );

  await import(
    '../../utk_curio/frontend/urban-workflows/src/registry/descriptors'
  );

  getNodeDescriptor = nodeRegistry.getNodeDescriptor;
  BoxType = constants.BoxType;
  useGrammarLifecycle = grammarLifecycle.useGrammarLifecycle;
  useUtkLifecycle = utkLifecycle.useUtkLifecycle;
  useVegaLifecycle = vegaLifecycle.useVegaLifecycle;
});

describe('Vega-Lite lifecycle migration', () => {
  test('should use generic grammar lifecycle, not Vega-specific lifecycle', () => {
    const descriptor = getNodeDescriptor(BoxType.VIS_VEGA);

    expect(descriptor).toBeDefined();
    expect(descriptor.grammarId).toBe('vega-lite');

    expect(descriptor.adapter?.useLifecycle).toBeDefined();
    expect(descriptor.adapter?.useLifecycle).toBe(useGrammarLifecycle);
    expect(descriptor.adapter?.useLifecycle).not.toBe(useVegaLifecycle);
  });
});

describe('UTK lifecycle migration', () => {
  test('should use generic grammar lifecycle, not UTK-specific lifecycle', () => {
    const descriptor = getNodeDescriptor(BoxType.VIS_UTK);

    expect(descriptor).toBeDefined();
    expect(descriptor.grammarId).toBe('utk');

    expect(descriptor.adapter?.useLifecycle).toBeDefined();
    expect(descriptor.adapter?.useLifecycle).toBe(useGrammarLifecycle);
    expect(descriptor.adapter?.useLifecycle).not.toBe(useUtkLifecycle);
  });
});