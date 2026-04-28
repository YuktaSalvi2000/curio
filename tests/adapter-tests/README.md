# Adapter Tests: Grammar Independence & Extensibility

## Overview

This directory contains unit tests that verify the Curio visualization framework supports **grammar-agnostic visualization execution**, proving that:

1. New grammar plugins can be added without modifying core code
2. The execution contract is truly generic and backend-independent
3. Existing Vega-Lite and UTK grammars work identically under the new architecture
4. Invalid requests are properly rejected at the integration layer

---

## Control Flow: Which Lifecycle Controls Visualization Execution?

### Before Refactoring
```
VegaBox → useVegaLifecycle (Vega-Lite specific)
UTKBox  → useUtkLifecycle (UTK specific)
```
- Each grammar had its own lifecycle hook
- Control flow was tied to the box type and grammar-specific logic
- Adding a new grammar required modifying the box system

### After Refactoring
```
GrammarVisBox → useGrammarLifecycle (Generic)
  ↓
  ├─ Vega-Lite box (grammarId: 'vega-lite')
  ├─ UTK box (grammarId: 'utk')
  └─ Mock-Grammar box (grammarId: 'mock-grammar')
```

**All grammars now route through `useGrammarLifecycle`**, which:
1. Reads `descriptor.grammarId` from the node configuration
2. Calls `executeVisualization()` with a generic `VisualizationIR` contract
3. The integration layer looks up the correct adapter: `getGrammarAdapter(ir.grammarId)`
4. The adapter's `render()` method handles grammar-specific logic

---

## Architecture: Generic vs. Specific

### Generic Grammar Lifecycle Flow

**File:** `utk_curio/frontend/urban-workflows/src/adapters/box/useGrammarLifecycle.ts`

```typescript
export const useGrammarLifecycle: BoxLifecycleHook = (data, boxState, descriptor) => {
  const applyGrammar = async (spec: string) => {
    const grammarId = descriptor.grammarId; // READ from descriptor, not hardcoded
    
    // Prepare spec using generic contract
    const prepared = prepareGrammarSpec(spec, grammarId);
    
    // Build generic VisualizationIR (contract-based, not grammar-specific)
    const ir: VisualizationIR = {
      grammarId,           // Generic: any registered grammar ID
      spec: JSON.stringify(prepared.parsedSpec),
      data: data.input,    // Generic: any data shape
      nodeId: data.nodeId,
      containerId: outputId,
      boxType: data.nodeType,
    };
    
    // Dispatch to generic integration layer
    const result = await executeVisualization(ir);
  };
};
```

### Grammar-Specific Adapter Implementation

**File:** `utk_curio/frontend/urban-workflows/src/adapters/vegaLiteAdapter.ts`

```typescript
export const vegaLiteAdapter: GrammarAdapter = {
  grammarId: 'vega-lite',
  
  validate(spec: unknown): boolean {
    // Grammar-specific validation only
    const parsed = JSON.parse(spec);
    return parsed && typeof parsed === 'object';
  },
  
  async render(container, spec, data, options) {
    // Grammar-specific implementation
    const vegaSpec = lite.compile(specObj).spec;
    const view = new vega.View(vega.parse(vegaSpec))...
  }
};
```

---

## How Control Flows for Each Grammar

### Vega-Lite Visualization Execution

1. **Box Setup:** `VIS_VEGA` node descriptor specifies `grammarId: 'vega-lite'`
2. **User Action:** Clicks "Play" in grammar editor
3. **Lifecycle Called:** `useGrammarLifecycle` executes (not `useVegaLifecycle`)
4. **Spec Read:** `applyGrammar(userSpec)` is called
5. **Execution:** `executeVisualization(ir)` → `getGrammarAdapter('vega-lite')` → `vegaLiteAdapter.render()`
6. **Vega-Specific Logic:** Vega compilation, View creation, hover handlers — all in adapter

### UTK Visualization Execution

1. **Box Setup:** `VIS_UTK` node descriptor specifies `grammarId: 'utk'`
2. **User Action:** Clicks "Play" in grammar editor
3. **Lifecycle Called:** `useGrammarLifecycle` executes (not `useUtkLifecycle`)
4. **Spec Read:** `applyGrammar(userSpec)` is called
5. **Execution:** `executeVisualization(ir)` → `getGrammarAdapter('utk')` → `utkAdapter.render()`
6. **UTK-Specific Logic:** Grid setup, component rendering — all in adapter

### New Grammar (Mock-Grammar) Execution

