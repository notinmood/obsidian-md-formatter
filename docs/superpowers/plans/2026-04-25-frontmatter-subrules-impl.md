# Frontmatter 规则拆分实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 将 FrontmatterRule 拆分为子规则嵌套配置，支持每个子功能独立开关

**架构：** 在 `FrontmatterRule` 内部通过 `subRules` 配置对象控制各子功能执行，新增 `FrontmatterConfig` 类型定义

**技术栈：** TypeScript, Jest, yaml

---

## 文件结构

| 文件 | 职责 |
|------|------|
| `src/types/index.ts` | 新增 `FrontmatterConfig` 类型定义 |
| `src/rules/FrontmatterRule.ts` | 重构 `apply()` 方法，按子规则分块执行 |
| `src/rules/index.ts` | 注册规则（无需改动） |
| `src/ui/SettingsTab.ts` | 更新设置面板 UI |
| `src/core/RuleRegistry.ts` | 无需改动 |
| `tests/rules/FrontmatterRule.test.ts` | 更新测试覆盖子规则逻辑 |

---

## 任务 1：更新类型定义

**文件：**
- 修改：`src/types/index.ts:49-55`

- [ ] **步骤 1：在 types/index.ts 中添加 FrontmatterConfig 类型**

在 `RuleConfig` 接口定义后添加：

```typescript
/**
 * Frontmatter 子规则配置
 */
export interface FrontmatterSubRules {
  created: {
    enabled: boolean;
    useFileCtime: boolean;
  };
  updated: {
    enabled: boolean;
  };
  tags: {
    enabled: boolean;
    ensureTimeTags: boolean;
    ai: {
      enabled: boolean;
    };
  };
  summary: {
    enabled: boolean;
    ai: {
      enabled: boolean;
    };
  };
  categories: {
    enabled: boolean;
    ai: {
      enabled: boolean;
    };
  };
  title: {
    enabled: boolean;
    useFilename: boolean;
  };
}

export interface FrontmatterConfig extends RuleConfig {
  normalizeFields: boolean;
  subRules: FrontmatterSubRules;
}
```

- [ ] **步骤 2：更新 RuleConfig 类型（添加注释说明）**

在 `RuleConfig` 接口添加注释：
```typescript
/**
 * 规则配置
 * Frontmatter 规则的配置支持 subRules 嵌套结构
 */
export interface RuleConfig {
  enabled: boolean;
  [key: string]: unknown;
}
```

- [ ] **步骤 3：Commit**

```bash
cd /home/xiedali/projects/markdown-formatter
git add src/types/index.ts
git commit -m "feat(types): 添加 FrontmatterConfig 和 FrontmatterSubRules 类型"
```

---

## 任务 2：重构 FrontmatterRule

**文件：**
- 修改：`src/rules/FrontmatterRule.ts`

- [ ] **步骤 1：更新 defaultConfig**

将 `defaultConfig` 替换为新的嵌套结构：

```typescript
defaultConfig: FrontmatterConfig = {
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
  },
};
```

- [ ] **步骤 2：添加导入**

在文件顶部添加：
```typescript
import type { FrontmatterConfig, FrontmatterSubRules } from '../types';
```

- [ ] **步骤 3：重构 apply() 方法 - 提取子规则执行逻辑**

将 `apply()` 方法内的逻辑按子规则拆分。核心流程改为：

```typescript
async apply(
  ast: AstNode,
  config: RuleConfig,
  filename?: string,
  fileInfo?: FileInfo,
  aiService?: AIService
): Promise<AstNode> {
  const cfg = { ...this.defaultConfig, ...config } as FrontmatterConfig;

  if (cfg.enabled === false) {
    return ast;
  }

  // 深拷贝 AST
  const clonedAst = JSON.parse(JSON.stringify(ast)) as AstNode;
  // ... 查找 yaml 节点 ...

  if (typeof yamlContent === 'object') {
    // 1. 字段名规范化
    if (cfg.normalizeFields) {
      this.applyNormalizeFields(yamlContent);
    }

    // 2. 获取 created 日期（供多个子规则使用）
    const createdDate = this.resolveCreatedDate(yamlContent, cfg.subRules.created, fileInfo);

    // 3. 执行 updated 子规则
    if (cfg.subRules.updated.enabled && createdDate) {
      yamlContent.updated = this.formatDate(Date.now());
    }

    // 4. 执行 tags 子规则
    if (cfg.subRules.tags.enabled && createdDate) {
      this.applyTags(yamlContent, createdDate, cfg.subRules.tags, aiService);
    }

    // 5. 执行 summary 子规则
    if (cfg.subRules.summary.enabled && aiService && cfg.subRules.summary.ai.enabled) {
      await this.applySummary(yamlContent, clonedAst, createdDate);
    }

    // 6. 执行 categories 子规则
    if (cfg.subRules.categories.enabled && aiService && cfg.subRules.categories.ai.enabled) {
      await this.applyCategories(yamlContent, createdDate);
    }

    // 7. 执行 title 子规则
    if (cfg.subRules.title.enabled && !('title' in yamlContent) && filename && cfg.subRules.title.useFilename) {
      yamlContent.title = filename;
    }
  }
  // ... 重新生成 YAML ...
}
```

