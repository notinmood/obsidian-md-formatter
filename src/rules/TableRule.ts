// src/rules/TableRule.ts
import type { Node } from 'unist';
import { visit } from 'unist-util-visit';
import type { FormatRule, RuleConfig } from '../types';

/**
 * 表格格式化规则
 * 处理表格对齐等
 */
export class TableRule implements FormatRule {
  name = 'table';
  priority = 50;
  description = '格式化表格：自动对齐表格列';

  defaultConfig = {
    autoAlign: true,
    alignStyle: 'default',
  };

  apply(ast: Node, config: RuleConfig): Node {
    const cfg = { ...this.defaultConfig, ...config };

    // 深拷贝AST以避免修改原始对象
    const clonedAst = JSON.parse(JSON.stringify(ast));

    if (!cfg.autoAlign) {
      return clonedAst;
    }

    visit(clonedAst, 'table', (node: Node) => {
      const tableNode = node as {
        align?: ('left' | 'right' | 'center' | null)[];
        children?: Node[];
      };

      // 确保表格有align属性
      if (!tableNode.align) {
        tableNode.align = [];
      }

      // 处理表格行
      if (tableNode.children && Array.isArray(tableNode.children)) {
        tableNode.children.forEach((row: Node) => {
          const rowNode = row as {
            type: string;
            children?: Node[];
          };

          if (rowNode.type === 'tableRow' && rowNode.children && Array.isArray(rowNode.children)) {
            // 根据列数确保align数组有足够的元素
            const columnCount = rowNode.children.length;
            while (tableNode.align!.length < columnCount) {
              tableNode.align!.push(null);
            }
          }
        });
      }
    });

    return clonedAst;
  }
}