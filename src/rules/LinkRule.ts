// src/rules/LinkRule.ts
import { visit } from 'unist-util-visit';
import type { FormatRule, RuleConfig, AstNode } from '../types';

/**
 * 链接格式化规则
 * 处理链接风格、引用链接排序等
 */
export class LinkRule implements FormatRule {
  name = 'link';
  priority = 60;
  description = '格式化链接：控制链接风格，处理引用链接';

  defaultConfig = {
    linkStyle: 'inline',
    sortReferenceLinks: false,
  };

  apply(ast: AstNode, config: RuleConfig): AstNode {
    const cfg = { ...this.defaultConfig, ...config };

    // 深拷贝AST以避免修改原始对象
    const clonedAst = JSON.parse(JSON.stringify(ast)) as AstNode;

    // 处理链接节点
    visit(clonedAst, 'link', (node: AstNode) => {
      // 确保链接有基本属性
      if (!node.url) {
        node.url = '';
      }

      // 清理title属性（如果为空字符串则设为null）
      if (node.title === '') {
        node.title = null;
      }
    });

    // 处理图片节点
    visit(clonedAst, 'image', (node: AstNode) => {
      // 确保图片有基本属性
      if (!node.url) {
        node.url = '';
      }

      // 确保有alt属性
      if (node.alt === undefined) {
        node.alt = '';
      }
    });

    // 如果需要排序引用链接定义
    if (cfg.sortReferenceLinks) {
      this.sortDefinitions(clonedAst);
    }

    return clonedAst;
  }

  /**
   * 排序引用链接定义
   */
  private sortDefinitions(ast: AstNode): void {
    if (!ast.children || !Array.isArray(ast.children)) {
      return;
    }

    // 收集所有definition节点
    const definitions: AstNode[] = [];
    const otherChildren: AstNode[] = [];

    ast.children.forEach((child: AstNode) => {
      if (child.type === 'definition') {
        definitions.push(child);
      } else {
        otherChildren.push(child);
      }
    });

    // 按标识符排序
    definitions.sort((a: AstNode, b: AstNode) => {
      const idA = a.identifier || '';
      const idB = b.identifier || '';
      return idA.localeCompare(idB);
    });

    // 将排序后的definition放回文档末尾
    ast.children = [...otherChildren, ...definitions];
  }
}