// src/rules/index.ts
import type { RuleRegistry } from '../core/RuleRegistry';
import { FrontmatterRule } from './FrontmatterRule';
import { HeadingRule } from './HeadingRule';
import { ParagraphRule } from './ParagraphRule';
import { ListRule } from './ListRule';
import { CodeBlockRule } from './CodeBlockRule';
import { TableRule } from './TableRule';
import { LinkRule } from './LinkRule';

/**
 * 注册内置规则到规则注册中心
 */
export function registerBuiltinRules(registry: RuleRegistry): void {
  registry.register(new FrontmatterRule());
  registry.register(new HeadingRule());
  registry.register(new ParagraphRule());
  registry.register(new ListRule());
  registry.register(new CodeBlockRule());
  registry.register(new TableRule());
  registry.register(new LinkRule());
}

export { FrontmatterRule } from './FrontmatterRule';
export { HeadingRule } from './HeadingRule';
export { ParagraphRule } from './ParagraphRule';
export { ListRule } from './ListRule';
export { CodeBlockRule } from './CodeBlockRule';
export { TableRule } from './TableRule';
export { LinkRule } from './LinkRule';