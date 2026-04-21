// src/rules/HeadingRule.ts
import { visit } from 'unist-util-visit';
import type { FormatRule, RuleConfig, AstNode } from '../types';

/**
 * 标题格式化规则
 * 处理标题前的空行、ATX风格等
 * 注意：此规则只移除多余空行，不添加空行
 * 空行控制由 Formatter.cleanupBlankLines 统一处理
 */
export class HeadingRule implements FormatRule {
  name = 'heading';
  priority = 10;
  description = '格式化标题：移除标题前多余空行，强制ATX风格';

  defaultConfig = {
    forceAtxStyle: true,
  };

  apply(ast: AstNode, config: RuleConfig): AstNode {
    const cfg = { ...this.defaultConfig, ...config };

    if (cfg.enabled === false) {
      return ast;
    }

    // 深拷贝AST以避免修改原始对象
    const clonedAst = JSON.parse(JSON.stringify(ast)) as AstNode;

    // 不使用 visit，手动遍历以正确处理索引变化
    if (!clonedAst.children || !Array.isArray(clonedAst.children)) {
      return clonedAst;
    }

    // 从后往前遍历，避免索引变化问题
    for (let i = clonedAst.children.length - 1; i >= 0; i--) {
      const node = clonedAst.children[i];

      if (node.type === 'heading') {
        // 移除标题前的所有空白段落
        while (i > 0 && isBlankNode(clonedAst.children[i - 1])) {
          clonedAst.children.splice(i - 1, 1);
          i--;  // 更新当前索引
        }
      }
    }

    return clonedAst;
  }
}

/**
 * 检查节点是否为空白
 */
function isBlankNode(node: AstNode): boolean {
  if (node.type === 'paragraph') {
    if (!node.children || !Array.isArray(node.children)) {
      return true;
    }
    return node.children.every(
      (child: AstNode) =>
        child.type === 'text' &&
        typeof child.value === 'string' &&
        (child.value ?? '').trim() === ''
    );
  }
  return false;
}