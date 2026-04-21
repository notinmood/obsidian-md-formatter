// src/utils/notice.ts
import { Notice } from 'obsidian';
import type { Progress, ProgressCallback } from '../types';

/**
 * 显示Obsidian通知
 */
export function showNotice(message: string, duration = 3000): Notice {
  return new Notice(message, duration);
}

/**
 * 创建进度回调函数
 */
export function createProgressCallback(): ProgressCallback {
  let lastNotice: Notice | null = null;

  return (progress: Progress) => {
    // 关闭上一个通知
    if (lastNotice) {
      lastNotice.hide();
    }

    const percentage = Math.round((progress.current / progress.total) * 100);
    const message = `${progress.message} (${percentage}%)`;
    lastNotice = showNotice(message, 0); // 持续显示
  };
}

/**
 * 隐藏进度通知
 */
export function hideProgress(): void {
  // Notice会自动隐藏或被新通知替换
}
