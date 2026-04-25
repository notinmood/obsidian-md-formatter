import type { Node, Parent } from 'unist';

// 导出 Node 类型供测试使用
export type { Node };

/**
 * 扩展的 AST 节点类型
 * 使用宽松的类型定义以兼容 remark AST
 */
export interface AstNode {
  type: string;
  children?: AstNode[];
  value?: string;
  depth?: number;
  // 代码块属性
  lang?: string;
  meta?: string;
  // 链接属性
  url?: string;
  title?: string | null;
  alt?: string | null;
  identifier?: string;
  // 列表属性
  ordered?: boolean;
  start?: number;
  spread?: boolean;
  // 表格属性
  align?: ('left' | 'right' | 'center' | null)[];
  // 其他可能的属性
  [key: string]: unknown;
}

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
  apply(ast: AstNode, config: RuleConfig, filename?: string, fileInfo?: FileInfo, aiService?: AIService): Promise<AstNode> | AstNode;
}

/**
 * 规则配置
 * Frontmatter 规则的配置支持 subRules 嵌套结构
 */
export interface RuleConfig {
  enabled: boolean;
  [key: string]: unknown;
}

/**
 * Frontmatter 子规则配置 - 时间字段
 */
export interface FrontmatterCreatedConfig {
  enabled: boolean;
  useFileCtime: boolean;
}

export interface FrontmatterUpdatedConfig {
  enabled: boolean;
}

/**
 * Frontmatter 子规则配置 - 标签
 */
export interface FrontmatterTagsConfig {
  enabled: boolean;
  ensureTimeTags: boolean;
  ai: {
    enabled: boolean;
  };
}

/**
 * Frontmatter 子规则配置 - 摘要
 */
export interface FrontmatterSummaryConfig {
  enabled: boolean;
  ai: {
    enabled: boolean;
  };
}

/**
 * Frontmatter 子规则配置 - 分类
 */
export interface FrontmatterCategoriesConfig {
  enabled: boolean;
  ai: {
    enabled: boolean;
  };
}

/**
 * Frontmatter 子规则配置 - 标题
 */
export interface FrontmatterTitleConfig {
  enabled: boolean;
  useFilename: boolean;
}

/**
 * Frontmatter 子规则配置集合
 */
export interface FrontmatterSubRules {
  created: FrontmatterCreatedConfig;
  updated: FrontmatterUpdatedConfig;
  tags: FrontmatterTagsConfig;
  summary: FrontmatterSummaryConfig;
  categories: FrontmatterCategoriesConfig;
  title: FrontmatterTitleConfig;
}

/**
 * Frontmatter 子规则默认配置
 */
export const DEFAULT_SUBRULES: FrontmatterSubRules = {
  created: { enabled: true, useFileCtime: true },
  updated: { enabled: true },
  tags: { enabled: true, ensureTimeTags: true, ai: { enabled: true } },
  summary: { enabled: true, ai: { enabled: true } },
  categories: { enabled: true, ai: { enabled: true } },
  title: { enabled: true, useFilename: true },
};

/**
 * Frontmatter 规则完整配置
 */
export interface FrontmatterConfig extends RuleConfig {
  normalizeFields: boolean;
  subRules: FrontmatterSubRules;
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
  /** AI frontmatter 配置 */
  aiFrontmatter: AIFrontmatterConfig;
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
  aiFrontmatter: {
    enabled: false,
    providers: [],
    maxTags: 5,
    maxCategories: 3,
    customPrompt: '',
    showPreview: true,
  },
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
  showPreview: boolean;
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

export interface AIService {
  generateMetadata(content: string, createdDate: string, existingTags: string[]): Promise<AIMetadataResult | null>;
}