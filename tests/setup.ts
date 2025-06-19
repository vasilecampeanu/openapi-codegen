// This file is used for global test setup
// We can add global mocks, spies, or other test configurations here

// Increase timeout for tests since file operations might take time
jest.setTimeout(10000);

// Silence console logs during tests unless in debug mode
if (!process.env.DEBUG) {
    global.console.log = jest.fn();
    // INFO:
    // Keep error logs visible for debugging test failures
    // global.console.error = jest.fn();
}

// Create mock fs module for testing
jest.mock('node:fs', () => ({
    ...jest.requireActual('node:fs'),
}));
