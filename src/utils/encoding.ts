// src/utils/encoding.ts
import jschardet from 'jschardet';

export type SupportedEncoding = 'utf-8' | 'gbk' | 'gb2312' | 'big5' | 'utf-16le';

/**
 * 检测Buffer的编码
 */
export function detectEncoding(buffer: Buffer): SupportedEncoding {
  if (buffer.length === 0) {
    return 'utf-8';
  }

  // 检查BOM
  if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    return 'utf-8';
  }
  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
    return 'utf-16le';
  }

  // 尝试UTF-8验证
  try {
    const decoded = buffer.toString('utf-8');
    const reEncoded = Buffer.from(decoded, 'utf-8');
    if (reEncoded.equals(buffer)) {
      return 'utf-8';
    }
  } catch {
    // 继续其他检测
  }

  // 使用jschardet检测
  const detected = jschardet.detect(buffer);
  if (detected.encoding) {
    const enc = detected.encoding.toLowerCase();
    if (enc === 'gb2312' || enc === 'gbk') {
      return 'gbk';
    }
    if (enc === 'big5') {
      return 'big5';
    }
    if (enc === 'utf-8' || enc === 'ascii') {
      return 'utf-8';
    }
  }

  return 'utf-8';
}

/**
 * 解码Buffer为字符串
 */
export function decodeBuffer(buffer: Buffer, encoding: SupportedEncoding): string {
  try {
    if (encoding === 'utf-8') {
      return buffer.toString('utf-8');
    }
    if (encoding === 'utf-16le') {
      return buffer.toString('utf16le');
    }
    // GBK/GB2312/BIG5 - 使用binary作为fallback
    return buffer.toString('binary');
  } catch (error) {
    throw new Error(`Failed to decode buffer with encoding ${encoding}: ${error}`);
  }
}

/**
 * 编码字符串为Buffer
 */
export function encodeToBuffer(content: string, encoding: SupportedEncoding): Buffer {
  if (encoding === 'utf-8') {
    return Buffer.from(content, 'utf-8');
  }
  if (encoding === 'utf-16le') {
    return Buffer.from(content, 'utf16le');
  }
  // GBK/GB2312/BIG5
  return Buffer.from(content, 'binary');
}
