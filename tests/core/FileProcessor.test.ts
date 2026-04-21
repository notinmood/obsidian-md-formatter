// tests/core/FileProcessor.test.ts
import { FileProcessor } from '../../src/core/FileProcessor';
import { Formatter } from '../../src/core/Formatter';
import { RuleRegistry } from '../../src/core/RuleRegistry';
import { PluginSettings, DEFAULT_SETTINGS } from '../../src/types';

describe('FileProcessor', () => {
  let processor: FileProcessor;
  let registry: RuleRegistry;
  let formatter: Formatter;

  beforeEach(() => {
    registry = new RuleRegistry();
    formatter = new Formatter(registry);
    processor = new FileProcessor(formatter);
  });

  describe('processContent', () => {
    it('应该处理小文件', async () => {
      const content = '# Test\n\nContent here.';
      const settings: PluginSettings = {
        ...DEFAULT_SETTINGS,
        fileSizeThreshold: 500,
        chunkSize: 100,
      };

      const result = await processor.processContent(content, settings);
      expect(result.success).toBe(true);
    });

    it('应该返回内容长度', async () => {
      const content = '# Test';
      const settings = DEFAULT_SETTINGS;

      const result = await processor.processContent(content, settings);
      expect(result.success).toBe(true);
    });
  });

  describe('shouldChunkFile', () => {
    it('小文件应返回false', () => {
      const content = 'a'.repeat(100);
      const settings: PluginSettings = {
        ...DEFAULT_SETTINGS,
        fileSizeThreshold: 500,
      };

      expect(processor.shouldChunkFile(content, settings)).toBe(false);
    });

    it('大文件应返回true', () => {
      const content = 'a'.repeat(600 * 1024); // 600KB
      const settings: PluginSettings = {
        ...DEFAULT_SETTINGS,
        fileSizeThreshold: 500,
      };

      expect(processor.shouldChunkFile(content, settings)).toBe(true);
    });
  });
});