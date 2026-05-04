import { TFolder, TFile, TAbstractFile } from 'obsidian';

const EXCLUDED_FOLDERS = new Set(['node_modules']);

function isExcludedFolder(folderName: string): boolean {
  return folderName.startsWith('.') || EXCLUDED_FOLDERS.has(folderName);
}

function isFolder(file: TAbstractFile): file is TFolder {
  return 'children' in file;
}

function isMarkdownFile(file: TAbstractFile): file is TFile {
  return 'extension' in file && (file as TFile).extension === 'md';
}

export function scanMarkdownFiles(
  folder: TFolder,
  recursive: boolean = true
): TFile[] {
  const files: TFile[] = [];

  for (const child of folder.children) {
    if (isFolder(child)) {
      if (isExcludedFolder(child.name)) {
        continue;
      }
      if (recursive) {
        files.push(...scanMarkdownFiles(child, recursive));
      }
    } else if (isMarkdownFile(child)) {
      files.push(child);
    }
  }

  return files;
}
