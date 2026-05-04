# AI-Formatted 字段设计

## 问题

当前格式化功能每次执行时，如果 AI 子规则启用，都会调用 AI 服务生成 tags/summary/categories。对于已经 AI 格式化过的文档，重复调用 AI 浪费用量且结果无明显差异。需要一个机制来标记文档是否已被 AI 格式化过，并据此跳过不必要的 AI 调用。

## 方案

在 frontmatter 中引入 `ai-formatted` 字段，记录 AI 格式化的时间。格式化时先检查该字段，已有值则跳过 AI 调用；本次调用了 AI 则写入/更新该字段。用户可通过删除该字段或清空其值来强制重新触发 AI 格式化。

## 详细设计

### 1. 类型定义（`src/types/index.ts`）

`FrontmatterSubRules` 新增 `aiFormatted` 子规则：

```typescript
aiFormatted: {
  enabled: boolean;        // 是否写入 ai-formatted 字段，默认 true
  skipAiIfPresent: boolean; // 已有值时是否跳过 AI 调用，默认 true
};
```

`DEFAULT_SUBRULES` 中增加默认值：

```typescript
aiFormatted: {
  enabled: true,
  skipAiIfPresent: true,
},
```

### 2. FrontmatterRule 核心逻辑（`src/rules/FrontmatterRule.ts`）

在 `apply()` 方法中，现有的 AI 调用判断逻辑（第 90-99 行）改为：

**步骤 1：检查 ai-formatted 是否存在且有值**

```typescript
const aiFormattedValue = yamlContent['ai-formatted'];
const hasAiFormatted = aiFormattedValue !== undefined
  && aiFormattedValue !== null
  && String(aiFormattedValue).trim() !== '';
```

**步骤 2：决定是否跳过 AI**

```typescript
const skipAi = cfg.subRules.aiFormatted.skipAiIfPresent && hasAiFormatted;
```

**步骤 3：计算 needAi 时加入 skipAi 条件**

```typescript
const needAi = !skipAi
  && ((cfg.subRules.tags.enabled && cfg.subRules.tags.ai.enabled)
    || (cfg.subRules.summary.enabled && cfg.subRules.summary.ai.enabled)
    || (cfg.subRules.categories.enabled && cfg.subRules.categories.ai.enabled));
```

**步骤 4：AI 调用后写入 ai-formatted**

在现有步骤 7（categories）和步骤 8（title）之间，新增：

```typescript
// 写入 ai-formatted
if (cfg.subRules.aiFormatted.enabled && aiResult) {
  yamlContent['ai-formatted'] = this.formatDate(Date.now());
}
```

仅在 `aiResult` 不为 null（即本次实际调用了 AI）时才写入。如果 `skipAi` 导致未调用 AI，`aiResult` 为 null，`ai-formatted` 保持原样不动。

### 3. 字段排序（`src/rules/FrontmatterRule.ts`）

`orderFields()` 方法中的 `orderedKeys` 数组，在 `updated` 后加入 `ai-formatted`：

```typescript
const orderedKeys = ['title', 'created', 'updated', 'ai-formatted', 'categories', 'tags'];
```

`knownKeys` 集合同步更新：

```typescript
const knownKeys = new Set([...orderedKeys, 'summary']);
```

### 4. 设置面板（`src/ui/SettingsTab.ts`）

在 Frontmatter 子规则设置区域，增加 `ai-formatted` 的配置项：

- **启用 ai-formatted 字段**（开关，对应 `aiFormatted.enabled`）
- **已有值时跳过 AI 调用**（开关，对应 `aiFormatted.skipAiIfPresent`）

放置在 `updated` 子规则之后、`tags` 子规则之前，与字段排序位置一致。

### 5. 字段规范化

`ai-formatted` 使用连字符命名（与 YAML 惯例一致），不参与 `normalizeFields` 的重命名逻辑，因为它不存在别名变体。

## 用户交互

- **强制重新触发 AI**：删除 `ai-formatted` 字段或将其值清空，下次格式化会重新调用 AI 并写入新时间
- **关闭跳过行为**：在设置中关闭"已有值时跳过 AI 调用"，则即使 `ai-formatted` 有值也会调用 AI
- **关闭字段写入**：在设置中关闭"启用 ai-formatted 字段"，则不写入该字段也不跳过 AI

## 影响范围

| 文件 | 变更类型 |
|------|----------|
| `src/types/index.ts` | 修改：新增 aiFormatted 子规则类型和默认值 |
| `src/rules/FrontmatterRule.ts` | 修改：AI 跳过逻辑、字段写入、排序 |
| `src/ui/SettingsTab.ts` | 修改：新增配置项 |
| `tests/rules/FrontmatterRule.test.ts` | 修改：新增测试用例 |

向后兼容：旧版配置中无 `aiFormatted` 子规则，`mergeConfig` 的深合并逻辑会使用默认值，不影响已有用户。
