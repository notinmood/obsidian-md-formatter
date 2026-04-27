// tests/rules/FrontmatterRule.test.ts
import { jest } from '@jest/globals';
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
        subRules: {
          created: {
            enabled: true,
            useFileCtime: true,
          },
          updated: {
            enabled: true,
          },
          tags: {
            enabled: true,
            ensureTimeTags: true,
            ai: {
              enabled: true,
            },
          },
          summary: {
            enabled: true,
            ai: {
              enabled: true,
            },
          },
          categories: {
            enabled: true,
            ai: {
              enabled: true,
            },
          },
          title: {
            enabled: true,
            useFilename: true,
          },
          aiFormatted: {
            enabled: true,
            skipAiIfPresent: true,
          },
        },
      });
    });
  });

  describe('apply方法', () => {
    it('应该能正确处理包含 frontmatter 的文档', async () => {
      const content = '---\ntitle: Test\n---\n\n# Heading';
      const processor = unified().use(remarkParse).use(remarkFrontmatter).use(remarkStringify);
      const ast = processor.parse(content);

      const result = await rule.apply(ast, { enabled: true });

      expect(result).toBeDefined();
      expect(result.type).toBe('root');
    });

    it('应该能处理没有 frontmatter 的文档', async () => {
      const content = '# Just a heading\n\nParagraph';
      const processor = unified().use(remarkParse);
      const ast = processor.parse(content);

      const result = await rule.apply(ast, { enabled: true });

      expect(result).toBeDefined();
    });

    it('应该能处理空文档', async () => {
      const content = '';
      const processor = unified().use(remarkParse);
      const ast = processor.parse(content);

      const result = await rule.apply(ast, { enabled: true });

      expect(result).toBeDefined();
    });
  });

  describe('字段名规范化', () => {
    it('应该将 create 改为 created', async () => {
      const content = '---\ncreate: 2026-04-21\n---\n\n# Heading';
      const processor = unified().use(remarkParse).use(remarkFrontmatter);
      const ast = processor.parse(content);

      const result = await rule.apply(ast, { enabled: true });

      const yamlNode = result.children?.find((c: any) => c.type === 'yaml');
      expect(yamlNode?.value).toContain('created: 2026-04-21');
      expect(yamlNode?.value).not.toContain('create:');
    });

    it('应该将 update 改为 updated', async () => {
      const content = '---\nupdate: 2026-04-21\n---\n\n# Heading';
      const processor = unified().use(remarkParse).use(remarkFrontmatter);
      const ast = processor.parse(content);

      const result = await rule.apply(ast, { enabled: true });

      const yamlNode = result.children?.find((c: any) => c.type === 'yaml');
      expect(yamlNode?.value).toContain('updated:');
      expect(yamlNode?.value).not.toContain('update:');
    });

    it('应该将 tag 改为 tags', async () => {
      const content = '---\ntag:\n  - test\n---\n\n# Heading';
      const processor = unified().use(remarkParse).use(remarkFrontmatter);
      const ast = processor.parse(content);

      const result = await rule.apply(ast, { enabled: true });

      const yamlNode = result.children?.find((c: any) => c.type === 'yaml');
      expect(yamlNode?.value).toContain('tags:');
      expect(yamlNode?.value).not.toMatch(/^tag:/m);
    });

    it('应该不覆盖已存在的目标字段', async () => {
      const content = '---\ncreate: old-value\ncreated: existing-value\n---\n\n# Heading';
      const processor = unified().use(remarkParse).use(remarkFrontmatter);
      const ast = processor.parse(content);

      const result = await rule.apply(ast, { enabled: true });

      const yamlNode = result.children?.find((c: any) => c.type === 'yaml');
      // created 已存在，不应被 create 覆盖
      expect(yamlNode?.value).toContain('created: existing-value');
    });

    it('应该同时处理多个字段重命名', async () => {
      const content = '---\ncreate: 2026-04-01\nupdate: 2026-04-21\ntag:\n  - test\n---\n\n# Heading';
      const processor = unified().use(remarkParse).use(remarkFrontmatter);
      const ast = processor.parse(content);

      const result = await rule.apply(ast, { enabled: true });

      const yamlNode = result.children?.find((c: any) => c.type === 'yaml');
      expect(yamlNode?.value).toContain('created: 2026-04-01');
      expect(yamlNode?.value).toContain('tags:');
    });
  });

  describe('添加 title 字段', () => {
    it('没有 title 时应该用文件名作为 title', async () => {
      const content = '---\ncreated: 2026-04-21\n---\n\n# Heading';
      const processor = unified().use(remarkParse).use(remarkFrontmatter);
      const ast = processor.parse(content);

      const result = await rule.apply(ast, { enabled: true }, 'MyDocument');

      const yamlNode = result.children?.find((c: any) => c.type === 'yaml');
      expect(yamlNode?.value).toContain('title: MyDocument');
    });

    it('已有 title 时不应该覆盖', async () => {
      const content = '---\ntitle: Existing Title\n---\n\n# Heading';
      const processor = unified().use(remarkParse).use(remarkFrontmatter);
      const ast = processor.parse(content);

      const result = await rule.apply(ast, { enabled: true }, 'MyDocument');

      const yamlNode = result.children?.find((c: any) => c.type === 'yaml');
      expect(yamlNode?.value).toContain('title: Existing Title');
      expect(yamlNode?.value).not.toContain('MyDocument');
    });

    it('没有 frontmatter 时不添加 title', async () => {
      const content = '# Heading\n\nContent';
      const processor = unified().use(remarkParse).use(remarkFrontmatter);
      const ast = processor.parse(content);

      const result = await rule.apply(ast, { enabled: true }, 'MyDocument');

      // 没有 YAML 节点
      const yamlNode = result.children?.find((c: any) => c.type === 'yaml');
      expect(yamlNode).toBeUndefined();
    });
  });

  describe('禁用规范化', () => {
    it('禁用 normalizeFields 时不应修改字段名', async () => {
      const content = '---\ncreate: 2026-04-21\n---\n\n# Heading';
      const processor = unified().use(remarkParse).use(remarkFrontmatter);
      const ast = processor.parse(content);

      const result = await rule.apply(ast, { enabled: true, normalizeFields: false });

      const yamlNode = result.children?.find((c: any) => c.type === 'yaml');
      expect(yamlNode?.value).toContain('create: 2026-04-21');
    });
  });
});

