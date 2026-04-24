# Frontmatter 增强 + AI 元数据生成 设计

## 问题

现有 FrontmatterRule 只做字段名规范化（create→created 等）和缺 title 时用文件名填充。需要增强 frontmatter 处理能力：

1. 自动填充 created/updated 时间字段
2. 自动生成时间标签（Year/2026, Month/04）
3. AI 生成内容标签、summary、categories
4. 保留 frontmatter 中其他所有已有字段

## 方案

增强现有 FrontmatterRule，内部分为确定性逻辑和 AI 逻辑两层。确定性逻辑始终执行，AI 逻辑在 AI 不可用时跳过。

## 架构

### 新增文件

- `src/services/AIService.ts`：AI 服务层，封装对大模型 API 的调用，支持多提供商和故障转移
- `src/types/FileInfo.ts`：FileInfo 和 AIMetadataResult 类型定义

### 修改文件

- `src/rules/FrontmatterRule.ts`：增强确定性逻辑（时间字段、时间标签），增加 AI 元数据生成逻辑
- `src/core/Formatter.ts`：FormatOptions 扩展 fileInfo 参数，规则执行时传递 AI 服务
- `src/main.ts`：获取文件时间戳传入 Formatter，初始化 AIService 并传入
- `src/types/index.ts`：新增 AIFrontmatterConfig、AIProviderConfig 类型，PluginSettings 扩展
- `src/ui/SettingsTab.ts`：新增 AI Frontmatter 设置区域（多提供商管理、标签上限、自定义提示词）

## 详细设计

### 1. FrontmatterRule 执行流程

**输入**：AST + RuleConfig + filename + fileInfo + aiService

**步骤**（按顺序执行）：

1. 解析 AST 中 yaml 节点的 YAML 内容为字段字典
2. **确定性逻辑**（始终执行）：
   - 字段名规范化（create→created, update→updated, tag→tags）— 保留现有功能
   - `created`：如果缺失，从 fileInfo.ctime 生成，格式 `YYYY-MM-DD HH:mm:ss 星期x`
   - `updated`：每次格式化更新为当前时间，格式同上
   - 时间标签：从 created 日期推算，确保 tags 中包含 `Year/YYYY` 和 `Month/MM`，已有则跳过
   - 如果没有 title，用 filename 填充 — 保留现有功能
   - 保留其他所有已有字段不变
3. **AI 逻辑**（aiService 可用时执行）：
   - 提取正文内容（去掉 frontmatter 部分）传给 AIService
   - AI 生成 tags（二级格式 `类别/具体实体`），追加到现有 tags（不替换）
   - AI 生成 summary，如果已有 summary 则不覆盖
   - AI 生成 categories（二级格式，可多个），覆盖已有 categories 字段（AI 重新分析后的分类替换原有）
   - AI 不可用时跳过这些字段，其余照常
4. 重建 YAML 字符串替换 AST 中 yaml 节点

### 2. AI 服务层

**AIService 接口**：

```typescript
interface AIService {
  generateMetadata(content: string, createdDate: string, existingTags: string[]): Promise<AIMetadataResult | null>;
}

interface AIMetadataResult {
  tags: string[];        // 二级格式，如 ["科技/AI", "软件开发/Python"]
  summary: string;       // 摘要
  categories: string[];  // 二级格式，如 ["人文社科/历史"]
}
```

- 返回 null 表示 AI 不可用（无配置或所有提供商调用失败）
- 统一使用 OpenAI 兼容格式 `/chat/completions` 接口
- 使用 Obsidian 的 `requestUrl` API 发起请求（插件沙箱中 fetch 不可用）
- 故障转移：按 providers 数组顺序尝试，默认提供商失败后自动尝试下一个，全部失败则返回 null

### 3. 多提供商配置

```typescript
interface AIProviderConfig {
  name: string;        // 用户自定义名称，如 "DeepSeek主"
  baseUrl: string;     // API 基地址，如 "https://api.deepseek.com"
  apiKey: string;      // API 密钥
  model: string;       // 模型名称，如 "deepseek-chat"
  temperature: number; // 默认 0.7
  maxTokens: number;   // 默认 4096
}

interface AIFrontmatterConfig {
  enabled: boolean;                  // 是否启用 AI 生成
  providers: AIProviderConfig[];     // 提供商列表，第一个为默认
  maxTags: number;                   // AI 生成的标签数量上限，默认 5
  maxCategories: number;             // AI 生成的分类数量上限，默认 3
  customPrompt: string;              // 自定义提示词补充
}
```

- providers 数组第一个为默认提供商
- 排序通过上下箭头按钮调整优先级
- 全部提供商失败时，AI 逻辑跳过

### 4. Formatter 传递机制

**FormatOptions 扩展**：

```typescript
interface FormatOptions {
  filename?: string;
  fileInfo?: FileInfo;
}

interface FileInfo {
  ctime: number;   // 文件创建时间（毫秒）
  mtime: number;   // 文件修改时间（毫秒）
}
```

**Formatter 构造**：新增 AIService 参数

```typescript
class Formatter {
  constructor(private registry: RuleRegistry, private aiService?: AIService) {}
}
```

规则执行时将 fileInfo 和 aiService 传入规则的 apply 方法。

### 5. main.ts 改动

- 初始化 AIService（从 settings 中读取配置）
- `formatCurrentFile` 中获取文件时间戳传入 Formatter
- `formatFolder` 中同样获取时间戳
- 设置变更时重新初始化 AIService

### 6. 设置面板 UI

新增 AI Frontmatter 设置区域：
- 启用/禁用 AI 生成开关
- 提供商管理：添加/删除提供商，每个配置 name、baseUrl、apiKey、model、temperature、maxTokens
- 上下箭头按钮调整提供商优先级
- 第一个提供商标记为"默认"
- 标签数量上限（maxTags）、分类数量上限（maxCategories）
- 自定义提示词输入

现有的 frontmatter 规则设置中增加：
- 时间标签开关（Year/Month 标签）

### 7. 日期格式

`YYYY-MM-DD HH:mm:ss 星期x`

示例：`2026-04-24 14:30:00 星期四`

星期使用中文：星期一、星期二、...星期日

### 8. 时间标签规则

从 created 日期推算：
- `Year/YYYY`：如 `Year/2026`
- `Month/MM`：如 `Month/04`

如果 tags 中已有这些标签则跳过，没有则追加。

### 9. AI 提示词设计

系统提示词核心要求：
- tags 使用二级格式 `类别/具体实体`，如 `科技/AI`、`软件开发/Python`
- categories 使用二级格式，如 `人文社科/历史`
- summary 为 100-200 字摘要
- 返回 JSON 格式

已有 tags 和 categories 作为上下文传入，AI 应优先使用已有分类体系。

## 行为说明

- 确定性逻辑（时间字段、时间标签、字段规范化）始终执行，不受 AI 配置影响
- AI 逻辑在 AI 未配置或不可用时自动跳过，不影响确定性逻辑执行
- 保留 frontmatter 中所有其他已有字段不变
- AI 生成的 tags 追加到现有 tags，不替换已有的
- AI 生成的 summary 如果已有则不覆盖
- AI 生成的 categories 覆盖已有 categories 字段（AI 重新分析后的分类替换原有）
- 格式化命令触发时 updated 字段始终更新为当前时间