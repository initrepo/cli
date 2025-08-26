# MCP Integration Guide

This document provides comprehensive information for MCP (Model Context Protocol) server developers on how to integrate with and utilize the InitRepo CLI's AI-enhanced features.

## Overview

The InitRepo CLI provides four AI-enhanced commands specifically designed for programmatic access by AI assistants and MCP servers:

1. **`deps`** - Structured dependency analysis
2. **`find-symbol`** - Code symbol search and location
3. **`get-code`** - Targeted code extraction
4. **`tasks`** - Task list management

All commands support JSON output format (`--format=json`) and provide structured, consistent responses perfect for programmatic consumption.

## Command Reference

### `deps` - Dependency Analysis

**Purpose**: Extract and analyze project dependencies across multiple ecosystems.

**Basic Usage**:
```bash
initrepo-cli deps --format=json
```

**Options**:
- `--format=json|markdown` - Output format (default: markdown)
- `--type=runtime|dev|peer|optional` - Filter by dependency type
- `--output=<file>` - Write to file instead of stdout

**JSON Response Structure**:
```json
{
  "success": true,
  "message": "Dependencies analyzed successfully",
  "data": {
    "summary": {
      "total": 12,
      "runtime": 9,
      "dev": 3,
      "peer": 0,
      "optional": 0
    },
    "byEcosystem": {
      "nodejs": {
        "ecosystem": "nodejs",
        "manifest": "package.json",
        "projectInfo": {
          "name": "my-project",
          "version": "1.0.0",
          "description": "Project description"
        },
        "dependencies": [
          {
            "name": "express",
            "version": "^4.18.0",
            "type": "runtime",
            "versionClean": "4.18.0"
          }
        ]
      }
    },
    "generatedAt": "2025-08-25T18:00:00.000Z",
    "projectRoot": "/path/to/project"
  },
  "timestamp": "2025-08-25T18:00:00.000Z"
}
```

**Supported Ecosystems**:
- **Node.js** (`package.json`) - Full support with scripts and engines
- **Python** (`requirements.txt`, `pyproject.toml`) - Dependency parsing
- **Rust** (`Cargo.toml`) - Runtime and dev dependencies
- **PHP** (`composer.json`) - Full support
- **Java** (`pom.xml`, `build.gradle`) - Basic detection

**MCP Use Cases**:
- Check if specific dependencies are installed
- Analyze dependency versions for compatibility
- Generate dependency reports
- Detect project type from dependencies

---

### `find-symbol` - Symbol Search

**Purpose**: Locate functions, classes, variables, and other symbols across the codebase.

**Basic Usage**:
```bash
initrepo-cli find-symbol ComponentName --format=json
```

**Options**:
- `--type=function|class|variable|interface` - Filter by symbol type
- `--format=json|text` - Output format (default: text)
- `--file-pattern=<regex>` - Filter by file pattern
- `--exact` - Exact name match only (no fuzzy matching)
- `--output=<file>` - Write to file instead of stdout

**JSON Response Structure**:
```json
{
  "success": true,
  "message": "Found 2 matching symbols",
  "data": {
    "query": {
      "symbolName": "ComponentName",
      "type": "class",
      "exact": false,
      "filePattern": null
    },
    "count": 2,
    "symbols": [
      {
        "name": "ComponentName",
        "type": "class",
        "file": "/path/to/file.js",
        "line": 15,
        "column": 7,
        "signature": "class ComponentName extends React.Component",
        "description": null
      }
    ]
  },
  "timestamp": "2025-08-25T18:00:00.000Z"
}
```

**Parsing Methods**:
- **JavaScript/TypeScript**: AST-based parsing using Babel
- **Python**: Regex patterns for functions, classes, variables
- **Rust**: Regex patterns for functions, structs, enums, traits
- **Go**: Regex patterns for functions, structs, interfaces
- **Java**: Regex patterns for classes, interfaces, methods

**Symbol Types Detected**:
- `function` - Function declarations
- `class` - Class declarations
- `variable` - Variable declarations (const, let, var)
- `interface` - Interface declarations (TypeScript, Go, Java)
- `struct` - Struct declarations (Rust, Go)
- `enum` - Enum declarations
- `export` - Export statements
- `method` - Class methods

**MCP Use Cases**:
- "Where is the User model defined?"
- "Find all authentication functions"
- "Locate the main React component"
- "Show me all database connection functions"

---

### `get-code` - Code Extraction

**Purpose**: Extract specific code blocks with optional context and dependency information.

**Basic Usage**:
```bash
initrepo-cli get-code functionName --format=json
```

