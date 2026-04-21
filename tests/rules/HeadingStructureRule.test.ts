// tests/rules/HeadingStructureRule.test.ts
import { HeadingStructureRule } from '../../src/rules/HeadingStructureRule';
import { unified } from 'unified';
import remarkParse from 'remark-parse';

describe('HeadingStructureRule', () => {
  let rule: HeadingStructureRule;

  beforeEach(() => {
    rule = new HeadingStructureRule();
  });

  describe('默认配置', () => {
    it('应该有正确的name', () => {
      expect(rule.name).toBe('headingStructure');
    });

    it('应该有正确的priority', () => {
      expect(rule.priority).toBe(8);
    });

    it('应该有正确的默认配置', () => {
      expect(rule.defaultConfig).toEqual({
        enforceHierarchy: true,
        singleH1: true,
        useFilenameAsH1: true,
      });
    });
  });

  describe('标题层级约束', () => {
    it('应该修复跳级的标题（# -> ### 变为 # -> ##）', () => {
      const content = '# Title\n\n### Skipped level';
      const processor = unified().use(remarkParse);
      const ast = processor.parse(content);

      const result = rule.apply(ast, { enabled: true });

      // 检查标题层级是否被修正
      const headings = result.children?.filter((c: any) => c.type === 'heading');
      expect(headings?.length).toBe(2);
      expect(headings?.[1].depth).toBe(2);  // ### 变为 ##
    });

    it('应该保持正确的标题层级', () => {
      const content = '# Title\n\n## Section\n\n### Subsection';
      const processor = unified().use(remarkParse);
      const ast = processor.parse(content);

      const result = rule.apply(ast, { enabled: true });

      const headings = result.children?.filter((c: any) => c.type === 'heading');
      expect(headings?.[0].depth).toBe(1);
      expect(headings?.[1].depth).toBe(2);
      expect(headings?.[2].depth).toBe(3);
    });
  });

  describe('单一一级标题', () => {
    it('应该将多个一级标题降为二级', () => {
      const content = '# Title 1\n\n# Title 2\n\n# Title 3';
      const processor = unified().use(remarkParse);
      const ast = processor.parse(content);

      const result = rule.apply(ast, { enabled: true });

      const headings = result.children?.filter((c: any) => c.type === 'heading');
      expect(headings?.[0].depth).toBe(1);  // 第一个保持一级
      expect(headings?.[1].depth).toBe(2);  // 第二个降为二级
      expect(headings?.[2].depth).toBe(2);  // 第三个降为二级
    });
  });

  describe('使用文件名作为一级标题', () => {
    it('没有标题时应该添加文件名作为一级标题', () => {
      const content = 'Some paragraph content';
      const processor = unified().use(remarkParse);
      const ast = processor.parse(content);

      const result = rule.apply(ast, { enabled: true }, 'MyDocument.md');

      const headings = result.children?.filter((c: any) => c.type === 'heading');
      expect(headings?.length).toBe(1);
      expect(headings?.[0].depth).toBe(1);
      expect(headings?.[0].children?.[0].value).toBe('MyDocument');
    });

    it('没有一级标题时应该在开头添加文件名', () => {
      const content = '## Section\n\nContent';
      const processor = unified().use(remarkParse);
      const ast = processor.parse(content);

      const result = rule.apply(ast, { enabled: true }, 'TestFile.md');

      const headings = result.children?.filter((c: any) => c.type === 'heading');
      expect(headings?.length).toBe(2);
      expect(headings?.[0].depth).toBe(1);
      expect(headings?.[0].children?.[0].value).toBe('TestFile');
    });
  });

  describe('禁用规则', () => {
    it('应该不修改禁用规则的AST', () => {
      const content = '# Title\n\n### Skipped';
      const processor = unified().use(remarkParse);
      const ast = processor.parse(content);

      const result = rule.apply(ast, { enabled: false });

      // 禁用时不应修改层级
      const headings = result.children?.filter((c: any) => c.type === 'heading');
      expect(headings?.[1].depth).toBe(3);  // 保持原来的 ###
    });
  });
});
