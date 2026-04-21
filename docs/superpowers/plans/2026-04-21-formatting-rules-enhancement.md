# 格式化规则增强 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 增强 Markdown 格式化规则：frontmatter 使用 `---` 标记、列表使用 `-` 标记、优化空行控制。

**架构：** 新增 FrontmatterRule，修改 Formatter 配置 remark-stringify 的 bullet 选项，修改 ParagraphRule/HeadingRule 的空行逻辑，新增空行清理后处理。

**技术栈：** TypeScript, remark/unified, unist-util-visit

---

## 文件结构

| 文件 | 职责 | 变更类型 |
|------|------|----------|
| `src/rules/FrontmatterRule.ts` | Frontmatter 格式化规则 | 新增 |
| `src/rules/ParagraphRule.ts` | 修改 blankLinesBetween 默认值 | 修改 |
| `src/rules/HeadingRule.ts` | 移除标题后空行逻辑 | 修改 |
| `src/core/Formatter.ts` | 配置 bullet 选项，新增空行清理 | 修改 |
| `src/rules/index.ts` | 注册 FrontmatterRule | 修改 |
| `src/ui/SettingsTab.ts` | 添加 frontmatter 规则开关 | 修改 |
| `tests/rules/FrontmatterRule.test.ts` | Frontmatter 规则测试 | 新增 |
| `tests/rules/ParagraphRule.test.ts` | 更新默认配置测试 | 修改 |
| `tests/core/Formatter.test.ts` | 更新格式化输出测试 | 修改 |

---

### 任务 1：修改 ParagraphRule 默认配置

**文件：**
- 修改：`src/rules/ParagraphRule.ts:14-17`
- 修改：`tests/rules/ParagraphRule.test.ts:23-26`

- [ ] **步骤 1：修改 ParagraphRule 默认配置**

修改 `src/rules/ParagraphRule.ts` 第 14-17 行：

```typescript
defaultConfig = {
  blankLinesBetween: 0,  // 默认不添加空行
  trimTrailingWhitespace: true,
};
```

- [ ] **步骤 2：更新 ParagraphRule 测试**

修改 `tests/rules/ParagraphRule.test.ts` 第 23-26 行：

```typescript
expect(rule.defaultConfig).toEqual({
  blankLinesBetween: 0,
  trimTrailingWhitespace: true,
});
```

- [ ] **步骤 3：运行测试验证通过**

运行：`npm test -- tests/rules/ParagraphRule.test.ts`
预期：PASS

- [ ] **步骤 4：Commit**

```bash
git add src/rules/ParagraphRule.ts tests/rules/ParagraphRule.test.ts
git commit -m "feat: ParagraphRule 默认不添加段落间空行"
```

---

### 任务 2：修改 HeadingRule 空行逻辑

**文件：**
- 修改：`src/rules/HeadingRule.ts`
- 修改：`tests/rules/HeadingRule.test.ts`

- [ ] **步骤 1：修改 HeadingRule 默认配置**

修改 `src/rules/HeadingRule.ts` 第 14-19 行，移除 `blankLinesAfter` 配置：

```typescript
defaultConfig = {
  blankLinesBefore: 1,
  blankLinesBeforeH1: 0,
  forceAtxStyle: true,
};
```

- [ ] **步骤 2：简化 HeadingRule apply 方法**

修改 `src/rules/HeadingRule.ts` 第 21-79 行，移除标题后添加空行的逻辑。当前代码只处理标题前空行，无需修改 apply 方法逻辑，只需移除未使用的 `blankLinesAfter` 配置。

完整代码保持不变，只是 defaultConfig 中移除 `blankLinesAfter`。

- [ ] **步骤 3：更新 HeadingRule 测试**

修改 `tests/rules/HeadingRule.test.ts` 第 24-29 行：

```typescript
expect(rule.defaultConfig).toEqual({
  blankLinesBefore: 1,
  blankLinesBeforeH1: 0,
  forceAtxStyle: true,
});
```

- [ ] **步骤 4：运行测试验证通过**

运行：`npm test -- tests/rules/HeadingRule.test.ts`
预期：PASS

- [ ] **步骤 5：Commit**

```bash
git add src/rules/HeadingRule.ts tests/rules/HeadingRule.test.ts
git commit -m "feat: HeadingRule 移除标题后空行配置"
```

---

### 任务 3：配置 remark-stringify 的 bullet 选项

**文件：**
- 修改：`src/core/Formatter.ts`
- 修改：`tests/core/Formatter.test.ts`

- [ ] **步骤 1：修改 Formatter 配置 remark-stringify**

修改 `src/core/Formatter.ts` 第 19 行，添加 bullet 选项：

