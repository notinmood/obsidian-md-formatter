# 光标位置保持设计

## 问题

格式化当前文件后，`editor.setValue()` 会将光标重置到文档开头，用户需要手动找回原来的编辑位置，非常不方便。

## 方案

采用"保存/恢复光标 + transaction 替换"方案（方案 A+C 混合）：

- 格式化前用 `editor.getCursor()` 保存光标位置
- 格式化后用 `editor.transaction()` 替换内容，通过 `selection` 字段恢复光标
- transaction 将整个替换作为一次操作，支持一次 Ctrl+Z 整体撤销格式化

## 改动范围

仅修改 `src/main.ts` 的 `formatCurrentFile` 方法：

```typescript
private async formatCurrentFile(editor: Editor, view: MarkdownView): Promise<void> {
  const file = view.file;
  if (!file || file.extension !== 'md') {
    showNotice('仅支持Markdown文件');
    return;
  }

  const content = editor.getValue();
  const cursor = editor.getCursor();  // 保存光标位置

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

## 行为说明

- 光标恢复到格式化前的行号和列号位置，不跟踪内容偏移
- `formatSelection` 和 `formatFolder` 不受影响
- 格式化可通过一次 Ctrl+Z 整体撤销