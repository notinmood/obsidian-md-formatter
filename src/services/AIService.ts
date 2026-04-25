import { requestUrl, Notice } from 'obsidian';
import type { AIFrontmatterConfig, AIProviderConfig, AIMetadataResult, AIService } from '../types';

export class AIServiceImpl implements AIService {
  private config: AIFrontmatterConfig;

  constructor(config: AIFrontmatterConfig) {
    this.config = config;
  }

  async generateMetadata(content: string, createdDate: string, existingTags: string[]): Promise<AIMetadataResult | null> {
    if (!this.config.enabled || this.config.providers.length === 0) {
      return null;
    }

    let lastError = '';
    for (let i = 0; i < this.config.providers.length; i++) {
      const provider = this.config.providers[i];
      try {
        const result = await this.callProvider(provider, content, createdDate, existingTags);
        if (result) return result;
        // callProvider 返回 null 但没抛异常（如响应解析失败）
        lastError = '响应解析失败';
      } catch (e) {
        lastError = e instanceof Error ? e.message : String(e);
        console.warn(`[MD Formatter] AI 提供商 "${provider.name}" 调用失败: ${lastError}`);
      }
    }

    // 所有提供商均失败
    console.warn(`[MD Formatter] AI 元数据生成失败: ${lastError}`);
    new Notice(`AI 元数据生成失败：所有提供商均不可用 (${lastError})`);
    return null;
  }

  private async callProvider(provider: AIProviderConfig, content: string, createdDate: string, existingTags: string[]): Promise<AIMetadataResult | null> {
    const systemPrompt = this.buildSystemPrompt(existingTags);
    const baseUrl = provider.baseUrl.replace(/\/+$/, '');

    const response = await requestUrl({
      url: `${baseUrl}/chat/completions`,
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
      console.warn(`[MD Formatter] AI 提供商 "${provider.name}" 返回状态码 ${response.status}`);
      return null;
    }

    const textContent = response.json?.choices?.[0]?.message?.content || '';
    const result = this.parseResponse(textContent);
    if (!result) {
      console.warn(`[MD Formatter] AI 提供商 "${provider.name}" 返回内容无法解析: ${textContent.slice(0, 200)}`);
    }
    return result;
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
