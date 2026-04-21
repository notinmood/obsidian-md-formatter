// tests/rules/CodeBlockRule.test.ts
import { CodeBlockRule } from '../../src/rules/CodeBlockRule';
import { unified } from 'unified';
import remarkParse from 'remark-parse';

describe('CodeBlockRule', () => {
  let rule: CodeBlockRule;

  beforeEach(() => {
    rule = new CodeBlockRule();
  });

  describe('默认配置', () => {
    it('应该有正确的name', () => {
      expect(rule.name).toBe('codeBlock');
    });

    it('应该有正确的priority', () => {
      expect(rule.priority).toBe(40);
    });

    it('应该有正确的默认配置', () => {
      expect(rule.defaultConfig).toEqual({
        blankLinesBefore: 1,
        blankLinesAfter: 1,
        addLanguageHint: true,
      });
    });
  });

  describe('apply方法', () => {
    it('应该能正确处理包含代码块的AST', () => {
      const content = '```javascript\nconsole.log("Hello");\n```';
      const processor = unified().use(remarkParse);
      const ast = processor.parse(content);

      const result = rule.apply(ast, { enabled: true });

      expect(result).toBeDefined();
      expect(result.type).toBe('root');
    });

    it('应该能处理没有语言标识的代码块', () => {
      const content = '```\nplain code\n```';
      const processor = unified().use(remarkParse);
      const ast = processor.parse(content);

      const result = rule.apply(ast, { enabled: true });

      expect(result).toBeDefined();
    });

    it('应该能处理多个代码块', () => {
      const content = '```js\ncode1\n```\n\n```js\ncode2\n```';
      const processor = unified().use(remarkParse);
      const ast = processor.parse(content);

      const result = rule.apply(ast, { enabled: true });

      expect(result).toBeDefined();
    });

    it('应该能处理没有代码块的文档', () => {
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

    it('应该能禁用语言标识自动补全', () => {
      const content = '```\ncode\n```';
      const processor = unified().use(remarkParse);
      const ast = processor.parse(content);

      const result = rule.apply(ast, { enabled: true, addLanguageHint: false });

      expect(result).toBeDefined();
    });
  });
});