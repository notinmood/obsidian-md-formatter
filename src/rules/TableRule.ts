// src/rules/TableRule.ts
import { visit } from 'unist-util-visit';
import type { FormatRule, RuleConfig, AstNode } from '../types';

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

  apply(ast: AstNode, config: RuleConfig): AstNode {
    const cfg = { ...this.defaultConfig, ...config };

    // 深拷贝AST以避免修改原始对象
    const clonedAst = JSON.parse(JSON.stringify(ast)) as AstNode;

    if (!cfg.autoAlign) {
      return clonedAst;
    }

    visit(clonedAst, 'table', (node: AstNode) => {
      // 确保表格有align属性
      if (!node.align) {
        node.align = [];
      }

      // 处理表格行
      if (node.children && Array.isArray(node.children)) {
        node.children.forEach((row: AstNode) => {
          if (row.type === 'tableRow' && row.children && Array.isArray(row.children)) {
            // 根据列数确保align数组有足够的元素
            const columnCount = row.children.length;
            while (node.align!.length < columnCount) {
              node.align!.push(null);
            }
          }
        });
      }
    });

    return clonedAst;
  }
}