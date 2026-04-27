// src/ui/SettingsTab.ts
import { App, PluginSettingTab, Setting } from 'obsidian';
import type { PluginSettings, RuleConfig, AIProviderConfig } from '../types';
import { DEFAULT_SETTINGS, DEFAULT_SUBRULES } from '../types';
import type MarkdownFormatterPlugin from '../main';

const COLLAPSIBLE_STYLES = `
  .md-formatter-collapsible { margin-bottom: 8px; }
  .md-formatter-collapsible > summary {
    cursor: pointer; list-style: none;
    display: flex; align-items: center; gap: 8px;
    margin-bottom: 4px; padding: 4px 8px; border-radius: 4px;
    background: var(--background-secondary);
  }
  .md-formatter-collapsible > summary .title { font-weight: 500; }
  .md-formatter-collapsible > summary .desc {
    font-size: 12px; color: var(--text-muted); margin-left: auto;
  }
  .md-formatter-collapsible-content {
    padding-left: 24px;
    border-left: 2px solid var(--background-modifier-border);
    margin-top: 4px;
  }
  .md-formatter-provider-header {
    display: flex; align-items: center; gap: 8px;
  }
  .md-formatter-provider-header .badge {
    font-size: 11px; color: var(--text-on-accent); background: var(--interactive-accent);
    padding: 1px 6px; border-radius: 3px;
  }
  .md-formatter-provider-actions {
    margin-left: auto; display: flex; gap: 4px;
  }
`;

