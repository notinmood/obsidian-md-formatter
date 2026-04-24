# Frontmatter 增强 + AI 元数据生成 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 增强 FrontmatterRule 以支持时间字段自动填充、时间标签生成、AI 生成内容标签/摘要/分类，AI 不可用时跳过 AI 部分。

**架构：** 在现有 FrontmatterRule 中增加确定性逻辑层（时间字段、时间标签）和 AI 逻辑层（tags/summary/categories）。新增 AIService 服务层处理多提供商调用和故障转移。通过 Formatter 传递 FileInfo 和 AIService 到规则。

**技术栈：** TypeScript、Obsidian Editor API（requestUrl）、yaml 库、remark AST

---

## 文件结构

| 文件 | 职责 |
|---|---|
| `src/types/index.ts` | 扩展 PluginSettings，新增 AIProviderConfig、AIFrontmatterConfig、FileInfo、AIMetadataResult 类型 |
| `src/services/AIService.ts` | 新建。AI 服务层：多提供商调用、故障转移、提示词构建、响应解析 |
| `src/services/index.ts` | 新建。导出 AIService |
| `src/rules/FrontmatterRule.ts` | 增强。确定性逻辑（时间字段、时间标签）+ AI 逻辑（tags/summary/categories） |
| `src/core/Formatter.ts` | 修改。FormatOptions 扩展 fileInfo，Formatter 构造增加 aiService |
| `src/core/FileProcessor.ts` | 修改。processContent 增加 fileInfo 参数传递 |
| `src/main.ts` | 修改。初始化 AIService，获取文件时间戳，传入 Formatter |
| `src/ui/SettingsTab.ts` | 修改。新增 AI 设置区域（提供商管理、参数配置） |
| `tests/rules/FrontmatterRule.test.ts` | 扩展。新增时间字段、时间标签测试 |
| `tests/services/AIService.test.ts` | 新建。AI 服务层测试 |

---

### 任务 1：扩展类型定义

**文件：**
- 修改：`src/types/index.ts`

- [ ] **步骤 1：扩展 PluginSettings 和新增类型**

在 `src/types/index.ts` 末尾追加以下类型定义，并修改 PluginSettings 接口添加 `aiFrontmatter` 字段：

```typescript
// 在 PluginSettings 接口中新增字段：
/** AI frontmatter 配置 */
aiFrontmatter: AIFrontmatterConfig;

// 在 DEFAULT_SETTINGS 中新增：
aiFrontmatter: {
  enabled: false,
  providers: [],
  maxTags: 5,
  maxCategories: 3,
  customPrompt: '',
},

// 在文件末尾追加以下类型：

export interface AIProviderConfig {
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
}

export interface AIFrontmatterConfig {
  enabled: boolean;
  providers: AIProviderConfig[];
  maxTags: number;
  maxCategories: number;
  customPrompt: string;
}

export interface FileInfo {
  ctime: number;
  mtime: number;
}

export interface AIMetadataResult {
  tags: string[];
  summary: string;
  categories: string[];
}
```

同时修改 `FormatRule` 接口的 `apply` 方法签名，使其能接收额外参数：

```typescript
export interface FormatRule {
  name: string;
  priority: number;
  description: string;
  defaultConfig: Record<string, unknown>;
  apply(ast: AstNode, config: RuleConfig, filename?: string, fileInfo?: FileInfo, aiService?: AIService): AstNode;
}
```

注意：`AIService` 类型将在任务 2 中定义，此处先引用。为避免循环依赖，将 `AIService` 定义为接口放在 `src/types/index.ts` 中：

```typescript
export interface AIService {
  generateMetadata(content: string, createdDate: string, existingTags: string[]): Promise<AIMetadataResult | null>;
}
```

- [ ] **步骤 2：运行构建验证类型无错误**

运行：`npm run build`
预期：构建成功（可能有未使用的参数警告，但不应有类型错误）

- [ ] **步骤 3：运行测试确认无回归**

运行：`npm test`
预期：所有现有测试通过

- [ ] **步骤 4：Commit**

```bash
git add src/types/index.ts
git commit -m "feat: 扩展类型定义，新增 AI frontmatter 相关类型"
```

---

### 任务 2：创建 AIService 服务层

**文件：**
- 创建：`src/services/AIService.ts`
- 创建：`src/services/index.ts`
- 创建：`tests/services/AIService.test.ts`

- [ ] **步骤 1：编写失败的测试**

创建 `tests/services/AIService.test.ts`：