1. **Box Setup:** `VIS_MOCK_GRAMMAR` node descriptor specifies `grammarId: 'mock-grammar'`
2. **User Action:** Clicks "Play"
3. **Lifecycle Called:** `useGrammarLifecycle` executes (same as Vega/UTK!)
4. **Spec Read:** `applyGrammar(userSpec)` is called
5. **Execution:** `executeVisualization(ir)` → `getGrammarAdapter('mock-grammar')` → `mockGrammarAdapter.render()`
6. **Mock-Specific Logic:** Simple DOM rendering for testing

---

## Key Insight: Separation of Concerns

| Layer | Responsibility | Scope |
|-------|-----------------|-------|
| **useGrammarLifecycle** | Route spec to adapter, manage UI state | Generic (all grammars) |
| **VisualizationIR** | Contract for requests/responses | Generic (all grammars) |
| **executeVisualization()** | Adapter lookup and error handling | Generic (all grammars) |
| **GrammarAdapter.validate()** | Backend-specific validation | Grammar-specific |
| **GrammarAdapter.render()** | Backend-specific compilation/rendering | Grammar-specific |

---

## Test Files Organization

### `grammarIndependence.test.ts`
**Focus:** Contract validation and edge cases

Tests that verify:
- Invalid requests fail properly (missing grammarId, unregistered adapter, etc.)
- Response contract is consistent (success, grammarId, optional error/output)
- Edge cases are handled (skipValidation, container resolution failures)

This file uses only the generic integration layer, not grammar-specific imports.

---

### `mockGrammarAdapter.test.ts`
**Focus:** Adapter-level interface compliance

Tests that verify the `mockGrammarAdapter` itself implements `GrammarAdapter`:
- Registration in grammar registry
- Validation logic (JSON parsing, object shape)
- Valid and invalid spec handling
- Default spec provision

---

### `mockGrammarExecution.test.ts`
**Focus:** Execution flow through generic integration

Tests that verify:
- `executeVisualization()` successfully dispatches to the adapter
- Rendering produces DOM output
- Generic options (data, resolutionMode) are passed through

---

### `mockGrammarNegative.test.ts`
**Focus:** Independence and negative scenarios

Tests that verify:
- Backend-specific Vega/UTK fields are NOT required
- Arbitrary data shapes work (not constrained to dataframe/geodataframe)
- Generic interactions without backend specifics work
- Malformed generic requests are rejected

---

## Correctness: Vega-Lite and UTK Still Work

### How to Verify

The refactoring **maintains complete backward compatibility**:

1. **Control flow is unchanged:**
   - Box still calls lifecycle hook
   - Lifecycle calls `executeVisualization(ir)`
   - Visualization renders to container

2. **Data flow preserves spec and input data:**
   - Vega-Lite specs still receive dataframe input
   - UTK grammars still receive appropriate data
   - No modifications to spec or data structure

3. **Rendering still works:**
   - Vega View is created and rendered identically
   - UTK interpreter runs the same way
   - DOM output is indistinguishable

### Integration Test Verification

**Note:** Regression testing for actual Vega-Lite and UTK example workflows should be done in integration tests, not unit tests, because they require:
- Full React/UI stack (JSX rendering)
- Real browser environment (jsdom + Vega library interactions)
- Example data fixtures

---

## Extensibility: Adding a New Grammar

To add a new grammar (e.g., D3, Plotly, Altair):

1. **Create `/src/adapters/myGrammarAdapter.ts`:**
   ```typescript
   export const myGrammarAdapter: GrammarAdapter = {
     grammarId: 'my-grammar',
     validate(spec) { /* grammar-specific */ },
     async render(container, spec, data, options) { /* implementation */ },
     getDefaultSpec() { /* default config */ }
   };
   registerGrammarAdapter(myGrammarAdapter);
   ```

2. **Add to `/src/registry/index.ts`:**
   ```typescript
   import '../adapters/myGrammarAdapter';
   ```

3. **Add BoxType constant in `/src/constants.ts`:**
   ```typescript
   VIS_MY_GRAMMAR = "VIS_MY_GRAMMAR"
   ```

4. **Add descriptor in `/src/registry/descriptors.ts`:**
   ```typescript
   registerNode({
     id: BoxType.VIS_MY_GRAMMAR,
     grammarId: 'my-grammar',
     adapter: {
       useLifecycle: useGrammarLifecycle,
       // ...other config
     }
   });
   ```

**That's it.** No modification to `useGrammarLifecycle` or `executeVisualization()` needed.

---

## Summary

- **All grammars (Vega-Lite, UTK, Mock, Future) route through `useGrammarLifecycle`**
- Control is **generic and adapter-driven**, not lifecycle-specific
- Backend-specific logic is encapsulated in adapter `render()` methods
- The VisualizationIR contract is **truly backend-agnostic**
- New grammars require only adapter + descriptor registration, no core changes
