# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

InitRepo CLI is a Node.js-based command-line tool for codebase analysis and project scaffolding. It analyzes existing codebases to generate AI-consumable documentation and creates new projects from templates.

## Common Development Commands

```bash
# Run the CLI in development
npm run dev

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Test the CLI locally (analysis)
node bin/initrepo.js analyze
node bin/initrepo.js scaffold nextjs my-project

# Test AI-enhanced commands
node bin/initrepo.js deps --format=json
node bin/initrepo.js find-symbol functionName --format=json
node bin/initrepo.js get-code functionName --context=full
node bin/initrepo.js tasks --list --format=json
```

## Core Architecture

### Entry Points
- `bin/initrepo.js` - Binary wrapper
- `src/main.js` - Main application logic with Commander.js CLI parsing

### Key Modules

**File Handler** (`src/file-handler.js`)
- Discovers files using globby with intelligent ignore patterns
- Supports `.gitignore` and `.initrepoignore` filtering
- Handles 25+ source file extensions

**Generators** (`src/generators/`)
- `generate-tech-stack.js` - Analyzes package managers and dependencies
- `generate-project-structure.js` - Creates tree visualization with statistics
- `generate-full-codebase.js` - Exports complete source as XML for AI processing

**Scaffolders** (`src/scaffolders/`)
- `BaseScaffolder` - Abstract base class for all project templates
- Individual scaffolders for NextJS, React, React Native, Python MCP, Python Automation
- Template variable replacement and git initialization

**Architecture Parser** (`src/parsers/architecture-parser.js`)
- Extracts project structure from `technical_architecture.md` files
- Enables custom project scaffolding from architecture specifications

### Command Flow

**Analysis**: Directory → File Discovery → Parallel Generation → `.initrepo/` output files
**Scaffolding**: Project Type + Name → Template Selection → Structure Creation → Optional git/npm init

### File Filtering System

Uses hierarchical ignore patterns:
1. Default patterns (42 built-in rules for build outputs, dependencies, cache)
2. `.gitignore` patterns
3. `.initrepoignore` patterns

### Testing

- Uses Vitest with Node.js environment
- Mocks file system with `memfs` for isolated testing
- Coverage reports in text, JSON, and HTML formats

### Dependencies

Core runtime dependencies:
- `commander` - CLI framework
- `globby` - Advanced file globbing
- `picocolors` - Terminal colors
- `fast-xml-parser` - XML generation

## AI-Enhanced Commands

### `deps` - Structured Dependency Analysis
- **Purpose**: Export project dependencies in JSON format for AI consumption
- **Usage**: `initrepo deps --format=json --type=runtime`
- **Output**: Structured JSON with dependency versions, types, and metadata
- **Benefits**: MCP servers can easily parse and use dependency information

### `find-symbol` - Code Symbol Search
- **Purpose**: Locate functions, classes, variables across the codebase
- **Usage**: `initrepo find-symbol ComponentName --type=class --format=json`
- **Features**: AST-based parsing for JS/TS, regex patterns for other languages
- **Output**: File paths, line numbers, and symbol metadata

### `get-code` - Targeted Code Extraction  
- **Purpose**: Extract specific code blocks with optional context
- **Usage**: `initrepo get-code functionName --context=full --format=json`
- **Features**: Symbol-based extraction, line-based extraction, context inclusion
- **Output**: Clean code blocks with imports and dependencies

### `tasks` - Task List Management
- **Purpose**: Read and update task lists in README.md safely
- **Usage**: `initrepo tasks --add "New task" --format=json`
- **Features**: Markdown parsing, atomic updates, rollback protection
- **Actions**: `--list`, `--add "text"`, `--complete "text"`, `--update "old" "new"`

## Key Implementation Details

- ES Modules only (`"type": "module"`)
- Node.js >=18.0.0 required
- Concurrent file processing for performance
- XML output uses CDATA sections for safe code embedding
- Template variables use `{{variable}}` syntax for replacement
- AST parsing via Babel for JavaScript/TypeScript analysis
- Regex-based parsing for Python, Rust, Go, Java, etc.
- JSON output format for all AI-enhanced commands
- Atomic file operations with backup/rollback for task management