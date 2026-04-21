// src/rules/LinkRule.ts
import type { Node } from 'unist';
import { visit } from 'unist-util-visit';
import type { FormatRule, RuleConfig } from '../types';

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

  apply(ast: Node, config: RuleConfig): Node {
    const cfg = { ...this.defaultConfig, ...config };

    // 深拷贝AST以避免修改原始对象
    const clonedAst = JSON.parse(JSON.stringify(ast));

    // 处理链接节点
    visit(clonedAst, 'link', (node: Node) => {
      const linkNode = node as {
        url?: string;
        title?: string | null;
        children?: Node[];
      };

      // 确保链接有基本属性
      if (!linkNode.url) {
        linkNode.url = '';
      }

      // 清理title属性（如果为空字符串则设为null）
      if (linkNode.title === '') {
        linkNode.title = null;
      }
    });

    // 处理图片节点
    visit(clonedAst, 'image', (node: Node) => {
      const imageNode = node as {
        url?: string;
        title?: string | null;
        alt?: string;
      };

      // 确保图片有基本属性
      if (!imageNode.url) {
        imageNode.url = '';
      }

      // 确保有alt属性
      if (imageNode.alt === undefined) {
        imageNode.alt = '';
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
  private sortDefinitions(ast: Node): void {
    const rootNode = ast as { children?: Node[] };
    if (!rootNode.children || !Array.isArray(rootNode.children)) {
      return;
    }

    // 收集所有definition节点
    const definitions: Node[] = [];
    const otherChildren: Node[] = [];

    rootNode.children.forEach((child: Node) => {
      if (child.type === 'definition') {
        definitions.push(child);
      } else {
        otherChildren.push(child);
      }
    });

    // 按标识符排序
    definitions.sort((a: Node, b: Node) => {
      const defA = a as { identifier?: string };
      const defB = b as { identifier?: string };
      const idA = defA.identifier || '';
      const idB = defB.identifier || '';
      return idA.localeCompare(idB);
    });

    // 将排序后的definition放回文档末尾
    rootNode.children = [...otherChildren, ...definitions];
  }
}