// Mock for obsidian module - exports are stored on a mutable object
// so tests can override requestUrl with jest.fn()
const _mocks = {
  requestUrl: () => Promise.resolve({ status: 200, json: {} }),
};

export const requestUrl = (...args: any[]) => _mocks.requestUrl(...args);
export class Notice {
  constructor(public message: string) {}
}

// Expose internal mock object for tests to override
export const __mocks = _mocks;