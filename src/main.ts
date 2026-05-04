// src/main.ts
import { Plugin, Notice, TFile, TFolder, Editor, MarkdownView } from 'obsidian';
import { parse, Document as YamlDocument } from 'yaml';
import { DEFAULT_SETTINGS, PluginSettings } from './types';
import { RuleRegistry } from './core/RuleRegistry';
import { Formatter } from './core/Formatter';
import { FileProcessor } from './core/FileProcessor';
import { registerBuiltinRules } from './rules';
import { SettingsTab } from './ui/SettingsTab';
import { showNotice, createProgressCallback } from './utils/notice';
import { AIServiceImpl } from './services';
import { MetadataPreviewModal } from './modals/MetadataPreviewModal';
import { FolderSuggestModal } from './modals/FolderSuggestModal';
import { FolderFormatProgressModal } from './modals/FolderFormatProgressModal';
import { scanMarkdownFiles } from './utils/folderScanner';

export default class MarkdownFormatterPlugin extends Plugin {
  settings: PluginSettings = DEFAULT_SETTINGS;
  private registry!: RuleRegistry;
  private formatter!: Formatter;
  private processor!: FileProcessor;

  async onload() {
    // 初始化核心组件
    this.registry = new RuleRegistry();
    registerBuiltinRules(this.registry);

    // 加载设置
    await this.loadSettings();

    // 初始化 Formatter（需要先加载设置以创建 AIService）
    this.formatter = new Formatter(this.registry, this.createAIService());
    this.processor = new FileProcessor(this.formatter);

    // 注册命令
    this.registerCommands();

    // 注册设置面板
    this.addSettingTab(new SettingsTab(this.app, this));
  }

  private createAIService(): AIServiceImpl | undefined {
    const aiConfig = this.settings.aiFrontmatter;
    if (!aiConfig.enabled || aiConfig.providers.length === 0) {
      return undefined;
    }
    return new AIServiceImpl(aiConfig);
  }

  /**
   * 注册命令
   */
  private registerCommands(): void {
    // 格式化当前文件
    this.addCommand({
      id: 'format-current-file',
      name: '格式化当前文件',
      hotkeys: [{ modifiers: ['Alt'], key: 'f' }],
      editorCallback: async (editor: Editor, view: MarkdownView) => {
        await this.formatCurrentFile(editor, view);
      },
    });

    // 格式化选中内容
    this.addCommand({
      id: 'format-selection',
      name: '格式化选中内容',
      editorCallback: async (editor: Editor, view: MarkdownView) => {
        await this.formatSelection(editor);
      },
    });

    // 批量格式化文件夹
    this.addCommand({
      id: 'format-folder',
      name: '批量格式化文件夹',
      callback: () => {
        this.startFolderFormatFlow();
      },
    });
  }

