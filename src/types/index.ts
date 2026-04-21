import type { Node } from 'unist';

/**
 * 格式化规则接口
 */
export interface FormatRule {
  /** 规则唯一标识 */
  name: string;
  /** 执行优先级（数值越小越先执行） */
  priority: number;
  /** 规则描述 */
  description: string;
  /** 默认配置 */
  defaultConfig: Record<string, unknown>;
  /** 应用规则转换AST */
  apply(ast: Node, config: RuleConfig): Node;
}

/**
 * 规则配置
 */
export interface RuleConfig {
  enabled: boolean;
  [key: string]: unknown;
}

/**
 * 插件设置
 */
export interface PluginSettings {
  /** 大文件阈值（KB） */
  fileSizeThreshold: number;
  /** 分块大小（KB） */
  chunkSize: number;
  /** 自动检测编码 */
  autoDetectEncoding: boolean;
  /** 回退编码 */
  fallbackEncoding: string;
  /** 规则配置 */
  rules: Record<string, RuleConfig>;
}

/**
 * 默认设置
 */
export const DEFAULT_SETTINGS: PluginSettings = {
  fileSizeThreshold: 500,
  chunkSize: 100,
  autoDetectEncoding: true,
  fallbackEncoding: 'utf-8',
  rules: {},
};

/**
 * 格式化结果
 */
export interface FormatResult {
  success: boolean;
  content?: string;
  error?: string;
  stats?: {
    rulesApplied: number;
    changesMade: number;
  };
}

/**
 * 处理进度
 */
export interface Progress {
  current: number;
  total: number;
  message: string;
}

/**
 * 进度回调
 */
export type ProgressCallback = (progress: Progress) => void;