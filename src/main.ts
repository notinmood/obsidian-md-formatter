// src/main.ts
import { Plugin, Notice, TFile, Editor, MarkdownView } from 'obsidian';
import { DEFAULT_SETTINGS, PluginSettings } from './types';
import { RuleRegistry } from './core/RuleRegistry';
import { Formatter } from './core/Formatter';
import { FileProcessor } from './core/FileProcessor';
import { registerBuiltinRules } from './rules';
import { SettingsTab } from './ui/SettingsTab';
import { showNotice, createProgressCallback } from './utils/notice';

export default class MarkdownFormatterPlugin extends Plugin {
  settings: PluginSettings = DEFAULT_SETTINGS;
  private registry!: RuleRegistry;
  private formatter!: Formatter;
  private processor!: FileProcessor;

  async onload() {
    // 初始化核心组件
    this.registry = new RuleRegistry();
    registerBuiltinRules(this.registry);
    this.formatter = new Formatter(this.registry);
    this.processor = new FileProcessor(this.formatter);

    // 加载设置
    await this.loadSettings();

    // 注册命令
    this.registerCommands();

    // 注册设置面板
    this.addSettingTab(new SettingsTab(this.app, this));
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
        this.formatFolder();
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
    showNotice('正在格式化...');

    const progressCallback = this.processor.shouldChunkFile(content, this.settings)
      ? createProgressCallback()
      : undefined;

    const result = await this.processor.processContent(content, this.settings, progressCallback, file.basename);

    if (result.success && result.content) {
      editor.setValue(result.content);
      showNotice(`格式化完成，应用了 ${result.stats?.rulesApplied || 0} 条规则`);
    } else {
      showNotice(`格式化失败: ${result.error || '未知错误'}`);
    }
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
        const result = await this.processor.processContent(content, this.settings, undefined, file.basename);

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
  }

  onunload() {
    // 清理资源
  }
}