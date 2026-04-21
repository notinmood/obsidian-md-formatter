// src/core/Formatter.ts
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import remarkFrontmatter from 'remark-frontmatter';
import type { Node } from 'unist';
import type { FormatRule, PluginSettings, FormatResult, RuleConfig, AstNode } from '../types';
import { RuleRegistry } from './RuleRegistry';

/**
 * 格式化选项
 */
export interface FormatOptions {
  /** 文件名（用于生成一级标题） */
  filename?: string;
}

/**
 * 格式化器核心
 * 负责解析Markdown、应用规则、生成格式化结果
 */
export class Formatter {
  constructor(private registry: RuleRegistry) {}

  async format(content: string, settings: PluginSettings, options?: FormatOptions): Promise<FormatResult> {
    try {
      // 使用 unified 处理器
      const processor = unified()
        .use(remarkParse)
        .use(remarkFrontmatter, ['yaml'])  // 支持 YAML frontmatter
        .use(remarkStringify, {
          bullet: '-',  // 无序列表使用 - 标记
          // 自定义转义：不转义 [ 和 ]，保留 Obsidian 的 [[wikilink]] 格式
          handlers: {
            text: (node: { value: string }) => {
              // 返回原始文本，不进行转义
              return node.value;
            },
          },
        })
        .use(remarkFrontmatter, ['yaml']);  // stringify 时也需要 frontmatter 支持
      const ast = processor.parse(content);

      const enabledRules = this.getEnabledRules(settings.rules);

      let transformedAst: Node = ast;
      let rulesApplied = 0;

      for (const rule of enabledRules) {
        const ruleConfig = settings.rules[rule.name] || { enabled: true };
        transformedAst = rule.apply(transformedAst as unknown as AstNode, ruleConfig, options?.filename) as unknown as Node;
        rulesApplied++;
      }

      // 空行清理后处理：确保不同块元素间最多只有 1 个空行
      transformedAst = this.cleanupBlankLines(transformedAst as unknown as AstNode) as unknown as Node;

      const result = processor.stringify(transformedAst as never);

      return {
        success: true,
        content: String(result),
        stats: {
          rulesApplied,
          changesMade: 0,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private getEnabledRules(ruleSettings: Record<string, RuleConfig>): FormatRule[] {
    const allRules = this.registry.getAll();
    return allRules.filter((rule) => {
      const config = ruleSettings[rule.name];
      return config?.enabled !== false;
    });
  }

  /**
   * 清理多余的空白段落
   * 确保不同类型块元素之间最多只有 1 个空行
   * 相同类型块元素之间的空白段落移除
   */
  private cleanupBlankLines(ast: AstNode): AstNode {
    if (!ast.children || !Array.isArray(ast.children)) {
      return ast;
    }

    const newChildren: AstNode[] = [];
    let prevType: string | null = null;
    let blankCount = 0;

    for (const child of ast.children) {
      const isBlank = this.isBlankNode(child);

      if (isBlank) {
        blankCount++;
        // 暂不添加空白节点，等下一个非空白节点确定
      } else {
        const currentType = child.type;

        // 如果前面有空白节点，根据前后节点类型决定是否保留
        if (blankCount > 0) {
          // 不同类型块元素之间保留 1 个空行
          if (prevType !== null && prevType !== currentType) {
            newChildren.push(this.createBlankParagraph());
          }
          // 相同类型块元素之间不保留空行
          blankCount = 0;
        }

        newChildren.push(child);
        prevType = currentType;
      }
    }

    // 处理末尾的空白节点（通常不保留）
    ast.children = newChildren;
    return ast;
  }

  /**
   * 检查节点是否为空白
   */
  private isBlankNode(node: AstNode): boolean {
    if (node.type === 'paragraph') {
      if (!node.children || !Array.isArray(node.children)) {
        return true;
      }
      return node.children.every(
        (child: AstNode) =>
          child.type === 'text' &&
          typeof child.value === 'string' &&
          (child.value ?? '').trim() === ''
      );
    }
    if (node.type === 'text') {
      return typeof node.value === 'string' && (node.value ?? '').trim() === '';
    }
    return false;
  }

  /**
   * 创建空白段落
   */
  private createBlankParagraph(): AstNode {
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
}
