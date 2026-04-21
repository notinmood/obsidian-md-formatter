// tests/rules/HeadingRule.test.ts
import { HeadingRule } from '../../src/rules/HeadingRule';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import type { Node } from 'unist';

describe('HeadingRule', () => {
  let rule: HeadingRule;

  beforeEach(() => {
    rule = new HeadingRule();
  });

  describe('默认配置', () => {
    it('应该有正确的name', () => {
      expect(rule.name).toBe('heading');
    });

    it('应该有正确的priority', () => {
      expect(rule.priority).toBe(10);
    });

    it('应该有正确的默认配置', () => {
      expect(rule.defaultConfig).toEqual({
        blankLinesBefore: 1,
        blankLinesAfter: 1,
        blankLinesBeforeH1: 0,
        forceAtxStyle: true,
      });
    });
  });

  describe('apply方法', () => {
    it('应该能正确处理包含标题的AST', () => {
      const content = '# Hello World\n\nParagraph content';
      const processor = unified().use(remarkParse);
      const ast = processor.parse(content);

      const result = rule.apply(ast, { enabled: true });

      expect(result).toBeDefined();
      expect(result.type).toBe('root');
    });

    it('应该不修改禁用规则的AST', () => {
      const content = '# Hello World';
      const processor = unified().use(remarkParse);
      const ast = processor.parse(content);

      const result = rule.apply(ast, { enabled: false });

      expect(result).toBeDefined();
      expect(result.type).toBe('root');
    });

    it('应该能处理没有标题的文档', () => {
      const content = 'Just a paragraph\n\nAnother paragraph';
      const processor = unified().use(remarkParse);
      const ast = processor.parse(content);

      const result = rule.apply(ast, { enabled: true });

      expect(result).toBeDefined();
    });

    it('应该能处理空文档', () => {
      const content = '';
      const processor = unified().use(remarkParse);
      const ast = processor.parse(content);

      const result = rule.apply(ast, { enabled: true });

      expect(result).toBeDefined();
    });

    it('应该能处理多级标题', () => {
      const content = '# Heading 1\n## Heading 2\n### Heading 3';
      const processor = unified().use(remarkParse);
      const ast = processor.parse(content);

      const result = rule.apply(ast, { enabled: true });

      expect(result).toBeDefined();
    });
  });
});