let stylesInjected = false;

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

    if (!stylesInjected) {
      const style = document.createElement('style');
      style.textContent = COLLAPSIBLE_STYLES;
      document.head.appendChild(style);
      stylesInjected = true;
    }

    this.renderFileSettings(containerEl);
    this.renderEncodingSettings(containerEl);
    this.renderAISettings(containerEl);
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

    this.renderFrontmatterRuleSettings(containerEl);

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

  private renderFrontmatterRuleSettings(containerEl: HTMLElement): void {
    const rule = this.getOrCreateFrontmatterRule();
    const subRules = (rule as Record<string, unknown>).subRules as Record<string, unknown> || DEFAULT_SUBRULES;

    const mainEnabled = rule.enabled !== false;
    new Setting(containerEl)
      .setName('Frontmatter 格式化')
      .setDesc('处理 frontmatter 各字段')
      .addToggle((toggle) =>
        toggle
          .setValue(mainEnabled)
          .onChange(async (value) => {
            this.getOrCreateFrontmatterRule().enabled = value;
            await this.plugin.saveSettings();
            this.display();
          })
      );

    if (!mainEnabled) return;

    const getSubVal = (path: string, fallback: boolean): boolean => {
      const keys = path.split('.');
      let obj: unknown = subRules;
      for (const k of keys) {
        if (obj && typeof obj === 'object' && k in obj) {
          obj = (obj as Record<string, unknown>)[k];
        } else {
          return fallback;
        }
      }
      return typeof obj === 'boolean' ? obj : fallback;
    };

    // 字段规范化
    this.renderCollapsibleSetting(containerEl, '字段规范化', 'create→created, update→updated, tag→tags', rule, [
      { name: '启用字段规范化', key: 'normalizeFields', desc: '自动转换字段名', value: (rule as Record<string, unknown>).normalizeFields !== false }
    ]);

    // created
    this.renderCollapsibleSetting(containerEl, 'created 时间', '缺失时自动填充', subRules, [
      { name: '使用文件创建时间', key: 'created.useFileCtime', desc: '缺失 created 时使用文件创建时间填充', value: getSubVal('created.useFileCtime', true) }
    ]);

    // updated
    this.renderCollapsibleSetting(containerEl, 'updated 时间', '每次格式化更新为当前时间', subRules, [
      { name: '启用 updated 更新', key: 'updated.enabled', desc: '每次格式化时更新 updated 为当前时间', value: getSubVal('updated.enabled', true) }
    ]);

    // ai-formatted
    const aiFormattedItems: { name: string; key: string; desc: string; value: boolean }[] = [
      { name: '启用 ai-formatted 字段', key: 'aiFormatted.enabled', desc: 'AI 格式化后写入 ai-formatted 时间标记', value: getSubVal('aiFormatted.enabled', true) },
      { name: '已有值时跳过 AI 调用', key: 'aiFormatted.skipAiIfPresent', desc: '已有 ai-formatted 时间值时跳过 AI 调用，节省 AI 用量', value: getSubVal('aiFormatted.skipAiIfPresent', true) },
    ];
    this.renderCollapsibleSetting(containerEl, 'AI 格式化标记 (ai-formatted)', '标记 AI 格式化时间，避免重复调用', subRules, aiFormattedItems);

    // tags
    const tagsItems: { name: string; key: string; desc: string; value: boolean }[] = [
      { name: '确保时间标签', key: 'tags.ensureTimeTags', desc: '自动添加 Year/Month 标签', value: getSubVal('tags.ensureTimeTags', true) },
    ];
    if (this.plugin.settings.aiFrontmatter.enabled) {
      tagsItems.push({ name: 'AI 生成标签', key: 'tags.ai.enabled', desc: '使用 AI 生成内容相关标签', value: getSubVal('tags.ai.enabled', true) });
    }
    this.renderCollapsibleSetting(containerEl, '标签 (tags)', '处理标签字段', subRules, tagsItems);

    // summary
    if (this.plugin.settings.aiFrontmatter.enabled) {
      this.renderCollapsibleSetting(containerEl, '摘要 (summary)', '处理摘要字段', subRules, [
        { name: 'AI 生成摘要', key: 'summary.ai.enabled', desc: '使用 AI 生成摘要（已有摘要不会被覆盖）', value: getSubVal('summary.ai.enabled', true) }
      ]);
    }

    // categories
    if (this.plugin.settings.aiFrontmatter.enabled) {
      this.renderCollapsibleSetting(containerEl, '分类 (categories)', '处理分类字段', subRules, [
        { name: 'AI 生成分类', key: 'categories.ai.enabled', desc: '使用 AI 生成分类（categories 完全由 AI 生成）', value: getSubVal('categories.ai.enabled', true) }
      ]);
    }

    // title
    this.renderCollapsibleSetting(containerEl, '标题 (title)', '处理标题字段', subRules, [
      { name: '使用文件名作为标题', key: 'title.useFilename', desc: '缺失 title 时用文件名填充', value: getSubVal('title.useFilename', true) }
    ]);
  }

  private renderCollapsibleSetting(
    containerEl: HTMLElement,
    title: string,
    desc: string,
    config: Record<string, unknown>,
    subItems: { name: string; key: string; desc: string; value: boolean }[]
  ): void {
    const details = document.createElement('details');
    details.addClass('md-formatter-collapsible');

    const summary = document.createElement('summary');

    const titleSpan = document.createElement('span');
    titleSpan.addClass('title');
    titleSpan.textContent = title;
    summary.appendChild(titleSpan);

    const descSpan = document.createElement('span');
    descSpan.addClass('desc');
    descSpan.textContent = desc;
    summary.appendChild(descSpan);

    details.appendChild(summary);

    const content = document.createElement('div');
    content.addClass('md-formatter-collapsible-content');

    for (const item of subItems) {
      const setting = new Setting(content);
      setting.setName(item.name);
      setting.setDesc(item.desc);
      setting.addToggle((toggle) =>
        toggle
          .setValue(item.value)
          .onChange(async (value) => {
            this.setNestedValue(config, item.key, value);
            await this.plugin.saveSettings();
          })
      );
    }

    if (subItems.length > 0) {
      details.appendChild(content);
    }

    summary.addEventListener('click', (e) => {
      e.preventDefault();
      details.open = !details.open;
    });

    containerEl.appendChild(details);
  }

  private setNestedValue(obj: Record<string, unknown>, key: string, value: unknown): void {
    const keys = key.split('.');
    let current: Record<string, unknown> = obj;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]] || typeof current[keys[i]] !== 'object') {
        current[keys[i]] = {};
      }
      current = current[keys[i]] as Record<string, unknown>;
    }
    current[keys[keys.length - 1]] = value;
  }

  private getOrCreateFrontmatterRule(): RuleConfig {
    if (!this.plugin.settings.rules['frontmatter']) {
      this.plugin.settings.rules['frontmatter'] = {
        enabled: true,
        normalizeFields: true,
        subRules: { ...DEFAULT_SUBRULES },
      };
    }
    return this.plugin.settings.rules['frontmatter']!;
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
      .setName('AI 设置')
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

    // 提供商列表（每个为折叠面板）
    const providers = this.plugin.settings.aiFrontmatter.providers;
    for (let i = 0; i < providers.length; i++) {
      this.renderProviderItem(containerEl, providers[i], i);
    }

    // 添加提供商按钮
    new Setting(containerEl)
      .setName('添加提供商')
      .setDesc('添加新的 AI 提供商配置')
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

    const details = document.createElement('details');
    details.addClass('md-formatter-collapsible');

    const summary = document.createElement('summary');

    // 名称
    const titleSpan = document.createElement('span');
    titleSpan.addClass('title');
    titleSpan.textContent = provider.name || '未命名提供商';
    summary.appendChild(titleSpan);

    // "默认" 标记
    if (isDefault) {
      const badge = document.createElement('span');
      badge.addClass('badge');
      badge.textContent = '默认';
      summary.appendChild(badge);
    }

    // 操作按钮区域
    const actions = document.createElement('span');
    actions.addClass('md-formatter-provider-actions');

    const upBtn = document.createElement('button');
    upBtn.textContent = '↑';
    upBtn.disabled = index === 0;
    upBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      [providers[index], providers[index - 1]] = [providers[index - 1], providers[index]];
      this.plugin.saveSettings().then(() => this.display());
    });
    actions.appendChild(upBtn);

    const downBtn = document.createElement('button');
    downBtn.textContent = '↓';
    downBtn.disabled = index === providers.length - 1;
    downBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      [providers[index], providers[index + 1]] = [providers[index + 1], providers[index]];
      this.plugin.saveSettings().then(() => this.display());
    });
    actions.appendChild(downBtn);

    const delBtn = document.createElement('button');
    delBtn.textContent = '删除';
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      providers.splice(index, 1);
      this.plugin.saveSettings().then(() => this.display());
    });
    actions.appendChild(delBtn);

    summary.appendChild(actions);
    details.appendChild(summary);

    // 折叠内容：提供商配置字段
    const content = document.createElement('div');
    content.addClass('md-formatter-collapsible-content');

    new Setting(content)
      .setName('提供商名称')
      .addText((text) =>
        text
          .setValue(provider.name)
          .onChange(async (value) => {
            provider.name = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(content)
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

    new Setting(content)
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

    new Setting(content)
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

    new Setting(content)
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

    new Setting(content)
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

    details.appendChild(content);

    summary.addEventListener('click', (e) => {
      e.preventDefault();
      details.open = !details.open;
    });

    containerEl.appendChild(details);
  }
}