```typescript
import { AIServiceImpl } from '../../src/services/AIService';
import type { AIProviderConfig, AIFrontmatterConfig } from '../../src/types';

// Mock requestUrl
jest.mock('obsidian', () => ({
  requestUrl: jest.fn(),
}));

import { requestUrl } from 'obsidian';

const mockRequestUrl = requestUrl as jest.MockedFunction<typeof requestUrl>;

describe('AIServiceImpl', () => {
  const defaultConfig: AIProviderConfig = {
    name: 'TestProvider',
    baseUrl: 'https://api.test.com',
    apiKey: 'test-key',
    model: 'test-model',
    temperature: 0.7,
    maxTokens: 4096,
  };

  const aiConfig: AIFrontmatterConfig = {
    enabled: true,
    providers: [defaultConfig],
    maxTags: 5,
    maxCategories: 3,
    customPrompt: '',
  };

  it('应该在 AI 未配置时返回 null', async () => {
    const service = new AIServiceImpl({ enabled: false, providers: [], maxTags: 5, maxCategories: 3, customPrompt: '' });
    const result = await service.generateMetadata('content', '2026-04-24 14:30:00 星期四', []);
    expect(result).toBeNull();
  });

  it('应该在 providers 为空时返回 null', async () => {
    const service = new AIServiceImpl({ ...aiConfig, providers: [] });
    const result = await service.generateMetadata('content', '2026-04-24', []);
    expect(result).toBeNull();
  });

  it('应该在 API 成功时返回 AIMetadataResult', async () => {
    mockRequestUrl.mockResolvedValueOnce({
      status: 200,
      json: {
        choices: [{
          message: {
            content: '{"tags":["科技/AI"],"summary":"这是一篇关于AI的文章","categories":["科技/AI"]}',
          },
        }],
      },
    } as any);

    const service = new AIServiceImpl(aiConfig);
    const result = await service.generateMetadata('关于人工智能的文章', '2026-04-24', []);

    expect(result).not.toBeNull();
    expect(result!.tags).toEqual(['科技/AI']);
    expect(result!.summary).toBe('这是一篇关于AI的文章');
    expect(result!.categories).toEqual(['科技/AI']);
  });

  it('应该在第一个提供商失败后尝试第二个', async () => {
    const fallbackProvider: AIProviderConfig = {
      name: 'Fallback',
      baseUrl: 'https://api.fallback.com',
      apiKey: 'fallback-key',
      model: 'fallback-model',
      temperature: 0.7,
      maxTokens: 4096,
    };

    mockRequestUrl.mockRejectedValueOnce(new Error('First provider failed'));
    mockRequestUrl.mockResolvedValueOnce({
      status: 200,
      json: {
        choices: [{
          message: {
            content: '{"tags":["备用/标签"],"summary":"备用摘要","categories":["备用/分类"]}',
          },
        }],
      },
    } as any);

    const service = new AIServiceImpl({ ...aiConfig, providers: [defaultConfig, fallbackProvider] });
    const result = await service.generateMetadata('content', '2026-04-24', []);

    expect(result).not.toBeNull();
    expect(result!.tags).toEqual(['备用/标签']);
    expect(mockRequestUrl).toHaveBeenCalledTimes(2);
  });

  it('应该在所有提供商失败时返回 null', async () => {
    mockRequestUrl.mockRejectedValue(new Error('All failed'));

    const service = new AIServiceImpl(aiConfig);
    const result = await service.generateMetadata('content', '2026-04-24', []);

    expect(result).toBeNull();
  });
});
```

- [ ] **步骤 2：运行测试验证失败**

运行：`npm test -- tests/services/AIService.test.ts`
预期：FAIL，AIServiceImpl 未定义

- [ ] **步骤 3：创建 AIService 实现**

创建 `src/services/AIService.ts`：

```typescript
import { requestUrl } from 'obsidian';
import type { AIFrontmatterConfig, AIProviderConfig, AIMetadataResult } from '../types';

export class AIServiceImpl implements AIService {
  private config: AIFrontmatterConfig;

  constructor(config: AIFrontmatterConfig) {
    this.config = config;
  }

  async generateMetadata(content: string, createdDate: string, existingTags: string[]): Promise<AIMetadataResult | null> {
    if (!this.config.enabled || this.config.providers.length === 0) {
      return null;
    }

    for (const provider of this.config.providers) {
      try {
        const result = await this.callProvider(provider, content, createdDate, existingTags);
        if (result) return result;
      } catch {
        continue;
      }
    }

    return null;
  }

  private async callProvider(provider: AIProviderConfig, content: string, createdDate: string, existingTags: string[]): Promise<AIMetadataResult | null> {
    const systemPrompt = this.buildSystemPrompt(existingTags);

    const response = await requestUrl({
      url: `${provider.baseUrl}/chat/completions`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${provider.apiKey}`,
      },
      body: JSON.stringify({
        model: provider.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `请分析以下文章内容，生成合适的元数据：\n\n${content}` },
        ],
        max_tokens: provider.maxTokens || 4096,
        temperature: provider.temperature ?? 0.7,
      }),
    });

    if (response.status !== 200) {
      return null;
    }

    const textContent = response.json?.choices?.[0]?.message?.content || '';
    return this.parseResponse(textContent);
  }

  private buildSystemPrompt(existingTags: string[]): string {
    let prompt = `你是一个专业的内容分析助手。请分析用户提供的文章内容，并生成以下元数据：

1. **tags**: 3-${this.config.maxTags}个相关标签，必须使用二级格式 "类别/具体实体"，如 "科技/AI"、"软件开发/Python"、"人文社科/历史"
2. **summary**: 一段简短的摘要（100-200字），概括文章核心内容
3. **categories**: 1-${this.config.maxCategories}个主要分类，必须使用二级格式，如 "人文社科/历史"、"科技/人工智能"、"软件开发/Web开发"

请以 JSON 格式返回结果，格式如下：
{
  "tags": ["类别/具体实体1", "类别/具体实体2"],
  "summary": "文章摘要...",
  "categories": ["大类/子类1", "大类/子类2"]
}

要求：
- 标签必须使用二级格式，避免过于宽泛
- 摘要要准确反映文章的核心观点
- 分类必须使用二级格式`;

    if (existingTags.length > 0) {
      prompt += `\n\n**重要：优先使用以下已有标签风格和分类体系**（如果内容相关）：\n${existingTags.join(", ")}`;
    }

    if (this.config.customPrompt) {
      prompt += `\n\n${this.config.customPrompt}`;
    }

    prompt += `\n\n请只返回 JSON 格式的结果，不要包含其他说明文字。`;

    return prompt;
  }

  private parseResponse(response: string): AIMetadataResult | null {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return null;

      const parsed = JSON.parse(jsonMatch[0]);
      return {
        tags: Array.isArray(parsed.tags) ? parsed.tags : [],
        summary: parsed.summary || '',
        categories: Array.isArray(parsed.categories) ? parsed.categories : [],
      };
    } catch {
      return null;
    }
  }
}
```

创建 `src/services/index.ts`：

```typescript
export { AIServiceImpl } from './AIService';
```

- [ ] **步骤 4：运行测试验证通过**

运行：`npm test -- tests/services/AIService.test.ts`
预期：PASS

- [ ] **步骤 5：运行全部测试确认无回归**

运行：`npm test`
预期：所有测试通过

- [ ] **步骤 6：Commit**

```bash
git add src/services/AIService.ts src/services/index.ts tests/services/AIService.test.ts
git commit -m "feat: 创建 AIService 服务层，支持多提供商和故障转移"
```

---

### 任务 3：增强 FrontmatterRule — 确定性逻辑（时间字段和时间标签）

**文件：**
- 修改：`src/rules/FrontmatterRule.ts`
- 修改：`tests/rules/FrontmatterRule.test.ts`

- [ ] **步骤 1：编写失败的测试**

在 `tests/rules/FrontmatterRule.test.ts` 新增以下测试：

```typescript
describe('时间字段', () => {
  const fileInfo = { ctime: new Date('2026-04-24T14:30:00').getTime(), mtime: new Date('2026-04-21T10:00:00').getTime() };

  it('应该在缺少 created 时从 fileInfo.ctime 生成', () => {
    const content = '---\ntitle: Test\n---\n\n# Heading';
    const processor = unified().use(remarkParse).use(remarkFrontmatter);
    const ast = processor.parse(content);

    const result = rule.apply(ast, { enabled: true }, 'Test', fileInfo);

    const yamlNode = result.children?.find((c: any) => c.type === 'yaml');
    expect(yamlNode?.value).toContain('created:');
    expect(yamlNode?.value).toContain('2026-04-24');
  });

  it('应该始终更新 updated 为当前时间', () => {
    const content = '---\ncreated: 2026-04-21\nupdated: 2026-04-21\n---\n\n# Heading';
    const processor = unified().use(remarkParse).use(remarkFrontmatter);
    const ast = processor.parse(content);

    const result = rule.apply(ast, { enabled: true }, 'Test', fileInfo);

    const yamlNode = result.children?.find((c: any) => c.type === 'yaml');
    expect(yamlNode?.value).toContain('updated:');
    // updated 不应是旧的 2026-04-21
    expect(yamlNode?.value).not.toContain('updated: 2026-04-21');
  });

  it('已有 created 时不应覆盖', () => {
    const content = '---\ncreated: 2026-03-15 08:00:00 星期六\ntitle: Test\n---\n\n# Heading';
    const processor = unified().use(remarkParse).use(remarkFrontmatter);
    const ast = processor.parse(content);

    const result = rule.apply(ast, { enabled: true }, 'Test', fileInfo);

    const yamlNode = result.children?.find((c: any) => c.type === 'yaml');
    expect(yamlNode?.value).toContain('created: 2026-03-15 08:00:00 星期六');
  });

  it('没有 fileInfo 时不添加时间字段', () => {
    const content = '---\ntitle: Test\n---\n\n# Heading';
    const processor = unified().use(remarkParse).use(remarkFrontmatter);
    const ast = processor.parse(content);

    const result = rule.apply(ast, { enabled: true }, 'Test');

    const yamlNode = result.children?.find((c: any) => c.type === 'yaml');
    expect(yamlNode?.value).not.toContain('created:');
  });
});

