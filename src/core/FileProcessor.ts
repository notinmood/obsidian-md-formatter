// src/core/FileProcessor.ts
import type { PluginSettings, FormatResult, ProgressCallback } from '../types';
import { Formatter } from './Formatter';

/**
 * 文件处理器
 * 处理大文件分块和编码检测
 */
export class FileProcessor {
  constructor(private formatter: Formatter) {}

  /**
   * 处理文件内容
   */
  async processContent(
    content: string,
    settings: PluginSettings,
    progressCallback?: ProgressCallback,
    filename?: string
  ): Promise<FormatResult> {
    try {
      // 检查是否需要分块处理
      if (this.shouldChunkFile(content, settings)) {
        return await this.processChunked(content, settings, progressCallback, filename);
      }

      // 直接处理
      return await this.formatter.format(content, settings, { filename });
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 判断是否需要分块处理
   */
  shouldChunkFile(content: string, settings: PluginSettings): boolean {
    const sizeKB = Buffer.byteLength(content, 'utf-8') / 1024;
    return sizeKB > settings.fileSizeThreshold;
  }

  /**
   * 分块处理大文件
   */
  private async processChunked(
    content: string,
    settings: PluginSettings,
    progressCallback?: ProgressCallback,
    filename?: string
  ): Promise<FormatResult> {
    // 按Markdown结构边界分块
    const chunks = this.splitByMarkdownBoundary(content, settings.chunkSize * 1024);
    const results: string[] = [];

    for (let i = 0; i < chunks.length; i++) {
      if (progressCallback) {
        progressCallback({
          current: i + 1,
          total: chunks.length,
          message: '正在格式化大文件',
        });
      }

      // 只有第一个分块传入 filename（用于添加一级标题）
      const chunkFilename = i === 0 ? filename : undefined;
      const result = await this.formatter.format(chunks[i], settings, { filename: chunkFilename });
      if (!result.success) {
        return result;
      }
      results.push(result.content || chunks[i]);
    }

    return {
      success: true,
      content: results.join('\n\n'),
      stats: {
        rulesApplied: 0,
        changesMade: 0,
      },
    };
  }

  /**
   * 按Markdown结构边界分割内容
   */
  private splitByMarkdownBoundary(content: string, chunkSize: number): string[] {
    const lines = content.split('\n');
    const chunks: string[] = [];
    let currentChunk: string[] = [];
    let currentSize = 0;

    for (const line of lines) {
      const lineSize = Buffer.byteLength(line, 'utf-8') + 1; // +1 for newline

      // 检查是否是Markdown边界（标题、代码块开始/结束等）
      const isBoundary = /^#{1,6}\s/.test(line) || /^```/.test(line);

      if (currentSize + lineSize > chunkSize && currentChunk.length > 0 && isBoundary) {
        chunks.push(currentChunk.join('\n'));
        currentChunk = [];
        currentSize = 0;
      }

      currentChunk.push(line);
      currentSize += lineSize;
    }

    if (currentChunk.length > 0) {
      chunks.push(currentChunk.join('\n'));
    }

    return chunks;
  }
}