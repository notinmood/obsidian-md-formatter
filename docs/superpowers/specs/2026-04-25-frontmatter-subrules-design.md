# Frontmatter 规则拆分设计

**日期**: 2026-04-25
**状态**: 已批准

## 背景

现有的 `FrontmatterRule` 是一个单一的规则，包含多个职责：
- 字段规范化（create→created, update→updated, tag→tags）
- created/updated 时间字段处理
- tags 标签处理（含 AI 生成）
- summary 摘要生成
- categories 分类生成
- title 标题填充

用户需要更细粒度的控制，允许单独开关每个子功能。

## 方案：子规则嵌套配置

### 1. 配置结构

```typescript
// types/index.ts
interface FrontmatterConfig {
  enabled: boolean;
  normalizeFields: boolean;  // create→created, update→updated, tag→tags
  subRules: {
    created: {
      enabled: boolean;
      useFileCtime: boolean;  // 缺失时从 fileInfo.ctime 生成
    };
    updated: {
      enabled: boolean;
    };
    tags: {
      enabled: boolean;
      ensureTimeTags: boolean;  // Year/Month 标签
      ai: {
        enabled: boolean;  // AI 生成标签
      };
    };
    summary: {
      enabled: boolean;
      ai: {
        enabled: boolean;  // AI 生成摘要（仅在无 summary 时）
      };
    };
    categories: {
      enabled: boolean;
      ai: {
        enabled: boolean;  // AI 生成分类
      };
    };
    title: {
      enabled: boolean;
      useFilename: boolean;  // 缺失时用 filename 填充
    };
  };
}
```

### 2. 默认配置

```typescript
const DEFAULT_FRONTMATTER_CONFIG: FrontmatterConfig = {
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
        enabled: true,  // 依赖 aiFrontmatter.enabled
      },
    },
    summary: {
      enabled: true,
      ai: {
        enabled: true,  // 依赖 aiFrontmatter.enabled
      },
    },
    categories: {
      enabled: true,
      ai: {
        enabled: true,  // 依赖 aiFrontmatter.enabled
      },
    },
    title: {
      enabled: true,
      useFilename: true,
    },
  },
};
```

### 3. 执行流程

```
apply() 执行流程：
  │
  ├─ normalizeFields → create→created, update→updated, tag→tags
  │
  ├─ subRules.created → 缺失时填充 created（依赖 useFileCtime + fileInfo.ctime）
  ├─ subRules.updated → 每次更新为当前时间
  │
  ├─ subRules.title → 缺失时用 filename 填充（依赖 useFilename）
  │
  ├─ subRules.tags
  │   ├─ ensureTimeTags → 确保 Year/Month 标签存在（确定性逻辑）
  │   └─ ai.enabled → AI 生成内容标签（依赖 aiService）
  │
  ├─ subRules.summary
  │   └─ ai.enabled → AI 生成摘要（依赖 aiService，仅无 summary 时）
  │
  └─ subRules.categories
      └─ ai.enabled → AI 生成分类（依赖 aiService）
```

### 4. AI 执行条件

| 子规则 | AI 执行条件 |
|--------|------------|
| tags.ai | `subRules.tags.enabled && subRules.tags.ai.enabled && aiService` |
| summary.ai | `subRules.summary.enabled && subRules.summary.ai.enabled && aiService` |
| categories.ai | `subRules.categories.enabled && subRules.categories.ai.enabled && aiService` |

**关键点**: AI 部分依赖外部 `aiService` 参数，`aiService` 由 `aiFrontmatter.enabled` 控制。子规则的 `ai.enabled` 仅控制该子规则是否使用 AI。

### 5. 代码改动

#### 5.1 类型定义 (types/index.ts)

- 扩展 `RuleConfig` 类型以支持 `subRules` 配置
- 定义 `FrontmatterConfig` 接口

#### 5.2 FrontmatterRule (rules/FrontmatterRule.ts)

- 重构 `apply()` 方法，按子规则分块执行
- 提取各子规则的逻辑为独立方法

#### 5.3 SettingsTab (ui/SettingsTab.ts)

- 更新设置面板，按子规则分组展示开关
- AI 相关开关在 `aiFrontmatter.enabled` 为 true 时才生效

### 6. 向后兼容

- 现有用户配置会自动适配新结构
- `frontmatter.enabled` 保持原有语义（总开关）
- 缺失的配置项使用默认值

## 检查清单

- [ ] 更新 types/index.ts 添加 FrontmatterConfig 类型
- [ ] 重构 FrontmatterRule.apply() 方法
- [ ] 更新 SettingsTab UI
- [ ] 更新相关测试
- [ ] 更新 CLAUDE.md 文档