describe('时间标签', () => {
  const fileInfo = { ctime: new Date('2026-04-24T14:30:00').getTime(), mtime: new Date('2026-04-21T10:00:00').getTime() };

  it('应该在 tags 中包含 Year/2026 和 Month/04（基于 created 日期）', () => {
    const content = '---\ncreated: 2026-04-24 14:30:00 星期四\n---\n\n# Heading';
    const processor = unified().use(remarkParse).use(remarkFrontmatter);
    const ast = processor.parse(content);

    const result = rule.apply(ast, { enabled: true }, 'Test', fileInfo);

    const yamlNode = result.children?.find((c: any) => c.type === 'yaml');
    expect(yamlNode?.value).toContain('Year/2026');
    expect(yamlNode?.value).toContain('Month/04');
  });

  it('应该从 fileInfo.ctime 推算时间标签（如果没有 created 字段）', () => {
    const content = '---\n---\n\n# Heading';
    const processor = unified().use(remarkParse).use(remarkFrontmatter);
    const ast = processor.parse(content);

    const result = rule.apply(ast, { enabled: true }, 'Test', fileInfo);

    const yamlNode = result.children?.find((c: any) => c.type === 'yaml');
    expect(yamlNode?.value).toContain('Year/2026');
    expect(yamlNode?.value).toContain('Month/04');
  });

  it('已有时间标签时不应重复添加', () => {
    const content = '---\ncreated: 2026-04-24\ntags:\n  - Year/2026\n  - Month/04\n---\n\n# Heading';
    const processor = unified().use(remarkParse).use(remarkFrontmatter);
    const ast = processor.parse(content);

    const result = rule.apply(ast, { enabled: true }, 'Test', fileInfo);

    const yamlNode = result.children?.find((c: any) => c.type === 'yaml');
    // 不应出现两个 Year/2026
    const yearCount = (yamlNode?.value as string).split('Year/2026').length - 1;
    expect(yearCount).toBe(1);
  });
});
```

- [ ] **步骤 2：运行测试验证失败**

运行：`npm test -- tests/rules/FrontmatterRule.test.ts`
预期：新测试 FAIL（FrontmatterRule 尚未处理 fileInfo 和时间标签）

- [ ] **步骤 3：修改 FrontmatterRule 实现确定性逻辑**

修改 `src/rules/FrontmatterRule.ts`，完整的替换后内容：

```typescript
import { parse, stringify } from 'yaml';
import type { FormatRule, RuleConfig, AstNode, FileInfo, AIService, AIMetadataResult } from '../types';

export class FrontmatterRule implements FormatRule {
  name = 'frontmatter';
  priority = 5;
  description = '处理 frontmatter：字段规范化、时间字段、时间标签、AI 元数据';

