// src/rules/CodeBlockRule.ts
import type { Node } from 'unist';
import { visit } from 'unist-util-visit';
import type { FormatRule, RuleConfig } from '../types';

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

  apply(ast: Node, config: RuleConfig): Node {
    const cfg = { ...this.defaultConfig, ...config };

    // 深拷贝AST以避免修改原始对象
    const clonedAst = JSON.parse(JSON.stringify(ast));

    visit(clonedAst, 'code', (node: Node, index: number | undefined, parent: Node | undefined) => {
      if (index === undefined || !parent || !parent.children) {
        return;
      }

      const codeNode = node as {
        lang?: string;
        meta?: string;
        value?: string;
      };

      // 自动补全语言标识
      if (cfg.addLanguageHint && !codeNode.lang) {
        codeNode.lang = '';
      }

      // 确保代码块前有正确数量的空行
      this.ensureBlankLinesBefore(parent, index, cfg.blankLinesBefore);
    });

    return clonedAst;
  }

  /**
   * 确保节点前有指定数量的空行
   */
  private ensureBlankLinesBefore(parent: Node, index: number, blankLines: number): void {
    const parentWithChildren = parent as { children: Node[] };
    if (!parentWithChildren.children) {
      return;
    }

    // 计算当前位置前的连续空白节点数
    let blankCount = 0;
    for (let i = index - 1; i >= 0; i--) {
      const sibling = parentWithChildren.children[i];
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
        parentWithChildren.children.splice(index, 0, createBlankParagraph());
      }
    }
  }
}

/**
 * 检查节点是否为空白
 */
function isBlankNode(node: Node): boolean {
  if (node.type === 'paragraph') {
    const paragraph = node as { children?: Node[] };
    if (!paragraph.children || paragraph.children.length === 0) {
      return true;
    }
    return paragraph.children.every(
      (child: Node) =>
        child.type === 'text' &&
        typeof (child as { value?: string }).value === 'string' &&
        (child as { value: string }).value.trim() === ''
    );
  }
  return false;
}

/**
 * 创建空白段落
 */
function createBlankParagraph(): Node {
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