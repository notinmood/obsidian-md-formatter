import { parse, stringify } from 'yaml';
import type {
  FormatRule,
  RuleConfig,
  AstNode,
  FileInfo,
  AIService,
  FrontmatterConfig,
  FrontmatterSubRules,
  AIMetadataResult,
} from '../types';
import { DEFAULT_SUBRULES } from '../types';

/**
 * Frontmatter 格式化规则
 * 支持子规则嵌套配置，每个子功能可独立开关
 */
export class FrontmatterRule implements FormatRule {
  name = 'frontmatter';
  priority = 5;  // 最高优先级，最先处理
  description = '处理 frontmatter：时间字段、标签、摘要、分类、标题';

  defaultConfig: FrontmatterConfig = {
    enabled: true,
    normalizeFields: true,
    subRules: { ...DEFAULT_SUBRULES },
  };

  /**
   * 需要重命名的字段映射
   */
  private fieldRenameMap: Record<string, string> = {
    create: 'created',
    update: 'updated',
    tag: 'tags',
  };

  private weekdayNames = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];

  async apply(
    ast: AstNode,
    config: RuleConfig,
    filename?: string,
    fileInfo?: FileInfo,
    aiService?: AIService
  ): Promise<AstNode> {
    const cfg = this.mergeConfig(config);

    if (cfg.enabled === false) {
      return ast;
    }

    // 深拷贝 AST
    const clonedAst = JSON.parse(JSON.stringify(ast)) as AstNode;

    if (!clonedAst.children || !Array.isArray(clonedAst.children)) {
      return clonedAst;
    }

    // 查找 YAML frontmatter 节点
    const yamlNode = clonedAst.children.find((child: AstNode) => child.type === 'yaml');

    if (!yamlNode) {
      return clonedAst;
    }

    try {
      // 解析 YAML 内容
      let yamlContent = parse(yamlNode.value as string) as Record<string, unknown>;

      if (yamlContent === null || yamlContent === undefined) {
        yamlContent = {};
      }

      if (typeof yamlContent === 'object') {
        // 1. 字段名规范化
        if (cfg.normalizeFields) {
          this.applyNormalizeFields(yamlContent);
        }

        // 2. 执行 created 子规则（获取日期并写入）
        const createdDate = this.applyCreated(yamlContent, cfg.subRules.created, fileInfo);

        // 3. 执行 updated 子规则
        if (cfg.subRules.updated.enabled && createdDate) {
          yamlContent.updated = this.formatDate(Date.now());
        }

        // 4. 一次性调用 AI，获取 tags/summary/categories
        const needAi = (cfg.subRules.tags.enabled && cfg.subRules.tags.ai.enabled)
          || (cfg.subRules.summary.enabled && cfg.subRules.summary.ai.enabled)
          || (cfg.subRules.categories.enabled && cfg.subRules.categories.ai.enabled);
        const aiResult = needAi && aiService
          ? await aiService.generateMetadata(
            this.extractBody(clonedAst),
            createdDate || '',
            this.normalizeTags(yamlContent.tags),
          )
          : null;

        // 5. 执行 tags 子规则
        if (cfg.subRules.tags.enabled && createdDate) {
          this.applyTags(yamlContent, createdDate, cfg.subRules.tags, aiResult);
        }

        // 6. 执行 summary 子规则
        if (cfg.subRules.summary.enabled) {
          this.applySummary(yamlContent, cfg.subRules.summary.ai, aiResult);
        }

        // 7. 执行 categories 子规则
        if (cfg.subRules.categories.enabled) {
          this.applyCategories(yamlContent, cfg.subRules.categories.ai, aiResult);
        }

        // 8. 执行 title 子规则
        if (cfg.subRules.title.enabled && !('title' in yamlContent) && filename && cfg.subRules.title.useFilename) {
          yamlContent.title = filename;
        }

        // 重新生成 YAML 字符串
        yamlNode.value = stringify(yamlContent, {
          lineWidth: 0,  // 不自动换行
          defaultStringType: 'PLAIN',
          defaultKeyType: 'PLAIN',
        }).trim();
      }
    } catch {
      // YAML 解析失败，保持原样
    }

    return clonedAst;
  }

  /**
   * 深合并配置：确保 subRules 嵌套对象正确合并，而非被覆盖
   */
  private mergeConfig(config: RuleConfig): FrontmatterConfig {
    const subRules: FrontmatterSubRules = JSON.parse(JSON.stringify(DEFAULT_SUBRULES));

    if (config.subRules && typeof config.subRules === 'object') {
      const incoming = config.subRules as unknown as Partial<FrontmatterSubRules>;
      for (const key of Object.keys(incoming) as (keyof FrontmatterSubRules)[]) {
        const val = incoming[key];
        if (val && typeof val === 'object') {
          (subRules as unknown as Record<string, unknown>)[key] = {
            ...(subRules[key] as object),
            ...(val as object),
          };
        }
      }
    }

    return {
      ...this.defaultConfig,
      ...config,
      normalizeFields: config.normalizeFields !== undefined
        ? Boolean(config.normalizeFields)
        : this.defaultConfig.normalizeFields,
      subRules,
    };
  }

  /**
   * 字段名规范化：create→created, update→updated, tag→tags
   */
  private applyNormalizeFields(yamlContent: Record<string, unknown>): void {
    for (const [oldName, newName] of Object.entries(this.fieldRenameMap)) {
      if (oldName in yamlContent && !(newName in yamlContent)) {
        yamlContent[newName] = yamlContent[oldName];
        delete yamlContent[oldName];
      }
    }
  }

  /**
   * 应用 created 子规则
   * @returns created 日期字符串或 null
   */
  private applyCreated(
    yamlContent: Record<string, unknown>,
    config: FrontmatterSubRules['created'],
    fileInfo?: FileInfo
  ): string | null {
    if (!config.enabled) {
      return null;
    }

    if ('created' in yamlContent) {
      return String(yamlContent.created);
    }

    if (config.useFileCtime && fileInfo) {
      const date = this.formatDate(fileInfo.ctime);
      yamlContent.created = date;
      return date;
    }

    return null;
  }

  /**
   * 应用 tags 子规则
   */
  private applyTags(
    yamlContent: Record<string, unknown>,
    createdDate: string,
    config: FrontmatterSubRules['tags'],
    aiResult: AIMetadataResult | null,
  ): void {
    const dateInfo = this.extractDateInfo(createdDate);
    const yearTag = `Year/${dateInfo.year}`;
    const monthTag = `Month/${dateInfo.month}`;

    let tags = this.normalizeTags(yamlContent.tags);

    // 确保时间标签（确定性逻辑）
    if (config.ensureTimeTags) {
      const hasYear = tags.some(t => t === yearTag);
      const hasMonth = tags.some(t => t === monthTag);
      if (!hasYear) tags.push(yearTag);
      if (!hasMonth) tags.push(monthTag);
    }

    // AI 生成标签
    if (config.ai.enabled && aiResult) {
      tags = [yearTag, monthTag, ...aiResult.tags];
    }

    yamlContent.tags = tags;
  }

  /**
   * 应用 summary 子规则
   */
  private applySummary(
    yamlContent: Record<string, unknown>,
    aiConfig: FrontmatterSubRules['summary']['ai'],
    aiResult: AIMetadataResult | null,
  ): void {
    // 已有 summary 则不覆盖
    if ('summary' in yamlContent && yamlContent.summary) {
      return;
    }

    if (aiConfig.enabled && aiResult) {
      yamlContent.summary = aiResult.summary;
    }
  }

  /**
   * 应用 categories 子规则
   */
  private applyCategories(
    yamlContent: Record<string, unknown>,
    aiConfig: FrontmatterSubRules['categories']['ai'],
    aiResult: AIMetadataResult | null,
  ): void {
    if (aiConfig.enabled && aiResult) {
      yamlContent.categories = aiResult.categories;
    }
  }

  private formatDate(timestamp: number): string {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const weekday = this.weekdayNames[date.getDay()];
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} ${weekday}`;
  }

  private extractDateInfo(dateStr: string): { year: string; month: string } {
    const match = dateStr.match(/(\d{4})-(\d{2})/);
    if (match) {
      return { year: match[1], month: match[2] };
    }
    const now = new Date();
    return {
      year: String(now.getFullYear()),
      month: String(now.getMonth() + 1).padStart(2, '0'),
    };
  }

  private normalizeTags(tags: unknown): string[] {
    if (Array.isArray(tags)) {
      return tags.map(t => String(t).trim()).filter(t => t.length > 0);
    }
    if (typeof tags === 'string') {
      return tags.split(/[,\s]+/).map(t => t.trim()).filter(t => t.length > 0);
    }
    return [];
  }

  private extractBody(ast: AstNode): string {
    if (!ast.children) return '';
    return ast.children
      .filter(child => child.type !== 'yaml')
      .map(child => {
        if (child.type === 'text' && child.value) return String(child.value);
        if (child.children) return child.children.map(c => c.value || '').join(' ');
        return '';
      })
      .join('\n');
  }
}