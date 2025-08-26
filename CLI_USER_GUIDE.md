# InitRepo CLI - Complete User Guide

## Table of Contents

1. [Getting Started](#getting-started)
2. [Core Concepts](#core-concepts)
3. [Phase 1: Advanced Code Analysis](#phase-1-advanced-code-analysis)
4. [Phase 2: Safe Code Modifications](#phase-2-safe-code-modifications)
5. [Phase 3: Project Structure Management](#phase-3-project-structure-management)
6. [AI Integration Commands](#ai-integration-commands)
7. [Common Workflows](#common-workflows)
8. [Best Practices](#best-practices)
9. [Troubleshooting](#troubleshooting)
10. [Advanced Usage](#advanced-usage)

## Getting Started

### Installation

```bash
# Global installation (recommended)
npm install -g initrepo-cli

# Or use directly without installation
npx initrepo-cli

# Verify installation
initrepo-cli --version
```

### Basic Usage

```bash
# Navigate to your project
cd /path/to/your-project

# Basic codebase analysis (creates .initrepo/ directory)
initrepo-cli

# Get help for any command
initrepo-cli <command> --help

# Initialize configuration
initrepo-cli --init
```

## Core Concepts

### Output Formats

All commands support two output formats:

- **`--format=text`** (default): Human-readable output with colors and icons
- **`--format=json`**: Structured JSON for programmatic use and AI integration

```bash
# Human-readable output
initrepo-cli analyze-imports

# JSON output for AI/scripts
initrepo-cli analyze-imports --format=json
```

### Dry-Run Mode

All modification commands support `--dry-run` to preview changes:

```bash
# Preview what would be renamed
initrepo-cli safe-rename oldName newName --dry-run

# See what imports would be organized
initrepo-cli manage-imports --organize --dry-run
```

### File Filtering

Many commands support include/exclude patterns:

```bash
# Analyze only specific files
initrepo-cli analyze-complexity --include "src/**/*.js"

# Exclude test files
initrepo-cli find-references MyComponent --exclude "**/*.test.js"
```

## Phase 1: Advanced Code Analysis

### Import Analysis (`analyze-imports`)

Comprehensive analysis of import/export statements with unused import detection and circular dependency analysis.

#### Basic Usage

```bash
# Full import analysis
initrepo-cli analyze-imports

# Focus on specific issues
initrepo-cli analyze-imports --unused-only
initrepo-cli analyze-imports --circular-only
initrepo-cli analyze-imports --stats-only
```

#### Advanced Options

```bash
# Analyze with custom thresholds
initrepo-cli analyze-imports --max-unused=5 --format=json

# Include detailed dependency chains
initrepo-cli analyze-imports --include-chains
```

#### Example Output

```json
{
  "success": true,
  "data": {
    "summary": {
      "totalFiles": 45,
      "totalImports": 312,
      "unusedImports": 8,
      "circularDependencies": 1
    },
    "unusedImports": [
      {
        "file": "src/components/Header.jsx",
        "imports": ["useState", "useCallback"],
        "suggestion": "Remove unused React hooks"
      }
    ],
    "circularDependencies": [
      {
        "cycle": ["src/utils/helper.js", "src/components/App.jsx", "src/utils/helper.js"],
        "severity": "medium"
      }
    ]
  }
}
```

### Reference Finding (`find-references`)

Find where symbols are used across your entire codebase.

#### Basic Usage

```bash
# Find all references to a symbol
initrepo-cli find-references MyComponent

# Find function references only
initrepo-cli find-references handleClick --type=function

# Case-sensitive exact matching
initrepo-cli find-references MyClass --exact --case-sensitive
```

#### Advanced Search Options

```bash
# Include comments and strings
initrepo-cli find-references "API_KEY" --include-comments --include-strings

# Group results by file or type
initrepo-cli find-references useState --group-by=file --format=json

# Limit results
initrepo-cli find-references Component --limit=10
```

### Complexity Analysis (`analyze-complexity`)

Measure cyclomatic complexity and provide maintainability metrics.

#### Basic Usage

```bash
# Analyze all files
initrepo-cli analyze-complexity

# Set custom threshold
initrepo-cli analyze-complexity --threshold=15

# Get recommendations
initrepo-cli analyze-complexity --with-recommendations
```

#### Advanced Analysis

```bash
# Focus on high-complexity functions only
initrepo-cli analyze-complexity --threshold=10 --high-only

# Include maintainability index
initrepo-cli analyze-complexity --include-maintainability
```

## Phase 2: Safe Code Modifications

⚠️ **Important**: Always use `--dry-run` first to preview changes before applying modifications.

### Safe Symbol Renaming (`safe-rename`)

Rename functions, classes, and variables across multiple files with AST precision.

#### Basic Usage

```bash
# Preview a rename operation
initrepo-cli safe-rename oldFunctionName newFunctionName --dry-run

# Apply the rename
initrepo-cli safe-rename oldFunctionName newFunctionName

# Rename with type filtering
initrepo-cli safe-rename MyClass NewClassName --type=class
```

#### Advanced Renaming

```bash
# Scope-limited renaming
initrepo-cli safe-rename localVar newLocalVar --scope=file

# Exact matching only (no partial matches)
initrepo-cli safe-rename temp temporaryValue --exact

# With detailed preview
initrepo-cli safe-rename Handler EventHandler --dry-run --format=json
```

#### Safety Features

- **AST-based analysis**: Understands code structure, not just text matching
- **Context awareness**: Avoids renaming in comments or strings unless specified
- **Scope validation**: Ensures renames don't break code semantics
- **Preview mode**: Shows exactly what will change before modification

### Import Management (`manage-imports`)

Safely manage import statements in JavaScript/TypeScript files.

#### Adding Imports

```bash
# Add default import
initrepo-cli manage-imports --add "lodash"

# Add named imports  
initrepo-cli manage-imports --add "react:useState,useEffect"

# Add multiple imports
initrepo-cli manage-imports --add "lodash" --add "react:useState"
```

#### Removing Imports

```bash
# Remove specific imports
initrepo-cli manage-imports --remove "lodash:get,set"

# Remove entire import statement
initrepo-cli manage-imports --remove "unused-package"

# Remove unused imports automatically
initrepo-cli manage-imports --remove-unused
```

#### Organizing Imports

```bash
# Organize and sort imports
initrepo-cli manage-imports --organize

# Combine multiple operations
initrepo-cli manage-imports --remove-unused --organize --dry-run
```

#### Updating Import Paths

```bash
# Update import source paths
initrepo-cli manage-imports --update "old-package->new-package"

# Multiple path updates
initrepo-cli manage-imports --update "old-pkg->new-pkg" --update "old-utils->utils"
```

### Template Application (`apply-template`)

Insert code templates and snippets with variable substitution.

#### Available Templates

```bash
# List all predefined templates
initrepo-cli apply-template --list-templates
```

Available templates:
- `react-component`: React functional component
- `function`: JavaScript/TypeScript function
- `class`: JavaScript/TypeScript class
- `test`: Test suite template

#### Using Templates

```bash
# Apply a React component template
initrepo-cli apply-template react-component \
  --variables "componentName=MyComponent,props=children"

# Apply function template with JSON variables
initrepo-cli apply-template function \
  --variables '{"functionName":"calculateTotal","parameters":"items, tax"}'

# Custom template from file
initrepo-cli apply-template ./my-template.js \
  --variables "name=MyModule" --position=end
```

#### Template Positioning

```bash
# Insert at the end of files (default)
initrepo-cli apply-template function --position=end

# Insert at the beginning
initrepo-cli apply-template function --position=start

# Insert before/after specific symbol
initrepo-cli apply-template function --position=before --target=existingFunction
```

#### Variable Substitution

Templates support these variable formats:
- `{{variableName}}`: Custom variables
- `{{NOW}}`: Current timestamp
- `{{DATE}}`: Current date
- `{{TIMESTAMP}}`: Unix timestamp

## Phase 3: Project Structure Management

### Structure Documentation (`generate-structure`)

Generate comprehensive project structure documentation with framework detection.

#### Basic Usage

```bash
# Generate structure analysis
initrepo-cli generate-structure

# Tree view format
initrepo-cli generate-structure --format=tree

# JSON for programmatic use
initrepo-cli generate-structure --format=json
```

#### Customization Options

```bash
# Limit analysis depth
initrepo-cli generate-structure --max-depth=3

# Include detailed file information
initrepo-cli generate-structure --include-files

# Exclude symbol analysis for faster results
initrepo-cli generate-structure --no-symbols
```

#### Example Tree Output

```
📁 my-project/
├── 📁 src/
│   ├── 📁 components/
│   │   ├── ⚛️ Header.jsx (2.3KB)
│   │   ├── ⚛️ Footer.jsx (1.8KB)
│   │   └── ⚛️ Layout.jsx (3.2KB)
│   ├── 📁 utils/
│   │   ├── 📜 helpers.js (4.1KB)
│   │   └── 📜 api.js (2.9KB)
│   └── 📜 main.js (1.2KB)
├── 📝 README.md (3.4KB)
└── 📋 package.json (1.1KB)
```

### Structure Validation (`validate-structure`)

Validate your project against best practices and conventions.

#### Basic Validation

```bash
# Full validation with scoring
initrepo-cli validate-structure

# Strict mode (higher standards)
initrepo-cli validate-structure --strict

# Custom file size limits
initrepo-cli validate-structure --max-file-size=800
```

#### Customizing Validation Rules

```bash
# Skip specific validations
initrepo-cli validate-structure --no-readme --no-license

# Require configuration files
initrepo-cli validate-structure --require-config

# Set directory file limits
initrepo-cli validate-structure --max-dir-files=20
```

#### Validation Scoring

```
📊 Overall Score: 85/100 (85%)

✅ Passed Validations:
  ✓ README exists: Project has a README file
  ✓ Tests exist: Project has test files
  ✓ Git setup: Complete git setup

⚠️  Warnings:
  ⚠ File size warnings: 3 files exceed 500 lines
  ⚠ Directory organization: 2 directories have more than 30 files

❌ Failed Validations:
  ✗ LICENSE missing: Consider adding a license file
```

### Refactoring Suggestions (`suggest-refactor`)

Get intelligent recommendations for improving code quality.

#### Basic Analysis

```bash
# Full refactoring analysis
initrepo-cli suggest-refactor

# Focus on high-priority issues
initrepo-cli suggest-refactor --min-severity=medium

# Limit results per category
initrepo-cli suggest-refactor --top=5
```

#### Category-Specific Analysis

```bash
# Focus on complexity issues only
initrepo-cli suggest-refactor --category=complexity

# Analyze naming conventions
initrepo-cli suggest-refactor --category=naming

# Check for duplication
initrepo-cli suggest-refactor --category=duplication
```

#### Custom Thresholds

```bash
# Set complexity threshold
initrepo-cli suggest-refactor --complexity-threshold=15

# Set file size threshold
initrepo-cli suggest-refactor --file-size-threshold=600
```

## AI Integration Commands

These commands provide the foundation for AI assistant integration:

### Dependencies Analysis (`deps`)

```bash
# Get dependency information
initrepo-cli deps --format=json

# Runtime dependencies only
initrepo-cli deps --type=runtime
```

### Symbol Search (`find-symbol`)

```bash
# Search for symbols across codebase
initrepo-cli find-symbol MyComponent --format=json

# Filter by type
initrepo-cli find-symbol handleClick --type=function
```

### Code Extraction (`get-code`)

```bash
# Extract function with context
initrepo-cli get-code myFunction --format=json

# Extract with full context
initrepo-cli get-code MyClass --context=full
```

### Task Management (`tasks`)

```bash
# List tasks in README.md
initrepo-cli tasks --list --format=json

# Add new task
initrepo-cli tasks --add "Implement user authentication"

# Mark task as complete
initrepo-cli tasks --complete "Setup database connection"
```

## Common Workflows

### 1. Code Quality Assessment Workflow

```bash
#!/bin/bash
echo "🔍 Running code quality assessment..."

# 1. Validate project structure
initrepo-cli validate-structure --format=json > validation.json

# 2. Check complexity issues
initrepo-cli analyze-complexity --threshold=10 --format=json > complexity.json

# 3. Find unused imports
initrepo-cli analyze-imports --unused-only --format=json > imports.json

# 4. Get refactoring suggestions
initrepo-cli suggest-refactor --min-severity=medium --format=json > refactor.json

echo "✅ Assessment complete! Check JSON files for detailed results."
```

### 2. Codebase Cleanup Workflow

```bash
#!/bin/bash
echo "🧹 Starting codebase cleanup..."

# 1. Remove unused imports (dry-run first)
initrepo-cli manage-imports --remove-unused --dry-run
read -p "Apply unused import removal? (y/n): " confirm
if [[ $confirm == "y" ]]; then
    initrepo-cli manage-imports --remove-unused
fi

# 2. Organize imports
initrepo-cli manage-imports --organize --dry-run
read -p "Apply import organization? (y/n): " confirm
if [[ $confirm == "y" ]]; then
    initrepo-cli manage-imports --organize
fi

# 3. Check for naming improvements
initrepo-cli suggest-refactor --category=naming --format=json > naming-suggestions.json
echo "📝 Check naming-suggestions.json for naming improvements"

echo "✅ Cleanup workflow complete!"
```

### 3. Refactoring Workflow

```bash
#!/bin/bash
SYMBOL_NAME="$1"
NEW_NAME="$2"

if [[ -z "$SYMBOL_NAME" || -z "$NEW_NAME" ]]; then
    echo "Usage: $0 <old-name> <new-name>"
    exit 1
fi

echo "🔧 Starting safe refactoring workflow..."

# 1. Find all references first
echo "📍 Finding references..."
initrepo-cli find-references "$SYMBOL_NAME" --format=json > references.json

# 2. Preview the rename
echo "👀 Previewing rename operation..."
initrepo-cli safe-rename "$SYMBOL_NAME" "$NEW_NAME" --dry-run

# 3. Confirm and apply
read -p "Apply rename operation? (y/n): " confirm
if [[ $confirm == "y" ]]; then
    initrepo-cli safe-rename "$SYMBOL_NAME" "$NEW_NAME" --format=json > rename-result.json
    echo "✅ Rename completed successfully!"
else
    echo "❌ Rename cancelled"
fi
```

### 4. New Project Setup Workflow

```bash
#!/bin/bash
PROJECT_NAME="$1"
PROJECT_TYPE="$2"

echo "🚀 Setting up new project: $PROJECT_NAME"

# 1. Scaffold project
initrepo-cli scaffold "$PROJECT_TYPE" "$PROJECT_NAME"
cd "$PROJECT_NAME"

# 2. Initialize configuration
initrepo-cli --init

# 3. Generate initial documentation
initrepo-cli generate-structure --format=tree > STRUCTURE.md

# 4. Validate setup
initrepo-cli validate-structure

echo "✅ Project setup complete!"
```

## Best Practices

### 1. Always Use Dry-Run First

```bash
# ❌ Don't do this
initrepo-cli safe-rename oldName newName

# ✅ Do this
initrepo-cli safe-rename oldName newName --dry-run
# Review the output, then:
initrepo-cli safe-rename oldName newName
```

### 2. Use JSON Output for Automation

```bash
# For scripts and automation
result=$(initrepo-cli analyze-complexity --format=json)
high_complexity=$(echo "$result" | jq '.data.summary.highPriority')

if [[ $high_complexity -gt 0 ]]; then
    echo "❌ Found $high_complexity high complexity issues"
    exit 1
fi
```

### 3. Combine Commands for Comprehensive Analysis

```bash
# Create comprehensive project report
{
    echo "# Project Analysis Report"
    echo "Generated: $(date)"
    echo ""
    echo "## Structure Validation"
    initrepo-cli validate-structure
    echo ""
    echo "## Refactoring Suggestions"
    initrepo-cli suggest-refactor --min-severity=medium
    echo ""
    echo "## Project Structure"
    initrepo-cli generate-structure --format=tree
} > project-report.md
```

### 4. Use Filtering for Large Projects

```bash
# Focus on specific directories
initrepo-cli analyze-complexity --include "src/**/*.js" --exclude "**/*.test.js"

# Use thresholds to reduce noise
initrepo-cli suggest-refactor --min-severity=medium --top=10
```

## Troubleshooting

### Common Issues

#### 1. "No files found to process"

```bash
# Check if you're in the right directory
pwd

# Check if files are being ignored
initrepo-cli analyze-imports --include "**/*" --format=json

# Initialize configuration if needed
initrepo-cli --init
```

#### 2. "Failed to parse JavaScript/TypeScript"

```bash
# Check for syntax errors in your code
npm run lint  # or your linter

# Try with simpler file patterns
initrepo-cli analyze-complexity --include "src/simple-file.js"
```

#### 3. JSON parsing errors

```bash
# Ensure you're using the right format
initrepo-cli analyze-imports --format=json | jq '.'

# Check for command completion
if ! command -v jq &> /dev/null; then
    echo "jq is required for JSON processing"
fi
```

### Performance Issues

#### Large Codebases

```bash
# Limit analysis scope
initrepo-cli analyze-complexity --include "src/**/*.js" --max-depth=3

# Use specific file patterns
initrepo-cli find-references MyComponent --include "src/**/*.jsx"

# Process in chunks
for dir in src/*; do
    initrepo-cli analyze-complexity --include "$dir/**/*"
done
```

### Getting Help

```bash
# General help
initrepo-cli --help

# Command-specific help
initrepo-cli analyze-complexity --help
initrepo-cli safe-rename --help

# Check version
initrepo-cli --version
```

## Advanced Usage

### Custom Analysis Scripts

```javascript
// analyze-project.js
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

async function comprehensiveAnalysis() {
    try {
        const [structure, complexity, imports] = await Promise.all([
            execAsync('initrepo-cli generate-structure --format=json'),
            execAsync('initrepo-cli analyze-complexity --format=json'),
            execAsync('initrepo-cli analyze-imports --format=json')
        ]);

        const analysis = {
            structure: JSON.parse(structure.stdout),
            complexity: JSON.parse(complexity.stdout),
            imports: JSON.parse(imports.stdout),
            timestamp: new Date().toISOString()
        };

        console.log(JSON.stringify(analysis, null, 2));
    } catch (error) {
        console.error('Analysis failed:', error.message);
    }
}

comprehensiveAnalysis();
```

### Integration with Build Tools

#### Webpack Plugin Example

```javascript
// webpack-initrepo-plugin.js
class InitRepoAnalysisPlugin {
    apply(compiler) {
        compiler.hooks.done.tap('InitRepoAnalysis', () => {
            exec('initrepo-cli validate-structure --format=json', (error, stdout) => {
                if (error) return;
                
                const result = JSON.parse(stdout);
                if (result.data.score < 80) {
                    console.warn(`⚠️  Project structure score: ${result.data.score}/100`);
                }
            });
        });
    }
}

module.exports = InitRepoAnalysisPlugin;
```

#### ESLint Integration

```javascript
// eslint-plugin-initrepo.js
module.exports = {
    rules: {
        'complexity-check': {
            create(context) {
                return {
                    Program() {
                        // Run InitRepo complexity analysis
                        // Report ESLint errors based on results
                    }
                };
            }
        }
    }
};
```

### API Integration

```javascript
// api-service.js
class InitRepoAPIService {
    async analyzeRepository(repoPath) {
        const commands = [
            'generate-structure',
            'validate-structure', 
            'analyze-complexity',
            'suggest-refactor'
        ];

        const results = {};
        
        for (const command of commands) {
            try {
                const { stdout } = await execAsync(`initrepo-cli ${command} --format=json`, {
                    cwd: repoPath
                });
                results[command] = JSON.parse(stdout);
            } catch (error) {
                results[command] = { error: error.message };
            }
        }

        return this.generateReport(results);
    }
}
```

---

This comprehensive guide covers all aspects of using the InitRepo CLI effectively. For more advanced use cases and integrations, refer to the [InitRepo Ecosystem Guide](./INITREPO_ECOSYSTEM.md) and [MCP Integration documentation](./MCP_INTEGRATION.md).