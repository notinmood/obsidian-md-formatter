# 标题层级跳级整体晋升修复设计

## 问题

`HeadingStructureRule` 的 `enforceHierarchy` 循环只做相邻两步检查（`current > prev + 1`），发现跳级时只将当前标题升一级。这导致同一层级的后续标题不被处理。

**具体案例**：

| 输入 | 期望输出 | 实际输出 |
|------|----------|----------|
| `### A, ### B, ### C`（无 H1/H2） | `# 文件名, ## A, ## B, ## C` | `# 文件名, ## A, ### B, ### C` |
| `## A, #### B, #### C, ##### D` | `## A, ### B, ### C, #### D` | `## A, ### B, #### C, ##### D` |
| `### A, ##### B` | `### A, #### B` | `### A, #### B`（此例恰好正确） |

**根本原因**：循环中 `prevDepth` 跟着第一个调整后的标题走，后续同深度的标题因为"不再跳级"而被跳过。但正确的语义是：跳级出现时，**该层级及其所有子层级应整体向上晋升**。

## 方案

替换原有的"逐个相邻检查+单步调整"算法，改为**整体晋升算法**：

从左到右遍历 headings，发现跳级时，将当前标题及**所有同深度或更深的后续标题**整体向上晋升一级。然后重新从当前标题开始检查（因为晋升后可能仍存在跳级），直到该位置不再跳级才继续前进。

### 算法

```
i = 1
while i < headings.length:
  if headings[i].depth > headings[i-1].depth + 1:
    // 跳级了：把 headings[i] 及所有 depth >= headings[i].depth 的后续标题升一级
    threshold = headings[i].depth
    for j from i to end:
      if headings[j].depth >= threshold:
        headings[j].depth -= 1
        headings[j].node.depth -= 1
      else:
        break  // 遇到更浅的标题，停止
    // 不前进 i，重新检查当前位置是否仍有跳级
  else:
    i += 1
```

### 示例推演

**输入**：`H1, H3, H3, H4`

1. i=1: H3 > H1+1 → 跳级。threshold=3，从 i=1 开始 depth≥3 的升一级：H3→H2, H3→H2, H4→H3。结果：`H1, H2, H2, H3`
2. i=1: H2 == H1+1 → 不跳级。i=2
3. i=2: H2 == H2+1? 不，H2 不 > H2+1 → 不跳级。i=3
4. i=3: H3 == H2+1 → 不跳级。i=4，结束。

**最终**：`H1, H2, H2, H3` ✓

**输入**：`H2, H4, H4, H5`

1. i=1: H4 > H2+1 → 跳级。threshold=4，从 i=1 开始 depth≥4 的升一级：H4→H3, H4→H3, H5→H4。结果：`H2, H3, H3, H4`
2. i=1: H3 == H2+1 → 不跳级。i=2
3. i=2: H3 == H3+1? 不 → 不跳级。i=3
4. i=3: H4 == H3+1 → 不跳级。i=4，结束。

**最终**：`H2, H3, H3, H4` ✓

## 详细设计

### 文件

- 修改：`src/rules/HeadingStructureRule.ts`

### 改动

将 line 104-120 的原有 `enforceHierarchy` 循环：

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

### 影响范围

- 仅修改 `HeadingStructureRule.ts` 一个文件
- 替换 `enforceHierarchy` 循环的实现，行为更正确
- 向后兼容：配置项 `enforceHierarchy`、`singleH1`、`useFilenameAsH1` 均不变
