# 光标位置保持 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 格式化当前文件后保持光标位置不变，支持一次 Ctrl+Z 整体撤销格式化

**架构：** 在 `formatCurrentFile` 方法中，格式化前保存光标位置，格式化后使用 Obsidian `editor.transaction()` API 替换内容并通过 `selection` 字段恢复光标，而非使用 `editor.setValue()`。transaction 将整个替换作为单次编辑操作，用户可一次撤销。

**技术栈：** Obsidian Editor API（transaction、getCursor、offsetToPos）

---

### 任务 1：修改 formatCurrentFile 方法

**文件：**
- 修改：`src/main.ts:70-92`

- [ ] **步骤 1：修改 formatCurrentFile 方法**

将 `src/main.ts` 中 `formatCurrentFile` 方法从 `editor.setValue()` 改为 `editor.transaction()`，并保存/恢复光标位置。

修改前（第 70-92 行）：
```typescript
private async formatCurrentFile(editor: Editor, view: MarkdownView): Promise<void> {
    const file = view.file;
    if (!file || file.extension !== 'md') {
      showNotice('仅支持Markdown文件');
      return;
    }

    const content = editor.getValue();
    showNotice('正在格式化...');

    const progressCallback = this.processor.shouldChunkFile(content, this.settings)
      ? createProgressCallback()
      : undefined;

    const result = await this.processor.processContent(content, this.settings, progressCallback, file.basename);

    if (result.success && result.content) {
      editor.setValue(result.content);
      showNotice(`格式化完成，应用了 ${result.stats?.rulesApplied || 0} 条规则`);
    } else {
      showNotice(`格式化失败: ${result.error || '未知错误'}`);
    }
  }
```

修改后：
```typescript
private async formatCurrentFile(editor: Editor, view: MarkdownView): Promise<void> {
    const file = view.file;
    if (!file || file.extension !== 'md') {
      showNotice('仅支持Markdown文件');
      return;
    }

    const content = editor.getValue();
    const cursor = editor.getCursor();

    showNotice('正在格式化...');

    const progressCallback = this.processor.shouldChunkFile(content, this.settings)
      ? createProgressCallback()
      : undefined;

    const result = await this.processor.processContent(content, this.settings, progressCallback, file.basename);

    if (result.success && result.content) {
      const currentContent = editor.getValue();
      editor.transaction({
        changes: [{
          from: { line: 0, ch: 0 },
          to: editor.offsetToPos(currentContent.length),
          text: result.content,
        }],
        selection: { from: cursor, to: cursor },
      });
      showNotice(`格式化完成，应用了 ${result.stats?.rulesApplied || 0} 条规则`);
    } else {
      showNotice(`格式化失败: ${result.error || '未知错误'}`);
    }
  }
```

- [ ] **步骤 2：运行构建确认无类型错误**

运行：`npm run build`
预期：构建成功，无 TypeScript 错误

- [ ] **步骤 3：运行测试确认无回归**

运行：`npm test`
预期：所有现有测试通过

- [ ] **步骤 4：Commit**

```bash
git add src/main.ts
git commit -m "feat: 格式化后保持光标位置，支持一次Ctrl+Z撤销"
```