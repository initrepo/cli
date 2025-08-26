# Changelog

All notable changes to the InitRepo CLI project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.1] - 2024-12-28

### 🐛 **CRITICAL BUG FIX**

#### Fixed
- **CLI Execution**: Fixed critical bug where the main CLI was completely non-functional
  - Added missing `main()` function call in `src/main.js`
  - All CLI commands were silently failing due to main function never being executed
  - Commands like `initrepo-cli --version`, `initrepo-cli tasks --help`, and all other commands now work correctly
  - Resolves blocking issue for MCP server integration where `tasks` command appeared to have missing options

#### Impact
This was a **blocking bug** that made the entire CLI unusable despite having correct command implementations. The `tasks` command (and all others) were properly implemented but never executed.

**For MCP Server Users**: Both documented command formats now work correctly:
- `initrepo-cli tasks --list --format=json` ✅
- `initrepo-cli tasks --format=json` ✅

## [2.0.0] - 2024-12-28

### 🚀 Major Release - Complete AI-Enhanced Codebase Management Platform

This major release transforms InitRepo CLI from a simple analysis tool into a comprehensive AI-enhanced codebase management platform with 10+ powerful commands across 3 specialized phases.

### Added

#### Phase 1: Advanced Code Analysis
- **`analyze-imports`** - Comprehensive import/export analysis with unused imports and circular dependency detection
- **`find-references`** - Cross-file symbol usage detection with advanced filtering options
- **`analyze-complexity`** - Cyclomatic complexity analysis with maintainability metrics and recommendations
- Support for JavaScript, TypeScript, Python, Rust, Go, Java with AST parsing and regex fallbacks
- JSON output format optimized for MCP (Model Context Protocol) server integration

#### Phase 2: Safe Code Modifications  
- **`safe-rename`** - AST-based symbol renaming across multiple files with precision and safety
- **`manage-imports`** - Advanced import management (add, remove, organize, update paths)
- **`apply-template`** - Code template and snippet insertion with variable substitution
- Dry-run mode for all modification commands to preview changes safely
- Support for predefined templates (React components, functions, classes, tests)
- Variable substitution system with `{{variable}}` syntax

#### Phase 3: Project Structure Management
- **`generate-structure`** - Comprehensive project documentation with directory tree visualization
- **`validate-structure`** - Project structure validation against best practices with scoring
- **`suggest-refactor`** - Intelligent refactoring opportunity detection and recommendations
- Framework detection (React, Vue, Angular, Next.js, Express, NestJS)
- Architecture pattern recognition (MVC, MVVM, layered, modular)
- Naming convention analysis and consistency validation

#### Technical Enhancements
- **AST-based transformations** using `@babel/parser`, `jscodeshift`, and `recast`
- **Multi-language support** with intelligent parser selection
- **Rich CLI interface** with colored output, icons, and progress indicators
- **Comprehensive error handling** and validation across all commands
- **MCP server integration** with structured JSON responses

#### New Dependencies
- `@babel/generator` - AST code generation
- `jscodeshift` - JavaScript/TypeScript refactoring toolkit  
- `recast` - AST manipulation with format preservation
- `ast-types` - AST type definitions
- `complexity-report` - Complexity analysis engine
- `minimatch` - Advanced pattern matching
- `path-to-regexp` - URL pattern matching
- `remark` and `remark-parse` - Markdown processing
- `unist-util-visit` - AST traversal utilities

### Enhanced

#### Core Functionality
- **Expanded file support** - Better handling of various programming languages
- **Improved analysis accuracy** - AST-based parsing for precise code understanding  
- **Better error reporting** - Detailed error messages with context and suggestions
- **Enhanced JSON output** - Structured responses perfect for AI consumption

#### Developer Experience
- **Consistent command interface** - Uniform options and formatting across all commands
- **Rich help system** - Comprehensive help text and usage examples
- **Flexible output formats** - JSON and text output modes for different use cases
- **Configurable thresholds** - Customizable limits for complexity, file size, etc.

### Documentation
- Updated README.md with comprehensive command reference
- Enhanced MCP_INTEGRATION.md with Phase 1-3 command documentation  
- Updated CLAUDE.md with development patterns and architecture details
- Added CHANGELOG.md for version tracking

### Performance
- **Optimized file processing** - Better handling of large codebases
- **Concurrent analysis** - Parallel processing where applicable
- **Memory efficiency** - Improved memory usage for large projects

## [1.0.2] - 2024-12-XX

### Added
- AI-enhanced commands for MCP server integration
- `deps` command for dependency analysis
- `find-symbol` command for symbol search
- `get-code` command for code extraction  
- `tasks` command for task management

## [1.0.1] - 2024-12-XX

### Added
- Initial release with basic codebase analysis
- Project scaffolding capabilities
- File extraction and documentation generation

---

## Migration Guide: 1.x → 2.0

### Breaking Changes
- None! Version 2.0 is fully backward compatible with 1.x commands

### New Capabilities
Users can now leverage 7 additional powerful commands:
- Use `analyze-imports --unused-only` to find unused imports
- Use `safe-rename oldName newName --dry-run` to preview symbol renaming  
- Use `generate-structure --format=tree` for visual project structure
- Use `validate-structure` to check project best practices compliance
- Use `suggest-refactor --min-severity=medium` for refactoring opportunities

### Recommended Workflow
1. **Analyze** your codebase with `analyze-imports`, `analyze-complexity`
2. **Validate** structure with `validate-structure`  
3. **Refactor** using suggestions from `suggest-refactor`
4. **Modify** safely with `safe-rename`, `manage-imports`, `apply-template`
5. **Document** with `generate-structure`

---

*This release represents months of development work to create the most comprehensive AI-enhanced codebase management tool available.*