**Options**:
- `--context=minimal|full` - Context level (default: minimal)
- `--format=json|text` - Output format (default: text)
- `--file=<path>` - Extract from specific file only
- `--line=<number>` - Extract code around specific line (requires --file)
- `--lines=<start-end>` - Extract specific line range (requires --file)
- `--output=<file>` - Write to file instead of stdout

**JSON Response Structure**:
```json
{
  "success": true,
  "message": "Extracted 1 code block",
  "data": {
    "query": {
      "symbol": "functionName",
      "context": "full",
      "file": null,
      "line": null,
      "lines": null
    },
    "count": 1,
    "results": [
      {
        "symbol": "functionName",
        "file": "/path/to/file.js",
        "startLine": 10,
        "endLine": 25,
        "code": "function functionName(param1, param2) {\n  // implementation\n  return result;\n}",
        "context": "// Additional context lines...",
        "imports": [
          {
            "source": "lodash",
            "specifiers": [
              {
                "name": "_",
                "imported": "default",
                "type": "ImportDefaultSpecifier"
              }
            ]
          }
        ],
        "dependencies": [
          {
            "source": "lodash",
            "specifiers": ["_"]
          }
        ]
      }
    ]
  },
  "timestamp": "2025-08-25T18:00:00.000Z"
}
```

**Extraction Modes**:
- **Symbol-based**: Find and extract specific functions/classes
- **Line-based**: Extract code around a specific line number
- **Range-based**: Extract a specific range of lines

**Context Levels**:
- **minimal**: Just the symbol definition
- **full**: Symbol + 5 lines before/after + imports

**MCP Use Cases**:
- "Show me the authenticate function"
- "Get the User class with full context"
- "Extract the database connection code"
- "Show me lines 50-75 from utils.js"

---

### `tasks` - Task Management

**Purpose**: Safely read and manipulate task lists in markdown files (typically README.md).

**Basic Usage**:
```bash
initrepo-cli tasks --list --format=json
```

**Options**:
- `--list` - List all tasks (default action)
- `--add="<text>"` - Add a new task
- `--complete="<text>"` - Mark a task as completed
- `--update="<oldText>" "<newText>"` - Update task text
- `--file=<path>` - Target markdown file (default: README.md)
- `--format=json|text` - Output format (default: text)
- `--stats` - Show task statistics
- `--output=<file>` - Write to file instead of stdout

**JSON Response Structure**:
```json
{
  "success": true,
  "message": "Found 5 tasks",
  "data": {
    "count": 5,
    "completed": 2,
    "pending": 3,
    "tasks": [
      {
        "id": "task-1",
        "text": "Implement user authentication",
        "completed": false,
        "line": 42,
        "priority": "high"
      }
    ]
  },
  "timestamp": "2025-08-25T18:00:00.000Z"
}
```

**Task Formats Supported**:
- GitHub-style checkboxes: `- [ ] Task text` or `- [x] Completed task`
- HTML checkboxes: `<input type="checkbox"> Task text`
- Numbered lists with checkboxes

