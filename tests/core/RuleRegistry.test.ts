// tests/core/RuleRegistry.test.ts
import { RuleRegistry } from '../../src/core/RuleRegistry';
import { FormatRule, Node } from '../../src/types';

describe('RuleRegistry', () => {
  let registry: RuleRegistry;

  beforeEach(() => {
    registry = new RuleRegistry();
  });

  describe('register', () => {
    it('应该成功注册规则', () => {
      const rule: FormatRule = {
        name: 'test-rule',
        priority: 10,
        description: 'Test rule',
        defaultConfig: {},
        apply: (ast: Node) => ast,
      };

      registry.register(rule);
      expect(registry.get('test-rule')).toBe(rule);
    });

    it('应该拒绝重复注册同名规则', () => {
      const rule: FormatRule = {
        name: 'duplicate',
        priority: 10,
        description: 'Duplicate rule',
        defaultConfig: {},
        apply: (ast: Node) => ast,
      };

      registry.register(rule);
      expect(() => registry.register(rule)).toThrow('Rule "duplicate" already registered');
    });
  });

  describe('getAll', () => {
    it('应该按优先级排序返回所有规则', () => {
      const rule1: FormatRule = {
        name: 'rule-1',
        priority: 20,
        description: 'Rule 1',
        defaultConfig: {},
        apply: (ast: Node) => ast,
      };
      const rule2: FormatRule = {
        name: 'rule-2',
        priority: 10,
        description: 'Rule 2',
        defaultConfig: {},
        apply: (ast: Node) => ast,
      };

      registry.register(rule1);
      registry.register(rule2);

      const all = registry.getAll();
      expect(all).toHaveLength(2);
      expect(all[0].name).toBe('rule-2');
      expect(all[1].name).toBe('rule-1');
    });
  });

  describe('unregister', () => {
    it('应该成功注销规则', () => {
      const rule: FormatRule = {
        name: 'to-remove',
        priority: 10,
        description: 'Rule to remove',
        defaultConfig: {},
        apply: (ast: Node) => ast,
      };

      registry.register(rule);
      registry.unregister('to-remove');
      expect(registry.get('to-remove')).toBeUndefined();
    });
  });
});