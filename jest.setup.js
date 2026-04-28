// jest.setup.js
require('jest-canvas-mock');

// Mock structuredClone if not available
if (typeof global.structuredClone === 'undefined') {
  global.structuredClone = (value) => JSON.parse(JSON.stringify(value));
}

// Mock Vega dependencies
jest.mock('vega', () => ({
  parse: jest.fn(),
  View: jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockReturnThis(),
    runAsync: jest.fn().mockResolvedValue(undefined),
    logLevel: jest.fn().mockReturnThis(),
    renderer: jest.fn().mockReturnThis(),
    hover: jest.fn().mockReturnThis(),
  })),
  Warn: 'warn',
}));

jest.mock('vega-lite', () => ({
  compile: jest.fn().mockReturnValue({ spec: {} }),
}));

// Mock canvas if not available
if (typeof global.HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = jest.fn();
}