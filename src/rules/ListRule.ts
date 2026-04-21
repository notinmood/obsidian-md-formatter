// src/rules/ListRule.ts
import { visit } from 'unist-util-visit';
import type { FormatRule, RuleConfig, AstNode } from '../types';

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

  apply(ast: AstNode, config: RuleConfig): AstNode {
    const cfg = { ...this.defaultConfig, ...config };

    // 深拷贝AST以避免修改原始对象
    const clonedAst = JSON.parse(JSON.stringify(ast)) as AstNode;

    visit(clonedAst, 'list', (node: AstNode) => {
      // 设置列表的spread属性（控制列表项间的空行）
      if (cfg.listItemSpacing > 0) {
        node.spread = true;
      } else {
        node.spread = false;
      }

      // 处理列表项
      if (node.children && Array.isArray(node.children)) {
        node.children.forEach((listItem: AstNode) => {
          this.processListItem(listItem, cfg.indentSize, 0);
        });
      }
    });

    return clonedAst;
  }

  /**
   * 处理列表项（递归处理嵌套列表）
   */
  private processListItem(listItem: AstNode, indentSize: number, depth: number): void {
    if (!listItem.children || !Array.isArray(listItem.children)) {
      return;
    }

    // 处理嵌套列表
    listItem.children.forEach((child: AstNode) => {
      if (child.type === 'list') {
        // 设置嵌套列表的spread属性
        child.spread = false;

        if (child.children && Array.isArray(child.children)) {
          child.children.forEach((nestedItem: AstNode) => {
            this.processListItem(nestedItem, indentSize, depth + 1);
          });
        }
      }
    });
  }
}