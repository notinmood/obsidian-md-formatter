// tests/rules/ListRule.test.ts
import { ListRule } from '../../src/rules/ListRule';
import { unified } from 'unified';
import remarkParse from 'remark-parse';

describe('ListRule', () => {
  let rule: ListRule;

  beforeEach(() => {
    rule = new ListRule();
  });

  describe('默认配置', () => {
    it('应该有正确的name', () => {
      expect(rule.name).toBe('list');
    });

    it('应该有正确的priority', () => {
      expect(rule.priority).toBe(30);
    });

    it('应该有正确的默认配置', () => {
      expect(rule.defaultConfig).toEqual({
        indentSize: 2,
        listItemSpacing: 0,
      });
    });
  });

  describe('apply方法', () => {
    it('应该能正确处理包含列表的AST', () => {
      const content = '- Item 1\n- Item 2\n- Item 3';
      const processor = unified().use(remarkParse);
      const ast = processor.parse(content);

      const result = rule.apply(ast, { enabled: true });

      expect(result).toBeDefined();
      expect(result.type).toBe('root');
    });

    it('应该能处理有序列表', () => {
      const content = '1. First\n2. Second\n3. Third';
      const processor = unified().use(remarkParse);
      const ast = processor.parse(content);

      const result = rule.apply(ast, { enabled: true });

      expect(result).toBeDefined();
    });

    it('应该能处理嵌套列表', () => {
      const content = '- Item 1\n  - Nested 1\n  - Nested 2\n- Item 2';
      const processor = unified().use(remarkParse);
      const ast = processor.parse(content);

      const result = rule.apply(ast, { enabled: true });

      expect(result).toBeDefined();
    });

    it('应该能处理没有列表的文档', () => {
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

    it('应该能配置listItemSpacing', () => {
      const content = '- Item 1\n- Item 2';
      const processor = unified().use(remarkParse);
      const ast = processor.parse(content);

      const result = rule.apply(ast, { enabled: true, listItemSpacing: 1 });

      expect(result).toBeDefined();
    });
  });
});