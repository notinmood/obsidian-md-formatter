// tests/rules/FrontmatterRule.test.ts
import { FrontmatterRule } from '../../src/rules/FrontmatterRule';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import remarkFrontmatter from 'remark-frontmatter';

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
        normalizeFields: true,
      });
    });
  });

  describe('apply方法', () => {
    it('应该能正确处理包含 frontmatter 的文档', () => {
      const content = '---\ntitle: Test\n---\n\n# Heading';
      const processor = unified().use(remarkParse).use(remarkFrontmatter).use(remarkStringify);
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

  describe('字段名规范化', () => {
    it('应该将 create 改为 created', () => {
      const content = '---\ncreate: 2026-04-21\n---\n\n# Heading';
      const processor = unified().use(remarkParse).use(remarkFrontmatter);
      const ast = processor.parse(content);

      const result = rule.apply(ast, { enabled: true });

      const yamlNode = result.children?.find((c: any) => c.type === 'yaml');
      expect(yamlNode?.value).toContain('created: 2026-04-21');
      expect(yamlNode?.value).not.toContain('create:');
    });

    it('应该将 update 改为 updated', () => {
      const content = '---\nupdate: 2026-04-21\n---\n\n# Heading';
      const processor = unified().use(remarkParse).use(remarkFrontmatter);
      const ast = processor.parse(content);

      const result = rule.apply(ast, { enabled: true });

      const yamlNode = result.children?.find((c: any) => c.type === 'yaml');
      expect(yamlNode?.value).toContain('updated: 2026-04-21');
      expect(yamlNode?.value).not.toContain('update:');
    });

    it('应该将 tag 改为 tags', () => {
      const content = '---\ntag:\n  - test\n---\n\n# Heading';
      const processor = unified().use(remarkParse).use(remarkFrontmatter);
      const ast = processor.parse(content);

      const result = rule.apply(ast, { enabled: true });

      const yamlNode = result.children?.find((c: any) => c.type === 'yaml');
      expect(yamlNode?.value).toContain('tags:');
      expect(yamlNode?.value).not.toMatch(/^tag:/m);
    });

    it('应该不覆盖已存在的目标字段', () => {
      const content = '---\ncreate: old-value\ncreated: existing-value\n---\n\n# Heading';
      const processor = unified().use(remarkParse).use(remarkFrontmatter);
      const ast = processor.parse(content);

      const result = rule.apply(ast, { enabled: true });

      const yamlNode = result.children?.find((c: any) => c.type === 'yaml');
      // created 已存在，不应被 create 覆盖
      expect(yamlNode?.value).toContain('created: existing-value');
    });

    it('应该同时处理多个字段重命名', () => {
      const content = '---\ncreate: 2026-04-01\nupdate: 2026-04-21\ntag:\n  - test\n---\n\n# Heading';
      const processor = unified().use(remarkParse).use(remarkFrontmatter);
      const ast = processor.parse(content);

      const result = rule.apply(ast, { enabled: true });

      const yamlNode = result.children?.find((c: any) => c.type === 'yaml');
      expect(yamlNode?.value).toContain('created: 2026-04-01');
      expect(yamlNode?.value).toContain('updated: 2026-04-21');
      expect(yamlNode?.value).toContain('tags:');
    });
  });

  describe('添加 title 字段', () => {
    it('没有 title 时应该用文件名作为 title', () => {
      const content = '---\ncreated: 2026-04-21\n---\n\n# Heading';
      const processor = unified().use(remarkParse).use(remarkFrontmatter);
      const ast = processor.parse(content);

      const result = rule.apply(ast, { enabled: true }, 'MyDocument');

      const yamlNode = result.children?.find((c: any) => c.type === 'yaml');
      expect(yamlNode?.value).toContain('title: MyDocument');
    });

    it('已有 title 时不应该覆盖', () => {
      const content = '---\ntitle: Existing Title\n---\n\n# Heading';
      const processor = unified().use(remarkParse).use(remarkFrontmatter);
      const ast = processor.parse(content);

      const result = rule.apply(ast, { enabled: true }, 'MyDocument');

      const yamlNode = result.children?.find((c: any) => c.type === 'yaml');
      expect(yamlNode?.value).toContain('title: Existing Title');
      expect(yamlNode?.value).not.toContain('MyDocument');
    });

    it('没有 frontmatter 时不添加 title', () => {
      const content = '# Heading\n\nContent';
      const processor = unified().use(remarkParse).use(remarkFrontmatter);
      const ast = processor.parse(content);

      const result = rule.apply(ast, { enabled: true }, 'MyDocument');

      // 没有 YAML 节点
      const yamlNode = result.children?.find((c: any) => c.type === 'yaml');
      expect(yamlNode).toBeUndefined();
    });
  });

  describe('禁用规范化', () => {
    it('禁用 normalizeFields 时不应修改字段名', () => {
      const content = '---\ncreate: 2026-04-21\n---\n\n# Heading';
      const processor = unified().use(remarkParse).use(remarkFrontmatter);
      const ast = processor.parse(content);

      const result = rule.apply(ast, { enabled: true, normalizeFields: false });

      const yamlNode = result.children?.find((c: any) => c.type === 'yaml');
      expect(yamlNode?.value).toContain('create: 2026-04-21');
    });
  });
});