describe('时间字段', () => {
  let rule: FrontmatterRule;
  const fileInfo = { ctime: new Date('2026-04-24T14:30:00').getTime(), mtime: new Date('2026-04-21T10:00:00').getTime() };

  beforeEach(() => {
    rule = new FrontmatterRule();
  });

  it('应该在缺少 created 时从 fileInfo.ctime 生成', async () => {
    const content = '---\ntitle: Test\n---\n\n# Heading';
    const processor = unified().use(remarkParse).use(remarkFrontmatter);
    const ast = processor.parse(content);

    const result = await rule.apply(ast, { enabled: true }, 'Test', fileInfo);

    const yamlNode = result.children?.find((c: any) => c.type === 'yaml');
    expect(yamlNode?.value).toContain('created:');
    expect(yamlNode?.value).toContain('2026-04-24');
  });

  it('应该始终更新 updated 为当前时间', async () => {
    const content = '---\ncreated: 2026-04-21\nupdated: 2026-04-21\n---\n\n# Heading';
    const processor = unified().use(remarkParse).use(remarkFrontmatter);
    const ast = processor.parse(content);

    const result = await rule.apply(ast, { enabled: true }, 'Test', fileInfo);

    const yamlNode = result.children?.find((c: any) => c.type === 'yaml');
    expect(yamlNode?.value).toContain('updated:');
    expect(yamlNode?.value).not.toContain('updated: 2026-04-21');
  });

  it('已有 created 时不应覆盖', async () => {
    const content = '---\ncreated: 2026-03-15 08:00:00 星期六\ntitle: Test\n---\n\n# Heading';
    const processor = unified().use(remarkParse).use(remarkFrontmatter);
    const ast = processor.parse(content);

    const result = await rule.apply(ast, { enabled: true }, 'Test', fileInfo);

    const yamlNode = result.children?.find((c: any) => c.type === 'yaml');
    expect(yamlNode?.value).toContain('created: 2026-03-15 08:00:00 星期六');
  });

  it('没有 fileInfo 时不添加时间字段', async () => {
    const content = '---\ntitle: Test\n---\n\n# Heading';
    const processor = unified().use(remarkParse).use(remarkFrontmatter);
    const ast = processor.parse(content);

    const result = await rule.apply(ast, { enabled: true }, 'Test');

    const yamlNode = result.children?.find((c: any) => c.type === 'yaml');
    expect(yamlNode?.value).not.toContain('created:');
  });
});