  defaultConfig = {
    enabled: true,
    normalizeFields: true,
  };

  private fieldRenameMap: Record<string, string> = {
    create: 'created',
    update: 'updated',
    tag: 'tags',
  };

  private weekdayNames = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];

  apply(ast: AstNode, config: RuleConfig, filename?: string, fileInfo?: FileInfo, aiService?: AIService): AstNode {
    const cfg = { ...this.defaultConfig, ...config };

    if (cfg.enabled === false) {
      return ast;
    }

    const clonedAst = JSON.parse(JSON.stringify(ast)) as AstNode;

    if (!clonedAst.children || !Array.isArray(clonedAst.children)) {
      return clonedAst;
    }

    const yamlNode = clonedAst.children.find((child: AstNode) => child.type === 'yaml');

    if (!yamlNode || !yamlNode.value) {
      return clonedAst;
    }

    try {
      let yamlContent = parse(yamlNode.value as string) as Record<string, unknown>;

      if (yamlContent && typeof yamlContent === 'object') {
        // 1. 字段名规范化
        if (cfg.normalizeFields) {
          for (const [oldName, newName] of Object.entries(this.fieldRenameMap)) {
            if (oldName in yamlContent && !(newName in yamlContent)) {
              yamlContent[newName] = yamlContent[oldName];
              delete yamlContent[oldName];
            }
          }
        }

        // 2. created 字段：缺失时从 fileInfo.ctime 生成
        let createdDate: string | null = null;
        if (!('created' in yamlContent) && fileInfo) {
          createdDate = this.formatDate(fileInfo.ctime);
          yamlContent.created = createdDate;
        } else if ('created' in yamlContent) {
          createdDate = String(yamlContent.created);
        }

        // 3. updated 字段：每次格式化都更新为当前时间
        yamlContent.updated = this.formatDate(Date.now());

        // 4. 时间标签（确定性逻辑，始终确保 Year/Month 存在）
        if (createdDate) {
          const dateInfo = this.extractDateInfo(createdDate);
          const yearTag = `Year/${dateInfo.year}`;
          const monthTag = `Month/${dateInfo.month}`;

          const existingTags = this.normalizeTags(yamlContent.tags);
          const hasYear = existingTags.some(t => t === yearTag);
          const hasMonth = existingTags.some(t => t === monthTag);

          if (!hasYear) existingTags.push(yearTag);
          if (!hasMonth) existingTags.push(monthTag);

          // 5. AI 逻辑：可用时覆盖 tags，不可用时只保留时间标签
          if (aiService) {
            // 提取正文内容
            const bodyContent = this.extractBody(clonedAst);
            const aiResult = await aiService.generateMetadata(bodyContent, createdDate, existingTags);

            if (aiResult) {
              // AI 可用：覆盖 tags = 时间标签 + AI 标签
              yamlContent.tags = [yearTag, monthTag, ...aiResult.tags];

              // summary：已有则不覆盖
              if (!('summary' in yamlContent) || !yamlContent.summary) {
                yamlContent.summary = aiResult.summary;
              }

              // categories：覆盖
              yamlContent.categories = aiResult.categories;
            } else {
              // AI 调用失败：不改动其他 tags，只确保时间标签存在
              yamlContent.tags = existingTags;
            }
          } else {
            // AI 未配置：不改动其他 tags，只确保时间标签存在
            yamlContent.tags = existingTags;
          }
        }

        // 6. 如果没有 title，用 filename 填充
        if (!('title' in yamlContent) && filename) {
          yamlContent.title = filename;
        }

        // 重新生成 YAML 字符串
        yamlNode.value = stringify(yamlContent, {
          lineWidth: 0,
          defaultStringType: 'PLAIN',
          defaultKeyType: 'PLAIN',
        }).trim();
      }
    } catch {
      // YAML 解析失败，保持原样
    }

    return clonedAst;
  }

  private formatDate(timestamp: number): string {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const weekday = this.weekdayNames[date.getDay()];
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} ${weekday}`;
  }

  private extractDateInfo(dateStr: string): { year: string; month: string } {
    const match = dateStr.match(/(\d{4})-(\d{2})/);
    if (match) {
      return { year: match[1], month: match[2] };
    }
    // fallback：从 fileInfo 推算
    const now = new Date();
    return {
      year: String(now.getFullYear()),
      month: String(now.getMonth() + 1).padStart(2, '0'),
    };
  }

  private normalizeTags(tags: unknown): string[] {
    if (Array.isArray(tags)) {
      return tags.map(t => String(t).trim()).filter(t => t.length > 0);
    }
    if (typeof tags === 'string') {
      return tags.split(/[,\s]+/).map(t => t.trim()).filter(t => t.length > 0);
    }
    return [];
  }

  private extractBody(ast: AstNode): string {
    if (!ast.children) return '';
    return ast.children
      .filter(child => child.type !== 'yaml')
      .map(child => {
        if (child.type === 'text' && child.value) return String(child.value);
        if (child.children) return child.children.map(c => c.value || '').join(' ');
        return '';
      })
      .join('\n');
  }
}
```

注意：`apply` 方法现在是 `async` 的（因为 AI 调用是异步的）。这意味着 `FormatRule` 接口的 `apply` 方法也需要改为异步。这将在任务 5 中同步修改接口和相关调用方。但此处先保持现有测试能通过，`async` 方法在同步调用时也会工作。

- [ ] **步骤 4：运行测试验证通过**

运行：`npm test -- tests/rules/FrontmatterRule.test.ts`
预期：PASS（包括新增的时间字段和时间标签测试）

- [ ] **步骤 5：运行全部测试确认无回归**

运行：`npm test`
预期：所有测试通过

- [ ] **步骤 6：Commit**

