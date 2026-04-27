// src/rules/HeadingStructureRule.ts
import { visit } from 'unist-util-visit';
import type { FormatRule, RuleConfig, AstNode } from '../types';

/**
 * 标题层级结构规则
 * 确保标题层级严谨：逐级递增，全文仅1个一级标题
 */
export class HeadingStructureRule implements FormatRule {
  name = 'headingStructure';
  priority = 8;  // 在 HeadingRule 之前执行
  description = '确保标题层级严谨：逐级递增，全文仅一个一级标题';

  defaultConfig = {
    enforceHierarchy: true,
    singleH1: true,
    useFilenameAsH1: true,
  };

  apply(ast: AstNode, config: RuleConfig, filename?: string): AstNode {
    const cfg = { ...this.defaultConfig, ...config };

    if (cfg.enabled === false) {
      return ast;
    }

    // 深拷贝AST以避免修改原始对象
    const clonedAst = JSON.parse(JSON.stringify(ast)) as AstNode;

    if (!clonedAst.children || !Array.isArray(clonedAst.children)) {
      return clonedAst;
    }

    // 收集所有标题
    const headings: Array<{ node: AstNode; index: number; depth: number }> = [];
    visit(clonedAst, 'heading', (node: AstNode, index: number | undefined) => {
      if (index !== undefined) {
        headings.push({
          node,
          index,
          depth: node.depth ?? 1,
        });
      }
    });

    // 获取文件名（去除扩展名）
    const h1Title = filename ? filename.replace(/\.md$/i, '') : undefined;

    // 如果没有标题，添加文件名作为一级标题
    if (headings.length === 0 && cfg.useFilenameAsH1 && h1Title) {
      const h1Node = this.createHeading(h1Title, 1);
      // 在 frontmatter 后插入
      let insertIndex = 0;
      if (clonedAst.children[0]?.type === 'yaml') {
        insertIndex = 1;
      }
      clonedAst.children.splice(insertIndex, 0, h1Node);
      return clonedAst;
    }

    // 检查是否有一级标题
    const h1Headings = headings.filter(h => h.depth === 1);
    const hasH1 = h1Headings.length > 0;

    // 如果没有一级标题且有文件名，添加一级标题
    if (!hasH1 && cfg.singleH1 && cfg.useFilenameAsH1 && h1Title) {
      const h1Node = this.createHeading(h1Title, 1);
      // 在第一个非 YAML/frontmatter 节点前插入
      let insertIndex = 0;
      if (clonedAst.children[0]?.type === 'yaml') {
        insertIndex = 1;
      }
      clonedAst.children.splice(insertIndex, 0, h1Node);

      // 更新 headings 数组索引
      headings.forEach(h => {
        if (h.index >= insertIndex) {
          h.index++;
        }
      });
      headings.unshift({
        node: h1Node,
        index: insertIndex,
        depth: 1,
      });
    }

    // 确保只有一个一级标题
    if (cfg.singleH1 && headings.filter(h => h.depth === 1).length > 1) {
      let isFirstH1 = true;
      for (const heading of headings) {
        if (heading.depth === 1) {
          if (isFirstH1) {
            isFirstH1 = false;
          } else {
            // 多余的一级标题降为二级
            heading.node.depth = 2;
            heading.depth = 2;
          }
        }
      }
    }

    // 确保标题层级逐级递增（整体晋升算法）
    if (cfg.enforceHierarchy && headings.length > 0) {
      let i = 1;
      while (i < headings.length) {
        const prevDepth = headings[i - 1].depth;
        const currentDepth = headings[i].depth;

        if (currentDepth > prevDepth + 1) {
          // 跳级：将当前标题及所有同深度或更深的后续标题整体升一级
          const threshold = currentDepth;
          for (let j = i; j < headings.length; j++) {
            if (headings[j].depth >= threshold) {
              headings[j].depth -= 1;
              headings[j].node.depth = headings[j].depth;
            } else {
              break;
            }
          }
          // 不前进 i，重新检查当前位置是否仍有跳级
        } else {
          i++;
        }
      }
    }

    return clonedAst;
  }

  /**
   * 创建标题节点
   */
  private createHeading(text: string, depth: number): AstNode {
    return {
      type: 'heading',
      depth,
      children: [
        {
          type: 'text',
          value: text,
        },
      ],
    };
  }
}