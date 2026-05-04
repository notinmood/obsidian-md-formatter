# 标题层级跳级整体晋升修复实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 修复标题跳级时只调整第一个标题的 Bug，改为跳级处所有同级及更深标题整体晋升。

**架构：** 替换 `HeadingStructureRule.apply()` 中 `enforceHierarchy` 循环为整体晋升算法：发现跳级时，将当前标题及所有同深度或更深的后续标题整体升一级，然后重新检查直到不再跳级。

**技术栈：** TypeScript, Jest

---

## 文件结构

| 文件 | 职责 | 变更类型 |
|------|------|----------|
| `src/rules/HeadingStructureRule.ts` | 替换 enforceHierarchy 循环实现 | 修改 |
| `tests/rules/HeadingStructureRule.test.ts` | 新增测试用例 | 修改 |

---

### 任务 1：替换 enforceHierarchy 循环为整体晋升算法

**文件：**
- 修改：`src/rules/HeadingStructureRule.ts:104-120`
- 修改：`tests/rules/HeadingStructureRule.test.ts`

- [ ] **步骤 1：编写失败的测试**

在 `tests/rules/HeadingStructureRule.test.ts` 文件末尾新增测试用例：

```typescript
  describe('标题跳级整体晋升', () => {
    it('多个 H3 标题应全部升为 H2（用文件名生成 H1）', () => {
      const content = '### 标题A\n\n### 标题B\n\n### 标题C';
      const processor = unified().use(remarkParse);
      const ast = processor.parse(content);

      const result = rule.apply(ast, { enabled: true }, '我的文档');

      const headings = result.children?.filter((c: any) => c.type === 'heading');
      expect(headings?.length).toBe(4);
      expect(headings?.[0].depth).toBe(1);  // 文件名作为 H1
      expect(headings?.[1].depth).toBe(2);  // H3 → H2
      expect(headings?.[2].depth).toBe(2);  // H3 → H2
      expect(headings?.[3].depth).toBe(2);  // H3 → H2
    });

    it('H2 下多个 H4 应全部升为 H3，H5 升为 H4', () => {
      const content = '## 章节\n\n#### 子节A\n\n#### 子节B\n\n##### 细节';
      const processor = unified().use(remarkParse);
      const ast = processor.parse(content);

      const result = rule.apply(ast, { enabled: true }, 'Test');

      const headings = result.children?.filter((c: any) => c.type === 'heading');
      expect(headings?.[0].depth).toBe(2);  // H2
      expect(headings?.[1].depth).toBe(3);  // H4 → H3
      expect(headings?.[2].depth).toBe(3);  // H4 → H3
      expect(headings?.[3].depth).toBe(4);  // H5 → H4
    });

    it('连续跳级应递归处理', () => {
      const content = '# 主标题\n\n#### 跳了两级';
      const processor = unified().use(remarkParse);
      const ast = processor.parse(content);

      const result = rule.apply(ast, { enabled: true });

      const headings = result.children?.filter((c: any) => c.type === 'heading');
      expect(headings?.[0].depth).toBe(1);  // H1
      expect(headings?.[1].depth).toBe(2);  // H4 先升到 H3，仍跳级，再升到 H2
    });
  });
```

- [ ] **步骤 2：运行测试验证失败**

运行：`npm test -- tests/rules/HeadingStructureRule.test.ts -t "标题跳级整体晋升"`
预期：FAIL

- [ ] **步骤 3：替换 enforceHierarchy 循环实现**

将 `src/rules/HeadingStructureRule.ts` 第 104-120 行的代码：

```typescript
    // 确保标题层级逐级递增
    if (cfg.enforceHierarchy && headings.length > 0) {
      let prevDepth = headings[0].depth;

      for (let i = 1; i < headings.length; i++) {
        const current = headings[i];

        // 如果跳级（当前层级比前一个层级大超过1）
        if (current.depth > prevDepth + 1) {
          // 调整为前一个层级+1
          current.node.depth = Math.min(prevDepth + 1, 6);
          current.depth = current.node.depth;
        }

        prevDepth = current.depth;
      }
    }
```

替换为：

```typescript
    // 确保标题层级逐级递增（整体晋升算法）
    if (cfg.enforceHierarchy && headings.length > 0) {
      let i = 1;
      while (i < headings.length) {
        const prevDepth = headings[i - 1].depth;
        const currentDepth = headings[i].depth;

        if (currentDepth > prevDepth + 1) {
          // 跳级：将当前标题及所有同深度或更深的后续标题整体升一级
          const threshold = currentDepth;
          for (let j = i; j < headings.length; j++) {
            if (headings[j].depth >= threshold) {
              headings[j].depth -= 1;
              headings[j].node.depth = headings[j].depth;
            } else {
              break;
            }
          }
          // 不前进 i，重新检查当前位置是否仍有跳级
        } else {
          i++;
        }
      }
    }
```

- [ ] **步骤 4：运行新测试验证通过**

运行：`npm test -- tests/rules/HeadingStructureRule.test.ts -t "标题跳级整体晋升"`
预期：PASS

- [ ] **步骤 5：运行全部测试确认无回归**

运行：`npm test`
预期：全部 PASS

- [ ] **步骤 6：Commit**

```bash
git add src/rules/HeadingStructureRule.ts tests/rules/HeadingStructureRule.test.ts
git commit -m "fix: 标题层级跳级整体晋升——所有同级及更深层级一起调整"
```
