# 快捷键自定义功能 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 修改插件命令的默认快捷键配置，格式化当前文件改为 Alt+F，其他两个命令无默认快捷键。

**架构：** 仅修改 `src/main.ts` 中的 `registerCommands()` 方法，调整 `hotkeys` 属性配置。

**技术栈：** TypeScript, Obsidian Plugin API

---

## 文件结构

| 文件 | 职责 | 变更类型 |
|------|------|----------|
| `src/main.ts` | 插件入口，注册命令 | 修改 |
| `tests/main.test.ts` | 主入口测试（如存在） | 可能新增/修改 |

---

### 任务 1：修改命令快捷键配置

**文件：**
- 修改：`src/main.ts:38-65`

- [ ] **步骤 1：修改格式化当前文件命令的快捷键为 Alt+F**

修改 `src/main.ts` 第 42 行，将 `hotkeys: [{ modifiers: ['Mod', 'Shift'], key: 'f' }]` 改为 `hotkeys: [{ modifiers: ['Alt'], key: 'f' }]`：

```typescript
// 格式化当前文件
this.addCommand({
  id: 'format-current-file',
  name: '格式化当前文件',
  hotkeys: [{ modifiers: ['Alt'], key: 'f' }],
  editorCallback: async (editor: Editor, view: MarkdownView) => {
    await this.formatCurrentFile(editor, view);
  },
});
```

- [ ] **步骤 2：确认格式化选中内容命令无快捷键**

确认第 49-55 行的 `format-selection` 命令没有 `hotkeys` 属性（当前代码已符合要求）：

```typescript
// 格式化选中内容
this.addCommand({
  id: 'format-selection',
  name: '格式化选中内容',
  editorCallback: async (editor: Editor, view: MarkdownView) => {
    await this.formatSelection(editor);
  },
});
```

- [ ] **步骤 3：确认批量格式化文件夹命令无快捷键**

确认第 58-64 行的 `format-folder` 命令没有 `hotkeys` 属性（当前代码已符合要求）：

```typescript
// 批量格式化文件夹
this.addCommand({
  id: 'format-folder',
  name: '批量格式化文件夹',
  callback: () => {
    this.formatFolder();
  },
});
```

- [ ] **步骤 4：运行构建验证无错误**

运行：`npm run build`
预期：构建成功，无 TypeScript 错误

- [ ] **步骤 5：运行测试验证功能正常**

运行：`npm test`
预期：所有测试通过

- [ ] **步骤 6：Commit**

```bash
git add src/main.ts
git commit -m "feat: 修改格式化命令默认快捷键为 Alt+F"
```
