// src/rules/FrontmatterRule.ts
import type { FormatRule, RuleConfig, AstNode } from '../types';

/**
 * Frontmatter 格式化规则
 * 确保 YAML frontmatter 使用 --- 标记
 * remark-parse 和 remark-stringify 已正确处理 YAML frontmatter，
 * 此规则主要用于确保 frontmatter 存在时的格式一致性
 */
export class FrontmatterRule implements FormatRule {
  name = 'frontmatter';
  priority = 5;  // 最高优先级，最先处理
  description = '确保 YAML frontmatter 使用 --- 标记';

  defaultConfig = {
    enabled: true,
  };

  apply(ast: AstNode, config: RuleConfig): AstNode {
    // remark 解析 frontmatter 时生成 type: 'yaml' 的节点
    // remark-stringify 默认使用 --- 作为 YAML 节点的边界标记
    // 无需额外处理，直接返回 AST
    if (config.enabled === false) {
      return ast;
    }

    return ast;
  }
}