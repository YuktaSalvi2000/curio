import './descriptors';
import '../adapters/vegaLiteAdapter';
import '../adapters/utkAdapter';
import '../adapters/mockGrammarAdapter';   //Modified for Mock grammar plugin testing - not part of actual registry descriptors
import '../adapters/d3Adapter'
export {
  registerNode,
  getNodeDescriptor,
  getAllNodeTypes,
  getPaletteNodeTypes,
} from './nodeRegistry';

export {
  registerGrammarAdapter,
  getGrammarAdapter,
  getAllGrammarAdapters,
} from './grammarAdapter';

export type {
  BoxDescriptor,
  PortDef,
  EditorType,
  BoxCategory,
  HandleDef,
  EditorConfig,
  ContainerConfig,
  BoxAdapter,
  BoxLifecycleHook,
  BoxLifecycleData,
  LifecycleResult,
  UseBoxStateReturn,
} from './types';

export type {
  GrammarAdapter,
} from './grammarAdapter';