```bash
git add src/rules/FrontmatterRule.ts tests/rules/FrontmatterRule.test.ts
git commit -m "feat: FrontmatterRule 增强确定性逻辑——时间字段和时间标签"
```

---

### 任务 4：修改 Formatter 和 FormatRule 接口支持异步和额外参数

**文件：**
- 修改：`src/types/index.ts`（FormatRule 接口 apply 方法改为 async）
- 修改：`src/core/Formatter.ts`
- 修改：`src/core/FileProcessor.ts`

- [ ] **步骤 1：修改 FormatRule 接口为异步**

在 `src/types/index.ts` 中修改 `FormatRule` 接口：

```typescript
export interface FormatRule {
  name: string;
  priority: number;
  description: string;
  defaultConfig: Record<string, unknown>;
  apply(ast: AstNode, config: RuleConfig, filename?: string, fileInfo?: FileInfo, aiService?: AIService): Promise<AstNode> | AstNode;
}
```

同时修改 `FormatOptions`（在 Formatter.ts 中定义）：

```typescript
export interface FormatOptions {
  filename?: string;
  fileInfo?: FileInfo;
}
```

- [ ] **步骤 2：修改 Formatter 支持异步规则执行和 AIService**

修改 `src/core/Formatter.ts`：

```typescript
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import remarkFrontmatter from 'remark-frontmatter';
import type { Node } from 'unist';
import type { FormatRule, PluginSettings, FormatResult, RuleConfig, AstNode, FileInfo, AIService } from '../types';
import { RuleRegistry } from './RuleRegistry';

export interface FormatOptions {
  filename?: string;
  fileInfo?: FileInfo;
}

export class Formatter {
  private aiService?: AIService;

  constructor(private registry: RuleRegistry, aiService?: AIService) {
    this.aiService = aiService;
  }

  setAIService(aiService?: AIService): void {
    this.aiService = aiService;
  }

  async format(content: string, settings: PluginSettings, options?: FormatOptions): Promise<FormatResult> {
    try {
      const processor = unified()
        .use(remarkParse)
        .use(remarkFrontmatter, ['yaml'])
        .use(remarkStringify, {
          bullet: '-',
          handlers: {
            text: (node: { value: string }) => node.value,
          },
        })
        .use(remarkFrontmatter, ['yaml']);
      const ast = processor.parse(content);

      const enabledRules = this.getEnabledRules(settings.rules);

      let transformedAst: Node = ast;
      let rulesApplied = 0;

      for (const rule of enabledRules) {
        const ruleConfig = settings.rules[rule.name] || { enabled: true };
        const result = rule.apply(
          transformedAst as unknown as AstNode,
          ruleConfig,
          options?.filename,
          options?.fileInfo,
          this.aiService
        );
        transformedAst = (await result) as unknown as Node;
        rulesApplied++;
      }

      transformedAst = this.cleanupBlankLines(transformedAst as unknown as AstNode) as unknown as Node;

      const result = processor.stringify(transformedAst as never);

      return {
        success: true,
        content: String(result),
        stats: {
          rulesApplied,
          changesMade: 0,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private getEnabledRules(ruleSettings: Record<string, RuleConfig>): FormatRule[] {
    const allRules = this.registry.getAll();
    return allRules.filter((rule) => {
      const config = ruleSettings[rule.name];
      return config?.enabled !== false;
    });
  }

  private cleanupBlankLines(ast: AstNode): AstNode {
    if (!ast.children || !Array.isArray(ast.children)) {
      return ast;
    }

    const newChildren: AstNode[] = [];
    let prevType: string | null = null;
    let blankCount = 0;

    for (const child of ast.children) {
      const isBlank = this.isBlankNode(child);

      if (isBlank) {
        blankCount++;
      } else {
        const currentType = child.type;

        if (blankCount > 0) {
          if (prevType !== null && prevType !== currentType) {
            newChildren.push(this.createBlankParagraph());
          }
          blankCount = 0;
        }

        newChildren.push(child);
        prevType = currentType;
      }
    }

    ast.children = newChildren;
    return ast;
  }

  private isBlankNode(node: AstNode): boolean {
    if (node.type === 'paragraph') {
      if (!node.children || !Array.isArray(node.children)) {
        return true;
      }
      return node.children.every(
        (child: AstNode) =>
          child.type === 'text' &&
          typeof child.value === 'string' &&
          (child.value ?? '').trim() === ''
      );
    }
    if (node.type === 'text') {
      return typeof node.value === 'string' && (node.value ?? '').trim() === '';
    }
    return false;
  }

  private createBlankParagraph(): AstNode {
    return {
      type: 'paragraph',
      children: [{ type: 'text', value: '' }],
    };
  }
}
```

- [ ] **步骤 3：修改 FileProcessor 传递 fileInfo**

修改 `src/core/FileProcessor.ts` 的 `processContent` 方法签名，增加 `fileInfo` 参数：

```typescript
async processContent(
  content: string,
  settings: PluginSettings,
  progressCallback?: ProgressCallback,
  filename?: string,
  fileInfo?: FileInfo
): Promise<FormatResult> {
  try {
    if (this.shouldChunkFile(content, settings)) {
      return await this.processChunked(content, settings, progressCallback, filename, fileInfo);
    }
    return await this.formatter.format(content, settings, { filename, fileInfo });
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
```

同时修改 `processChunked` 方法增加 `fileInfo` 参数，并在调用 `formatter.format` 时传递：

