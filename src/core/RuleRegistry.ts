// src/core/RuleRegistry.ts
import type { FormatRule } from '../types';

/**
 * 规则注册中心
 * 管理所有格式化规则，支持动态注册/注销
 */
export class RuleRegistry {
  private rules: Map<string, FormatRule> = new Map();

  /**
   * 注册规则
   */
  register(rule: FormatRule): void {
    if (this.rules.has(rule.name)) {
      throw new Error(`Rule "${rule.name}" already registered`);
    }
    this.rules.set(rule.name, rule);
  }

  /**
   * 注销规则
   */
  unregister(name: string): void {
    this.rules.delete(name);
  }

  /**
   * 获取指定规则
   */
  get(name: string): FormatRule | undefined {
    return this.rules.get(name);
  }

  /**
   * 获取所有规则（按优先级排序）
   */
  getAll(): FormatRule[] {
    return Array.from(this.rules.values()).sort((a, b) => a.priority - b.priority);
  }

  /**
   * 检查规则是否存在
   */
  has(name: string): boolean {
    return this.rules.has(name);
  }
}