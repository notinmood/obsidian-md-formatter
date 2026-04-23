# Obsidian Markdown Formatter

一个用于 Obsidian 的 Markdown 格式化插件，支持手动触发格式化，采用插件式规则架构便于扩展。

## 功能特性

- **格式化当前文件** - 一键格式化当前打开的 Markdown 文件（快捷键 `Alt+F`）
- **格式化选中内容** - 仅格式化选中的文本片段
- **批量格式化文件夹** - 批量处理整个文件夹下的所有 Markdown 文件
- **大文件支持** - 自动检测大文件并进行分块处理
- **编码检测** - 支持 UTF-8、GBK、GB2312、BIG5 等编码自动检测
- **可配置规则** - 每条格式化规则都可独立开关
- **标题层级结构** - 确保标题逐级递增，全文仅一个一级标题
- **代码块语言推断** - 自动推断代码块语言，无法推断时使用 `plain`
- **智能空行控制** - 不同块元素间保留 1 个空行，相同块元素间无空行

## 格式化规则

| 规则 | 说明 |
|------|------|
| Frontmatter 格式化 | 确保 YAML frontmatter 使用 `---` 标记 |
| 标题层级结构 | 确保标题逐级递增（# → ## → ###），全文仅一个一级标题，没有则用文件名作为标题 |
| 标题规范化 | 移除标题前多余空行，强制 ATX 风格（`#`） |
| 段落格式化 | 清理行尾空白，默认不添加段落间空行（可配置） |
| 列表格式化 | 统一使用 `-` 作为列表标记，控制列表缩进 |
| 代码块处理 | 自动推断代码块语言（支持 TypeScript、Python、Shell、JSON、YAML 等），无语言标识时使用 `plain` |
| 表格格式化 | 自动对齐表格列 |
| 链接/图片 | 格式化链接和图片语法 |

## 安装

### 手动安装

1. 从 [Gitee Releases](https://gitee.com/xiedali/obsidian-md-formatter/releases) 下载最新版本的 `obsidian-md-formatter-vX.X.X.zip`

2. 解压后将以下文件复制到 Obsidian 插件目录：
   ```
   你的Vault/.obsidian/plugins/obsidian-md-formatter/
   ├── main.js
   ├── manifest.json
   └── styles.css
   ```

3. 重启 Obsidian，在设置中启用 "Markdown Formatter" 插件

### 从源码构建

```bash
# 克隆仓库
git clone https://gitee.com/xiedali/obsidian-md-formatter.git
cd obsidian-md-formatter

# 安装依赖
npm install

# 构建
npm run build
```

构建产物 `main.js` 会在项目根目录生成。

## 使用方法

### 命令与快捷键

通过命令面板（`Ctrl/Cmd + P`）执行：

| 命令 | 默认快捷键 | 说明 |
|------|------------|------|
| 格式化当前文件 | `Alt+F` | 格式化当前打开的文件 |
| 格式化选中内容 | -（可自定义） | 仅格式化选中的文本 |
| 批量格式化文件夹 | -（可自定义） | 批量处理所有 Markdown 文件 |

> 所有快捷键均可通过 Obsidian 设置 → 快捷键自定义

### 设置

在 Obsidian 设置 → Markdown Formatter 中可配置：

**文件处理**
- 大文件阈值 (KB) - 超过此大小将分块处理
- 分块大小 (KB) - 每个分块的最大大小

**编码设置**
- 自动检测编码 - 尝试自动检测文件编码
- 回退编码 - 检测失败时的默认编码

**规则配置**
- 可独立开关每条格式化规则

## 技术栈

- TypeScript 5.x
- Obsidian API 1.x
- remark 15.x (Markdown 解析)
- remark-frontmatter (YAML frontmatter 支持)
- esbuild (打包)

## 开发

```bash
# 安装依赖
npm install

# 开发模式（监听文件变化）
npm run dev

# 运行测试
npm test

# 构建
npm run build
```

## 项目结构

```
obsidian-md-formatter/
├── src/
│   ├── main.ts              # 插件入口
│   ├── types/               # 类型定义
│   ├── core/                # 核心模块
│   │   ├── Formatter.ts     # 格式化引擎
│   │   ├── RuleRegistry.ts  # 规则注册中心
│   │   └── FileProcessor.ts # 文件处理器
│   ├── rules/               # 格式化规则
│   │   ├── FrontmatterRule.ts
│   │   ├── HeadingStructureRule.ts
│   │   ├── HeadingRule.ts
│   │   ├── ParagraphRule.ts
│   │   ├── ListRule.ts
│   │   ├── CodeBlockRule.ts
│   │   ├── TableRule.ts
│   │   └── LinkRule.ts
│   ├── ui/                  # 设置面板
│   └── utils/               # 工具函数
├── tests/                   # 测试文件
├── manifest.json            # 插件清单
├── styles.css               # 样式
└── package.json
```


## 参考资料

- [微软 Markdown 最佳做法](https://learn.microsoft.com/zh-cn/powershell/scripting/community/contributing/general-markdown?view=powershell-7.6)
- [MarkDownLint的规则文档](https://github.com/DavidAnson/markdownlint/tree/main/doc)

## 许可证

MIT