  /**
   * 格式化当前文件
   */
  private async formatCurrentFile(editor: Editor, view: MarkdownView): Promise<void> {
    const file = view.file;
    if (!file || file.extension !== 'md') {
      showNotice('仅支持Markdown文件');
      return;
    }

    const content = editor.getValue();
    const cursor = editor.getCursor();

    showNotice('正在格式化...');

    const progressCallback = this.processor.shouldChunkFile(content, this.settings)
      ? createProgressCallback()
      : undefined;

    const stat = await this.app.vault.adapter.stat(file.path);
    const fileInfo = stat ? { ctime: stat.ctime, mtime: stat.mtime } : undefined;

    const result = await this.processor.processContent(content, this.settings, progressCallback, file.basename, fileInfo);

    if (result.success && result.content) {
      const aiConfig = this.settings.aiFrontmatter;
      const needPreview = aiConfig.enabled && aiConfig.showPreview && this.createAIService() !== undefined;

      if (needPreview) {
        const match = result.content.match(/^---\s*\n([\s\S]*?)\n---/);
        if (match) {
          try {
            const formattedFrontmatter = parse(match[1]) as Record<string, unknown>;
            new MetadataPreviewModal(this.app, formattedFrontmatter, (previewResult) => {
              if (previewResult.confirmed && previewResult.editedFrontmatter) {
                const ordered = this.orderFrontmatterFields(previewResult.editedFrontmatter);
                const doc = new YamlDocument(ordered);
                for (const key of ['tags', 'categories']) {
                  if (key in ordered && Array.isArray(ordered[key])) {
                    const node = doc.get(key, true) as import('yaml').YAMLSeq;
                    if (node) node.flow = true;
                  }
                }
                const newYaml = doc.toString({ lineWidth: 0 }).trim();
                const newContent = result.content!.replace(/^---\s*\n[\s\S]*?\n---/, `---\n${newYaml}\n---`);
                this.applyFormatResult(editor, newContent, cursor);
                showNotice('格式化完成');
              } else {
                showNotice('格式化已取消');
              }
            }).open();
          } catch {
            this.applyFormatResult(editor, result.content, cursor);
            showNotice(`格式化完成，应用了 ${result.stats?.rulesApplied || 0} 条规则`);
          }
        } else {
          this.applyFormatResult(editor, result.content, cursor);
          showNotice(`格式化完成，应用了 ${result.stats?.rulesApplied || 0} 条规则`);
        }
      } else {
        this.applyFormatResult(editor, result.content, cursor);
        showNotice(`格式化完成，应用了 ${result.stats?.rulesApplied || 0} 条规则`);
      }
    } else {
      showNotice(`格式化失败: ${result.error || '未知错误'}`);
    }
  }

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

  private orderFrontmatterFields(fm: Record<string, unknown>): Record<string, unknown> {
    const orderedKeys = ['title', 'created', 'updated', 'categories', 'tags'];
    const knownKeys = new Set([...orderedKeys, 'summary']);
    const otherKeys = Object.keys(fm).filter(k => !knownKeys.has(k));

    const result: Record<string, unknown> = {};
    for (const key of orderedKeys) {
      if (key in fm) result[key] = fm[key];
    }
    for (const key of otherKeys) {
      result[key] = fm[key];
    }
    if ('summary' in fm) result['summary'] = fm['summary'];

    return result;
  }

  /**
   * 格式化选中内容
   */
  private async formatSelection(editor: Editor): Promise<void> {
    const selection = editor.getSelection();
    if (!selection) {
      showNotice('请先选择要格式化的内容');
      return;
    }

    showNotice('正在格式化选中内容...');

    const result = await this.processor.processContent(selection, this.settings);

    if (result.success && result.content) {
      editor.replaceSelection(result.content);
      showNotice('格式化完成');
    } else {
      showNotice(`格式化失败: ${result.error || '未知错误'}`);
    }
  }

  /**
   * 批量格式化文件夹
   */
  private async formatFolder(): Promise<void> {
    // 简化实现：格式化所有打开的Markdown文件
    const mdFiles = this.app.vault.getMarkdownFiles();
    let processed = 0;
    let failed = 0;

    showNotice('开始批量格式化...');

    for (const file of mdFiles) {
      try {
        const content = await this.app.vault.read(file);
        const stat = await this.app.vault.adapter.stat(file.path);
        const fileInfo = stat ? { ctime: stat.ctime, mtime: stat.mtime } : undefined;
        const result = await this.processor.processContent(content, this.settings, undefined, file.basename, fileInfo);

        if (result.success && result.content && result.content !== content) {
          await this.app.vault.modify(file, result.content);
          processed++;
        }
      } catch {
        failed++;
      }
    }

    showNotice(`批量格式化完成: ${processed} 个文件已更新, ${failed} 个失败`);
  }

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

  /**
   * 加载设置
   */
  async loadSettings(): Promise<void> {
    const data = await this.loadData();
    this.settings = { ...DEFAULT_SETTINGS, ...data };
  }

  /**
   * 保存设置
   */
  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
    this.formatter.setAIService(this.createAIService());
  }

  onunload() {
    // 清理资源
  }
}