```typescript
const processor = unified()
  .use(remarkParse)
  .use(remarkStringify, {
    bullet: '-',  // 无序列表使用 - 标记
  });
```

- [ ] **步骤 2：编写测试验证列表标记**

查看 `tests/core/Formatter.test.ts`，添加或修改测试验证列表输出使用 `-` 标记。

- [ ] **步骤 3：运行测试验证通过**

运行：`npm test -- tests/core/Formatter.test.ts`
预期：PASS

- [ ] **步骤 4：Commit**

```bash
git add src/core/Formatter.ts tests/core/Formatter.test.ts
git commit -m "feat: 配置 remark-stringify 使用 - 作为列表标记"
```

---

### 任务 4：创建 FrontmatterRule

**文件：**
- 创建：`src/rules/FrontmatterRule.ts`
- 创建：`tests/rules/FrontmatterRule.test.ts`

- [ ] **步骤 1：创建 FrontmatterRule**

创建 `src/rules/FrontmatterRule.ts`：

```typescript
// src/rules/FrontmatterRule.ts
import { visit } from 'unist-util-visit';
import type { FormatRule, RuleConfig, AstNode } from '../types';

/**
 * Frontmatter 格式化规则
 * 确保 YAML frontmatter 使用 --- 标记
 * remark-parse 和 remark-stringify 已正确处理 YAML frontmatter，
 * 此规则主要用于确保 frontmatter 存在时的格式一致性
 */
export class FrontmatterRule implements FormatRule {
  name = 'frontmatter';
  priority = 5;  // 最高优先级，最先处理
  description = '确保 YAML frontmatter 使用 --- 标记';

  defaultConfig = {
    enabled: true,
  };

  apply(ast: AstNode, config: RuleConfig): AstNode {
    // remark 解析 frontmatter 时生成 type: 'yaml' 的节点
    // remark-stringify 默认使用 --- 作为 YAML 节点的边界标记
    // 无需额外处理，直接返回 AST
    if (config.enabled === false) {
      return ast;
    }

    return ast;
  }
}
```

- [ ] **步骤 2：创建 FrontmatterRule 测试**

创建 `tests/rules/FrontmatterRule.test.ts`：

```typescript
// tests/rules/FrontmatterRule.test.ts
import { FrontmatterRule } from '../../src/rules/FrontmatterRule';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';

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
      });
    });
  });

  describe('apply方法', () => {
    it('应该能正确处理包含 frontmatter 的文档', () => {
      const content = '---\ntitle: Test\n---\n\n# Heading';
      const processor = unified().use(remarkParse).use(remarkStringify);
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
});
```

- [ ] **步骤 3：运行测试验证通过**

运行：`npm test -- tests/rules/FrontmatterRule.test.ts`
预期：PASS

- [ ] **步骤 4：Commit**

```bash
git add src/rules/FrontmatterRule.ts tests/rules/FrontmatterRule.test.ts
git commit -m "feat: 新增 FrontmatterRule 确保 YAML 使用 --- 标记"
```

---

### 任务 5：注册 FrontmatterRule

**文件：**
- 修改：`src/rules/index.ts`

- [ ] **步骤 1：修改 index.ts 导入和注册 FrontmatterRule**

修改 `src/rules/index.ts`：

```typescript
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
```

- [ ] **步骤 2：运行测试验证通过**

运行：`npm test`
预期：所有测试通过

- [ ] **步骤 3：Commit**

```bash
git add src/rules/index.ts
git commit -m "feat: 注册 FrontmatterRule 到规则注册中心"
```

---

### 任务 6：更新 SettingsTab

**文件：**
- 修改：`src/ui/SettingsTab.ts`

- [ ] **步骤 1：在 SettingsTab 中添加 frontmatter 规则开关**

修改 `src/ui/SettingsTab.ts` 第 102-109 行，添加 frontmatter 规则：

```typescript
const rules = [
  { name: 'frontmatter', label: 'Frontmatter 格式化' },
  { name: 'heading', label: '标题规范化' },
  { name: 'paragraph', label: '段落格式化' },
  { name: 'list', label: '列表格式化' },
  { name: 'codeBlock', label: '代码块处理' },
  { name: 'table', label: '表格格式化' },
  { name: 'link', label: '链接/图片' },
];
```

- [ ] **步骤 2：运行构建验证**

运行：`npm run build`
预期：构建成功

- [ ] **步骤 3：Commit**

```bash
git add src/ui/SettingsTab.ts
git commit -m "feat: SettingsTab 添加 frontmatter 规则开关"
```

---

### 任务 7：实现统一空行清理后处理

**文件：**
- 修改：`src/core/Formatter.ts`
- 修改：`tests/core/Formatter.test.ts`

