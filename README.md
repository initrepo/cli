# InitRepo CLI

[![NPM Version](https://img.shields.io/npm/v/initrepo-cli)](https://www.npmjs.com/package/initrepo-cli) [![GitHub Stars](https://img.shields.io/github/stars/initrepo/cli?style=social)](https://github.com/initrepo/cli) [![Discord](https://img.shields.io/badge/Discord-Join%20Us-7289da?logo=discord&logoColor=white)](https://discord.gg/FuNt9ejU) [![License](https://img.shields.io/badge/license-MIT-blue)](https://opensource.org/licenses/MIT)

A powerful CLI tool to extract and analyze codebase context for AI consumption, scaffold new projects, and provide intelligent codebase interaction through AI-enhanced commands.

## Documentation

📚 **Complete Documentation**: [https://docs.initrepo.com](https://docs.initrepo.com)

🔧 **CLI Installation Guide**: [https://docs.initrepo.com/cli/installation](https://docs.initrepo.com/cli/installation)

For detailed guides, tutorials, and API references, visit our comprehensive documentation platform.

## Prerequisites

- Node.js (v18.0.0 or higher)

## Installation

📖 **Detailed Installation Guide**: [https://docs.initrepo.com/cli/installation](https://docs.initrepo.com/cli/installation)

You can install the InitRepo CLI globally using npm:

```bash
npm install -g initrepo-cli
```

Or use it directly without installation:

```bash
npx initrepo-cli
```

## Usage

### Extract and Analyze Codebase

The primary function of the CLI is to extract and analyze your codebase, generating comprehensive documentation.

```bash
# Navigate to your project's root directory
cd /path/to/your-project

# Run the analysis (default command)
initrepo-cli
```

This will create a `.initrepo` directory containing:
- `tech-stack.md` - Dependencies and scripts summary
- `project-structure.md` - File tree visualization  
- `full-codebase.xml` - Complete source code export

### Initialize Configuration

Create a default `.initrepoignore` file to customize which files are analyzed:

```bash
initrepo-cli --init
```

### AI-Enhanced Commands

The CLI provides ten powerful commands designed for AI and MCP server integration:

#### Dependencies Analysis
```bash
# Get structured dependency information
initrepo-cli deps --format=json
initrepo-cli deps --format=json --type=runtime
```

#### Symbol Search
```bash
# Find functions, classes, variables across your codebase
initrepo-cli find-symbol ComponentName --format=json
initrepo-cli find-symbol functionName --type=function --format=json
```

#### Code Extraction
```bash
# Extract specific code blocks with context
initrepo-cli get-code functionName --format=json
initrepo-cli get-code ComponentName --context=full --format=json
```

#### Task Management
```bash
# Safely manage task lists in README.md
initrepo-cli tasks --list --format=json
initrepo-cli tasks --add "New task" --format=json
initrepo-cli tasks --complete "Task description" --format=json
```

#### Import Analysis
```bash
# Analyze imports and detect issues
initrepo-cli analyze-imports --format=json
initrepo-cli analyze-imports --unused-only --format=json
initrepo-cli analyze-imports --circular-only --format=json
```

#### Reference Finding
```bash
# Find symbol references across codebase
initrepo-cli find-references SymbolName --format=json
initrepo-cli find-references functionName --exact --case-sensitive --format=json
initrepo-cli find-references "import path" --include-comments --format=json
```

#### Complexity Analysis
```bash
# Analyze code complexity metrics
initrepo-cli analyze-complexity --format=json
initrepo-cli analyze-complexity --threshold=10 --format=json
initrepo-cli analyze-complexity --with-recommendations --format=json
```

#### Safe Symbol Renaming
```bash
# Safely rename symbols across multiple files
initrepo-cli safe-rename oldName newName --dry-run --format=json
initrepo-cli safe-rename functionName newFunctionName --type=function
initrepo-cli safe-rename ClassName NewClassName --exact --format=json
```

#### Import Management
```bash
# Manage import statements in JavaScript/TypeScript files
initrepo-cli manage-imports --remove-unused --organize --format=json
initrepo-cli manage-imports --add "lodash:get,set" --format=json
initrepo-cli manage-imports --update "old-package->new-package" --format=json
```

#### Template Application
```bash
# Apply code templates and snippets
initrepo-cli apply-template --list-templates
initrepo-cli apply-template react-component --variables "componentName=MyComponent"
initrepo-cli apply-template function --variables '{"functionName":"myFunc"}' --position=end
```

#### Structure Documentation
```bash
# Generate comprehensive project structure documentation
initrepo-cli generate-structure --format=json
initrepo-cli generate-structure --format=tree --no-symbols
initrepo-cli generate-structure --max-depth=5 --include-files
```

#### Structure Validation
```bash
# Validate project structure against best practices
initrepo-cli validate-structure --format=json
initrepo-cli validate-structure --strict --max-file-size=800
initrepo-cli validate-structure --no-readme --no-license --format=json
```

#### Refactoring Suggestions
```bash
# Analyze and suggest refactoring opportunities
initrepo-cli suggest-refactor --format=json
initrepo-cli suggest-refactor --min-severity=medium --top=5
initrepo-cli suggest-refactor --category=complexity --complexity-threshold=15
```

### Scaffold New Projects

Create new projects with organized structure:

```bash
# Available project types: nextjs, react, react-native, python-automation, python-mcp
initrepo-cli scaffold <type> <project-name>

# Examples:
initrepo-cli scaffold nextjs my-web-app
initrepo-cli scaffold python-automation my-script
```

## Features

### Core Analysis
- 🔍 **Smart Analysis** - Automatically detects and analyzes your project structure
- 📊 **Tech Stack Detection** - Identifies dependencies, frameworks, and build tools
- 🌳 **Project Visualization** - Generates clean file tree representations
- 📦 **Complete Export** - Creates XML export of your entire codebase

### AI-Enhanced Features

#### Phase 1: Advanced Code Analysis
- 🤖 **Structured Dependencies** - JSON output of all project dependencies with metadata
- 🔎 **Symbol Search** - Find functions, classes, variables across multiple languages
- 📄 **Code Extraction** - Extract specific code blocks with context and imports
- ✅ **Task Management** - Safe manipulation of markdown task lists
- 📦 **Import Analysis** - Detect unused imports and circular dependencies
- 🔍 **Reference Finding** - Locate symbol usage across your entire codebase
- 📊 **Complexity Analysis** - Measure cyclomatic complexity and maintainability

#### Phase 2: Safe Code Modifications
- 🔧 **Safe Symbol Renaming** - AST-based renaming across multiple files with precision
- 📥 **Import Management** - Add, remove, organize, and update import statements
- 📝 **Template Application** - Insert code templates with variable substitution
- 🛡️ **Dry-Run Modes** - Preview all modifications before applying changes
- ⚡ **Multi-language Support** - JavaScript, TypeScript with intelligent fallbacks

#### Phase 3: Project Structure Management
- 🏗️ **Structure Documentation** - Comprehensive project architecture analysis
- ✅ **Structure Validation** - Best practices compliance with scoring system
- 🔍 **Refactoring Suggestions** - Intelligent code quality recommendations
- 🎯 **Framework Detection** - Automatic identification of React, Vue, Angular, etc.
- 📋 **Architecture Patterns** - Recognition of MVC, layered, modular structures

### Project Management
- 🚀 **Project Scaffolding** - Bootstrap new projects with best practices
- ⚡ **Fast & Lightweight** - Minimal dependencies, maximum performance
- 🔧 **MCP Integration** - Perfect for AI assistants and development tools

## Configuration

The tool respects `.gitignore` files and supports custom filtering via `.initrepoignore`:

```bash
# Create default ignore file
initrepo-cli --init
```

Customize the `.initrepoignore` file to exclude specific files or directories from analysis.

## MCP Integration

📖 **Online MCP Integration Guide**: [https://docs.initrepo.com/mcp-integration](https://docs.initrepo.com/mcp-integration)

For MCP (Model Context Protocol) server developers, see our comprehensive [MCP Integration Guide](./MCP_INTEGRATION.md) and online documentation which includes:

- Complete command reference with JSON response formats
- Error handling patterns
- Best practices for integration
- Example code for MCP servers
- Supported programming languages and ecosystems

The AI-enhanced commands are specifically designed for programmatic access by AI assistants and development tools.

## Contributing

We welcome contributions from the community! If you'd like to contribute, please see our `CONTRIBUTING.md` file for details on how to get started, run tests, and submit pull requests.

If you have a bug report or a feature request, please [open an issue](https://github.com/initrepo/cli/issues/new).

## License

This project is licensed under the [**MIT License.**](https://github.com/initrepo/cli/blob/main/LICENSE)
