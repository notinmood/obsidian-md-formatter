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
      ? [...(frontmatter.tags as string[])]
      : typeof frontmatter.tags === 'string'
        ? (frontmatter.tags as string).split(/[,\s]+/).map(t => t.trim()).filter(t => t)
        : [];
    this.editedSummary = String(frontmatter.summary || '');
    this.editedCategories = Array.isArray(frontmatter.categories)
      ? [...(frontmatter.categories as string[])]
      : typeof frontmatter.categories === 'string'
        ? (frontmatter.categories as string).split(/[,\s]+/).map(t => t.trim()).filter(t => t)
        : [];
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();

    contentEl.createEl('h2', { text: '格式化预览' });

    // 只读字段
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