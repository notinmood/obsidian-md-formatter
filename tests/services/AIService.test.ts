import { jest } from '@jest/globals';
import { AIServiceImpl } from '../../src/services/AIService';
import type { AIProviderConfig, AIFrontmatterConfig } from '../../src/types';
import { __mocks } from 'obsidian';

const mockRequestUrl = jest.fn();
__mocks.requestUrl = mockRequestUrl;

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

  beforeEach(() => {
    mockRequestUrl.mockReset();
  });

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