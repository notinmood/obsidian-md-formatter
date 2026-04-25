// src/ui/SettingsTab.ts
import { App, PluginSettingTab, Setting } from 'obsidian';
import type { PluginSettings, RuleConfig, AIProviderConfig, FrontmatterConfig } from '../types';
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

    // 特殊处理 frontmatter 规则（子规则嵌套）
    this.renderFrontmatterRuleSettings(containerEl);

    // 其他规则（基本开关）
    const otherRules = [
      { name: 'headingStructure', label: '标题层级结构' },
      { name: 'heading', label: '标题规范化' },
      { name: 'paragraph', label: '段落格式化' },
      { name: 'list', label: '列表格式化' },
      { name: 'codeBlock', label: '代码块处理' },
      { name: 'table', label: '表格格式化' },
      { name: 'link', label: '链接/图片' },
    ];

    for (const rule of otherRules) {
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

  /**
   * 渲染 frontmatter 规则的子规则设置
   */
  private renderFrontmatterRuleSettings(containerEl: HTMLElement): void {
    const frontmatterRule: any = this.plugin.settings.rules['frontmatter'] || {};
    let subRules: any;
    if (frontmatterRule.subRules && frontmatterRule.subRules.created) {
      subRules = frontmatterRule.subRules;
    } else {
      subRules = {
        created: { enabled: true, useFileCtime: true },
        updated: { enabled: true },
        tags: { enabled: true, ensureTimeTags: true, ai: { enabled: true } },
        summary: { enabled: true, ai: { enabled: true } },
        categories: { enabled: true, ai: { enabled: true } },
        title: { enabled: true, useFilename: true },
      };
    }

    // 主开关
    const mainEnabled = frontmatterRule.enabled !== false;
    new Setting(containerEl)
      .setName('Frontmatter 格式化')
      .setDesc('处理 frontmatter 各字段')
      .addToggle((toggle) =>
        toggle
          .setValue(mainEnabled)
          .onChange(async (value) => {
            if (!this.plugin.settings.rules['frontmatter']) {
              this.plugin.settings.rules['frontmatter'] = { enabled: value, subRules: {} };
            } else {
              this.plugin.settings.rules['frontmatter'].enabled = value;
            }
            await this.plugin.saveSettings();
            this.display();
          })
      );

    if (!mainEnabled) return;

    // 缩进层级
    const indent = (el: HTMLElement) => el.style.setProperty('padding-left', '20px');

    // 字段规范化
    const normalizeSetting = new Setting(containerEl);
    normalizeSetting.setName('字段规范化');
    normalizeSetting.setDesc('create→created, update→updated, tag→tags');
    normalizeSetting.settingEl.style.paddingLeft = '20px';
    normalizeSetting.addToggle((toggle) =>
      toggle
        .setValue(frontmatterRule.normalizeFields !== false)
        .onChange(async (value) => {
          this.ensureFrontmatterRule();
          (this.plugin.settings.rules['frontmatter'] as any).normalizeFields = value;
          await this.plugin.saveSettings();
        })
    );

    // created 子规则
    const createdSetting = new Setting(containerEl);
    createdSetting.setName('created 时间');
    createdSetting.setDesc('缺失时自动填充');
    createdSetting.settingEl.style.paddingLeft = '20px';
    createdSetting.addToggle((toggle) =>
      toggle
        .setValue((subRules as any).created?.enabled !== false)
        .onChange(async (value) => {
          this.ensureFrontmatterSubRules();
          (this.plugin.settings.rules['frontmatter'] as any).subRules.created.enabled = value;
          await this.plugin.saveSettings();
        })
    );

    // created.useFileCtime
    const createdUseFileCtimeSetting = new Setting(containerEl);
    createdUseFileCtimeSetting.setName('使用文件创建时间');
    createdUseFileCtimeSetting.setDesc('缺失 created 时使用文件创建时间填充');
    createdUseFileCtimeSetting.settingEl.style.paddingLeft = '40px';
    createdUseFileCtimeSetting.addToggle((toggle) =>
      toggle
        .setValue((subRules as any).created?.useFileCtime !== false)
        .onChange(async (value) => {
          this.ensureFrontmatterSubRules();
          (this.plugin.settings.rules['frontmatter'] as any).subRules.created.useFileCtime = value;
          await this.plugin.saveSettings();
        })
    );

    // updated 子规则
    const updatedSetting = new Setting(containerEl);
    updatedSetting.setName('updated 时间');
    updatedSetting.setDesc('每次格式化更新为当前时间');
    updatedSetting.settingEl.style.paddingLeft = '20px';
    updatedSetting.addToggle((toggle) =>
      toggle
        .setValue((subRules as any).updated?.enabled !== false)
        .onChange(async (value) => {
          this.ensureFrontmatterSubRules();
          (this.plugin.settings.rules['frontmatter'] as any).subRules.updated.enabled = value;
          await this.plugin.saveSettings();
        })
    );

    // tags 子规则
    const tagsSetting = new Setting(containerEl);
    tagsSetting.setName('标签 (tags)');
    tagsSetting.setDesc('处理标签字段');
    tagsSetting.settingEl.style.paddingLeft = '20px';
    tagsSetting.addToggle((toggle) =>
      toggle
        .setValue((subRules as any).tags?.enabled !== false)
        .onChange(async (value) => {
          this.ensureFrontmatterSubRules();
          (this.plugin.settings.rules['frontmatter'] as any).subRules.tags.enabled = value;
          await this.plugin.saveSettings();
        })
    );

    // tags.ensureTimeTags
    const tagsTimeTagsSetting = new Setting(containerEl);
    tagsTimeTagsSetting.setName('确保时间标签');
    tagsTimeTagsSetting.setDesc('自动添加 Year/Month 标签');
    tagsTimeTagsSetting.settingEl.style.paddingLeft = '40px';
    tagsTimeTagsSetting.addToggle((toggle) =>
      toggle
        .setValue((subRules as any).tags?.ensureTimeTags !== false)
        .onChange(async (value) => {
          this.ensureFrontmatterSubRules();
          (this.plugin.settings.rules['frontmatter'] as any).subRules.tags.ensureTimeTags = value;
          await this.plugin.saveSettings();
        })
    );

    // tags.ai.enabled (仅当 aiFrontmatter 启用时)
    if (this.plugin.settings.aiFrontmatter.enabled) {
      const tagsAiSetting = new Setting(containerEl);
      tagsAiSetting.setName('AI 生成标签');
      tagsAiSetting.setDesc('使用 AI 生成内容相关标签');
      tagsAiSetting.settingEl.style.paddingLeft = '40px';
      tagsAiSetting.addToggle((toggle) =>
        toggle
          .setValue((subRules as any).tags?.ai?.enabled !== false)
          .onChange(async (value) => {
            this.ensureFrontmatterSubRules();
            (this.plugin.settings.rules['frontmatter'] as any).subRules.tags.ai.enabled = value;
            await this.plugin.saveSettings();
          })
      );
    }

    // summary 子规则
    const summarySetting = new Setting(containerEl);
    summarySetting.setName('摘要 (summary)');
    summarySetting.setDesc('处理摘要字段');
    summarySetting.settingEl.style.paddingLeft = '20px';
    summarySetting.addToggle((toggle) =>
      toggle
        .setValue((subRules as any).summary?.enabled !== false)
        .onChange(async (value) => {
          this.ensureFrontmatterSubRules();
          (this.plugin.settings.rules['frontmatter'] as any).subRules.summary.enabled = value;
          await this.plugin.saveSettings();
        })
    );

    // summary.ai.enabled (仅当 aiFrontmatter 启用时)
    if (this.plugin.settings.aiFrontmatter.enabled) {
      const summaryAiSetting = new Setting(containerEl);
      summaryAiSetting.setName('AI 生成摘要');
      summaryAiSetting.setDesc('使用 AI 生成摘要（已有摘要不会被覆盖）');
      summaryAiSetting.settingEl.style.paddingLeft = '40px';
      summaryAiSetting.addToggle((toggle) =>
        toggle
          .setValue((subRules as any).summary?.ai?.enabled !== false)
          .onChange(async (value) => {
            this.ensureFrontmatterSubRules();
            (this.plugin.settings.rules['frontmatter'] as any).subRules.summary.ai.enabled = value;
            await this.plugin.saveSettings();
          })
      );
    }

    // categories 子规则
    const categoriesSetting = new Setting(containerEl);
    categoriesSetting.setName('分类 (categories)');
    categoriesSetting.setDesc('处理分类字段');
    categoriesSetting.settingEl.style.paddingLeft = '20px';
    categoriesSetting.addToggle((toggle) =>
      toggle
        .setValue((subRules as any).categories?.enabled !== false)
        .onChange(async (value) => {
          this.ensureFrontmatterSubRules();
          (this.plugin.settings.rules['frontmatter'] as any).subRules.categories.enabled = value;
          await this.plugin.saveSettings();
        })
    );

    // categories.ai.enabled (仅当 aiFrontmatter 启用时)
    if (this.plugin.settings.aiFrontmatter.enabled) {
      const categoriesAiSetting = new Setting(containerEl);
      categoriesAiSetting.setName('AI 生成分类');
      categoriesAiSetting.setDesc('使用 AI 生成分类');
      categoriesAiSetting.settingEl.style.paddingLeft = '40px';
      categoriesAiSetting.addToggle((toggle) =>
        toggle
          .setValue((subRules as any).categories?.ai?.enabled !== false)
          .onChange(async (value) => {
            this.ensureFrontmatterSubRules();
            (this.plugin.settings.rules['frontmatter'] as any).subRules.categories.ai.enabled = value;
            await this.plugin.saveSettings();
          })
      );
    }

    // title 子规则
    const titleSetting = new Setting(containerEl);
    titleSetting.setName('标题 (title)');
    titleSetting.setDesc('处理标题字段');
    titleSetting.settingEl.style.paddingLeft = '20px';
    titleSetting.addToggle((toggle) =>
      toggle
          .setValue((subRules as any).title?.enabled !== false)
          .onChange(async (value) => {
            this.ensureFrontmatterSubRules();
            (this.plugin.settings.rules['frontmatter'] as any).subRules.title.enabled = value;
            await this.plugin.saveSettings();
          })
      );

    // title.useFilename
    const titleUseFilenameSetting = new Setting(containerEl);
    titleUseFilenameSetting.setName('使用文件名作为标题');
    titleUseFilenameSetting.setDesc('缺失 title 时用文件名填充');
    titleUseFilenameSetting.settingEl.style.paddingLeft = '40px';
    titleUseFilenameSetting.addToggle((toggle) =>
      toggle
        .setValue((subRules as any).title?.useFilename !== false)
        .onChange(async (value) => {
          this.ensureFrontmatterSubRules();
          (this.plugin.settings.rules['frontmatter'] as any).subRules.title.useFilename = value;
          await this.plugin.saveSettings();
          })
      );
  }

  /**
   * 确保 frontmatter 规则的 subRules 结构存在
   */
  private ensureFrontmatterSubRules(): void {
    this.ensureFrontmatterRule();
    if (!this.plugin.settings.rules['frontmatter']!.subRules) {
      this.plugin.settings.rules['frontmatter']!.subRules = {
        created: { enabled: true, useFileCtime: true },
        updated: { enabled: true },
        tags: { enabled: true, ensureTimeTags: true, ai: { enabled: true } },
        summary: { enabled: true, ai: { enabled: true } },
        categories: { enabled: true, ai: { enabled: true } },
        title: { enabled: true, useFilename: true },
      };
    }
  }

  /**
   * 确保 frontmatter 规则配置存在
   */
  private ensureFrontmatterRule(): void {
    if (!this.plugin.settings.rules['frontmatter']) {
      this.plugin.settings.rules['frontmatter'] = {
        enabled: true,
        normalizeFields: true,
        subRules: {
          created: { enabled: true, useFileCtime: true },
          updated: { enabled: true },
          tags: { enabled: true, ensureTimeTags: true, ai: { enabled: true } },
          summary: { enabled: true, ai: { enabled: true } },
          categories: { enabled: true, ai: { enabled: true } },
          title: { enabled: true, useFilename: true },
        },
      } as any;
    }
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