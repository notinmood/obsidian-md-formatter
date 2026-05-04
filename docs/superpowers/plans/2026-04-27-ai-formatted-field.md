# AI-Formatted 字段实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 在 frontmatter 中增加 `ai-formatted` 字段，记录 AI 格式化时间，已有该字段时跳过 AI 调用以节省用量。

**架构：** 在 FrontmatterRule 的 apply 方法中，AI 调用前检查 `ai-formatted` 字段是否存在且有值；调用后若 aiResult 不为 null 则写入该字段。类型定义增加 `aiFormatted` 子规则配置，设置面板增加两个开关。

**技术栈：** TypeScript, Jest, Obsidian Plugin API

---

## 文件结构

| 文件 | 职责 | 变更类型 |
|------|------|----------|
| `src/types/index.ts` | 新增 `FrontmatterAiFormattedConfig` 类型和 `DEFAULT_SUBRULES.aiFormatted` 默认值 | 修改 |
| `src/rules/FrontmatterRule.ts` | AI 跳过逻辑、字段写入、字段排序 | 修改 |
| `src/ui/SettingsTab.ts` | 新增 ai-formatted 折叠配置面板 | 修改 |
| `tests/rules/FrontmatterRule.test.ts` | 新增 ai-formatted 相关测试用例 | 修改 |

---

### 任务 1：类型定义和默认值

**文件：**
- 修改：`src/types/index.ts`

- [ ] **步骤 1：编写失败的测试**

在 `tests/rules/FrontmatterRule.test.ts` 的"默认配置" describe 块内，在 `it('应该有正确的默认配置', ...)` 测试的 `expect(rule.defaultConfig).toEqual({...})` 中，`title` 子规则后增加 `aiFormatted` 默认值断言：

```typescript
// 在 title: { enabled: true, useFilename: true } 之后增加：
aiFormatted: {
  enabled: true,
  skipAiIfPresent: true,
},
```

- [ ] **步骤 2：运行测试验证失败**

运行：`npm test -- tests/rules/FrontmatterRule.test.ts -t "应该有正确的默认配置"`
预期：FAIL，因为 `rule.defaultConfig.subRules` 中尚无 `aiFormatted`

- [ ] **步骤 3：在类型文件中添加接口和默认值**

在 `src/types/index.ts` 的 `FrontmatterTitleConfig` 接口之后（第 107 行之后），新增：

```typescript
/**
 * Frontmatter 子规则配置 - AI 格式化标记
 */
export interface FrontmatterAiFormattedConfig {
  enabled: boolean;
  skipAiIfPresent: boolean;
}
```

在 `FrontmatterSubRules` 接口中（第 118 行 `title: FrontmatterTitleConfig;` 之后），新增：

```typescript
aiFormatted: FrontmatterAiFormattedConfig;
```

在 `DEFAULT_SUBRULES` 中（第 130 行 `title: { enabled: true, useFilename: true },` 之后），新增：

```typescript
aiFormatted: { enabled: true, skipAiIfPresent: true },
```

- [ ] **步骤 4：运行测试验证通过**

运行：`npm test -- tests/rules/FrontmatterRule.test.ts -t "应该有正确的默认配置"`
预期：PASS

- [ ] **步骤 5：Commit**

```bash
git add src/types/index.ts tests/rules/FrontmatterRule.test.ts
git commit -m "feat: 添加 aiFormatted 子规则类型定义和默认值（任务 1/5）"
```

---

### 任务 2：FrontmatterRule 中 AI 跳过逻辑和字段写入

**文件：**
- 修改：`src/rules/FrontmatterRule.ts`

- [ ] **步骤 1：编写失败的测试**

在 `tests/rules/FrontmatterRule.test.ts` 文件末尾新增 describe 块：

```typescript
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
});
```

- [ ] **步骤 2：运行测试验证失败**

运行：`npm test -- tests/rules/FrontmatterRule.test.ts -t "ai-formatted 字段"`
预期：FAIL，因为 `FrontmatterRule` 尚未实现 ai-formatted 相关逻辑

- [ ] **步骤 3：在 FrontmatterRule 中实现 AI 跳过逻辑和字段写入**

修改 `src/rules/FrontmatterRule.ts`，在 `apply()` 方法中做以下变更：

**变更 1**：在步骤 4（AI 调用，原第 89-99 行）之前，增加 ai-formatted 检查，修改 `needAi` 判断：

将原代码：
```typescript
        // 4. 一次性调用 AI，获取 tags/summary/categories
        const needAi = (cfg.subRules.tags.enabled && cfg.subRules.tags.ai.enabled)
          || (cfg.subRules.summary.enabled && cfg.subRules.summary.ai.enabled)
          || (cfg.subRules.categories.enabled && cfg.subRules.categories.ai.enabled);
        const aiResult = needAi && aiService
          ? await aiService.generateMetadata(
            this.extractBody(clonedAst),
            createdDate || '',
            this.normalizeTags(yamlContent.tags),
          )
          : null;
```