describe('时间标签', () => {
  let rule: FrontmatterRule;
  const fileInfo = { ctime: new Date('2026-04-24T14:30:00').getTime(), mtime: new Date('2026-04-21T10:00:00').getTime() };

  beforeEach(() => {
    rule = new FrontmatterRule();
  });

  it('应该在 tags 中包含 Year/2026 和 Month/04（基于 created 日期）', async () => {
    const content = '---\ncreated: 2026-04-24 14:30:00 星期四\n---\n\n# Heading';
    const processor = unified().use(remarkParse).use(remarkFrontmatter);
    const ast = processor.parse(content);

    const result = await rule.apply(ast, { enabled: true }, 'Test', fileInfo);

    const yamlNode = result.children?.find((c: any) => c.type === 'yaml');
    expect(yamlNode?.value).toContain('Year/2026');
    expect(yamlNode?.value).toContain('Month/04');
  });

  it('应该从 fileInfo.ctime 推算时间标签（如果没有 created 字段）', async () => {
    const content = '---\n---\n\n# Heading';
    const processor = unified().use(remarkParse).use(remarkFrontmatter);
    const ast = processor.parse(content);

    const result = await rule.apply(ast, { enabled: true }, 'Test', fileInfo);

    const yamlNode = result.children?.find((c: any) => c.type === 'yaml');
    expect(yamlNode?.value).toContain('Year/2026');
    expect(yamlNode?.value).toContain('Month/04');
  });

  it('已有时间标签时不应重复添加', async () => {
    const content = '---\ncreated: 2026-04-24\ntags:\n  - Year/2026\n  - Month/04\n---\n\n# Heading';
    const processor = unified().use(remarkParse).use(remarkFrontmatter);
    const ast = processor.parse(content);

    const result = await rule.apply(ast, { enabled: true }, 'Test', fileInfo);

    const yamlNode = result.children?.find((c: any) => c.type === 'yaml');
    const yearCount = (yamlNode?.value as string).split('Year/2026').length - 1;
    expect(yearCount).toBe(1);
  });
});

describe('子规则开关', () => {
  let rule: FrontmatterRule;
  const fileInfo = { ctime: new Date('2026-04-24T14:30:00').getTime(), mtime: new Date('2026-04-21T10:00:00').getTime() };

  beforeEach(() => {
    rule = new FrontmatterRule();
  });

  it('关闭 created 子规则时不应填充 created 字段', async () => {
    const content = '---\ntitle: Test\n---\n\n# Heading';
    const processor = unified().use(remarkParse).use(remarkFrontmatter);
    const ast = processor.parse(content);

    const result = await rule.apply(ast, { enabled: true, subRules: { created: { enabled: false, useFileCtime: true } } }, 'Test', fileInfo);

    const yamlNode = result.children?.find((c: any) => c.type === 'yaml');
    expect(yamlNode?.value).not.toContain('created:');
  });

  it('关闭 updated 子规则时不应更新 updated 字段', async () => {
    const content = '---\ncreated: 2026-04-21\nupdated: 2026-04-21\n---\n\n# Heading';
    const processor = unified().use(remarkParse).use(remarkFrontmatter);
    const ast = processor.parse(content);

    const result = await rule.apply(ast, { enabled: true, subRules: { updated: { enabled: false } } }, 'Test', fileInfo);

    const yamlNode = result.children?.find((c: any) => c.type === 'yaml');
    expect(yamlNode?.value).toContain('updated: 2026-04-21');
  });

  it('关闭 tags 子规则时不应添加时间标签', async () => {
    const content = '---\ncreated: 2026-04-21\n---\n\n# Heading';
    const processor = unified().use(remarkParse).use(remarkFrontmatter);
    const ast = processor.parse(content);

    const result = await rule.apply(ast, { enabled: true, subRules: { tags: { enabled: false, ensureTimeTags: true, ai: { enabled: false } } } }, 'Test', fileInfo);

    const yamlNode = result.children?.find((c: any) => c.type === 'yaml');
    expect(yamlNode?.value).not.toContain('Year/');
    expect(yamlNode?.value).not.toContain('Month/');
  });

  it('关闭 title 子规则时不应添加 title', async () => {
    const content = '---\ncreated: 2026-04-21\n---\n\n# Heading';
    const processor = unified().use(remarkParse).use(remarkFrontmatter);
    const ast = processor.parse(content);

    const result = await rule.apply(ast, { enabled: true, subRules: { title: { enabled: false, useFilename: true } } }, 'MyDocument', fileInfo);

    const yamlNode = result.children?.find((c: any) => c.type === 'yaml');
    expect(yamlNode?.value).not.toContain('title: MyDocument');
  });

  it('关闭 created.useFileCtime 时不应从 fileInfo 填充', async () => {
    const content = '---\ntitle: Test\n---\n\n# Heading';
    const processor = unified().use(remarkParse).use(remarkFrontmatter);
    const ast = processor.parse(content);

    const result = await rule.apply(ast, { enabled: true, subRules: { created: { enabled: true, useFileCtime: false } } }, 'Test', fileInfo);

    const yamlNode = result.children?.find((c: any) => c.type === 'yaml');
    expect(yamlNode?.value).not.toContain('created:');
  });

  it('关闭 title.useFilename 时不应从文件名填充 title', async () => {
    const content = '---\ncreated: 2026-04-21\n---\n\n# Heading';
    const processor = unified().use(remarkParse).use(remarkFrontmatter);
    const ast = processor.parse(content);

    const result = await rule.apply(ast, { enabled: true, subRules: { title: { enabled: true, useFilename: false } } }, 'MyDocument', fileInfo);

    const yamlNode = result.children?.find((c: any) => c.type === 'yaml');
    expect(yamlNode?.value).not.toContain('title: MyDocument');
  });
});

