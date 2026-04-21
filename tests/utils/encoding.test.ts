// tests/utils/encoding.test.ts
import { detectEncoding, decodeBuffer, encodeToBuffer } from '../../src/utils/encoding';

describe('encoding', () => {
  describe('detectEncoding', () => {
    it('应该检测UTF-8编码', () => {
      const content = 'Hello, 世界!';
      const buffer = Buffer.from(content, 'utf-8');
      const result = detectEncoding(buffer);
      expect(result).toBe('utf-8');
    });

    it('应该对空内容返回utf-8', () => {
      const buffer = Buffer.from('');
      const result = detectEncoding(buffer);
      expect(result).toBe('utf-8');
    });

    it('应该检测UTF-8 BOM', () => {
      const buffer = Buffer.from([0xef, 0xbb, 0xbf, 0x48, 0x65, 0x6c, 0x6c, 0x6f]);
      const result = detectEncoding(buffer);
      expect(result).toBe('utf-8');
    });
  });

  describe('decodeBuffer', () => {
    it('应该正确解码UTF-8内容', () => {
      const content = 'Hello, 世界!';
      const buffer = Buffer.from(content, 'utf-8');
      const result = decodeBuffer(buffer, 'utf-8');
      expect(result).toBe(content);
    });
  });

  describe('encodeToBuffer', () => {
    it('应该正确编码为UTF-8', () => {
      const content = 'Hello, 世界!';
      const buffer = encodeToBuffer(content, 'utf-8');
      expect(buffer.toString('utf-8')).toBe(content);
    });
  });
});
