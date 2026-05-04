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
