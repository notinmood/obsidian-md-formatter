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
  });
});
