# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Obsidian Markdown Formatter is a plugin for Obsidian that formats Markdown files with customizable rules. It uses the unified/remark ecosystem for Markdown parsing and transformation.

## Commands

```bash
# Development (watch mode, outputs to main.js with inline sourcemap)
npm run dev

# Production build (type-check + bundle, no sourcemap)
npm run build

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run single test file
npm test -- tests/core/Formatter.test.ts
```

## Architecture

The plugin follows a layered architecture:

**Entry Layer** (`src/main.ts`)
- Plugin class that initializes core components and registers Obsidian commands/hotkeys
- Commands: format-current-file (Ctrl+Shift+F), format-selection, format-folder

**Core Layer** (`src/core/`)
- `Formatter.ts`: Orchestrates Markdown processing via unified/remark pipeline, applies rules sequentially
- `RuleRegistry.ts`: Manages format rules with priority-based ordering, supports dynamic registration
- `FileProcessor.ts`: Handles large file chunking (by Markdown boundaries like headings/code blocks) and encoding detection

**Rules Layer** (`src/rules/`)
- Each rule implements `FormatRule` interface: `{ name, priority, description, defaultConfig, apply(ast, config, filename?) }`
- Rules transform the remark AST using `unist-util-visit` for traversal
- Built-in rules (priority order): Frontmatter(5), Heading(10), Paragraph(20), List(30), CodeBlock(40), Table(50), Link(60)
- Register new rules via `registerBuiltinRules()` in `index.ts`
- **FrontmatterRule**: Normalizes YAML frontmatter field names (create→created, update→updated, tag→tags), adds title from filename if missing

**UI Layer** (`src/ui/SettingsTab.ts`)
- Obsidian settings panel for file thresholds, encoding options, and rule toggles

**Type Definitions** (`src/types/index.ts`)
- `AstNode`: Extended remark AST node type with all Markdown-specific properties
- `FormatRule`: Rule interface with `apply()` method that transforms AST
- `PluginSettings`: Configuration including `fileSizeThreshold`, `chunkSize`, `rules` map

## Key Patterns

**AST Transformation**: Rules use `unist-util-visit` to traverse and modify the AST. Always deep-copy the AST before modification (see `HeadingRule.ts` pattern).

**Chunked Processing**: Large files (>fileSizeThreshold KB) are split by Markdown structural boundaries (headings, code blocks) to preserve document structure.

**Rule Configuration**: Each rule has `defaultConfig` and receives `RuleConfig` (with `enabled` flag plus rule-specific options) at runtime.

## Build Output

- `main.js`: Bundled output (CommonJS, ES2018 target) - the Obsidian plugin file
- Build uses esbuild with `obsidian`, `electron`, and `@codemirror/*` packages marked as external

## Testing

Tests mirror source structure under `tests/`. Jest with ts-jest preset, ES modules mode. Coverage excludes `src/main.ts`.

## Key Dependencies

- `yaml`: YAML parsing and stringifying for frontmatter processing
- `remark-frontmatter`: Plugin for handling YAML frontmatter in remark
- `jschardet`: Encoding detection for file processing

## Remote Repositories

- Gitee: https://gitee.com/xiedali/obsidian-md-formatter.git (origin)
- GitHub: https://github.com/xiedali/obsidian-md-formatter.git (github)

## Current Version

- Version: 1.0.5 (see manifest.json and package.json)
- Min App Version: 1.0.0