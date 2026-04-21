// src/core/Formatter.ts
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import type { Node } from 'unist';
import type { FormatRule, PluginSettings, FormatResult, RuleConfig, AstNode } from '../types';
import { RuleRegistry } from './RuleRegistry';

/**
 * 格式化器核心
 * 负责解析Markdown、应用规则、生成格式化结果
 */
export class Formatter {
  constructor(private registry: RuleRegistry) {}

  async format(content: string, settings: PluginSettings): Promise<FormatResult> {
    try {
      // 使用 unified 处理器
      const processor = unified().use(remarkParse).use(remarkStringify);
      const ast = processor.parse(content);

      const enabledRules = this.getEnabledRules(settings.rules);

      let transformedAst: Node = ast;
      let rulesApplied = 0;

      for (const rule of enabledRules) {
        const ruleConfig = settings.rules[rule.name] || { enabled: true };
        transformedAst = rule.apply(transformedAst as unknown as AstNode, ruleConfig) as unknown as Node;
        rulesApplied++;
      }

      const result = processor.stringify(transformedAst as never);

      return {
        success: true,
        content: String(result),
        stats: {
          rulesApplied,
          changesMade: 0,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private getEnabledRules(ruleSettings: Record<string, RuleConfig>): FormatRule[] {
    const allRules = this.registry.getAll();
    return allRules.filter((rule) => {
      const config = ruleSettings[rule.name];
      return config?.enabled !== false;
    });
  }
}
