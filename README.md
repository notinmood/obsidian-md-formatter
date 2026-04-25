# Obsidian Markdown Formatter

一个用于 Obsidian 的 Markdown 格式化插件，支持手动触发格式化，采用插件式规则架构便于扩展。

## 功能特性

- **格式化当前文件** - 一键格式化当前打开的 Markdown 文件（快捷键 `Alt+F`）
- **格式化选中内容** - 仅格式化选中的文本片段
- **批量格式化文件夹** - 批量处理整个文件夹下的所有 Markdown 文件
- **大文件支持** - 自动检测大文件并进行分块处理
- **编码检测** - 支持 UTF-8、GBK、GB2312、BIG5 等编码自动检测
- **可配置规则** - 每条格式化规则都可独立开关
- **Frontmatter 子规则** - 时间字段、标签、摘要、分类、标题各自独立开关
- **标题层级结构** - 确保标题逐级递增，全文仅一个一级标题
- **代码块语言推断** - 自动推断代码块语言，无法推断时使用 `plain`
- **智能空行控制** - 不同块元素间保留 1 个空行，相同块元素间无空行
- **光标位置保持** - 格式化后光标位置不变，支持一次 Ctrl+Z 整体撤销
- **AI 元数据生成** - 可选功能，使用 AI 大模型为 frontmatter 自动生成标签、摘要、分类（默认关闭）

## 格式化规则

| 规则 | 说明 |
|------|------|
| Frontmatter 格式化 | 确保 YAML frontmatter 使用 `---` 标记，支持字段规范化、时间字段、标签、摘要、分类、标题等子规则独立配置 |
| 标题层级结构 | 确保标题逐级递增（# → ## → ###），全文仅一个一级标题，没有则用文件名作为标题 |
| 标题规范化 | 移除标题前多余空行，强制 ATX 风格（`#`） |
| 段落格式化 | 清理行尾空白，默认不添加段落间空行（可配置） |
| 列表格式化 | 统一使用 `-` 作为列表标记，控制列表缩进 |
| 代码块处理 | 自动推断代码块语言（支持 TypeScript、Python、Shell、JSON、YAML 等），无语言标识时使用 `plain` |
| 表格格式化 | 自动对齐表格列 |
| 链接/图片 | 格式化链接和图片语法 |

### Frontmatter 子规则

Frontmatter 规则支持细粒度的子规则配置，每个子功能可独立开关：

| 子规则 | 说明 | 是否依赖 AI |
|--------|------|-------------|
| 字段规范化 | `create→created`、`update→updated`、`tag→tags` 自动转换 | 否 |
| created 时间 | 缺失时自动从文件创建时间填充 | 否 |
| updated 时间 | 每次格式化时更新为当前时间 | 否 |
| 标签 (tags) | 确保时间标签（Year/YYYY、Month/MM）存在；AI 生成内容标签 | 确定性逻辑否，AI 标签是 |
| 摘要 (summary) | AI 生成摘要（已有摘要不覆盖） | 是 |
| 分类 (categories) | AI 生成分类 | 是 |
| 标题 (title) | 缺失时用文件名填充 | 否 |

> 不依赖 AI 的子规则在 AI 不可用时仍正常执行，AI 相关子规则会静默跳过。

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

**AI 设置**（默认关闭）
- 启用 AI 元数据生成 - 开启后格式化时调用 AI 生成标签、摘要、分类
- AI 提供商管理 - 配置多个提供商（点击名称展开编辑），支持排序和故障自动切换
- 标签/分类数量上限
- 自定义提示词

**规则配置**
- Frontmatter 格式化 - 主开关 + 子规则折叠面板（字段规范化、created、updated、tags、summary、categories、title 各自独立配置）
- 其他规则 - 标题层级结构、标题规范化、段落、列表、代码块、表格、链接/图片，均可独立开关

> ⚠️ **AI 功能注意事项**：
> - AI 元数据生成**默认是关闭的**，需要在设置中手动启用并配置 AI 提供商
> - 启用后，格式化操作会调用 AI API，**响应时间会明显变长**（通常需要数秒到数十秒），请耐心等待
> - AI 不可用时（未配置、网络异常、API 余额不足等），格式化仍会正常执行确定性逻辑（时间字段、时间标签、字段规范化等），AI 相关字段会跳过
> - AI 调用失败时会在 Obsidian 通知栏显示错误提示，具体错误信息可在开发者控制台（Ctrl+Shift+I）查看
> - AI 生成的 tags 使用二级格式（如 `科技/AI`），categories 也使用二级格式（如 `人文社科/历史`）
> - 所有 AI 调用使用 OpenAI 兼容的 `/chat/completions` 接口，支持 DeepSeek、通义千问、智谱等国内大模型
> - 如果没有自己的ai账户。推荐使用智普免费的大模型：API地址：`https://open.bigmodel.cn/api/paas/v4`；API Key：<需要你到智普官方注册生成key，免费>；模型名称：`glm-4-flash`（这个模型是免费的，官方文档说这个已经下线，其实可以继续使用。并且也因此使用的人比较少，挺快。）

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
│   ├── types/               # 类型定义（含 FrontmatterConfig、DEFAULT_SUBRULES）
│   ├── core/                # 核心模块
│   │   ├── Formatter.ts     # 格式化引擎
│   │   ├── RuleRegistry.ts  # 规则注册中心
│   │   └── FileProcessor.ts # 文件处理器
│   ├── rules/               # 格式化规则
│   │   ├── FrontmatterRule.ts  # 支持子规则嵌套配置
│   │   ├── HeadingStructureRule.ts
│   │   ├── HeadingRule.ts
│   │   ├── ParagraphRule.ts
│   │   ├── ListRule.ts
│   │   ├── CodeBlockRule.ts
│   │   ├── TableRule.ts
│   │   └── LinkRule.ts
│   ├── services/            # AI 服务
│   │   └── AIService.ts     # AI 元数据生成（多提供商+故障转移+错误日志）
│   ├── ui/                  # 设置面板（折叠面板样式）
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
