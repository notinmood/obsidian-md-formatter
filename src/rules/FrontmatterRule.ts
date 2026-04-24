import { parse, stringify } from 'yaml';
import type { FormatRule, RuleConfig, AstNode, FileInfo, AIService } from '../types';

/**
 * Frontmatter 格式化规则
 * 确保 YAML frontmatter 使用 --- 标记，规范化字段名，处理时间字段和时间标签，支持 AI 元数据
 */
export class FrontmatterRule implements FormatRule {
  name = 'frontmatter';
  priority = 5;  // 最高优先级，最先处理
  description = '处理 frontmatter：字段规范化、时间字段、时间标签、AI 元数据';

  defaultConfig = {
    enabled: true,
    // 字段名规范化配置
    normalizeFields: true,
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

  async apply(ast: AstNode, config: RuleConfig, filename?: string, fileInfo?: FileInfo, aiService?: AIService): Promise<AstNode> {
    const cfg = { ...this.defaultConfig, ...config };

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
          for (const [oldName, newName] of Object.entries(this.fieldRenameMap)) {
            if (oldName in yamlContent && !(newName in yamlContent)) {
              yamlContent[newName] = yamlContent[oldName];
              delete yamlContent[oldName];
            }
          }
        }

        // 2. created 字段：缺失时从 fileInfo.ctime 生成
        let createdDate: string | null = null;
        if (!('created' in yamlContent) && fileInfo) {
          createdDate = this.formatDate(fileInfo.ctime);
          yamlContent.created = createdDate;
        } else if ('created' in yamlContent) {
          createdDate = String(yamlContent.created);
        }

        // 3. updated 字段：每次格式化都更新为当前时间
        if (createdDate) {
          yamlContent.updated = this.formatDate(Date.now());
        }

        // 4. 时间标签（确定性逻辑，始终确保 Year/Month 存在）
        if (createdDate) {
          const dateInfo = this.extractDateInfo(createdDate);
          const yearTag = `Year/${dateInfo.year}`;
          const monthTag = `Month/${dateInfo.month}`;

          const existingTags = this.normalizeTags(yamlContent.tags);
          const hasYear = existingTags.some(t => t === yearTag);
          const hasMonth = existingTags.some(t => t === monthTag);

          if (!hasYear) existingTags.push(yearTag);
          if (!hasMonth) existingTags.push(monthTag);

          // 5. AI 逻辑
          if (aiService) {
            const bodyContent = this.extractBody(clonedAst);
            const aiResult = await aiService.generateMetadata(bodyContent, createdDate, existingTags);

            if (aiResult) {
              // AI 可用：覆盖 tags = 时间标签 + AI 标签
              yamlContent.tags = [yearTag, monthTag, ...aiResult.tags];

              // summary：已有则不覆盖
              if (!('summary' in yamlContent) || !yamlContent.summary) {
                yamlContent.summary = aiResult.summary;
              }

              // categories：覆盖
              yamlContent.categories = aiResult.categories;
            } else {
              // AI 调用失败：不改动其他 tags，只确保时间标签存在
              yamlContent.tags = existingTags;
            }
          } else {
            // AI 未配置：不改动其他 tags，只确保时间标签存在
            yamlContent.tags = existingTags;
          }
        }

        // 6. 如果没有 title，用 filename 填充
        if (!('title' in yamlContent) && filename) {
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