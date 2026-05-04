# 批量文件夹格式化 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 增强批量格式化功能，支持文件夹选择、右键菜单、确认对话框和实时进度显示

**架构：** 新增 FolderSuggestModal 和 FolderFormatProgressModal 两个对话框，新增 folderScanner 工具函数负责文件扫描过滤，在 main.ts 中集成新流程和右键菜单

**技术栈：** TypeScript, Obsidian Plugin API, Jest

---

## 文件结构

| 文件 | 职责 | 类型 |
|---|---|---|
| `src/utils/folderScanner.ts` | 文件夹扫描、Markdown 文件过滤、排除规则 | 新建 |
| `tests/utils/folderScanner.test.ts` | folderScanner 单元测试 | 新建 |
| `src/modals/FolderSuggestModal.ts` | 文件夹选择对话框（FuzzySuggestModal） | 新建 |
| `src/modals/FolderFormatProgressModal.ts` | 格式化进度显示对话框 | 新建 |
| `src/main.ts` | 注册命令、右键菜单、集成新流程 | 修改 |

---

### 任务 1：folderScanner 工具函数

**文件：**
- 创建：`src/utils/folderScanner.ts`
- 测试：`tests/utils/folderScanner.test.ts`

- [ ] **步骤 1：编写失败的测试**

```typescript
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
```

- [ ] **步骤 2：运行测试验证失败**

运行：`npm test -- tests/utils/folderScanner.test.ts`
预期：FAIL，报错 "Cannot find module"

- [ ] **步骤 3：编写最少实现代码**

```typescript
import { TFolder, TFile, TAbstractFile } from 'obsidian';

const EXCLUDED_FOLDERS = new Set(['node_modules']);

function isExcludedFolder(folderName: string): boolean {
  return folderName.startsWith('.') || EXCLUDED_FOLDERS.has(folderName);
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
    if (child instanceof TFolder) {
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
```

- [ ] **步骤 4：运行测试验证通过**

运行：`npm test -- tests/utils/folderScanner.test.ts`
预期：PASS（6 个测试全部通过）

- [ ] **步骤 5：Commit**

```bash
git add src/utils/folderScanner.ts tests/utils/folderScanner.test.ts
git commit -m "feat: add folder scanner utility with exclusion rules"
```

---

### 任务 2：FolderSuggestModal 对话框

**文件：**
- 创建：`src/modals/FolderSuggestModal.ts`

- [ ] **步骤 1：创建 Modal 文件**

```typescript
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
```

- [ ] **步骤 2：验证 TypeScript 编译**

运行：`npx tsc --noEmit src/modals/FolderSuggestModal.ts`
预期：无错误

- [ ] **步骤 3：Commit**

```bash
git add src/modals/FolderSuggestModal.ts
git commit -m "feat: add folder suggest modal for folder selection"
```

---

### 任务 3：FolderFormatProgressModal 进度对话框

**文件：**
- 创建：`src/modals/FolderFormatProgressModal.ts`

- [ ] **步骤 1：创建进度 Modal 文件**

