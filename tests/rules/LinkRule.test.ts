// tests/rules/LinkRule.test.ts
import { LinkRule } from '../../src/rules/LinkRule';
import { unified } from 'unified';
import remarkParse from 'remark-parse';

describe('LinkRule', () => {
  let rule: LinkRule;

  beforeEach(() => {
    rule = new LinkRule();
  });

  describe('默认配置', () => {
    it('应该有正确的name', () => {
      expect(rule.name).toBe('link');
    });

    it('应该有正确的priority', () => {
      expect(rule.priority).toBe(60);
    });

    it('应该有正确的默认配置', () => {
      expect(rule.defaultConfig).toEqual({
        linkStyle: 'inline',
        sortReferenceLinks: false,
      });
    });
  });

  describe('apply方法', () => {
    it('应该能正确处理包含链接的AST', () => {
      const content = '[Example](https://example.com)';
      const processor = unified().use(remarkParse);
      const ast = processor.parse(content);

      const result = rule.apply(ast, { enabled: true });

      expect(result).toBeDefined();
      expect(result.type).toBe('root');
    });

    it('应该能处理图片', () => {
      const content = '![Alt text](https://example.com/image.png)';
      const processor = unified().use(remarkParse);
      const ast = processor.parse(content);

      const result = rule.apply(ast, { enabled: true });

      expect(result).toBeDefined();
    });

    it('应该能处理带标题的链接', () => {
      const content = '[Example](https://example.com "Title")';
      const processor = unified().use(remarkParse);
      const ast = processor.parse(content);

      const result = rule.apply(ast, { enabled: true });

      expect(result).toBeDefined();
    });

    it('应该能处理引用链接', () => {
      const content = '[Example][ref]\n\n[ref]: https://example.com';
      const processor = unified().use(remarkParse);
      const ast = processor.parse(content);

      const result = rule.apply(ast, { enabled: true });

      expect(result).toBeDefined();
    });

    it('应该能处理没有链接的文档', () => {
      const content = '# Heading\n\nParagraph';
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

    it('应该能排序引用链接定义', () => {
      const content = '[Link B][b]\n[Link A][a]\n\n[b]: https://b.com\n[a]: https://a.com';
      const processor = unified().use(remarkParse);
      const ast = processor.parse(content);

      const result = rule.apply(ast, { enabled: true, sortReferenceLinks: true });

      expect(result).toBeDefined();
    });
  });
});