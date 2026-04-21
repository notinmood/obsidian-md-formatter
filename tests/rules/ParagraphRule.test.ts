// tests/rules/ParagraphRule.test.ts
import { ParagraphRule } from '../../src/rules/ParagraphRule';
import { unified } from 'unified';
import remarkParse from 'remark-parse';

describe('ParagraphRule', () => {
  let rule: ParagraphRule;

  beforeEach(() => {
    rule = new ParagraphRule();
  });

  describe('默认配置', () => {
    it('应该有正确的name', () => {
      expect(rule.name).toBe('paragraph');
    });

    it('应该有正确的priority', () => {
      expect(rule.priority).toBe(20);
    });

    it('应该有正确的默认配置', () => {
      expect(rule.defaultConfig).toEqual({
        blankLinesBetween: 0,
        trimTrailingWhitespace: true,
      });
    });
  });

  describe('apply方法', () => {
    it('应该能正确处理包含段落的AST', () => {
      const content = 'First paragraph.\n\nSecond paragraph.';
      const processor = unified().use(remarkParse);
      const ast = processor.parse(content);

      const result = rule.apply(ast, { enabled: true });

      expect(result).toBeDefined();
      expect(result.type).toBe('root');
    });

    it('应该能清理行尾空白', () => {
      const content = 'Line with trailing spaces   \nAnother line  ';
      const processor = unified().use(remarkParse);
      const ast = processor.parse(content);

      const result = rule.apply(ast, { enabled: true, trimTrailingWhitespace: true });

      expect(result).toBeDefined();
    });

    it('应该能处理没有段落的文档', () => {
      const content = '# Just a heading';
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

    it('应该能处理单段落文档', () => {
      const content = 'Just one paragraph here.';
      const processor = unified().use(remarkParse);
      const ast = processor.parse(content);

      const result = rule.apply(ast, { enabled: true });

      expect(result).toBeDefined();
    });
  });
});