```typescript
private async processChunked(
  content: string,
  settings: PluginSettings,
  progressCallback?: ProgressCallback,
  filename?: string,
  fileInfo?: FileInfo
): Promise<FormatResult> {
  const chunks = this.splitByMarkdownBoundary(content, settings.chunkSize * 1024);
  const results: string[] = [];

  for (let i = 0; i < chunks.length; i++) {
    if (progressCallback) {
      progressCallback({ current: i + 1, total: chunks.length, message: '正在格式化大文件' });
    }
    const chunkFilename = i === 0 ? filename : undefined;
    const chunkFileInfo = i === 0 ? fileInfo : undefined;
    const result = await this.formatter.format(chunks[i], settings, { filename: chunkFilename, fileInfo: chunkFileInfo });
    if (!result.success) return result;
    results.push(result.content || chunks[i]);
  }

  return {
    success: true,
    content: results.join('\n\n'),
    stats: { rulesApplied: 0, changesMade: 0 },
  };
}
```

需要在文件顶部新增 `FileInfo` 的导入：

```typescript
import type { PluginSettings, FormatResult, ProgressCallback, FileInfo } from '../types';
```

- [ ] **步骤 4：运行构建验证**

运行：`npm run build`
预期：构建成功

- [ ] **步骤 5：运行全部测试确认无回归**

运行：`npm test`
预期：所有测试通过

- [ ] **步骤 6：Commit**

```bash
git add src/types/index.ts src/core/Formatter.ts src/core/FileProcessor.ts
git commit -m "feat: Formatter 和 FileProcessor 支持 fileInfo 和 AIService 传递"
```

---

### 任务 5：修改 main.ts 初始化 AIService 并传递 FileInfo

**文件：**
- 修改：`src/main.ts`

- [ ] **步骤 1：修改 main.ts**

修改 `src/main.ts`，完整的替换后内容：

```typescript
import { Plugin, Notice, TFile, Editor, MarkdownView } from 'obsidian';
import { DEFAULT_SETTINGS, PluginSettings } from './types';
import { RuleRegistry } from './core/RuleRegistry';
import { Formatter } from './core/Formatter';
import { FileProcessor } from './core/FileProcessor';
import { registerBuiltinRules } from './rules';
import { SettingsTab } from './ui/SettingsTab';
import { showNotice, createProgressCallback } from './utils/notice';
import { AIServiceImpl } from './services';

export default class MarkdownFormatterPlugin extends Plugin {
  settings: PluginSettings = DEFAULT_SETTINGS;
  private registry!: RuleRegistry;
  private formatter!: Formatter;
  private processor!: FileProcessor;

  async onload() {
    this.registry = new RuleRegistry();
    registerBuiltinRules(this.registry);

    await this.loadSettings();

    this.formatter = new Formatter(this.registry, this.createAIService());
    this.processor = new FileProcessor(this.formatter);

    this.registerCommands();
    this.addSettingTab(new SettingsTab(this.app, this));
  }

  private createAIService(): AIServiceImpl | undefined {
    const aiConfig = this.settings.aiFrontmatter;
    if (!aiConfig.enabled || aiConfig.providers.length === 0) {
      return undefined;
    }
    return new AIServiceImpl(aiConfig);
  }

  private registerCommands(): void {
    this.addCommand({
      id: 'format-current-file',
      name: '格式化当前文件',
      hotkeys: [{ modifiers: ['Alt'], key: 'f' }],
      editorCallback: async (editor: Editor, view: MarkdownView) => {
        await this.formatCurrentFile(editor, view);
      },
    });

    this.addCommand({
      id: 'format-selection',
      name: '格式化选中内容',
      editorCallback: async (editor: Editor, view: MarkdownView) => {
        await this.formatSelection(editor);
      },
    });

    this.addCommand({
      id: 'format-folder',
      name: '批量格式化文件夹',
      callback: () => {
        this.formatFolder();
      },
    });
  }

  private async formatCurrentFile(editor: Editor, view: MarkdownView): Promise<void> {
    const file = view.file;
    if (!file || file.extension !== 'md') {
      showNotice('仅支持Markdown文件');
      return;
    }

    const content = editor.getValue();
    const cursor = editor.getCursor();

    showNotice('正在格式化...');

    // 获取文件时间戳
    const stat = await this.app.vault.adapter.stat(file.path);
    const fileInfo = stat ? { ctime: stat.ctime, mtime: stat.mtime } : undefined;

    const progressCallback = this.processor.shouldChunkFile(content, this.settings)
      ? createProgressCallback()
      : undefined;

    const result = await this.processor.processContent(content, this.settings, progressCallback, file.basename, fileInfo);

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

  private async formatSelection(editor: Editor): Promise<void> {
    const selection = editor.getSelection();
    if (!selection) {
      showNotice('请先选择要格式化的内容');
      return;
    }

    showNotice('正在格式化选中内容...');

    const result = await this.processor.processContent(selection, this.settings);

    if (result.success && result.content) {
      editor.replaceSelection(result.content);
      showNotice('格式化完成');
    } else {
      showNotice(`格式化失败: ${result.error || '未知错误'}`);
    }
  }

  private async formatFolder(): Promise<void> {
    const mdFiles = this.app.vault.getMarkdownFiles();
    let processed = 0;
    let failed = 0;

    showNotice('开始批量格式化...');

    for (const file of mdFiles) {
      try {
        const content = await this.app.vault.read(file);
        const stat = await this.app.vault.adapter.stat(file.path);
        const fileInfo = stat ? { ctime: stat.ctime, mtime: stat.mtime } : undefined;

        const result = await this.processor.processContent(content, this.settings, undefined, file.basename, fileInfo);

        if (result.success && result.content && result.content !== content) {
          await this.app.vault.modify(file, result.content);
          processed++;
        }
      } catch {
        failed++;
      }
    }

    showNotice(`批量格式化完成: ${processed} 个文件已更新, ${failed} 个失败`);
  }

  async loadSettings(): Promise<void> {
    const data = await this.loadData();
    this.settings = { ...DEFAULT_SETTINGS, ...data };
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
    // 设置变更后重新初始化 AIService
    this.formatter.setAIService(this.createAIService());
  }

  onunload() {}
}
```

