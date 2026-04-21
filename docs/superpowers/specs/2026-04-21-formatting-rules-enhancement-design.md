# Markdown 格式化规则增强设计

## 概述

增强 Markdown 格式化插件，新增/修改以下规则：
1. Frontmatter 规则：确保 YAML frontmatter 使用 `---` 标记
2. 列表标记：统一使用 `-` 作为列表标记
3. 空行控制：不同块元素间 1 空行，相同块元素间 0 空行（可配置）

## 需求详情

### 1. Frontmatter 规则

- YAML frontmatter 必须以 `---` 作为开始和结束标记
- frontmatter 内容保持原样不变
- 如果文档开头已有 frontmatter，保持格式正确
- 如果没有 frontmatter，不做任何处理

### 2. 列表标记

- 无序列表统一使用 `-` 作为标记（不使用 `*` 或 `+`）
- 通过 remark-stringify 的 `bullet: '-'` 选项控制

### 3. 空行控制

**ParagraphRule 修改：**
- `blankLinesBetween` 默认值从 `1` 改为 `0`
- 保留配置项，用户可在设置中调整

**HeadingRule 修改：**
- 标题前保留 1 个空行（文档开头或 frontmatter 后的标题除外）
- 标题后不额外添加空行（由下一个块元素决定）

**统一空行处理：**
- 新增后处理逻辑，确保不同类型块元素之间最多只有 1 个空行
- 防止多条规则叠加产生多余空行

## 技术方案

### 新增文件

| 文件 | 职责 |
|------|------|
| `src/rules/FrontmatterRule.ts` | Frontmatter 格式化规则 |

### 修改文件

| 文件 | 修改内容 |
|------|----------|
| `src/rules/ListRule.ts` | 通过 remark-stringify 配置 bullet 标记 |
| `src/rules/ParagraphRule.ts` | blankLinesBetween 默认值改为 0 |
| `src/rules/HeadingRule.ts` | 标题后不添加空行，优化空行逻辑 |
| `src/rules/index.ts` | 注册 FrontmatterRule |
| `src/core/Formatter.ts` | 配置 remark-stringify 的 bullet 选项；新增空行清理后处理 |
| `src/ui/SettingsTab.ts` | 添加 Frontmatter 规则开关 |
| `src/types/index.ts` | 无需修改 |

### 实现细节

#### FrontmatterRule

```typescript
export class FrontmatterRule implements FormatRule {
  name = 'frontmatter';
  priority = 5;  // 最高优先级，最先处理
  description = '确保 YAML frontmatter 使用 --- 标记';

  defaultConfig = {
    enabled: true,
  };

  apply(ast: AstNode, config: RuleConfig): AstNode {
    // 检查 AST 第一个子节点是否为 YAML 节点
    // remark 解析时，frontmatter 会生成 type: 'yaml' 的节点
    // 无需修改内容，只需确保 stringify 时使用 --- 标记
    return ast;
  }
}
```

#### Formatter 修改

在 remark-stringify 配置中添加：
```typescript
.use(remarkStringify, {
  bullet: '-',  // 无序列表使用 - 标记
})
```

#### 空行清理后处理

在所有规则应用后，遍历 AST 清理多余的空白段落：
- 连续多个空白段落只保留一个
- 相同类型块元素之间的空白段落移除

#### ParagraphRule 修改

```typescript
defaultConfig = {
  blankLinesBetween: 0,  // 默认不添加空行
  trimTrailingWhitespace: true,
};
```

#### HeadingRule 修改

移除标题后添加空行的逻辑，只保留标题前的空行控制。

### 规则优先级顺序

| 规则 | 优先级 |
|------|--------|
| FrontmatterRule | 5 |
| HeadingRule | 10 |
| ParagraphRule | 20 |
| ListRule | 30 |
| CodeBlockRule | 40 |
| TableRule | 50 |
| LinkRule | 60 |

## 影响范围

- 新增 1 个规则文件
- 修改 6 个现有文件
- 现有用户设置不受影响（新配置项使用新默认值）
- 测试需要新增 FrontmatterRule 测试，修改其他规则测试