**Task Features**:
- **Priority Detection**: Automatic priority detection from text (high, medium, low, normal)
- **Tag Extraction**: Hashtag-based tags (#bug, #feature, etc.)
- **Atomic Updates**: All updates are atomic with automatic rollback on failure
- **Line Tracking**: Tracks line numbers for precise modifications

**MCP Use Cases**:
- "What tasks are pending in the project?"
- "Add a new task: 'Fix login bug'"
- "Mark 'Setup database' as completed"
- "Update task 'Write tests' to 'Write comprehensive tests'"

## Error Handling

All commands return consistent error responses in JSON format:

```json
{
  "success": false,
  "error": {
    "message": "Description of what went wrong",
    "code": "ERROR_CODE",
    "details": {
      "additional": "context"
    },
    "timestamp": "2025-08-25T18:00:00.000Z"
  }
}
```

**Common Error Codes**:
- `DEPS_ERROR` - Dependency analysis failed
- `FIND_SYMBOL_ERROR` - Symbol search failed
- `GET_CODE_ERROR` - Code extraction failed
- `TASKS_ERROR` - Task management failed

## Integration Best Practices

### 1. Always Use JSON Format
```bash
# Good for MCP integration
initrepo-cli find-symbol UserModel --format=json

# Not recommended for MCP
initrepo-cli find-symbol UserModel
```

### 2. Handle Errors Gracefully
```javascript
const result = JSON.parse(stdout);
if (!result.success) {
  console.error(`Error: ${result.error.message}`);
  return;
}
// Process result.data
```

### 3. Use Specific Queries
```bash
# More specific queries return better results
initrepo-cli find-symbol authenticate --type=function --exact

# Less specific queries may return many results
initrepo-cli find-symbol auth
```

### 4. Check File Existence
```bash
# Always verify files exist before operations
initrepo-cli tasks --file=./docs/TODO.md --list --format=json
```

### 5. Batch Operations
For multiple related operations, make separate calls but handle them as a transaction in your MCP server logic.

## Example MCP Integration

```javascript
class InitRepoMCP {
  async findFunction(functionName) {
    const { stdout } = await exec(
      `initrepo-cli find-symbol "${functionName}" --type=function --format=json`
    );
    const result = JSON.parse(stdout);
    return result.success ? result.data.symbols : [];
  }

  async getCodeWithContext(symbolName) {
    const { stdout } = await exec(
      `initrepo-cli get-code "${symbolName}" --context=full --format=json`
    );
    const result = JSON.parse(stdout);
    return result.success ? result.data.results[0] : null;
  }

  async addTask(taskText) {
    const { stdout } = await exec(
      `initrepo-cli tasks --add "${taskText}" --format=json`
    );
    const result = JSON.parse(stdout);
    return result.success;
  }
}
```

## Phase 1: Advanced Code Analysis Commands

### `analyze-imports` - Import/Export Analysis

**Purpose**: Comprehensive analysis of import/export relationships, unused imports, and circular dependencies.

**Basic Usage**:
```bash
initrepo-cli analyze-imports --format=json
```

**Options**:
- `--format=json|text` - Output format (default: text)
- `--unused` - Show only unused imports
- `--circular` - Show only circular dependencies
- `--stats` - Include dependency statistics
- `--external` - Include external dependency analysis
- `--output=<file>` - Write to file instead of stdout

**JSON Response Structure**:
```json
{
  "success": true,
  "message": "Import analysis completed successfully",
  "data": {
    "summary": {
      "totalFiles": 45,
      "totalImports": 123,
      "totalExports": 89,
      "unusedImports": 3,
      "circularDependencies": 1
    },
    "unusedImports": [
      {
        "file": "/path/to/file.js",
        "importSource": "lodash",
        "unusedIdentifier": "debounce",
        "line": 5,
        "suggestion": "Remove unused import: debounce"
      }
    ],
    "circularDependencies": [
      {
        "cycle": ["file1.js", "file2.js", "file3.js", "file1.js"],
        "length": 3,
        "severity": "medium"
      }
    ]
  }
}
```

**MCP Use Cases**:
- "Are there any unused imports in this project?"
- "Check for circular dependencies in the codebase"
- "Show me the import dependency graph"
- "What external packages does this project depend on?"

---

### `find-references` - Symbol Reference Search

**Purpose**: Find all references/usages of a symbol across the codebase (complementary to `find-symbol` which finds definitions).

**Basic Usage**:
```bash
initrepo-cli find-references ComponentName --format=json
```

**Options**:
- `--exact` - Exact name match only (no partial matching)
- `--case-sensitive` - Case sensitive search
- `--include-comments` - Include references in comments
- `--include-strings` - Include references in string literals
- `--group-by=file|type|none` - Group results by file, type, or none
- `--limit=<number>` - Limit number of results shown
- `--output=<file>` - Write to file instead of stdout

**JSON Response Structure**:
```json
{
  "success": true,
  "message": "Found 15 references",
  "data": {
    "query": {
      "symbol": "ComponentName",
      "options": {
        "exact": false,
        "caseSensitive": false,
        "includeComments": false,
        "includeStrings": false
      }
    },
    "summary": {
      "totalReferences": 15,
      "filesWithReferences": 8,
      "importReferences": 3,
      "exportReferences": 1
    },
    "references": [
      {
        "name": "ComponentName",
        "file": "/path/to/file.js",
        "line": 42,
        "column": 15,
        "context": "jsx_element",
        "usage": "component_usage",
        "lineContent": "<ComponentName props={data} />"
      }
    ],
    "groupedByType": {
      "function_calls": [...],
      "jsx_usage": [...],
      "property_access": [...],
      "references": [...]
    },
    "relatedSymbols": ["props", "data", "useState"]
  }
}
```

**Reference Types Detected**:
- `declarations` - Variable/function declarations
- `function_calls` - Function invocations
- `property_access` - Object property access
- `jsx_usage` - React/JSX component usage
- `assignments` - Variable assignments
- `comments` - References in comments (optional)
- `strings` - References in string literals (optional)

**MCP Use Cases**:
- "Where is this component being used?"
- "Show me all places where this function is called"
- "Find all references to this variable across the project"
- "What components use the User model?"

---

### `analyze-complexity` - Code Complexity Analysis

**Purpose**: Analyze code complexity using multiple metrics including cyclomatic complexity, cognitive complexity, and maintainability index.

**Basic Usage**:
```bash
initrepo-cli analyze-complexity --threshold=10 --format=json
```

**Options**:
- `--threshold=<number>` - Complexity threshold for flagging functions (default: 10)
- `--top=<number>` - Show top N most complex functions (default: 10)
- `--files` - Include per-file analysis in output
- `--recommendations` - Include improvement recommendations
- `--output=<file>` - Write to file instead of stdout

**JSON Response Structure**:
```json
{
  "success": true,
  "message": "Complexity analysis completed successfully",
  "data": {
    "summary": {
      "totalFiles": 45,
      "totalFunctions": 234,
      "averageComplexity": 4.2,
      "highComplexityFunctions": 12,
      "complexityDistribution": {
        "low": 180,      // 1-5
        "medium": 42,    // 6-10
        "high": 10,      // 11-20
        "veryHigh": 2    // 21+
      }
    },
    "topComplexFunctions": [
      {
        "name": "processUserData",
        "file": "/path/to/file.js",
        "line": 45,
        "cyclomaticComplexity": 15,
        "cognitiveComplexity": 18,
        "maintainabilityIndex": 65.4,
        "linesOfCode": 45,
        "parameters": 4,
        "suggestions": ["Consider breaking this function into smaller functions"]
      }
    ],
    "recommendations": [
      {
        "priority": "high",
        "type": "complexity",
        "message": "12 functions exceed complexity threshold of 10",
        "action": "Refactor the most complex functions first"
      }
    ]
  }
}
```

**Complexity Metrics**:
- **Cyclomatic Complexity**: Number of linearly independent paths through code
- **Cognitive Complexity**: Weighted complexity based on nesting and control flow
- **Maintainability Index**: 0-100 score indicating code maintainability
- **Lines of Code**: Function size metric
- **Parameter Count**: Number of function parameters

**Complexity Categories**:
- **Low (1-5)**: Simple, easy to understand
- **Medium (6-10)**: Moderate complexity, acceptable
- **High (11-20)**: Complex, consider refactoring
- **Very High (21+)**: Very complex, refactoring recommended

**MCP Use Cases**:
- "Which functions are too complex and need refactoring?"
- "What's the overall code complexity of this project?"
- "Show me the most complex functions in the codebase"
- "Are there any functions that exceed complexity thresholds?"

## Advanced Integration Patterns

### **Combining Commands for Powerful Analysis**

```javascript
class AdvancedCodeAnalysis {
  async getComplexityHotspots() {
    // Find high complexity functions
    const complexity = await this.runCommand('analyze-complexity --threshold=10 --format=json');
    
    // For each complex function, find its references
    const hotspots = [];
    for (const func of complexity.data.topComplexFunctions) {
      const refs = await this.runCommand(`find-references "${func.name}" --format=json`);
      hotspots.push({
        function: func,
        usageCount: refs.data.summary.totalReferences,
        impact: func.cyclomaticComplexity * refs.data.summary.totalReferences
      });
    }
    
    return hotspots.sort((a, b) => b.impact - a.impact);
  }

  async getUnusedCodeCandidates() {
    // Find unused imports
    const imports = await this.runCommand('analyze-imports --unused --format=json');
    
    // Find symbols with very few references
    const lowUsageFunctions = [];
    const symbols = await this.runCommand('find-symbol "" --type=function --format=json');
    
    for (const symbol of symbols.data.symbols) {
      const refs = await this.runCommand(`find-references "${symbol.name}" --format=json`);
      if (refs.data.summary.totalReferences < 3) {
        lowUsageFunctions.push({ symbol, references: refs.data.summary.totalReferences });
      }
    }
    
    return {
      unusedImports: imports.data.unusedImports,
      lowUsageFunctions: lowUsageFunctions.sort((a, b) => a.references - b.references)
    };
  }
}
```

### **Code Health Dashboard**

Your MCP server can create comprehensive code health reports by combining multiple analysis commands:

```javascript
async generateCodeHealthReport() {
  const [deps, complexity, imports] = await Promise.all([
    this.runCommand('deps --format=json'),
    this.runCommand('analyze-complexity --format=json --recommendations'),
    this.runCommand('analyze-imports --stats --format=json')
  ]);

  return {
    healthScore: this.calculateHealthScore(complexity, imports),
    dependencies: deps.data.summary,
    complexity: complexity.data.summary,
    imports: imports.data.summary,
    recommendations: [
      ...complexity.data.recommendations,
      ...this.generateImportRecommendations(imports.data)
    ],
    codeQualityMetrics: {
      averageComplexity: complexity.data.summary.averageComplexity,
      unusedImports: imports.data.unusedImports.length,
      circularDependencies: imports.data.circularDependencies.length,
      externalDependencies: deps.data.byEcosystem.nodejs?.dependencies.length || 0
    }
  };
}
```

This integration approach provides your MCP server with powerful, reliable access to codebase information and project management capabilities without the complexity of implementing these features from scratch.