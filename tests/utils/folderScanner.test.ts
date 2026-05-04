import { TFolder, TFile } from 'obsidian';
import { scanMarkdownFiles } from '../../src/utils/folderScanner';

// Mock TFolder 和 TFile
class MockTFile {
  extension: string;
  path: string;
  name: string;

  constructor(name: string, path: string) {
    this.name = name;
    this.path = path;
    this.extension = name.split('.').pop() || '';
  }
}

class MockTFolder {
  path: string;
  name: string;
  children: Array<MockTFolder | MockTFile>;

  constructor(name: string, path: string, children: Array<MockTFolder | MockTFile> = []) {
    this.name = name;
    this.path = path;
    this.children = children;
  }
}

describe('scanMarkdownFiles', () => {
  it('应该只返回 .md 后缀的文件', () => {
    const file1 = new MockTFile('note.md', 'docs/note.md') as unknown as TFile;
    const file2 = new MockTFile('image.png', 'docs/image.png') as unknown as TFile;
    const folder = new MockTFolder('docs', 'docs', [file1, file2]) as unknown as TFolder;

    const result = scanMarkdownFiles(folder, false);

    expect(result.length).toBe(1);
    expect(result[0].path).toBe('docs/note.md');
  });

  it('应该递归扫描子文件夹', () => {
    const subFile = new MockTFile('sub.md', 'docs/sub/sub.md') as unknown as TFile;
    const subFolder = new MockTFolder('sub', 'docs/sub', [subFile]) as unknown as TFolder;
    const rootFile = new MockTFile('root.md', 'docs/root.md') as unknown as TFile;
    const rootFolder = new MockTFolder('docs', 'docs', [rootFile, subFolder]) as unknown as TFolder;

    const result = scanMarkdownFiles(rootFolder, true);

    expect(result.length).toBe(2);
    expect(result.map(f => f.path)).toContain('docs/root.md');
    expect(result.map(f => f.path)).toContain('docs/sub/sub.md');
  });

  it('不递归时只返回直接子文件', () => {
    const subFile = new MockTFile('sub.md', 'docs/sub/sub.md') as unknown as TFile;
    const subFolder = new MockTFolder('sub', 'docs/sub', [subFile]) as unknown as TFolder;
    const rootFile = new MockTFile('root.md', 'docs/root.md') as unknown as TFile;
    const rootFolder = new MockTFolder('docs', 'docs', [rootFile, subFolder]) as unknown as TFolder;

    const result = scanMarkdownFiles(rootFolder, false);

    expect(result.length).toBe(1);
    expect(result[0].path).toBe('docs/root.md');
  });

  it('应该排除以 . 开头的隐藏文件夹', () => {
    const obsidianFile = new MockTFile('config.md', '.obsidian/config.md') as unknown as TFile;
    const obsidianFolder = new MockTFolder('.obsidian', '.obsidian', [obsidianFile]) as unknown as TFolder;
    const normalFile = new MockTFile('note.md', 'note.md') as unknown as TFile;
    const rootFolder = new MockTFolder('', '', [normalFile, obsidianFolder]) as unknown as TFolder;

    const result = scanMarkdownFiles(rootFolder, true);

    expect(result.length).toBe(1);
    expect(result[0].path).toBe('note.md');
  });

  it('应该排除 node_modules 文件夹', () => {
    const depFile = new MockTFile('dep.md', 'node_modules/pkg/dep.md') as unknown as TFile;
    const pkgFolder = new MockTFolder('pkg', 'node_modules/pkg', [depFile]) as unknown as TFolder;
    const nodeModulesFolder = new MockTFolder('node_modules', 'node_modules', [pkgFolder]) as unknown as TFolder;
    const normalFile = new MockTFile('note.md', 'note.md') as unknown as TFile;
    const rootFolder = new MockTFolder('', '', [normalFile, nodeModulesFolder]) as unknown as TFolder;

    const result = scanMarkdownFiles(rootFolder, true);

    expect(result.length).toBe(1);
    expect(result[0].path).toBe('note.md');
  });

  it('默认应该递归扫描', () => {
    const subFile = new MockTFile('sub.md', 'docs/sub/sub.md') as unknown as TFile;
    const subFolder = new MockTFolder('sub', 'docs/sub', [subFile]) as unknown as TFolder;
    const rootFile = new MockTFile('root.md', 'docs/root.md') as unknown as TFile;
    const rootFolder = new MockTFolder('docs', 'docs', [rootFile, subFolder]) as unknown as TFolder;

    const result = scanMarkdownFiles(rootFolder);

    expect(result.length).toBe(2);
  });
});
