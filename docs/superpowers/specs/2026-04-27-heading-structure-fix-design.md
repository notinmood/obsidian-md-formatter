# 标题层级全局对齐修复设计

## 问题

当文档中没有任何 H1/H2 标题，只有多个 H3 标题时：

**期望行为**：所有 H3 标题应统一升为 H2，然后用文件名生成一个 H1 放在最前面。

**实际行为**：只有第一个 H3 升为 H2，其余 H3 保持 H3 不变。

原因在于 `HeadingStructureRule` 的 `enforceHierarchy` 循环只做相邻两步检查（`current > prev + 1`）：第一个 H3 发现需要从 3 升到 2，更新后 `prevDepth=2`，后续 H3 因为 `3 > 2+1` 为 false 就保留了 H3。

## 方案

在 `enforceHierarchy` 循环之前，增加一次**全局对齐处理**：

检测当 heading 序列中（排除刚插入的 H1）没有任何 H1/H2 时，将后续所有 heading 的 depth 统一调整为 H2。

然后原有的 `enforceHierarchy` 局部调整循环继续按相邻逻辑处理。

## 详细设计

### 文件

- 修改：`src/rules/HeadingStructureRule.ts`

### 改动

在 line 104 `// 确保标题层级逐级递增` 之前，插入全局对齐逻辑：

```typescript
    // 全局对齐：如果 headings 序列中没有 H1/H2（排除刚插入的 H1），
    // 则将后续所有 heading 统一升为 H2
    const hasMidLevel = headings.slice(1).some(h => h.depth === 2);
    if (!hasMidLevel) {
      for (let i = 1; i < headings.length; i++) {
        headings[i].node.depth = 2;
        headings[i].depth = 2;
      }
    }
```

其中 `headings.slice(1)` 排除了索引 0（即刚插入的 H1），避免把 H1 算进去。

### 影响范围

- 仅修改 `HeadingStructureRule.ts` 一个文件
- 不影响已有 H1/H2 的文档层级处理逻辑
- 向后兼容：旧版配置中 `enforceHierarchy`、`singleH1`、`useFilenameAsH1` 均不变
