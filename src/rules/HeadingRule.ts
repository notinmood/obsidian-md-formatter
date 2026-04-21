// src/rules/HeadingRule.ts
import type { Node } from 'unist';
import { visit } from 'unist-util-visit';
import type { FormatRule, RuleConfig } from '../types';

/**
 * 标题格式化规则
 * 处理标题前后的空行、ATX风格等
 */
export class HeadingRule implements FormatRule {
  name = 'heading';
  priority = 10;
  description = '格式化标题：控制标题前后的空行数，强制ATX风格';

  defaultConfig = {
    blankLinesBefore: 1,
    blankLinesAfter: 1,
    blankLinesBeforeH1: 0,
    forceAtxStyle: true,
  };

  apply(ast: Node, config: RuleConfig): Node {
    const cfg = { ...this.defaultConfig, ...config };

    // 深拷贝AST以避免修改原始对象
    const clonedAst = JSON.parse(JSON.stringify(ast));

    visit(clonedAst, 'heading', (node: Node, index: number | undefined, parent: Node | undefined) => {
      if (index === undefined || !parent || !parent.children) {
        return;
      }

      const depth = (node as { depth?: number }).depth ?? 1;
      const blankLinesBefore = depth === 1 ? cfg.blankLinesBeforeH1 : cfg.blankLinesBefore;

      // 确保标题前有正确数量的空行
      let blankCount = 0;
      let insertPosition = index;

      // 计算当前位置前的连续空行数
      for (let i = index - 1; i >= 0; i--) {
        const sibling = parent.children[i];
        if (sibling.type === 'paragraph' && isBlankParagraph(sibling)) {
          blankCount++;
        } else if (sibling.type === 'text' && isBlankTextNode(sibling)) {
          blankCount++;
        } else {
          break;
        }
      }

      // 移除多余的空白段落
      const toRemove: number[] = [];
      for (let i = index - 1; i >= 0 && toRemove.length < blankCount; i--) {
        const sibling = parent.children[i];
        if (sibling.type === 'paragraph' && isBlankParagraph(sibling)) {
          toRemove.unshift(i);
        } else if (sibling.type === 'text' && isBlankTextNode(sibling)) {
          toRemove.unshift(i);
        } else {
          break;
        }
      }

      // 从后往前删除，避免索引变化
      for (const idx of toRemove.reverse()) {
        parent.children.splice(idx, 1);
      }

      // 更新插入位置
      insertPosition = index - toRemove.length;

      // 在标题前插入正确数量的空行
      for (let i = 0; i < blankLinesBefore; i++) {
        parent.children.splice(insertPosition, 0, createBlankParagraph());
        insertPosition++;
      }
    });

    return clonedAst;
  }
}

/**
 * 检查段落是否为空
 */
function isBlankParagraph(node: Node): boolean {
  if (!node.children || !Array.isArray(node.children)) {
    return true;
  }
  return node.children.every(
    (child: Node) =>
      child.type === 'text' &&
      typeof (child as { value?: string }).value === 'string' &&
      (child as { value: string }).value.trim() === ''
  );
}

/**
 * 检查文本节点是否为空
 */
function isBlankTextNode(node: Node): boolean {
  return (
    node.type === 'text' &&
    typeof (node as { value?: string }).value === 'string' &&
    (node as { value: string }).value.trim() === ''
  );
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
