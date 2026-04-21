// tests/rules/FrontmatterRule.test.ts
import { FrontmatterRule } from '../../src/rules/FrontmatterRule';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';

describe('FrontmatterRule', () => {
  let rule: FrontmatterRule;

  beforeEach(() => {
    rule = new FrontmatterRule();
  });

  describe('默认配置', () => {
    it('应该有正确的name', () => {
      expect(rule.name).toBe('frontmatter');
    });

    it('应该有正确的priority', () => {
      expect(rule.priority).toBe(5);
    });

    it('应该有正确的默认配置', () => {
      expect(rule.defaultConfig).toEqual({
        enabled: true,
      });
    });
  });

  describe('apply方法', () => {
    it('应该能正确处理包含 frontmatter 的文档', () => {
      const content = '---\ntitle: Test\n---\n\n# Heading';
      const processor = unified().use(remarkParse).use(remarkStringify);
      const ast = processor.parse(content);

      const result = rule.apply(ast, { enabled: true });

      expect(result).toBeDefined();
      expect(result.type).toBe('root');
    });

    it('应该能处理没有 frontmatter 的文档', () => {
      const content = '# Just a heading\n\nParagraph';
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
  });
});