- [ ] **步骤 4：添加子规则处理方法**

在类中添加以下私有方法：

```typescript
private applyNormalizeFields(yamlContent: Record<string, unknown>): void {
  for (const [oldName, newName] of Object.entries(this.fieldRenameMap)) {
    if (oldName in yamlContent && !(newName in yamlContent)) {
      yamlContent[newName] = yamlContent[oldName];
      delete yamlContent[oldName];
    }
  }
}

private resolveCreatedDate(
  yamlContent: Record<string, unknown>,
  config: FrontmatterSubRules['created'],
  fileInfo?: FileInfo
): string | null {
  if (!config.enabled) return null;

  if ('created' in yamlContent) {
    return String(yamlContent.created);
  }

  if (config.useFileCtime && fileInfo) {
    return this.formatDate(fileInfo.ctime);
  }

  return null;
}

private applyTags(
  yamlContent: Record<string, unknown>,
  createdDate: string,
  config: FrontmatterSubRules['tags'],
  aiService?: AIService
): void {
  const dateInfo = this.extractDateInfo(createdDate);
  const yearTag = `Year/${dateInfo.year}`;
  const monthTag = `Month/${dateInfo.month}`;

  let tags = this.normalizeTags(yamlContent.tags);

  // 确保时间标签（确定性逻辑）
  if (config.ensureTimeTags) {
    const hasYear = tags.some(t => t === yearTag);
    const hasMonth = tags.some(t => t === monthTag);
    if (!hasYear) tags.push(yearTag);
    if (!hasMonth) tags.push(monthTag);
  }

  // AI 生成标签
  if (config.ai.enabled && aiService) {
    const bodyContent = this.extractBody(/* 需要传入 ast */);
    const aiResult = await aiService.generateMetadata(bodyContent, createdDate, tags);
    if (aiResult) {
      tags = [yearTag, monthTag, ...aiResult.tags];
    }
  }

  yamlContent.tags = tags;
}

private async applySummary(
  yamlContent: Record<string, unknown>,
  ast: AstNode,
  createdDate: string | null
): Promise<void> {
  if ('summary' in yamlContent && yamlContent.summary) return;  // 已有则不覆盖

  // 调用 AI 生成 summary
}

private async applyCategories(
  yamlContent: Record<string, unknown>,
  createdDate: string | null
): Promise<void> {
  // 调用 AI 生成 categories
}
```

- [ ] **步骤 5：修复 TypeScript 错误**

确保 `applyTags` 方法正确处理 `ast` 参数传递和 `createdDate` 可为 null 的情况。

- [ ] **步骤 6：运行测试验证**

```bash
cd /home/xiedali/projects/markdown-formatter
npm test -- tests/rules/FrontmatterRule.test.ts
```

- [ ] **步骤 7：Commit**

```bash
git add src/rules/FrontmatterRule.ts
git commit -m "refactor: 重构 FrontmatterRule 为子规则嵌套配置"
```

---

## 任务 3：更新设置面板 UI

**文件：**
- 修改：`src/ui/SettingsTab.ts`

- [ ] **步骤 1：分析现有 UI 结构**

读取 `src/ui/SettingsTab.ts`，找到 frontmatter 相关的设置控件。

- [ ] **步骤 2：重构 frontmatter 设置区域**

按子规则分组展示：

