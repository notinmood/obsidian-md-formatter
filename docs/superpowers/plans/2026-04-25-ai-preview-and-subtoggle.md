# AI 预览 Modal + AI 子开关 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 格式化当前文件时弹出预览 Modal 让用户审阅/编辑 AI 生成的 metadata；AI 设置区域新增预览开关

**架构：** 新增 MetadataPreviewModal 展示格式化后的 frontmatter，tags/summary/categories 可编辑其余只展示。AIFrontmatterConfig 新增 showPreview 字段控制是否弹出预览。formatCurrentFile 在 AI 可用且 showPreview=true 时先格式化再弹 Modal，用户确认后才应用。

**技术栈：** Obsidian Modal API、yaml 库

---

## 文件结构

| 文件 | 职责 |
|---|---|
| `src/types/index.ts` | AIFrontmatterConfig 新增 showPreview 字段，DEFAULT_SETTINGS 更新 |
| `src/modals/MetadataPreviewModal.ts` | 新建。AI 预览 Modal：展示 frontmatter，可编辑 tags/summary/categories |
| `src/main.ts` | formatCurrentFile 增加 AI 预览流程 |
| `src/ui/SettingsTab.ts` | AI 设置区域新增预览开关 |

---

### 任务 1：扩展 AIFrontmatterConfig 新增 showPreview

**文件：**
- 修改：`src/types/index.ts`

- [ ] **步骤 1：修改 AIFrontmatterConfig 和 DEFAULT_SETTINGS**

在 `src/types/index.ts` 中：

`AIFrontmatterConfig` 接口新增字段：
```typescript
export interface AIFrontmatterConfig {
  enabled: boolean;
  providers: AIProviderConfig[];
  maxTags: number;
  maxCategories: number;
  customPrompt: string;
  showPreview: boolean;  // 新增：是否显示 AI 预览 Modal
}
```

`DEFAULT_SETTINGS` 中 `aiFrontmatter` 新增默认值：
```typescript
aiFrontmatter: {
  enabled: false,
  providers: [],
  maxTags: 5,
  maxCategories: 3,
  customPrompt: '',
  showPreview: true,
},
```

- [ ] **步骤 2：运行构建验证**

运行：`npm run build`
预期：构建成功

- [ ] **步骤 3：运行测试确认无回归**

运行：`npm test`
预期：所有测试通过

- [ ] **步骤 4：Commit**

```bash
git add src/types/index.ts
git commit -m "feat: AIFrontmatterConfig 新增 showPreview 字段"
```

---

### 任务 2：创建 MetadataPreviewModal

**文件：**
- 创建：`src/modals/MetadataPreviewModal.ts`

- [ ] **步骤 1：创建 MetadataPreviewModal**

创建 `src/modals/MetadataPreviewModal.ts`：

