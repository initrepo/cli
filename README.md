# InitRepo CLI

[![NPM Version](https://img.shields.io/npm/v/initrepo-cli)](https://www.npmjs.com/package/initrepo-cli) [![CI Status](https://github.com/initrepo/cli/actions/workflows/ci.yml/badge.svg)](https://github.com/initrepo/cli/actions) [![License](https://img.shields.io/badge/license-MIT-blue)](https://opensource.org/licenses/MIT)

A powerful CLI tool to extract and analyze codebase context for AI consumption, and scaffold new projects with organized structure.

## Prerequisites

- Node.js (v18.0.0 or higher)

## Installation

You can install the InitRepo CLI globally using npm:

```bash
npm install -g initrepo
```

## Usage

### Extract and Analyze Codebase

The primary function of the CLI is to extract and analyze your codebase, generating comprehensive documentation.

```bash
# Navigate to your project's root directory
cd /path/to/your-project

# Run the analysis (default command)
initrepo
```

This will create a `.initrepo` directory containing:
- `tech-stack.md` - Dependencies and scripts summary
- `project-structure.md` - File tree visualization  
- `full-codebase.xml` - Complete source code export

### Initialize Configuration

Create a default `.initrepoignore` file to customize which files are analyzed:

```bash
initrepo --init
```

### Scaffold New Projects

Create new projects with organized structure:

```bash
# Available project types: nextjs, react, react-native, python-automation, python-mcp
initrepo scaffold <type> <project-name>

# Examples:
initrepo scaffold nextjs my-web-app
initrepo scaffold python-automation my-script
```

## Features

- 🔍 **Smart Analysis** - Automatically detects and analyzes your project structure
- 📊 **Tech Stack Detection** - Identifies dependencies, frameworks, and build tools
- 🌳 **Project Visualization** - Generates clean file tree representations
- 📦 **Complete Export** - Creates XML export of your entire codebase
- 🚀 **Project Scaffolding** - Bootstrap new projects with best practices
- ⚡ **Fast & Lightweight** - Minimal dependencies, maximum performance

## Configuration

The tool respects `.gitignore` files and supports custom filtering via `.initrepoignore`:

```bash
# Create default ignore file
initrepo --init
```

Customize the `.initrepoignore` file to exclude specific files or directories from analysis.

## Contributing

We welcome contributions from the community! If you'd like to contribute, please see our `CONTRIBUTING.md` file for details on how to get started, run tests, and submit pull requests.

If you have a bug report or a feature request, please [open an issue](https://github.com/initrepo/cli/issues/new).

## License

This project is licensed under the [**MIT License.**](https://github.com/initrepo/cli/blob/main/LICENSE)
