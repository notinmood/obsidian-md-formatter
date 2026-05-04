// Mock for obsidian module - exports are stored on a mutable object
// so tests can override requestUrl with jest.fn()
const _mocks = {
  requestUrl: () => Promise.resolve({ status: 200, json: {} }),
};

export const requestUrl = (...args: any[]) => _mocks.requestUrl(...args);
export class Notice {
  constructor(public message: string) {}
}

export class TAbstractFile {}

export class TFile extends TAbstractFile {
  extension: string = '';
  path: string = '';
  name: string = '';
}

export class TFolder extends TAbstractFile {
  path: string = '';
  name: string = '';
  children: TAbstractFile[] = [];
}

// Expose internal mock object for tests to override
export const __mocks = _mocks;