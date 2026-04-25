# AI 预览 Modal + AI 子开关 设计

## 问题

1. AI 生成的 metadata 直接写入文档，用户无法审阅/编辑，缺乏信任感
2. FrontmatterRule 的 AI 逻辑和确定性逻辑共用一个开关，用户无法单独关闭 AI 部分

## 方案

### 1. AI 预览 Modal

格式化当前文件时，如果 AI 可用且预览开关开启，先执行全部逻辑生成结果，然后弹出 Modal 展示格式化后的 frontmatter 变化，用户可编辑 tags/summary/categories，确认后才应用。

- `AIFrontmatterConfig` 新增 `showPreview: boolean`（默认 true）
- 关闭预览时：直接应用格式化结果，和现有逻辑一致
- AI 不可用时：不弹出预览，直接格式化（确定性逻辑不需要预览）
- Modal 中 tags、summary、categories 可编辑，其余字段只展示
- "应用"和"取消"按钮

### 2. AI 子开关

FrontmatterRule 的 RuleConfig 新增 `aiEnabled: boolean`（默认 true）。

- `aiEnabled = false`：确定性逻辑正常执行，AI 部分跳过
- 与全局 `aiFrontmatter.enabled` 的关系：两者都为 true 时 AI 才执行
- 设置面板中 Frontmatter 规则区域增加 AI 子开关 toggle

## 详细设计

### 新增文件

- `src/modals/MetadataPreviewModal.ts`：AI 预览 Modal

### 修改文件

- `src/types/index.ts`：AIFrontmatterConfig 新增 showPreview 字段，DEFAULT_SETTINGS 更新
- `src/rules/FrontmatterRule.ts`：defaultConfig 新增 aiEnabled 子开关，apply 中检查 aiEnabled
- `src/main.ts`：formatCurrentFile 增加 AI 预览流程
- `src/ui/SettingsTab.ts`：Frontmatter 规则区域增加 AI 子开关，AI 设置区域增加预览开关

### MetadataPreviewModal 设计

```typescript
class MetadataPreviewModal extends Modal {
  constructor(app: App, formattedFrontmatter: Record<string, unknown>, onConfirm: (confirmed: boolean, editedResult?: Record<string, unknown>) => void)
}
```

- 展示格式化后的完整 frontmatter
- tags 用逗号分隔的文本输入框（可编辑）
- summary 用 textarea（可编辑）
- categories 用逗号分隔的文本输入框（可编辑）
- created、updated、title 等其他字段只展示不可编辑
- "应用"按钮：将编辑后的 frontmatter 合入格式化结果并应用
- "取消"按钮：不应用任何改动

### formatCurrentFile 流程变更

当 AI 可用且 showPreview 开启时：

1. Formatter 正常执行格式化，得到结果 content
2. 从结果中解析出格式化后的 frontmatter（用 yaml 库）
3. 弹出 MetadataPreviewModal，传入 frontmatter
4. 用户确认后：将编辑后的 frontmatter 替换回格式化结果的 yaml 部分，然后用 transaction 应用
5. 用户取消：不应用任何改动

当 AI 不可用或 showPreview 关闭时：直接格式化并应用（现有逻辑）。