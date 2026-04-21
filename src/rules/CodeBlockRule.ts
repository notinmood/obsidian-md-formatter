// src/rules/CodeBlockRule.ts
import { visit } from 'unist-util-visit';
import type { FormatRule, RuleConfig, AstNode } from '../types';

/**
 * 代码块格式化规则
 * 处理代码块语言标识等
 * 注意：此规则不处理空行，空行控制由 Formatter.cleanupBlankLines 统一处理
 */
export class CodeBlockRule implements FormatRule {
  name = 'codeBlock';
  priority = 40;
  description = '格式化代码块：自动补全语言标识，推断代码语言';

  defaultConfig = {
    addLanguageHint: true,
    defaultLanguage: 'plain',
  };

  apply(ast: AstNode, config: RuleConfig): AstNode {
    const cfg = { ...this.defaultConfig, ...config };

    if (cfg.enabled === false) {
      return ast;
    }

    // 深拷贝AST以避免修改原始对象
    const clonedAst = JSON.parse(JSON.stringify(ast)) as AstNode;

    visit(clonedAst, 'code', (node: AstNode) => {
      // 自动补全语言标识
      if (cfg.addLanguageHint && !node.lang) {
        // 尝试推断语言
        const inferredLang = this.inferLanguage(node.value as string);
        node.lang = inferredLang || cfg.defaultLanguage || 'plain';
      }
    });

    return clonedAst;
  }

  /**
   * 推断代码语言
   */
  private inferLanguage(code: string): string | null {
    if (!code || typeof code !== 'string') {
      return null;
    }

    const trimmedCode = code.trim();

    // 常见语言特征检测
    const languagePatterns: Array<{ pattern: RegExp | ((code: string) => boolean); lang: string }> = [
      // TypeScript/JavaScript
      { pattern: /^import\s+.*from\s+['"]|export\s+(default\s+)?|const\s+\w+\s*=|let\s+\w+\s*=|async\s+function|=>\s*{/m, lang: 'typescript' },
      { pattern: /interface\s+\w+\s*{|type\s+\w+\s*=/, lang: 'typescript' },
      { pattern: /<\w+[^>]*>/, lang: 'typescript' }, // JSX/TSX

      // Python
      { pattern: /^def\s+\w+\s*\(|^import\s+\w+|^from\s+\w+\s+import|^class\s+\w+.*:/m, lang: 'python' },
      { pattern: /if\s+__name__\s*==\s*['"]__main__['"]/, lang: 'python' },

      // Shell/Bash
      { pattern: /^#!/, lang: 'bash' },
      { pattern: /^\s*(echo|cd|ls|mkdir|rm|chmod|export|source)\s/m, lang: 'bash' },

      // JSON
      { pattern: (code: string) => {
        try { JSON.parse(code); return true; } catch { return false; }
      }, lang: 'json' },

      // YAML
      { pattern: /^\s*[\w-]+:\s*$/m, lang: 'yaml' },
      { pattern: /^\s*-\s+\w+:/m, lang: 'yaml' },

      // Markdown
      { pattern: /^#{1,6}\s+|^\*{3,}$|^---$/m, lang: 'markdown' },

      // HTML
      { pattern: /<!DOCTYPE|<html|<head|<body|<div|<span|<p>/i, lang: 'html' },

      // CSS
      { pattern: /^\s*[\w-]+\s*:\s*[\w-]+;/m, lang: 'css' },
      { pattern: /^\s*[\w-]+\s*{/m, lang: 'css' },

      // SQL
      { pattern: /^\s*(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)\s/i, lang: 'sql' },

      // Go
      { pattern: /^package\s+\w+|^func\s+\w+|^import\s*\(/m, lang: 'go' },

      // Rust
      { pattern: /^fn\s+\w+|^use\s+\w+|^let\s+mut\s+|^impl\s+/m, lang: 'rust' },

      // Java
      { pattern: /^public\s+class|^private\s+\w+|^import\s+java\./m, lang: 'java' },

      // C/C++
      { pattern: /^#include|^int\s+main|^void\s+\w+\s*\(/m, lang: 'c' },
      { pattern: /std::|cout|cin|namespace/, lang: 'cpp' },

      // Ruby
      { pattern: /^def\s+\w+|^require\s+['"]|^class\s+\w+|^end$/m, lang: 'ruby' },

      // PHP
      { pattern: /<\?php|\$\w+\s*=/, lang: 'php' },
    ];

    for (const { pattern, lang } of languagePatterns) {
      if (typeof pattern === 'function') {
        if (pattern(trimmedCode)) {
          return lang;
        }
      } else if (pattern.test(trimmedCode)) {
        return lang;
      }
    }

    return null;
  }
}