需要在文件顶部添加 `import type { AIService } from './types';` 以避免直接导入实现类到类型引用中。实际上因为 `createAIService` 返回的是 `AIServiceImpl | undefined`，而 Formatter 接收的是 `AIService | undefined`，所以导入 `AIServiceImpl` 是正确的。

- [ ] **步骤 2：运行构建验证**

运行：`npm run build`
预期：构建成功

- [ ] **步骤 3：运行全部测试确认无回归**

运行：`npm test`
预期：所有测试通过

- [ ] **步骤 4：Commit**

```bash
git add src/main.ts
git commit -m "feat: main.ts 初始化 AIService，获取文件时间戳传入 Formatter"
```

---

### 任务 6：设置面板 UI — AI Frontmatter 配置

**文件：**
- 修改：`src/ui/SettingsTab.ts`

- [ ] **步骤 1：修改 SettingsTab 新增 AI 设置区域**

在 `src/ui/SettingsTab.ts` 的 `display()` 方法中新增 `renderAISettings` 调用，并实现该方法。完整的修改后内容：

```typescript
import { App, PluginSettingTab, Setting } from 'obsidian';
import type { PluginSettings, RuleConfig, AIProviderConfig } from '../types';
import { DEFAULT_SETTINGS } from '../types';
import type MarkdownFormatterPlugin from '../main';

export class SettingsTab extends PluginSettingTab {
  constructor(
    app: App,
    private plugin: MarkdownFormatterPlugin
  ) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.addClass('md-formatter-settings');

    this.renderFileSettings(containerEl);
    this.renderEncodingSettings(containerEl);
    this.renderAISettings(containerEl);
    this.renderRuleSettings(containerEl);
  }

  private renderFileSettings(containerEl: HTMLElement): void {
    new Setting(containerEl)
      .setName('文件处理')
      .setHeading();

    new Setting(containerEl)
      .setName('大文件阈值 (KB)')
      .setDesc('超过此大小的文件将进行分块处理')
      .addText((text) =>
        text
          .setValue(String(this.plugin.settings.fileSizeThreshold))
          .onChange(async (value) => {
            this.plugin.settings.fileSizeThreshold = parseInt(value) || 500;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('分块大小 (KB)')
      .setDesc('每个分块的最大大小')
      .addText((text) =>
        text
          .setValue(String(this.plugin.settings.chunkSize))
          .onChange(async (value) => {
            this.plugin.settings.chunkSize = parseInt(value) || 100;
            await this.plugin.saveSettings();
          })
      );
  }

  private renderEncodingSettings(containerEl: HTMLElement): void {
    new Setting(containerEl)
      .setName('编码设置')
      .setHeading();

    new Setting(containerEl)
      .setName('自动检测编码')
      .setDesc('尝试自动检测文件编码')
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.autoDetectEncoding)
          .onChange(async (value) => {
            this.plugin.settings.autoDetectEncoding = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('回退编码')
      .setDesc('编码检测失败时使用的默认编码')
      .addDropdown((dropdown) =>
        dropdown
          .addOption('utf-8', 'UTF-8')
          .addOption('gbk', 'GBK')
          .addOption('gb2312', 'GB2312')
          .addOption('big5', 'BIG5')
          .setValue(this.plugin.settings.fallbackEncoding)
          .onChange(async (value) => {
            this.plugin.settings.fallbackEncoding = value;
            await this.plugin.saveSettings();
          })
      );
  }

  private renderAISettings(containerEl: HTMLElement): void {
    new Setting(containerEl)
      .setName('AI Frontmatter 设置')
      .setHeading();

    const aiConfig = this.plugin.settings.aiFrontmatter;

    new Setting(containerEl)
      .setName('启用 AI 元数据生成')
      .setDesc('格式化时使用 AI 生成 tags、summary、categories。AI 不可用时仅处理时间字段和时间标签。')
      .addToggle((toggle) =>
        toggle
          .setValue(aiConfig.enabled)
          .onChange(async (value) => {
            this.plugin.settings.aiFrontmatter.enabled = value;
            await this.plugin.saveSettings();
            this.display();
          })
      );

    if (!aiConfig.enabled) return;

    // 提供商管理
    new Setting(containerEl)
      .setName('AI 提供商')
      .setDesc('配置 AI 大模型提供商，按优先级排序。第一个为默认提供商，失败后自动尝试下一个。')
      .setHeading();

    for (let i = 0; i < aiConfig.providers.length; i++) {
      this.renderProviderItem(containerEl, i);
    }

    // 添加提供商按钮
    new Setting(containerEl)
      .addButton((btn) =>
        btn
          .setButtonText('添加提供商')
          .onClick(() => {
            aiConfig.providers.push({
              name: '新提供商',
              baseUrl: '',
              apiKey: '',
              model: '',
              temperature: 0.7,
              maxTokens: 4096,
            });
            this.plugin.saveSettings().then(() => this.display());
          })
      );

    // 参数设置
    new Setting(containerEl)
      .setName('标签数量上限')
      .setDesc('AI 生成的内容标签最大数量')
      .addText((text) =>
        text
          .setValue(String(aiConfig.maxTags))
          .onChange(async (value) => {
            this.plugin.settings.aiFrontmatter.maxTags = parseInt(value) || 5;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('分类数量上限')
      .setDesc('AI 生成的分类最大数量')
      .addText((text) =>
        text
          .setValue(String(aiConfig.maxCategories))
          .onChange(async (value) => {
            this.plugin.settings.aiFrontmatter.maxCategories = parseInt(value) || 3;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('自定义提示词补充')
      .setDesc('追加到默认 AI 提示词末尾的自定义内容')
      .addTextArea((textarea) =>
        textarea
          .setValue(aiConfig.customPrompt)
          .onChange(async (value) => {
            this.plugin.settings.aiFrontmatter.customPrompt = value;
            await this.plugin.saveSettings();
          })
      );
  }

  private renderProviderItem(containerEl: HTMLElement, index: number): void {
    const provider = this.plugin.settings.aiFrontmatter.providers[index];
    const isDefault = index === 0;

    const providerContainer = containerEl.createDiv({ cls: 'md-formatter-provider-item' });

    new Setting(providerContainer)
      .setName(`${provider.name}${isDefault ? ' (默认)' : ''}`)
      .setHeading();

    new Setting(providerContainer)
      .setName('名称')
      .addText((text) =>
        text
          .setValue(provider.name)
          .onChange(async (value) => {
            this.plugin.settings.aiFrontmatter.providers[index].name = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(providerContainer)
      .setName('API 基地址')
      .setDesc('如 https://api.deepseek.com')
      .addText((text) =>
        text
          .setValue(provider.baseUrl)
          .onChange(async (value) => {
            this.plugin.settings.aiFrontmatter.providers[index].baseUrl = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(providerContainer)
      .setName('API Key')
      .addText((text) =>
        text
          .setValue(provider.apiKey)
          .onChange(async (value) => {
            this.plugin.settings.aiFrontmatter.providers[index].apiKey = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(providerContainer)
      .setName('模型名称')
      .setDesc('如 deepseek-chat')
      .addText((text) =>
        text
          .setValue(provider.model)
          .onChange(async (value) => {
            this.plugin.settings.aiFrontmatter.providers[index].model = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(providerContainer)
      .setName('Temperature')
      .addText((text) =>
        text
          .setValue(String(provider.temperature))
          .onChange(async (value) => {
            this.plugin.settings.aiFrontmatter.providers[index].temperature = parseFloat(value) || 0.7;
            await this.plugin.saveSettings();
          })
      );

    new Setting(providerContainer)
      .setName('Max Tokens')
      .addText((text) =>
        text
          .setValue(String(provider.maxTokens))
          .onChange(async (value) => {
            this.plugin.settings.aiFrontmatter.providers[index].maxTokens = parseInt(value) || 4096;
            await this.plugin.saveSettings();
          })
      );

    // 优先级调整按钮
    const actionSetting = new Setting(providerContainer);

    if (index > 0) {
      actionSetting.addButton((btn) =>
        btn
          .setButtonText('↑ 上移')
          .onClick(async () => {
            const providers = this.plugin.settings.aiFrontmatter.providers;
            [providers[index - 1], providers[index]] = [providers[index], providers[index - 1]];
            await this.plugin.saveSettings();
            this.display();
          })
      );
    }

    if (index < this.plugin.settings.aiFrontmatter.providers.length - 1) {
      actionSetting.addButton((btn) =>
        btn
          .setButtonText('↓ 下移')
          .onClick(async () => {
            const providers = this.plugin.settings.aiFrontmatter.providers;
            [providers[index], providers[index + 1]] = [providers[index + 1], providers[index]];
            await this.plugin.saveSettings();
            this.display();
          })
      );
    }

    actionSetting.addButton((btn) =>
      btn
        .setButtonText('删除')
        .setWarning()
        .onClick(async () => {
          this.plugin.settings.aiFrontmatter.providers.splice(index, 1);
          await this.plugin.saveSettings();
          this.display();
        })
    );
  }

  private renderRuleSettings(containerEl: HTMLElement): void {
    new Setting(containerEl)
      .setName('规则配置')
      .setHeading();

    const rules = [
      { name: 'frontmatter', label: 'Frontmatter 格式化' },
      { name: 'headingStructure', label: '标题层级结构' },
      { name: 'heading', label: '标题规范化' },
      { name: 'paragraph', label: '段落格式化' },
      { name: 'list', label: '列表格式化' },
      { name: 'codeBlock', label: '代码块处理' },
      { name: 'table', label: '表格格式化' },
      { name: 'link', label: '链接/图片' },
    ];

    for (const rule of rules) {
      this.renderRuleToggle(containerEl, rule.name, rule.label);
    }

    new Setting(containerEl)
      .addButton((btn) =>
        btn
          .setButtonText('重置为默认')
          .onClick(async () => {
            this.plugin.settings = { ...DEFAULT_SETTINGS };
            await this.plugin.saveSettings();
            this.display();
          })
      );
  }

  private renderRuleToggle(containerEl: HTMLElement, ruleName: string, label: string): void {
    const ruleConfig = this.plugin.settings.rules[ruleName] || { enabled: true };

    new Setting(containerEl)
      .setName(label)
      .addToggle((toggle) =>
        toggle
          .setValue(ruleConfig.enabled !== false)
          .onChange(async (value) => {
            if (!this.plugin.settings.rules[ruleName]) {
              this.plugin.settings.rules[ruleName] = { enabled: value };
            } else {
              this.plugin.settings.rules[ruleName].enabled = value;
            }
            await this.plugin.saveSettings();
          })
      );
  }
}
```

- [ ] **步骤 2：运行构建验证**

运行：`npm run build`
预期：构建成功

- [ ] **步骤 3：运行全部测试确认无回归**

运行：`npm test`
预期：所有测试通过

- [ ] **步骤 4：Commit**

```bash
git add src/ui/SettingsTab.ts
git commit -m "feat: 设置面板新增 AI Frontmatter 配置区域"
```

---

### 任务 7：集成测试和最终验证

**文件：**
- 无新文件，仅验证

- [ ] **步骤 1：运行构建验证**

运行：`npm run build`
预期：构建成功，main.js 产出

- [ ] **步骤 2：运行全部测试**

运行：`npm test`
预期：所有测试通过（包括 FrontmatterRule 新增测试和 AIService 测试）

- [ ] **步骤 3：最终 Commit**

```bash
git commit --allow-empty -m "chore: 集成验证完成，frontmatter 增强 + AI 元数据生成功能就绪"
```