```typescript
import { App, Modal } from 'obsidian';

const PROGRESS_STYLES = `
  .md-formatter-progress-container {
    min-width: 400px;
  }
  .md-formatter-progress-bar-wrapper {
    width: 100%;
    height: 8px;
    background: var(--background-modifier-border);
    border-radius: 4px;
    overflow: hidden;
    margin: 16px 0;
  }
  .md-formatter-progress-bar {
    height: 100%;
    background: var(--interactive-accent);
    transition: width 0.2s ease;
  }
  .md-formatter-progress-file {
    font-size: 14px;
    color: var(--text-muted);
    margin-bottom: 8px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .md-formatter-progress-stats {
    display: flex;
    gap: 16px;
    font-size: 13px;
    color: var(--text-muted);
  }
  .md-formatter-progress-success {
    color: var(--text-success);
  }
  .md-formatter-progress-error {
    color: var(--text-error);
  }
`;

let progressStylesInjected = false;

export interface FormatProgress {
  currentFile: string;
  processed: number;
  total: number;
  success: number;
  failed: number;
}

export class FolderFormatProgressModal extends Modal {
  private progress: FormatProgress;
  private progressBar: HTMLElement;
  private fileLabel: HTMLElement;
  private statsLabel: HTMLElement;
  private isClosed = false;

  constructor(app: App, totalFiles: number) {
    super(app);
    this.progress = {
      currentFile: '',
      processed: 0,
      total: totalFiles,
      success: 0,
      failed: 0,
    };
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('md-formatter-progress-container');

    if (!progressStylesInjected) {
      const style = document.createElement('style');
      style.textContent = PROGRESS_STYLES;
      document.head.appendChild(style);
      progressStylesInjected = true;
    }

    contentEl.createEl('h2', { text: '批量格式化' });

    this.fileLabel = contentEl.createDiv({
      cls: 'md-formatter-progress-file',
      text: '准备中...',
    });

    const progressBarWrapper = contentEl.createDiv({
      cls: 'md-formatter-progress-bar-wrapper',
    });

    this.progressBar = progressBarWrapper.createDiv({
      cls: 'md-formatter-progress-bar',
    });
    this.progressBar.style.width = '0%';

    this.statsLabel = contentEl.createDiv({
      cls: 'md-formatter-progress-stats',
    });

    this.updateDisplay();
  }

  updateProgress(progress: Partial<FormatProgress>): void {
    if (this.isClosed) return;
    Object.assign(this.progress, progress);
    this.updateDisplay();
  }

  private updateDisplay(): void {
    const { processed, total, success, failed, currentFile } = this.progress;
    const percentage = total > 0 ? Math.round((processed / total) * 100) : 0;

    this.fileLabel.textContent = currentFile || '准备中...';
    this.progressBar.style.width = `${percentage}%`;
    this.statsLabel.innerHTML = `
      <span>进度: ${processed}/${total} (${percentage}%)</span>
      <span class="md-formatter-progress-success">成功: ${success}</span>
      <span class="md-formatter-progress-error">失败: ${failed}</span>
    `;
  }

  onClose() {
    this.isClosed = true;
    const { contentEl } = this;
    contentEl.empty();
  }
}
```

- [ ] **步骤 2：验证 TypeScript 编译**

运行：`npx tsc --noEmit src/modals/FolderFormatProgressModal.ts`
预期：无错误

- [ ] **步骤 3：Commit**

```bash
git add src/modals/FolderFormatProgressModal.ts
git commit -m "feat: add folder format progress modal with real-time display"
```

---

### 任务 4：集成新流程到 main.ts

**文件：**
- 修改：`src/main.ts:1-227`

- [ ] **步骤 1：添加导入语句**

在文件顶部导入区域添加：

```typescript
import { FolderSuggestModal } from './modals/FolderSuggestModal';
import { FolderFormatProgressModal } from './modals/FolderFormatProgressModal';
import { scanMarkdownFiles } from './utils/folderScanner';
```

- [ ] **步骤 2：添加新的格式化方法**

在现有 `formatFolder` 方法之后添加：

```typescript
  /**
   * 新的批量格式化流程：选择文件夹 -> 确认 -> 显示进度
   */
  private async startFolderFormatFlow(): Promise<void> {
    new FolderSuggestModal(this.app, async ({ folder, recursive }) => {
      await this.formatSelectedFolder(folder, recursive);
    }).open();
  }

  /**
   * 格式化选中的文件夹
   */
  private async formatSelectedFolder(folder: TFolder, recursive: boolean): Promise<void> {
    const files = scanMarkdownFiles(folder, recursive);

    if (files.length === 0) {
      showNotice('该文件夹下没有 Markdown 文件');
      return;
    }

    // 显示确认对话框（使用原生 confirm）
    const confirmed = confirm(`即将格式化 ${files.length} 个文件\n文件夹: ${folder.path || '/'}\n\n确定继续吗？`);
    if (!confirmed) return;

    // 显示进度对话框
    const progressModal = new FolderFormatProgressModal(this.app, files.length);
    progressModal.open();

    let success = 0;
    let failed = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      progressModal.updateProgress({
        currentFile: file.path,
        processed: i,
      });

      try {
        const content = await this.app.vault.read(file);
        const stat = await this.app.vault.adapter.stat(file.path);
        const fileInfo = stat ? { ctime: stat.ctime, mtime: stat.mtime } : undefined;
        const result = await this.processor.processContent(
          content,
          this.settings,
          undefined,
          file.basename,
          fileInfo
        );

        if (result.success && result.content && result.content !== content) {
          await this.app.vault.modify(file, result.content);
          success++;
        }
      } catch {
        failed++;
      }
    }

    // 更新最终状态
    progressModal.updateProgress({
      currentFile: '完成',
      processed: files.length,
      success,
      failed,
    });

    // 短暂延迟后关闭模态框并显示通知
    setTimeout(() => {
      progressModal.close();
      showNotice(`批量格式化完成: ${success} 个文件已更新, ${failed} 个失败`);
    }, 800);
  }
```

- [ ] **步骤 3：修改注册命令中的回调**

在 `registerCommands` 方法中找到 `format-folder` 命令（约第 70-77 行），修改回调：

```typescript
    // 批量格式化文件夹
    this.addCommand({
      id: 'format-folder',
      name: '批量格式化文件夹',
      callback: () => {
        this.startFolderFormatFlow();
      },
    });
```

- [ ] **步骤 4：验证编译和构建**

运行：`npm run build`
预期：构建成功

- [ ] **步骤 5：Commit**

```bash
git add src/main.ts
git commit -m "feat: integrate new folder format flow with selection and progress"
```

---

### 任务 5：添加右键菜单支持

**文件：**
- 修改：`src/main.ts:20-37`（onLoad 方法）

- [ ] **步骤 1：在 onLoad 中注册文件菜单事件**

在 `onLoad` 方法末尾（`this.addSettingTab` 之后）添加：

```typescript
    // 注册文件夹右键菜单
    this.registerEvent(
      this.app.workspace.on('file-menu', (menu, file) => {
        if (file instanceof TFolder) {
          menu.addItem((item) => {
            item
              .setTitle('格式化此文件夹')
              .setIcon('format')
              .onClick(async () => {
                await this.formatSelectedFolder(file, true);
              });
          });
        }
      })
    );
```

- [ ] **步骤 2：添加 TFolder 导入**

确认导入语句中包含 TFolder：

```typescript
import { Plugin, Notice, TFile, Editor, MarkdownView, TFolder } from 'obsidian';
```

- [ ] **步骤 3：验证编译和构建**

运行：`npm run build`
预期：构建成功

- [ ] **步骤 4：Commit**

```bash
git add src/main.ts
git commit -m "feat: add right-click folder menu support"
```

---

### 任务 6：运行完整测试和构建

- [ ] **步骤 1：运行所有测试**

运行：`npm test`
预期：全部测试通过（包括新增的 folderScanner 测试）

- [ ] **步骤 2：构建生产版本**

运行：`npm run build`
预期：构建成功，无 TypeScript 错误

- [ ] **步骤 3：Commit 最终验证**

```bash
git status
# 确认所有更改已提交
```

---

## 计划自检

**1. 规格覆盖度：**
- ✅ folderScanner - 文件扫描和排除规则（任务 1）
- ✅ FolderSuggestModal - 文件夹选择对话框（任务 2）
- ✅ FolderFormatProgressModal - 进度显示对话框（任务 3）
- ✅ 新流程集成 - 选择 → 确认 → 格式化（任务 4）
- ✅ 右键菜单支持（任务 5）

**2. 占位符扫描：**
- ✅ 所有步骤包含完整代码
- ✅ 所有命令精确
- ✅ 无 TODO 或"待定"

**3. 类型一致性：**
- ✅ scanMarkdownFiles 签名一致
- ✅ Modal 类名和方法名一致
- ✅ 导入路径正确