- [ ] **步骤 1：在 Formatter 中添加空行清理后处理**

修改 `src/core/Formatter.ts`，在规则应用后添加空行清理逻辑：

```typescript
// src/core/Formatter.ts
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import type { Node } from 'unist';
import type { FormatRule, PluginSettings, FormatResult, RuleConfig, AstNode } from '../types';
import { RuleRegistry } from './RuleRegistry';

/**
 * 格式化器核心
 * 负责解析Markdown、应用规则、生成格式化结果
 */
export class Formatter {
  constructor(private registry: RuleRegistry) {}

  async format(content: string, settings: PluginSettings): Promise<FormatResult> {
    try {
      // 使用 unified 处理器
      const processor = unified()
        .use(remarkParse)
        .use(remarkStringify, {
          bullet: '-',  // 无序列表使用 - 标记
        });
      const ast = processor.parse(content);

      const enabledRules = this.getEnabledRules(settings.rules);

      let transformedAst: Node = ast;
      let rulesApplied = 0;

      for (const rule of enabledRules) {
        const ruleConfig = settings.rules[rule.name] || { enabled: true };
        transformedAst = rule.apply(transformedAst as unknown as AstNode, ruleConfig) as unknown as Node;
        rulesApplied++;
      }

      // 空行清理后处理：确保不同块元素间最多只有 1 个空行
      transformedAst = this.cleanupBlankLines(transformedAst as unknown as AstNode) as unknown as Node;

      const result = processor.stringify(transformedAst as never);

      return {
        success: true,
        content: String(result),
        stats: {
          rulesApplied,
          changesMade: 0,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private getEnabledRules(ruleSettings: Record<string, RuleConfig>): FormatRule[] {
    const allRules = this.registry.getAll();
    return allRules.filter((rule) => {
      const config = ruleSettings[rule.name];
      return config?.enabled !== false;
    });
  }

  /**
   * 清理多余的空白段落
   * 确保不同类型块元素之间最多只有 1 个空行
   * 相同类型块元素之间的空白段落移除
   */
  private cleanupBlankLines(ast: AstNode): AstNode {
    if (!ast.children || !Array.isArray(ast.children)) {
      return ast;
    }

    const newChildren: AstNode[] = [];
    let prevType: string | null = null;
    let blankCount = 0;

    for (const child of ast.children) {
      const isBlank = this.isBlankNode(child);

      if (isBlank) {
        blankCount++;
        // 暂不添加空白节点，等下一个非空白节点确定
      } else {
        const currentType = child.type;

        // 如果前面有空白节点，根据前后节点类型决定是否保留
        if (blankCount > 0) {
          // 不同类型块元素之间保留 1 个空行
          if (prevType !== null && prevType !== currentType) {
            newChildren.push(this.createBlankParagraph());
          }
          // 相同类型块元素之间不保留空行
          blankCount = 0;
        }

        newChildren.push(child);
        prevType = currentType;
      }
    }

    // 处理末尾的空白节点（通常不保留）
    ast.children = newChildren;
    return ast;
  }

  /**
   * 检查节点是否为空白
   */
  private isBlankNode(node: AstNode): boolean {
    if (node.type === 'paragraph') {
      if (!node.children || !Array.isArray(node.children)) {
        return true;
      }
      return node.children.every(
        (child: AstNode) =>
          child.type === 'text' &&
          typeof child.value === 'string' &&
          (child.value ?? '').trim() === ''
      );
    }
    if (node.type === 'text') {
      return typeof node.value === 'string' && (node.value ?? '').trim() === '';
    }
    return false;
  }

  /**
   * 创建空白段落
   */
  private createBlankParagraph(): AstNode {
    return {
      type: 'paragraph',
      children: [
        {
          type: 'text',
          value: '',
        },
      ],
    };
  }
}
```

- [ ] **步骤 2：添加空行清理测试**

在 `tests/core/Formatter.test.ts` 中添加测试验证空行清理效果。

- [ ] **步骤 3：运行测试验证通过**

运行：`npm test -- tests/core/Formatter.test.ts`
预期：PASS

- [ ] **步骤 4：Commit**

```bash
git add src/core/Formatter.ts tests/core/Formatter.test.ts
git commit -m "feat: Formatter 添加空行清理后处理"
```

---

### 任务 8：运行所有测试并构建

- [ ] **步骤 1：运行所有测试**

运行：`npm test`
预期：所有测试通过

- [ ] **步骤 2：运行构建**

运行：`npm run build`
预期：构建成功

- [ ] **步骤 3：最终 Commit（如有未提交的变更）**

```bash
git status
# 如有未提交变更，提交
git add -A
git commit -m "chore: 完成格式化规则增强"
```