```typescript
import { App, Modal } from 'obsidian';

export interface PreviewResult {
  confirmed: boolean;
  editedFrontmatter: Record<string, unknown> | null;
}

export class MetadataPreviewModal extends Modal {
  private frontmatter: Record<string, unknown>;
  private onConfirm: (result: PreviewResult) => void;
  private editedTags: string[];
  private editedSummary: string;
  private editedCategories: string[];

  constructor(
    app: App,
    frontmatter: Record<string, unknown>,
    onConfirm: (result: PreviewResult) => void
  ) {
    super(app);
    this.frontmatter = frontmatter;
    this.onConfirm = onConfirm;
    this.editedTags = Array.isArray(frontmatter.tags)
      ? [...frontmatter.tags as string[]]
      : typeof frontmatter.tags === 'string'
        ? (frontmatter.tags as string).split(/[,\s]+/).map(t => t.trim()).filter(t => t)
        : [];
    this.editedSummary = String(frontmatter.summary || '');
    this.editedCategories = Array.isArray(frontmatter.categories)
      ? [...frontmatter.categories as string[]]
      : typeof frontmatter.categories === 'string'
        ? (frontmatter.categories as string).split(/[,\s]+/).map(t => t.trim()).filter(t => t)
        : [];
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();

    contentEl.createEl('h2', { text: '格式化预览' });

    // 只读字段：created, updated, title 等
    const readonlyKeys = Object.keys(this.frontmatter).filter(
      k => k !== 'tags' && k !== 'summary' && k !== 'categories'
    );

    if (readonlyKeys.length > 0) {
      const readonlyContainer = contentEl.createDiv({ cls: 'md-formatter-preview-readonly' });
      readonlyContainer.createEl('h3', { text: '自动处理字段（不可编辑）' });

      for (const key of readonlyKeys) {
        const value = this.frontmatter[key];
        const line = readonlyContainer.createDiv({ cls: 'md-formatter-preview-line' });
        line.createEl('span', { text: `${key}: `, cls: 'md-formatter-preview-key' });
        line.createEl('span', { text: this.formatValue(value), cls: 'md-formatter-preview-value' });
      }
    }

    // 可编辑字段
    const editableContainer = contentEl.createDiv({ cls: 'md-formatter-preview-editable' });
    editableContainer.createEl('h3', { text: 'AI 生成字段（可编辑）' });

    // tags
    const tagsContainer = editableContainer.createDiv();
    tagsContainer.createEl('label', { text: '标签 (tags):' });
    const tagsInput = tagsContainer.createEl('input', {
      type: 'text',
      value: this.editedTags.join(', '),
      cls: 'md-formatter-preview-input',
    });
    tagsInput.addEventListener('input', (e) => {
      this.editedTags = (e.target as HTMLInputElement).value
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);
    });

    // summary
    const summaryContainer = editableContainer.createDiv();
    summaryContainer.createEl('label', { text: '摘要 (summary):' });
    const summaryInput = summaryContainer.createEl('textarea', {
      cls: 'md-formatter-preview-textarea',
    });
    summaryInput.value = this.editedSummary;
    summaryInput.addEventListener('input', (e) => {
      this.editedSummary = (e.target as HTMLTextAreaElement).value;
    });

    // categories
    const categoriesContainer = editableContainer.createDiv();
    categoriesContainer.createEl('label', { text: '分类 (categories):' });
    const categoriesInput = categoriesContainer.createEl('input', {
      type: 'text',
      value: this.editedCategories.join(', '),
      cls: 'md-formatter-preview-input',
    });
    categoriesInput.addEventListener('input', (e) => {
      this.editedCategories = (e.target as HTMLInputElement).value
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);
    });

    // 按钮
    const buttonContainer = contentEl.createDiv({ cls: 'modal-button-container' });

    const confirmButton = buttonContainer.createEl('button', {
      text: '应用',
      cls: 'mod-cta',
    });
    confirmButton.addEventListener('click', () => {
      const edited = { ...this.frontmatter };
      edited.tags = this.editedTags;
      edited.summary = this.editedSummary;
      edited.categories = this.editedCategories;
      this.onConfirm({ confirmed: true, editedFrontmatter: edited });
      this.close();
    });

    const cancelButton = buttonContainer.createEl('button', {
      text: '取消',
    });
    cancelButton.addEventListener('click', () => {
      this.onConfirm({ confirmed: false, editedFrontmatter: null });
      this.close();
    });
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }

  private formatValue(value: unknown): string {
    if (Array.isArray(value)) {
      return value.map(v => String(v)).join(', ');
    }
    if (typeof value === 'string') {
      return value;
    }
    return String(value);
  }
}
```

- [ ] **步骤 2：运行构建验证**

运行：`npm run build`
预期：构建成功

- [ ] **步骤 3：Commit**

```bash
git add src/modals/MetadataPreviewModal.ts
git commit -m "feat: 创建 MetadataPreviewModal"
```

---

### 任务 3：修改 main.ts 增加 AI 预览流程

**文件：**
- 修改：`src/main.ts`

- [ ] **步骤 1：修改 formatCurrentFile 方法**

修改 `src/main.ts` 的 `formatCurrentFile` 方法，在 AI 可用且 showPreview=true 时弹出预览 Modal。

新增导入：
```typescript
import { parse, stringify } from 'yaml';
import { MetadataPreviewModal } from './modals/MetadataPreviewModal';
```

修改 `formatCurrentFile` 方法中 `if (result.success && result.content)` 部分：

