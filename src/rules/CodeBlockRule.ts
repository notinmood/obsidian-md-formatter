// src/rules/CodeBlockRule.ts
import { visit } from 'unist-util-visit';
import type { FormatRule, RuleConfig, AstNode } from '../types';

/**
 * 代码块格式化规则
 * 处理代码块前后空行、语言标识等
 */
export class CodeBlockRule implements FormatRule {
  name = 'codeBlock';
  priority = 40;
  description = '格式化代码块：控制代码块前后空行，自动补全语言标识';

  defaultConfig = {
    blankLinesBefore: 1,
    blankLinesAfter: 1,
    addLanguageHint: true,
  };

  apply(ast: AstNode, config: RuleConfig): AstNode {
    const cfg = { ...this.defaultConfig, ...config };

    // 深拷贝AST以避免修改原始对象
    const clonedAst = JSON.parse(JSON.stringify(ast)) as AstNode;

    visit(clonedAst, 'code', (node: AstNode, index: number | undefined, parent: AstNode | undefined) => {
      if (index === undefined || !parent || !parent.children) {
        return;
      }

      // 自动补全语言标识
      if (cfg.addLanguageHint && !node.lang) {
        node.lang = '';
      }

      // 确保代码块前有正确数量的空行
      this.ensureBlankLinesBefore(parent, index, cfg.blankLinesBefore);
    });

    return clonedAst;
  }

  /**
   * 确保节点前有指定数量的空行
   */
  private ensureBlankLinesBefore(parent: AstNode, index: number, blankLines: number): void {
    if (!parent.children) {
      return;
    }

    // 计算当前位置前的连续空白节点数
    let blankCount = 0;
    for (let i = index - 1; i >= 0; i--) {
      const sibling = parent.children[i];
      if (isBlankNode(sibling)) {
        blankCount++;
      } else {
        break;
      }
    }

    // 如果空行数不足，在节点前插入空行
    if (blankCount < blankLines) {
      const toInsert = blankLines - blankCount;
      for (let i = 0; i < toInsert; i++) {
        parent.children.splice(index, 0, createBlankParagraph());
      }
    }
  }
}

/**
 * 检查节点是否为空白
 */
function isBlankNode(node: AstNode): boolean {
  if (node.type === 'paragraph') {
    if (!node.children || node.children.length === 0) {
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

/**
 * 创建空白段落
 */
function createBlankParagraph(): AstNode {
  return {
    type: 'paragraph',
    children: [
      {
        type: 'text',
        value: '',
      },
    ],
  };
}