// src/rules/FrontmatterRule.ts
import { parse, stringify } from 'yaml';
import type { FormatRule, RuleConfig, AstNode } from '../types';

/**
 * Frontmatter 格式化规则
 * 确保 YAML frontmatter 使用 --- 标记，规范化字段名
 */
export class FrontmatterRule implements FormatRule {
  name = 'frontmatter';
  priority = 5;  // 最高优先级，最先处理
  description = '确保 YAML frontmatter 使用 --- 标记，规范化字段名';

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

  apply(ast: AstNode, config: RuleConfig, filename?: string): AstNode {
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

    if (!yamlNode || !yamlNode.value) {
      return clonedAst;
    }

    try {
      // 解析 YAML 内容
      const yamlContent = parse(yamlNode.value as string) as Record<string, unknown>;

      if (yamlContent && typeof yamlContent === 'object') {
        // 字段名规范化
        if (cfg.normalizeFields) {
          for (const [oldName, newName] of Object.entries(this.fieldRenameMap)) {
            if (oldName in yamlContent && !(newName in yamlContent)) {
              yamlContent[newName] = yamlContent[oldName];
              delete yamlContent[oldName];
            }
          }
        }

        // 如果没有 title 字段，使用文件名作为 title
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
}