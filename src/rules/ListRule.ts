// src/rules/ListRule.ts
import type { Node } from 'unist';
import { visit } from 'unist-util-visit';
import type { FormatRule, RuleConfig } from '../types';

/**
 * 列表格式化规则
 * 处理列表缩进、列表项间距等
 */
export class ListRule implements FormatRule {
  name = 'list';
  priority = 30;
  description = '格式化列表：控制缩进大小和列表项间距';

  defaultConfig = {
    indentSize: 2,
    listItemSpacing: 0,
  };

  apply(ast: Node, config: RuleConfig): Node {
    const cfg = { ...this.defaultConfig, ...config };

    // 深拷贝AST以避免修改原始对象
    const clonedAst = JSON.parse(JSON.stringify(ast));

    visit(clonedAst, 'list', (node: Node) => {
      const listNode = node as {
        ordered?: boolean;
        start?: number;
        spread?: boolean;
        children?: Node[];
      };

      // 设置列表的spread属性（控制列表项间的空行）
      if (cfg.listItemSpacing > 0) {
        listNode.spread = true;
      } else {
        listNode.spread = false;
      }

      // 处理列表项
      if (listNode.children && Array.isArray(listNode.children)) {
        listNode.children.forEach((listItem: Node) => {
          this.processListItem(listItem, cfg.indentSize, 0);
        });
      }
    });

    return clonedAst;
  }

  /**
   * 处理列表项（递归处理嵌套列表）
   */
  private processListItem(listItem: Node, indentSize: number, depth: number): void {
    const item = listItem as { children?: Node[] };

    if (!item.children || !Array.isArray(item.children)) {
      return;
    }

    // 处理嵌套列表
    item.children.forEach((child: Node) => {
      if (child.type === 'list') {
        const nestedList = child as {
          ordered?: boolean;
          spread?: boolean;
          children?: Node[];
        };

        // 设置嵌套列表的spread属性
        nestedList.spread = false;

        if (nestedList.children && Array.isArray(nestedList.children)) {
          nestedList.children.forEach((nestedItem: Node) => {
            this.processListItem(nestedItem, indentSize, depth + 1);
          });
        }
      }
    });
  }
}