替换为：
```typescript
        // 4. 检查 ai-formatted 字段，决定是否跳过 AI
        const aiFormattedValue = yamlContent['ai-formatted'];
        const hasAiFormatted = aiFormattedValue !== undefined
          && aiFormattedValue !== null
          && String(aiFormattedValue).trim() !== '';
        const skipAi = cfg.subRules.aiFormatted.skipAiIfPresent && hasAiFormatted;

        // 5. 一次性调用 AI，获取 tags/summary/categories
        const needAi = !skipAi
          && ((cfg.subRules.tags.enabled && cfg.subRules.tags.ai.enabled)
            || (cfg.subRules.summary.enabled && cfg.subRules.summary.ai.enabled)
            || (cfg.subRules.categories.enabled && cfg.subRules.categories.ai.enabled));
        const aiResult = needAi && aiService
          ? await aiService.generateMetadata(
            this.extractBody(clonedAst),
            createdDate || '',
            this.normalizeTags(yamlContent.tags),
          )
          : null;
```

**变更 2**：在步骤 7（categories）和步骤 8（title）之间，插入 ai-formatted 写入逻辑：

在原第 114 行 `}` 之后、原第 117 行 `// 8. 执行 title 子规则` 之前，插入：

```typescript
        // 7.5 写入 ai-formatted（仅在本次实际调用了 AI 时）
        if (cfg.subRules.aiFormatted.enabled && aiResult) {
          yamlContent['ai-formatted'] = this.formatDate(Date.now());
        }
```

**变更 3**：修改 `orderFields()` 方法中的 `orderedKeys` 数组（原第 275 行），在 `updated` 后加入 `ai-formatted`：

将：
```typescript
    const orderedKeys = ['title', 'created', 'updated', 'categories', 'tags'];
```

改为：
```typescript
    const orderedKeys = ['title', 'created', 'updated', 'ai-formatted', 'categories', 'tags'];
```

- [ ] **步骤 4：运行测试验证通过**

运行：`npm test -- tests/rules/FrontmatterRule.test.ts -t "ai-formatted 字段"`
预期：PASS

- [ ] **步骤 5：运行全部测试确认无回归**

运行：`npm test`
预期：全部 PASS

- [ ] **步骤 6：Commit**

```bash
git add src/rules/FrontmatterRule.ts tests/rules/FrontmatterRule.test.ts
git commit -m "feat: 实现 ai-formatted 字段逻辑——AI 跳过和写入（任务 2/5）"
```

---

### 任务 3：设置面板中增加 ai-formatted 配置项

**文件：**
- 修改：`src/ui/SettingsTab.ts`

- [ ] **步骤 1：在 renderFrontmatterRuleSettings 方法中添加 ai-formatted 折叠面板**

在 `src/ui/SettingsTab.ts` 的 `renderFrontmatterRuleSettings` 方法中，在 `// updated` 折叠面板（第 208-210 行）之后、`// tags` 折叠面板（第 213 行）之前，插入：

```typescript
    // ai-formatted
    const aiFormattedItems: { name: string; key: string; desc: string; value: boolean }[] = [
      { name: '启用 ai-formatted 字段', key: 'aiFormatted.enabled', desc: 'AI 格式化后写入 ai-formatted 时间标记', value: getSubVal('aiFormatted.enabled', true) },
      { name: '已有值时跳过 AI 调用', key: 'aiFormatted.skipAiIfPresent', desc: '已有 ai-formatted 时间值时跳过 AI 调用，节省 AI 用量', value: getSubVal('aiFormatted.skipAiIfPresent', true) },
    ];
    this.renderCollapsibleSetting(containerEl, 'AI 格式化标记 (ai-formatted)', '标记 AI 格式化时间，避免重复调用', subRules, aiFormattedItems);
```

- [ ] **步骤 2：运行构建验证**

运行：`npm run build`
预期：构建成功，无类型错误

- [ ] **步骤 3：Commit**

```bash
git add src/ui/SettingsTab.ts
git commit -m "feat: 设置面板增加 ai-formatted 配置项（任务 3/5）"
```

---

### 任务 4：更新默认配置快照测试

**文件：**
- 修改：`tests/rules/FrontmatterRule.test.ts`

- [ ] **步骤 1：确认默认配置测试已包含 aiFormatted**

任务 1 中已在"默认配置"测试的 `toEqual` 断言中添加了 `aiFormatted` 默认值。运行测试确认：

运行：`npm test -- tests/rules/FrontmatterRule.test.ts -t "默认配置"`
预期：PASS，`aiFormatted: { enabled: true, skipAiIfPresent: true }` 已在断言中

- [ ] **步骤 2：Commit（如有变更）**

如果默认配置测试已在任务 1 中更新且已提交，此步骤可跳过。否则：

```bash
git add tests/rules/FrontmatterRule.test.ts
git commit -m "test: 更新默认配置快照包含 aiFormatted（任务 4/5）"
```

---

### 任务 5：集成验证

**文件：**
- 无新增

- [ ] **步骤 1：运行全部测试**

运行：`npm test`
预期：全部 PASS

- [ ] **步骤 2：运行生产构建**

运行：`npm run build`
预期：构建成功，无类型错误

- [ ] **步骤 3：Commit**

```bash
git add -A
git commit -m "chore: ai-formatted 功能集成验证通过（任务 5/5）"
```
