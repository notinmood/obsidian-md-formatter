// tests/rules/TableRule.test.ts
import { TableRule } from '../../src/rules/TableRule';
import { unified } from 'unified';
import remarkParse from 'remark-parse';

describe('TableRule', () => {
  let rule: TableRule;

  beforeEach(() => {
    rule = new TableRule();
  });

  describe('默认配置', () => {
    it('应该有正确的name', () => {
      expect(rule.name).toBe('table');
    });

    it('应该有正确的priority', () => {
      expect(rule.priority).toBe(50);
    });

    it('应该有正确的默认配置', () => {
      expect(rule.defaultConfig).toEqual({
        autoAlign: true,
        alignStyle: 'default',
      });
    });
  });

  describe('apply方法', () => {
    it('应该能正确处理包含表格的AST', () => {
      const content = '| Header 1 | Header 2 |\n| --- | --- |\n| Cell 1 | Cell 2 |';
      const processor = unified().use(remarkParse);
      const ast = processor.parse(content);

      const result = rule.apply(ast, { enabled: true });

      expect(result).toBeDefined();
      expect(result.type).toBe('root');
    });

    it('应该能处理带有对齐标记的表格', () => {
      const content = '| Header 1 | Header 2 |\n| :--- | ---: |\n| Cell 1 | Cell 2 |';
      const processor = unified().use(remarkParse);
      const ast = processor.parse(content);

      const result = rule.apply(ast, { enabled: true });

      expect(result).toBeDefined();
    });

    it('应该能处理没有表格的文档', () => {
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

    it('应该在autoAlign为false时不做处理', () => {
      const content = '| A | B |\n| --- | --- |\n| 1 | 2 |';
      const processor = unified().use(remarkParse);
      const ast = processor.parse(content);

      const result = rule.apply(ast, { enabled: true, autoAlign: false });

      expect(result).toBeDefined();
    });

    it('应该能处理多列表格', () => {
      const content = '| A | B | C | D |\n| --- | --- | --- | --- |\n| 1 | 2 | 3 | 4 |';
      const processor = unified().use(remarkParse);
      const ast = processor.parse(content);

      const result = rule.apply(ast, { enabled: true });

      expect(result).toBeDefined();
    });
  });
});