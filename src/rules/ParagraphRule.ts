// src/rules/ParagraphRule.ts
import type { Node } from 'unist';
import { visit } from 'unist-util-visit';
import type { FormatRule, RuleConfig } from '../types';

/**
 * 段落格式化规则
 * 处理段落间距、清理行尾空白等
 */
export class ParagraphRule implements FormatRule {
  name = 'paragraph';
  priority = 20;
  description = '格式化段落：控制段落间空行数，清理行尾空白';

  defaultConfig = {
    blankLinesBetween: 1,
    trimTrailingWhitespace: true,
  };

  apply(ast: Node, config: RuleConfig): Node {
    const cfg = { ...this.defaultConfig, ...config };

    // 深拷贝AST以避免修改原始对象
    const clonedAst = JSON.parse(JSON.stringify(ast));

    if (cfg.trimTrailingWhitespace) {
      // 清理文本节点中的行尾空白
      visit(clonedAst, 'text', (node: Node) => {
        const textNode = node as { value?: string };
        if (typeof textNode.value === 'string') {
          // 移除每行尾部的空白字符
          textNode.value = textNode.value
            .split('\n')
            .map((line) => line.trimEnd())
            .join('\n');
        }
      });
    }

    // 处理段落间距
    if (cfg.blankLinesBetween > 0 && clonedAst.children && Array.isArray(clonedAst.children)) {
      const newChildren: Node[] = [];

      for (let i = 0; i < clonedAst.children.length; i++) {
        const child = clonedAst.children[i];
        newChildren.push(child);

        // 如果当前节点是段落，且下一个节点也是段落，则添加空行
        if (child.type === 'paragraph' && i < clonedAst.children.length - 1) {
          const nextChild = clonedAst.children[i + 1];
          if (nextChild.type === 'paragraph') {
            // 添加空行
            for (let j = 0; j < cfg.blankLinesBetween; j++) {
              newChildren.push(createBlankParagraph());
            }
          }
        }
      }

      clonedAst.children = newChildren;
    }

    return clonedAst;
  }
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