describe('配置深合并', () => {
  let rule: FrontmatterRule;
  const fileInfo = { ctime: new Date('2026-04-24T14:30:00').getTime(), mtime: new Date('2026-04-21T10:00:00').getTime() };

  beforeEach(() => {
    rule = new FrontmatterRule();
  });

  it('部分 subRules 配置应与默认值合并', async () => {
    const content = '---\ntitle: Test\n---\n\n# Heading';
    const processor = unified().use(remarkParse).use(remarkFrontmatter);
    const ast = processor.parse(content);

    // 只传 created.enabled=false，其他应保留默认值
    const result = await rule.apply(ast, {
      enabled: true,
      subRules: { created: { enabled: false, useFileCtime: true } },
    }, 'Test', fileInfo);

    const yamlNode = result.children?.find((c: any) => c.type === 'yaml');
    expect(yamlNode?.value).not.toContain('created:');
    // title 仍由默认值控制
    expect(yamlNode?.value).toContain('title: Test');
  });

  it('旧配置无 subRules 时应使用默认值', async () => {
    const content = '---\ntitle: Test\n---\n\n# Heading';
    const processor = unified().use(remarkParse).use(remarkFrontmatter);
    const ast = processor.parse(content);

    const result = await rule.apply(ast, { enabled: true }, 'Test', fileInfo);

    const yamlNode = result.children?.find((c: any) => c.type === 'yaml');
    expect(yamlNode?.value).toContain('created:');
  });

  it('normalizeFields 单独关闭时其他子规则仍生效', async () => {
    const content = '---\ncreate: 2026-04-21\n---\n\n# Heading';
    const processor = unified().use(remarkParse).use(remarkFrontmatter);
    const ast = processor.parse(content);

    const result = await rule.apply(ast, { enabled: true, normalizeFields: false }, 'MyDoc', fileInfo);

    const yamlNode = result.children?.find((c: any) => c.type === 'yaml');
    // 不规范化，保持 create
    expect(yamlNode?.value).toContain('create:');
    // title 仍添加
    expect(yamlNode?.value).toContain('title: MyDoc');
  });
});

