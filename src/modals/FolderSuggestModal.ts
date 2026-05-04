import { App, FuzzySuggestModal, TFolder } from 'obsidian';

export interface FolderSelectResult {
  folder: TFolder;
  recursive: boolean;
}

export class FolderSuggestModal extends FuzzySuggestModal<TFolder> {
  private onChoose: (result: FolderSelectResult) => void;

  constructor(
    app: App,
    onChoose: (result: FolderSelectResult) => void
  ) {
    super(app);
    this.onChoose = onChoose;
    this.setPlaceholder('选择要格式化的文件夹...');
  }

  getItems(): TFolder[] {
    const folders: TFolder[] = [];
    const collectFolders = (folder: TFolder) => {
      folders.push(folder);
      for (const child of folder.children) {
        if (child instanceof TFolder) {
          collectFolders(child);
        }
      }
    };
    collectFolders(this.app.vault.getRoot());
    return folders;
  }

  getItemText(item: TFolder): string {
    return item.path || '/ (根目录)';
  }

  onChooseItem(item: TFolder, evt: MouseEvent | KeyboardEvent): void {
    this.onChoose({
      folder: item,
      recursive: true,
    });
  }
}