```typescript
if (result.success && result.content) {
  // 判断是否需要弹出预览 Modal
  const aiConfig = this.settings.aiFrontmatter;
  const needPreview = aiConfig.enabled && aiConfig.showPreview && this.createAIService() !== undefined;

  if (needPreview) {
    // 从格式化结果中提取 frontmatter
    const match = result.content.match(/^---\s*\n([\s\S]*?)\n---/);
    if (match) {
      try {
        const formattedFrontmatter = parse(match[1]) as Record<string, unknown>;
        new MetadataPreviewModal(this.app, formattedFrontmatter, (previewResult) => {
          if (previewResult.confirmed && previewResult.editedFrontmatter) {
            // 将编辑后的 frontmatter 替换回格式化结果
            const newYaml = stringify(previewResult.editedFrontmatter, {
              lineWidth: 0,
              defaultStringType: 'PLAIN',
              defaultKeyType: 'PLAIN',
            }).trim();
            const newContent = result.content!.replace(/^---\s*\n[\s\S]*?\n---/, `---\n${newYaml}\n---`);

            const currentContent = editor.getValue();
            editor.transaction({
              changes: [{
                from: { line: 0, ch: 0 },
                to: editor.offsetToPos(currentContent.length),
                text: newContent,
              }],
              selection: { from: cursor, to: cursor },
            });
            showNotice('格式化完成');
          } else {
            showNotice('格式化已取消');
          }
        }).open();
      } catch {
        // YAML 解析失败，直接应用
        this.applyFormatResult(editor, result.content, cursor);
      }
    } else {
      // 没有 frontmatter，直接应用
      this.applyFormatResult(editor, result.content, cursor);
    }
  } else {
    // 不需要预览，直接应用
    this.applyFormatResult(editor, result.content, cursor);
    showNotice(`格式化完成，应用了 ${result.stats?.rulesApplied || 0} 条规则`);
  }
} else {
  showNotice(`格式化失败: ${result.error || '未知错误'}`);
}
```

新增 `applyFormatResult` 辅助方法（提取原来的 transaction 逻辑）：

```typescript
private applyFormatResult(editor: Editor, content: string, cursor: { line: number; ch: number }): void {
  const currentContent = editor.getValue();
  editor.transaction({
    changes: [{
      from: { line: 0, ch: 0 },
      to: editor.offsetToPos(currentContent.length),
      text: content,
    }],
    selection: { from: cursor, to: cursor },
  });
}
```

- [ ] **步骤 2：运行构建验证**

运行：`npm run build`
预期：构建成功

- [ ] **步骤 3：运行全部测试确认无回归**

运行：`npm test`
预期：所有测试通过

- [ ] **步骤 4：Commit**

```bash
git add src/main.ts
git commit -m "feat: formatCurrentFile 增加 AI 预览 Modal 流程"
```

---

### 任务 4：设置面板新增预览开关

**文件：**
- 修改：`src/ui/SettingsTab.ts`

- [ ] **步骤 1：在 renderAISettings 方法中新增预览开关**

在 `src/ui/SettingsTab.ts` 的 `renderAISettings` 方法中，在"启用 AI Frontmatter"开关之后（第352行 `if (!this.plugin.settings.aiFrontmatter.enabled) return;` 之前），新增预览开关：

```typescript
new Setting(containerEl)
  .setName('启用 AI 预览')
  .setDesc('格式化时弹出预览窗口，可审阅和编辑 AI 生成的标签、摘要、分类后再应用。关闭则直接应用格式化结果。')
  .addToggle((toggle) =>
    toggle
      .setValue(this.plugin.settings.aiFrontmatter.showPreview ?? true)
      .onChange(async (value) => {
        this.plugin.settings.aiFrontmatter.showPreview = value;
        await this.plugin.saveSettings();
      })
  );
```

注意：这个开关应该在 `if (!this.plugin.settings.aiFrontmatter.enabled) return;` 之前，因为即使 AI 暂时未启用，用户也可能想提前配置预览选项。但更好的做法是放在 AI 启用后的区域内，因为预览只在 AI 可用时才有意义。

实际上，放在 AI 启用区域内更合理——只有 AI 已启用时预览才有意义。所以在 `if (!this.plugin.settings.aiFrontmatter.enabled) return;` 之后、提供商列表之前插入。

- [ ] **步骤 2：运行构建验证**

运行：`npm run build`
预期：构建成功

- [ ] **步骤 3：运行全部测试确认无回归**

运行：`npm test`
预期：所有测试通过

- [ ] **步骤 4：Commit**

```bash
git add src/ui/SettingsTab.ts
git commit -m "feat: 设置面板新增 AI 预览开关"
```

---

### 任务 5：集成验证

- [ ] **步骤 1：运行构建**

运行：`npm run build`
预期：构建成功

- [ ] **步骤 2：运行全部测试**

运行：`npm test`
预期：所有测试通过

- [ ] **步骤 3：Commit**

```bash
git commit --allow-empty -m "chore: 集成验证完成，AI 预览 Modal + showPreview 开关就绪"
```