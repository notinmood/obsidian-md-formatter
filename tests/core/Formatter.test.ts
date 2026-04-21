// tests/core/Formatter.test.ts
import { Formatter } from '../../src/core/Formatter';
import { RuleRegistry } from '../../src/core/RuleRegistry';
import { FormatRule, PluginSettings, Node, RuleConfig } from '../../src/types';

describe('Formatter', () => {
  let registry: RuleRegistry;
  let formatter: Formatter;

  beforeEach(() => {
    registry = new RuleRegistry();
    formatter = new Formatter(registry);
  });

  describe('format', () => {
    it('应该返回格式化后的内容', async () => {
      const input = '# Test\nContent';
      const settings: PluginSettings = {
        fileSizeThreshold: 500,
        chunkSize: 100,
        autoDetectEncoding: true,
        fallbackEncoding: 'utf-8',
        rules: {},
      };

      const result = await formatter.format(input, settings);
      expect(result.success).toBe(true);
      expect(result.content).toBeDefined();
    });

    it('应该应用启用的规则', async () => {
      const mockRule: FormatRule = {
        name: 'mock',
        priority: 10,
        description: 'Mock rule',
        defaultConfig: {},
        apply: (ast: Node, _config: RuleConfig) => ast,
      };
      registry.register(mockRule);

      const input = '# Test';
      const settings: PluginSettings = {
        fileSizeThreshold: 500,
        chunkSize: 100,
        autoDetectEncoding: true,
        fallbackEncoding: 'utf-8',
        rules: {
          mock: { enabled: true },
        },
      };

      const result = await formatter.format(input, settings);
      expect(result.success).toBe(true);
    });

    it('应该跳过禁用的规则', async () => {
      let ruleApplied = false;
      const mockRule: FormatRule = {
        name: 'disabled-rule',
        priority: 10,
        description: 'Disabled rule',
        defaultConfig: {},
        apply: (ast: Node, _config: RuleConfig) => {
          ruleApplied = true;
          return ast;
        },
      };
      registry.register(mockRule);

      const input = '# Test';
      const settings: PluginSettings = {
        fileSizeThreshold: 500,
        chunkSize: 100,
        autoDetectEncoding: true,
        fallbackEncoding: 'utf-8',
        rules: {
          'disabled-rule': { enabled: false },
        },
      };

      await formatter.format(input, settings);
      expect(ruleApplied).toBe(false);
    });

    it('应该使用 - 作为无序列表标记', async () => {
      const input = '* Item 1\n* Item 2\n* Item 3';
      const settings: PluginSettings = {
        fileSizeThreshold: 500,
        chunkSize: 100,
        autoDetectEncoding: true,
        fallbackEncoding: 'utf-8',
        rules: {},
      };

      const result = await formatter.format(input, settings);
      expect(result.success).toBe(true);
      expect(result.content).toContain('- Item 1');
      expect(result.content).toContain('- Item 2');
      expect(result.content).toContain('- Item 3');
    });

    it('应该清理多余空行，不同块元素间只保留一个空行', async () => {
      const input = '# Title\n\n\n\nParagraph content';
      const settings: PluginSettings = {
        fileSizeThreshold: 500,
        chunkSize: 100,
        autoDetectEncoding: true,
        fallbackEncoding: 'utf-8',
        rules: {},
      };

      const result = await formatter.format(input, settings);
      expect(result.success).toBe(true);
      // 标题和段落之间只保留一个空行
      const lines = result.content!.split('\n');
      const titleIndex = lines.findIndex(line => line.startsWith('#'));
      // 标题后应该只有一个空行，然后是段落内容
      expect(lines[titleIndex + 1]).toBe('');
      expect(lines[titleIndex + 2].trim()).not.toBe('');
    });

    it('相同类型块元素之间不应有空行', async () => {
      const input = 'Paragraph 1\n\n\n\nParagraph 2';
      const settings: PluginSettings = {
        fileSizeThreshold: 500,
        chunkSize: 100,
        autoDetectEncoding: true,
        fallbackEncoding: 'utf-8',
        rules: {},
      };

      const result = await formatter.format(input, settings);
      expect(result.success).toBe(true);
      // 两个段落之间不应有空行（相同类型）
      const lines = result.content!.split('\n');
      // 找到第一个段落结束的位置
      const p1Index = lines.findIndex(line => line.includes('Paragraph 1'));
      // 下一个非空行应该是 Paragraph 2
      const nextNonEmpty = lines.slice(p1Index + 1).find(line => line.trim() !== '');
      expect(nextNonEmpty).toContain('Paragraph 2');
    });

    it('应该正确保留 YAML frontmatter 使用 --- 标记', async () => {
      const input = '---\nupdate: 2026-04-21 18:12:48 星期二\n---\n\n# Title';
      const settings: PluginSettings = {
        fileSizeThreshold: 500,
        chunkSize: 100,
        autoDetectEncoding: true,
        fallbackEncoding: 'utf-8',
        rules: {},
      };

      const result = await formatter.format(input, settings);
      expect(result.success).toBe(true);
      // frontmatter 应该以 --- 开始和结束
      expect(result.content).toMatch(/^---\n/);
      expect(result.content).toContain('\n---\n');
      // 内容应该保留
      expect(result.content).toContain('update: 2026-04-21 18:12:48 星期二');
    });

    it('段落后面接二级标题，应该只保留一个空行', async () => {
      const input = '## 标题A\n\n正文内容\n\n\n\n## 标题B';
      const settings: PluginSettings = {
        fileSizeThreshold: 500,
        chunkSize: 100,
        autoDetectEncoding: true,
        fallbackEncoding: 'utf-8',
        rules: {},
      };

      const result = await formatter.format(input, settings);
      expect(result.success).toBe(true);
      console.log('输出结果(无规则):', result.content);

      // 检查段落和标题B之间的空行数
      const lines = result.content!.split('\n');
      const contentIndex = lines.findIndex(line => line.includes('正文内容'));
      const titleBIndex = lines.findIndex(line => line.includes('标题B'));

      // 计算两个非空行之间的空行数
      let blankLinesBetween = 0;
      for (let i = contentIndex + 1; i < titleBIndex; i++) {
        if (lines[i].trim() === '') {
          blankLinesBetween++;
        }
      }

      // 段落和标题是不同类型块元素，应该只有1个空行
      expect(blankLinesBetween).toBe(1);
    });

    it('使用完整规则链时，段落后面接二级标题应该只保留一个空行', async () => {
      // 注册完整的规则链
      const { registerBuiltinRules } = await import('../../src/rules');
      registerBuiltinRules(registry);

      const input = '## 标题A\n\n正文内容\n\n\n\n## 标题B';
      const settings: PluginSettings = {
        fileSizeThreshold: 500,
        chunkSize: 100,
        autoDetectEncoding: true,
        fallbackEncoding: 'utf-8',
        rules: {},
      };

      const result = await formatter.format(input, settings);
      expect(result.success).toBe(true);
      console.log('输出结果(完整规则):', result.content);

      // 检查段落和标题B之间的空行数
      const lines = result.content!.split('\n');
      const contentIndex = lines.findIndex(line => line.includes('正文内容'));
      const titleBIndex = lines.findIndex(line => line.includes('标题B'));

      // 计算两个非空行之间的空行数
      let blankLinesBetween = 0;
      for (let i = contentIndex + 1; i < titleBIndex; i++) {
        if (lines[i].trim() === '') {
          blankLinesBetween++;
        }
      }

      // 段落和标题是不同类型块元素，应该只有1个空行
      expect(blankLinesBetween).toBe(1);
    });
  });
});