describe('ai-formatted 字段', () => {
  let rule: FrontmatterRule;
  const fileInfo = { ctime: new Date('2026-04-24T14:30:00').getTime(), mtime: new Date('2026-04-21T10:00:00').getTime() };

  beforeEach(() => {
    rule = new FrontmatterRule();
  });

  it('调用 AI 后应写入 ai-formatted 字段', async () => {
    const content = '---\ncreated: 2026-04-21\n---\n\n# Heading';
    const processor = unified().use(remarkParse).use(remarkFrontmatter);
    const ast = processor.parse(content);

    const mockAiService = {
      generateMetadata: jest.fn().mockResolvedValue({
        tags: ['AI-Tag'],
        summary: 'AI 摘要',
        categories: ['AI-分类'],
      }),
    };

    const result = await rule.apply(
      ast,
      {
        enabled: true,
        subRules: {
          tags: { enabled: true, ensureTimeTags: true, ai: { enabled: true } },
          summary: { enabled: true, ai: { enabled: true } },
          categories: { enabled: true, ai: { enabled: true } },
        },
      },
      'Test',
      fileInfo,
      mockAiService as any,
    );

    const yamlNode = result.children?.find((c: any) => c.type === 'yaml');
    expect(yamlNode?.value).toContain('ai-formatted:');
    expect(mockAiService.generateMetadata).toHaveBeenCalled();
  });

  it('未调用 AI 时不应写入 ai-formatted 字段', async () => {
    const content = '---\ncreated: 2026-04-21\n---\n\n# Heading';
    const processor = unified().use(remarkParse).use(remarkFrontmatter);
    const ast = processor.parse(content);

    // AI 子规则全部关闭
    const result = await rule.apply(
      ast,
      {
        enabled: true,
        subRules: {
          tags: { enabled: true, ensureTimeTags: true, ai: { enabled: false } },
          summary: { enabled: true, ai: { enabled: false } },
          categories: { enabled: true, ai: { enabled: false } },
        },
      },
      'Test',
      fileInfo,
    );

    const yamlNode = result.children?.find((c: any) => c.type === 'yaml');
    expect(yamlNode?.value).not.toContain('ai-formatted:');
  });

  it('已有 ai-formatted 值时应跳过 AI 调用', async () => {
    const content = '---\ncreated: 2026-04-21\nai-formatted: 2026-04-25 10:00:00 星期五\ntags:\n  - Year/2026\n---\n\n# Heading';
    const processor = unified().use(remarkParse).use(remarkFrontmatter);
    const ast = processor.parse(content);

    const mockAiService = {
      generateMetadata: jest.fn().mockResolvedValue({
        tags: ['AI-Tag'],
        summary: 'AI 摘要',
        categories: ['AI-分类'],
      }),
    };

    const result = await rule.apply(
      ast,
      {
        enabled: true,
        subRules: {
          tags: { enabled: true, ensureTimeTags: true, ai: { enabled: true } },
          summary: { enabled: true, ai: { enabled: true } },
          categories: { enabled: true, ai: { enabled: true } },
        },
      },
      'Test',
      fileInfo,
      mockAiService as any,
    );

    expect(mockAiService.generateMetadata).not.toHaveBeenCalled();
    const yamlNode = result.children?.find((c: any) => c.type === 'yaml');
    // 原有值保持不变
    expect(yamlNode?.value).toContain('ai-formatted: 2026-04-25');
  });

  it('ai-formatted 为空值时应正常调用 AI', async () => {
    const content = '---\ncreated: 2026-04-21\nai-formatted:\n---\n\n# Heading';
    const processor = unified().use(remarkParse).use(remarkFrontmatter);
    const ast = processor.parse(content);

    const mockAiService = {
      generateMetadata: jest.fn().mockResolvedValue({
        tags: ['AI-Tag'],
        summary: 'AI 摘要',
        categories: ['AI-分类'],
      }),
    };

    const result = await rule.apply(
      ast,
      {
        enabled: true,
        subRules: {
          tags: { enabled: true, ensureTimeTags: true, ai: { enabled: true } },
          summary: { enabled: true, ai: { enabled: true } },
          categories: { enabled: true, ai: { enabled: true } },
        },
      },
      'Test',
      fileInfo,
      mockAiService as any,
    );

    expect(mockAiService.generateMetadata).toHaveBeenCalled();
    const yamlNode = result.children?.find((c: any) => c.type === 'yaml');
    // 应写入新的时间值（不再是空）
    expect(yamlNode?.value).toMatch(/ai-formatted: \d{4}-\d{2}-\d{2}/);
  });

  it('关闭 skipAiIfPresent 时即使有 ai-formatted 也应调用 AI', async () => {
    const content = '---\ncreated: 2026-04-21\nai-formatted: 2026-04-25 10:00:00 星期五\ntags:\n  - Year/2026\n---\n\n# Heading';
    const processor = unified().use(remarkParse).use(remarkFrontmatter);
    const ast = processor.parse(content);

    const mockAiService = {
      generateMetadata: jest.fn().mockResolvedValue({
        tags: ['AI-Tag'],
        summary: 'AI 摘要',
        categories: ['AI-分类'],
      }),
    };

    const result = await rule.apply(
      ast,
      {
        enabled: true,
        subRules: {
          aiFormatted: { enabled: true, skipAiIfPresent: false },
          tags: { enabled: true, ensureTimeTags: true, ai: { enabled: true } },
          summary: { enabled: true, ai: { enabled: true } },
          categories: { enabled: true, ai: { enabled: true } },
        },
      },
      'Test',
      fileInfo,
      mockAiService as any,
    );

    expect(mockAiService.generateMetadata).toHaveBeenCalled();
    const yamlNode = result.children?.find((c: any) => c.type === 'yaml');
    // 时间被更新
    expect(yamlNode?.value).toContain('ai-formatted:');
  });

  it('关闭 aiFormatted.enabled 时不应写入 ai-formatted 字段', async () => {
    const content = '---\ncreated: 2026-04-21\n---\n\n# Heading';
    const processor = unified().use(remarkParse).use(remarkFrontmatter);
    const ast = processor.parse(content);

    const mockAiService = {
      generateMetadata: jest.fn().mockResolvedValue({
        tags: ['AI-Tag'],
        summary: 'AI 摘要',
        categories: ['AI-分类'],
      }),
    };

    const result = await rule.apply(
      ast,
      {
        enabled: true,
        subRules: {
          aiFormatted: { enabled: false, skipAiIfPresent: true },
          tags: { enabled: true, ensureTimeTags: true, ai: { enabled: true } },
          summary: { enabled: true, ai: { enabled: true } },
          categories: { enabled: true, ai: { enabled: true } },
        },
      },
      'Test',
      fileInfo,
      mockAiService as any,
    );

    const yamlNode = result.children?.find((c: any) => c.type === 'yaml');
    expect(yamlNode?.value).not.toContain('ai-formatted:');
  });

  it('AI 生成标签时不应重复已有的 Year/Month 标签', async () => {
    const content = '---\ncreated: 2026-04-21\ntags:\n  - Year/2026\n  - Month/04\n  - ExistingTag\n---\n\n# Heading';
    const processor = unified().use(remarkParse).use(remarkFrontmatter);
    const ast = processor.parse(content);

    const mockAiService = {
      generateMetadata: jest.fn().mockResolvedValue({
        tags: ['AI-Tag', 'Year/2026', 'Month/04'],
        summary: 'AI 摘要',
        categories: ['AI-分类'],
      }),
    };

    const result = await rule.apply(
      ast,
      {
        enabled: true,
        subRules: {
          tags: { enabled: true, ensureTimeTags: true, ai: { enabled: true } },
          summary: { enabled: true, ai: { enabled: true } },
          categories: { enabled: true, ai: { enabled: true } },
        },
      },
      'Test',
      fileInfo,
      mockAiService as any,
    );

    const yamlNode = result.children?.find((c: any) => c.type === 'yaml');
    const yamlStr = yamlNode?.value as string;
    // Year/2026 和 Month/04 不应重复
    const yearCount = yamlStr.split('Year/2026').length - 1;
    const monthCount = yamlStr.split('Month/04').length - 1;
    expect(yearCount).toBe(1);
    expect(monthCount).toBe(1);
    // 已有标签和 AI 新标签都应存在
    expect(yamlStr).toContain('ExistingTag');
    expect(yamlStr).toContain('AI-Tag');
  });

  it('Year/Month 标签应始终排在最前面', async () => {
    const content = '---\ncreated: 2026-04-21\ntags:\n  - ExistingTag\n  - AnotherTag\n---\n\n# Heading';
    const processor = unified().use(remarkParse).use(remarkFrontmatter);
    const ast = processor.parse(content);

    const mockAiService = {
      generateMetadata: jest.fn().mockResolvedValue({
        tags: ['AI-Tag'],
        summary: 'AI 摘要',
        categories: ['AI-分类'],
      }),
    };

    const result = await rule.apply(
      ast,
      {
        enabled: true,
        subRules: {
          tags: { enabled: true, ensureTimeTags: true, ai: { enabled: true } },
          summary: { enabled: true, ai: { enabled: true } },
          categories: { enabled: true, ai: { enabled: true } },
        },
      },
      'Test',
      fileInfo,
      mockAiService as any,
    );

    const yamlNode = result.children?.find((c: any) => c.type === 'yaml');
    const yamlStr = yamlNode?.value as string;
    // Year 应在 Month 前面，Month 应在任何非时间标签前面
    const yearIdx = yamlStr.indexOf('Year/2026');
    const monthIdx = yamlStr.indexOf('Month/04');
    const existingIdx = yamlStr.indexOf('ExistingTag');
    expect(yearIdx).toBeLessThan(monthIdx);
    expect(monthIdx).toBeLessThan(existingIdx);
  });
});