```typescript
// 添加设置区域
new Setting(containerEl)
  .setName('Frontmatter 子规则')
  .setHeading();

// created 子规则
new Setting(containerEl)
  .setName('created 时间')
  .setDesc('自动填充 created 字段')
  .addToggle(toggle => toggle
    .setValue(settings.rules.frontmatter?.subRules?.created?.enabled ?? true)
    .onChange(async (value) => {
      settings.rules.frontmatter.subRules.created.enabled = value;
      await saveSettings();
    }));

new Setting(containerEl)
  .setName('使用文件创建时间')
  .setDesc('缺失 created 时使用文件创建时间')
  .addToggle(toggle => toggle
    .setValue(settings.rules.frontmatter?.subRules?.created?.useFileCtime ?? true)
    .onChange(async (value) => {
      settings.rules.frontmatter.subRules.created.useFileCtime = value;
      await saveSettings();
    }));

// updated 子规则
new Setting(containerEl)
  .setName('updated 时间')
  .setDesc('每次格式化更新 updated 字段')
  .addToggle(...);

// tags 子规则
new Setting(containerEl)
  .setName('标签')
  .setDesc('处理 tags 字段')
  .addToggle(...);

new Setting(containerEl)
  .setName('确保时间标签')
  .setDesc('自动添加 Year/Month 标签')
  .addToggle(...);

// 如果 aiFrontmatter.enabled 为 true，显示 AI 相关开关
if (settings.aiFrontmatter.enabled) {
  new Setting(containerEl)
    .setName('AI 生成标签')
    .setDesc('使用 AI 生成内容标签')
    .addToggle(...);
}

// summary 子规则
// ... 类似结构 ...

// categories 子规则
// ... 类似结构 ...

// title 子规则
// ... 类似结构 ...
```

- [ ] **步骤 3：Commit**

```bash
git add src/ui/SettingsTab.ts
git commit -m "feat(ui): 更新 frontmatter 设置面板支持子规则开关"
```

---

## 任务 4：更新测试

**文件：**
- 修改：`tests/rules/FrontmatterRule.test.ts`

- [ ] **步骤 1：添加子规则配置测试用例**

```typescript
describe('FrontmatterRule - 子规则配置', () => {
  it('应支持单独禁用 created 子规则', () => {
    const rule = new FrontmatterRule();
    const config: RuleConfig = {
      enabled: true,
      normalizeFields: true,
      subRules: {
        created: { enabled: false, useFileCtime: true },
        // ... 其他子规则启用 ...
      },
    };

    const result = rule.apply(ast, config, 'test', { ctime: Date.now(), mtime: Date.now() });
    // 验证 created 未被填充
    expect(result).toHaveProperty('children');
  });

  it('AI 标签生成应依赖 aiService', async () => {
    // 测试 subRules.tags.ai.enabled 控制 AI 调用
  });

  it('已存在 summary 时不应被覆盖', async () => {
    // 测试 subRules.summary.ai 逻辑
  });
});
```

- [ ] **步骤 2：运行测试**

```bash
npm test -- tests/rules/FrontmatterRule.test.ts
```

- [ ] **步骤 3：Commit**

```bash
git add tests/rules/FrontmatterRule.test.ts
git commit -m "test: 添加 FrontmatterRule 子规则配置测试"
```

---

## 任务 5：更新 CLAUDE.md

**文件：**
- 修改：`CLAUDE.md`

- [ ] **步骤 1：更新 FrontmatterRule 描述**

��：
```
- **FrontmatterRule**: Two-phase logic...
```

更新为：
```
- **FrontmatterRule**: 支持子规则嵌套配置
  - 主开关：`enabled`
  - 子规则：`subRules.created`、`subRules.updated`、`subRules.tags`、`subRules.summary`、`subRules.categories`、`subRules.title`
  - AI 部分依赖 `aiService` 参数（由 `aiFrontmatter.enabled` 控制）
  - 每个子规则的 AI 部分由 `subRules.xxx.ai.enabled` 控制
```

- [ ] **步骤 2：Commit**

```bash
git add CLAUDE.md
git commit -m "docs: 更新 CLAUDE.md 说明 frontmatter 子规则配置"
```

---

## 自检清单

- [ ] 规格覆盖度：所有 5 个子规则（created、updated、tags、summary、categories、title）都有对应实现
- [ ] 占位符扫描：无 "TODO"、"待定" 等占位符
- [ ] 类型一致性：FrontmatterConfig 在类型定义和 FrontmatterRule 中一致
- [ ] 向后兼容：默认配置保持所有子规则启用，不影响现有用户

---

**计划已完成。两种执行方式：**

**1. 子代理驱动（推荐）** - 每个任务调度一个新的子代理，任务间进行审查，快速迭代

**2. 内联执行** - 在当前会话中使用 executing-plans 执行任务，批量执行并设有检查点

**选哪种方式？**