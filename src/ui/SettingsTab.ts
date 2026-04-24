// src/ui/SettingsTab.ts
import { App, PluginSettingTab, Setting } from 'obsidian';
import type { PluginSettings, RuleConfig, AIProviderConfig } from '../types';
import { DEFAULT_SETTINGS } from '../types';
import type MarkdownFormatterPlugin from '../main';

/**
 * Obsidian设置面板
 */
export class SettingsTab extends PluginSettingTab {
  constructor(
    app: App,
    private plugin: MarkdownFormatterPlugin
  ) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.addClass('md-formatter-settings');

    // 文件处理设置
    this.renderFileSettings(containerEl);

    // 编码设置
    this.renderEncodingSettings(containerEl);

    // AI 设置
    this.renderAISettings(containerEl);

    // 规则配置
    this.renderRuleSettings(containerEl);
  }

  private renderFileSettings(containerEl: HTMLElement): void {
    new Setting(containerEl)
      .setName('文件处理')
      .setHeading();

    new Setting(containerEl)
      .setName('大文件阈值 (KB)')
      .setDesc('超过此大小的文件将进行分块处理')
      .addText((text) =>
        text
          .setValue(String(this.plugin.settings.fileSizeThreshold))
          .onChange(async (value) => {
            this.plugin.settings.fileSizeThreshold = parseInt(value) || 500;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('分块大小 (KB)')
      .setDesc('每个分块的最大大小')
      .addText((text) =>
        text
          .setValue(String(this.plugin.settings.chunkSize))
          .onChange(async (value) => {
            this.plugin.settings.chunkSize = parseInt(value) || 100;
            await this.plugin.saveSettings();
          })
      );
  }

  private renderEncodingSettings(containerEl: HTMLElement): void {
    new Setting(containerEl)
      .setName('编码设置')
      .setHeading();

    new Setting(containerEl)
      .setName('自动检测编码')
      .setDesc('尝试自动检测文件编码')
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.autoDetectEncoding)
          .onChange(async (value) => {
            this.plugin.settings.autoDetectEncoding = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('回退编码')
      .setDesc('编码检测失败时使用的默认编码')
      .addDropdown((dropdown) =>
        dropdown
          .addOption('utf-8', 'UTF-8')
          .addOption('gbk', 'GBK')
          .addOption('gb2312', 'GB2312')
          .addOption('big5', 'BIG5')
          .setValue(this.plugin.settings.fallbackEncoding)
          .onChange(async (value) => {
            this.plugin.settings.fallbackEncoding = value;
            await this.plugin.saveSettings();
          })
      );
  }

  private renderRuleSettings(containerEl: HTMLElement): void {
    new Setting(containerEl)
      .setName('规则配置')
      .setHeading();

    const rules = [
      { name: 'frontmatter', label: 'Frontmatter 格式化' },
      { name: 'headingStructure', label: '标题层级结构' },
      { name: 'heading', label: '标题规范化' },
      { name: 'paragraph', label: '段落格式化' },
      { name: 'list', label: '列表格式化' },
      { name: 'codeBlock', label: '代码块处理' },
      { name: 'table', label: '表格格式化' },
      { name: 'link', label: '链接/图片' },
    ];

    for (const rule of rules) {
      this.renderRuleToggle(containerEl, rule.name, rule.label);
    }

    // 重置按钮
    new Setting(containerEl)
      .addButton((btn) =>
        btn
          .setButtonText('重置为默认')
          .onClick(async () => {
            this.plugin.settings = { ...DEFAULT_SETTINGS };
            await this.plugin.saveSettings();
            this.display();
          })
      );
  }

  private renderRuleToggle(containerEl: HTMLElement, ruleName: string, label: string): void {
    const ruleConfig = this.plugin.settings.rules[ruleName] || { enabled: true };

    new Setting(containerEl)
      .setName(label)
      .addToggle((toggle) =>
        toggle
          .setValue(ruleConfig.enabled !== false)
          .onChange(async (value) => {
            if (!this.plugin.settings.rules[ruleName]) {
              this.plugin.settings.rules[ruleName] = { enabled: value };
            } else {
              this.plugin.settings.rules[ruleName].enabled = value;
            }
            await this.plugin.saveSettings();
          })
      );
  }

  private renderAISettings(containerEl: HTMLElement): void {
    new Setting(containerEl)
      .setName('AI Frontmatter 设置')
      .setHeading();

    new Setting(containerEl)
      .setName('启用 AI Frontmatter')
      .setDesc('使用 AI 自动生成 frontmatter 标签、摘要和分类')
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.aiFrontmatter.enabled)
          .onChange(async (value) => {
            this.plugin.settings.aiFrontmatter.enabled = value;
            await this.plugin.saveSettings();
            this.display();
          })
      );

    if (!this.plugin.settings.aiFrontmatter.enabled) {
      return;
    }

    // 提供商管理区域
    new Setting(containerEl)
      .setName('AI 提供商配置')
      .setHeading();

    const providers = this.plugin.settings.aiFrontmatter.providers;
    for (let i = 0; i < providers.length; i++) {
      this.renderProviderItem(containerEl, providers[i], i);
    }

    // 添加提供商按钮
    new Setting(containerEl)
      .setName('添加提供商')
      .addButton((btn) =>
        btn
          .setButtonText('+ 添加')
          .onClick(async () => {
            this.plugin.settings.aiFrontmatter.providers.push({
              name: '新提供商',
              baseUrl: '',
              apiKey: '',
              model: '',
              temperature: 0.7,
              maxTokens: 1000,
            });
            await this.plugin.saveSettings();
            this.display();
          })
      );

    // 标签数量上限
    new Setting(containerEl)
      .setName('标签数量上限')
      .setDesc('AI 生成标签的最大数量')
      .addText((text) =>
        text
          .setValue(String(this.plugin.settings.aiFrontmatter.maxTags))
          .onChange(async (value) => {
            this.plugin.settings.aiFrontmatter.maxTags = parseInt(value) || 5;
            await this.plugin.saveSettings();
          })
      );

    // 分类数量上限
    new Setting(containerEl)
      .setName('分类数量上限')
      .setDesc('AI 生成分类的最大数量')
      .addText((text) =>
        text
          .setValue(String(this.plugin.settings.aiFrontmatter.maxCategories))
          .onChange(async (value) => {
            this.plugin.settings.aiFrontmatter.maxCategories = parseInt(value) || 3;
            await this.plugin.saveSettings();
          })
      );

    // 自定义提示词补充
    new Setting(containerEl)
      .setName('自定义提示词补充')
      .setDesc('附加到 AI 提示词末尾的自定义内容，用于微调生成结果')
      .addTextArea((text) =>
        text
          .setValue(this.plugin.settings.aiFrontmatter.customPrompt)
          .setPlaceholder('例如：请优先使用技术术语作为标签...')
          .onChange(async (value) => {
            this.plugin.settings.aiFrontmatter.customPrompt = value;
            await this.plugin.saveSettings();
          })
      );
  }

  private renderProviderItem(containerEl: HTMLElement, provider: AIProviderConfig, index: number): void {
    const providers = this.plugin.settings.aiFrontmatter.providers;
    const isDefault = index === 0;
    const displayName = isDefault ? `${provider.name} (默认)` : provider.name;

    // 提供商标题行：名称 + 操作按钮
    new Setting(containerEl)
      .setName(displayName)
      .addButton((btn) =>
        btn
          .setButtonText('↑')
          .setDisabled(index === 0)
          .onClick(async () => {
            // 与上一个交换
            [providers[index], providers[index - 1]] = [providers[index - 1], providers[index]];
            await this.plugin.saveSettings();
            this.display();
          })
      )
      .addButton((btn) =>
        btn
          .setButtonText('↓')
          .setDisabled(index === providers.length - 1)
          .onClick(async () => {
            // 与下一个交换
            [providers[index], providers[index + 1]] = [providers[index + 1], providers[index]];
            await this.plugin.saveSettings();
            this.display();
          })
      )
      .addButton((btn) =>
        btn
          .setButtonText('删除')
          .onClick(async () => {
            providers.splice(index, 1);
            await this.plugin.saveSettings();
            this.display();
          })
      );

    // 提供商名称
    new Setting(containerEl)
      .setName('提供商名称')
      .addText((text) =>
        text
          .setValue(provider.name)
          .onChange(async (value) => {
            provider.name = value;
            await this.plugin.saveSettings();
          })
      );

    // Base URL
    new Setting(containerEl)
      .setName('API 地址 (Base URL)')
      .setDesc('AI 服务的基础 URL，例如 https://api.openai.com/v1')
      .addText((text) =>
        text
          .setValue(provider.baseUrl)
          .setPlaceholder('https://api.openai.com/v1')
          .onChange(async (value) => {
            provider.baseUrl = value;
            await this.plugin.saveSettings();
          })
      );

    // API Key
    new Setting(containerEl)
      .setName('API Key')
      .setDesc('AI 服务的认证密钥')
      .addText((text) =>
        text
          .setValue(provider.apiKey)
          .setPlaceholder('sk-...')
          .onChange(async (value) => {
            provider.apiKey = value;
            await this.plugin.saveSettings();
          })
      );

    // Model
    new Setting(containerEl)
      .setName('模型名称')
      .setDesc('使用的 AI 模型，例如 gpt-4o-mini')
      .addText((text) =>
        text
          .setValue(provider.model)
          .setPlaceholder('gpt-4o-mini')
          .onChange(async (value) => {
            provider.model = value;
            await this.plugin.saveSettings();
          })
      );

    // Temperature
    new Setting(containerEl)
      .setName('Temperature')
      .setDesc('生成温度 (0-2)，越高越随机')
      .addText((text) =>
        text
          .setValue(String(provider.temperature))
          .onChange(async (value) => {
            provider.temperature = parseFloat(value) || 0.7;
            await this.plugin.saveSettings();
          })
      );

    // Max Tokens
    new Setting(containerEl)
      .setName('最大 Tokens')
      .setDesc('AI 生成的最大 token 数量')
      .addText((text) =>
        text
          .setValue(String(provider.maxTokens))
          .onChange(async (value) => {
            provider.maxTokens = parseInt(value) || 1000;
            await this.plugin.saveSettings();
          })
      );
  }
}