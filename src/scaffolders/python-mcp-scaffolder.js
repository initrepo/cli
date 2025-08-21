/**
 * Python MCP Scaffolder
 * 
 * Creates a Python MCP (Model Context Protocol) server project structure
 * for building AI tools and integrations.
 */

import { BaseScaffolder } from './base-scaffolder.js';
import { execSync } from 'child_process';

export class PythonMCPScaffolder extends BaseScaffolder {
  constructor(options) {
    super(options);
    this.usePoetry = options.poetry !== false;
    this.includeSamples = options.samples !== false;
  }

  async scaffold() {
    this.createProjectFiles();
    
    if (this.architecture?.structure) {
      this.createStructureFromArchitecture();
    } else {
      this.createDefaultStructure();
    }
    
    this.createEssentialFiles();
  }

  createDefaultStructure() {
    const dirs = [
      'src',
      `src/${this.getProjectNames().snake}`,
      `src/${this.getProjectNames().snake}/tools`,
      `src/${this.getProjectNames().snake}/handlers`,
      `src/${this.getProjectNames().snake}/utils`,
      'tests',
      'tests/tools',
      'tests/handlers',
      'docs',
      'examples'
    ];

    dirs.forEach(dir => this.createDirectory(dir));
    this.createSourceFiles();
  }

  createProjectFiles() {
    if (this.usePoetry) {
      this.createPyprojectToml();
    } else {
      this.createSetupPy();
      this.createRequirementsTxt();
    }
  }

  createPyprojectToml() {
    const projectName = this.getProjectNames().kebab;
    const packageName = this.getProjectNames().snake;
    
    const pyprojectContent = `[tool.poetry]
name = "${projectName}"
version = "0.1.0"
description = "MCP server for ${this.projectName}"
authors = ["Your Name <your.email@example.com>"]
readme = "README.md"
packages = [{include = "${packageName}", from = "src"}]

[tool.poetry.dependencies]
python = "^3.9"
mcp = "^1.0.0"
pydantic = "^2.0.0"
anyio = "^4.0.0"
httpx = "^0.27.0"
click = "^8.1.0"

[tool.poetry.group.dev.dependencies]
pytest = "^7.4.0"
pytest-asyncio = "^0.21.0"
black = "^23.0.0"
isort = "^5.12.0"
flake8 = "^6.0.0"
mypy = "^1.5.0"
pre-commit = "^3.4.0"

[tool.poetry.scripts]
${projectName} = "${packageName}.server:main"

[build-system]
requires = ["poetry-core"]
build-backend = "poetry.core.masonry.api"

[tool.black]
line-length = 88
target-version = ["py39"]

[tool.isort]
profile = "black"
multi_line_output = 3

[tool.mypy]
python_version = "3.9"
warn_return_any = true
warn_unused_configs = true
disallow_untyped_defs = true
`;

    this.writeFile('pyproject.toml', pyprojectContent);
  }

  createSetupPy() {
    const packageName = this.getProjectNames().snake;
    
    const setupContent = `from setuptools import setup, find_packages

with open("README.md", "r", encoding="utf-8") as fh:
    long_description = fh.read()

with open("requirements.txt", "r", encoding="utf-8") as fh:
    requirements = [line.strip() for line in fh if line.strip() and not line.startswith("#")]

setup(
    name="${this.getProjectNames().kebab}",
    version="0.1.0",
    author="Your Name",
    author_email="your.email@example.com",
    description="MCP server for ${this.projectName}",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/yourusername/${this.getProjectNames().kebab}",
    package_dir={"": "src"},
    packages=find_packages(where="src"),
    classifiers=[
        "Development Status :: 3 - Alpha",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
    ],
    python_requires=">=3.9",
    install_requires=requirements,
    extras_require={
        "dev": [
            "pytest>=7.4.0",
            "pytest-asyncio>=0.21.0",
            "black>=23.0.0",
            "isort>=5.12.0",
            "flake8>=6.0.0",
            "mypy>=1.5.0",
        ]
    },
    entry_points={
        "console_scripts": [
            "${this.getProjectNames().kebab}=${packageName}.server:main",
        ],
    },
)
`;

    this.writeFile('setup.py', setupContent);
  }

  createRequirementsTxt() {
    const requirements = `# Core MCP dependencies
mcp>=1.0.0
pydantic>=2.0.0
anyio>=4.0.0
httpx>=0.27.0
click>=8.1.0

# Optional dependencies for enhanced functionality
python-dotenv>=1.0.0
loguru>=0.7.0
`;

    this.writeFile('requirements.txt', requirements);
  }

  createSourceFiles() {
    const packageName = this.getProjectNames().snake;
    
    // Main server file
    const serverContent = `"""
${this.projectName} MCP Server

A Model Context Protocol server that provides tools and resources.
"""

import asyncio
import logging
from typing import Any, Sequence

import click
from mcp.server import Server
from mcp.server.models import InitializationOptions
from mcp.server.stdio import stdio_server
from mcp.types import (
    Resource,
    Tool,
    TextContent,
    ImageContent,
    EmbeddedResource,
)

from .tools import get_available_tools
from .handlers import setup_handlers

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ${this.getProjectNames().pascal}Server:
    """Main MCP server class for ${this.projectName}."""
    
    def __init__(self):
        self.server = Server("${this.getProjectNames().kebab}")
        self._setup_handlers()
    
    def _setup_handlers(self):
        """Set up request handlers for the server."""
        setup_handlers(self.server)
        
        @self.server.list_tools()
        async def handle_list_tools() -> list[Tool]:
            """List available tools."""
            return get_available_tools()
        
        @self.server.call_tool()
        async def handle_call_tool(name: str, arguments: dict[str, Any] | None) -> list[TextContent | ImageContent | EmbeddedResource]:
            """Handle tool execution."""
            from .tools import execute_tool
            
            try:
                result = await execute_tool(name, arguments or {})
                return [TextContent(type="text", text=str(result))]
            except Exception as e:
                logger.error(f"Error executing tool {name}: {e}")
                return [TextContent(type="text", text=f"Error: {str(e)}")]
    
    async def run(self):
        """Run the server."""
        async with stdio_server() as (read_stream, write_stream):
            await self.server.run(
                read_stream,
                write_stream,
                InitializationOptions(
                    server_name="${this.getProjectNames().kebab}",
                    server_version="0.1.0",
                    capabilities=self.server.get_capabilities(
                        notification_options=None,
                        experimental_capabilities=None,
                    ),
                ),
            )


@click.command()
@click.option("--debug", is_flag=True, help="Enable debug logging")
def main(debug: bool = False):
    """Run the ${this.projectName} MCP server."""
    if debug:
        logging.getLogger().setLevel(logging.DEBUG)
    
    server = ${this.getProjectNames().pascal}Server()
    asyncio.run(server.run())


if __name__ == "__main__":
    main()
`;

    this.writeFile(`src/${packageName}/server.py`, serverContent);

    // Package init file
    const initContent = `"""
${this.projectName} MCP Server Package
"""

__version__ = "0.1.0"
__author__ = "Your Name"
__email__ = "your.email@example.com"

from .server import ${this.getProjectNames().pascal}Server

__all__ = ["${this.getProjectNames().pascal}Server"]
`;

    this.writeFile(`src/${packageName}/__init__.py`, initContent);

    // Tools module
    const toolsContent = `"""
Tools for the ${this.projectName} MCP server.
"""

from typing import Any, Dict, List
from mcp.types import Tool

# Example tools - replace with your actual tools
AVAILABLE_TOOLS = [
    Tool(
        name="echo",
        description="Echo back the input text",
        inputSchema={
            "type": "object",
            "properties": {
                "text": {
                    "type": "string",
                    "description": "Text to echo back"
                }
            },
            "required": ["text"]
        }
    ),
    Tool(
        name="calculate",
        description="Perform basic arithmetic calculations",
        inputSchema={
            "type": "object",
            "properties": {
                "expression": {
                    "type": "string",
                    "description": "Mathematical expression to evaluate (e.g., '2 + 2')"
                }
            },
            "required": ["expression"]
        }
    )
]


def get_available_tools() -> List[Tool]:
    """Get list of available tools."""
    return AVAILABLE_TOOLS


async def execute_tool(name: str, arguments: Dict[str, Any]) -> Any:
    """Execute a tool with given arguments."""
    if name == "echo":
        return echo_tool(arguments)
    elif name == "calculate":
        return calculate_tool(arguments)
    else:
        raise ValueError(f"Unknown tool: {name}")


def echo_tool(arguments: Dict[str, Any]) -> str:
    """Echo tool implementation."""
    text = arguments.get("text", "")
    return f"Echo: {text}"


def calculate_tool(arguments: Dict[str, Any]) -> str:
    """Calculate tool implementation."""
    expression = arguments.get("expression", "")
    
    try:
        # Simple and safe expression evaluation
        # In production, consider using a proper math parser
        allowed_chars = set("0123456789+-*/(). ")
        if not all(c in allowed_chars for c in expression):
            return "Error: Invalid characters in expression"
        
        result = eval(expression)
        return f"Result: {result}"
    except Exception as e:
        return f"Error: {str(e)}"
`;

    this.writeFile(`src/${packageName}/tools/__init__.py`, toolsContent);

    // Handlers module
    const handlersContent = `"""
Request handlers for the ${this.projectName} MCP server.
"""

import logging
from typing import Any, Sequence

from mcp.server import Server
from mcp.types import (
    Resource,
    TextContent,
)

logger = logging.getLogger(__name__)


def setup_handlers(server: Server):
    """Set up additional request handlers."""
    
    @server.list_resources()
    async def handle_list_resources() -> list[Resource]:
        """List available resources."""
        return [
            Resource(
                uri="info://server",
                name="Server Information",
                description="Information about this MCP server",
                mimeType="text/plain"
            )
        ]
    
    @server.read_resource()
    async def handle_read_resource(uri: str) -> str:
        """Read a specific resource."""
        if uri == "info://server":
            return f"""${this.projectName} MCP Server

This is a Model Context Protocol server that provides tools and resources.

Version: 0.1.0
Tools available: echo, calculate

Usage:
- Use the echo tool to repeat text
- Use the calculate tool for basic math
"""
        else:
            raise ValueError(f"Unknown resource: {uri}")
`;

    this.writeFile(`src/${packageName}/handlers/__init__.py`, handlersContent);

    // Utils module
    const utilsContent = `"""
Utility functions for the ${this.projectName} MCP server.
"""

import json
import logging
from typing import Any, Dict

logger = logging.getLogger(__name__)


def validate_arguments(arguments: Dict[str, Any], required_fields: list[str]) -> bool:
    """Validate that all required fields are present in arguments."""
    return all(field in arguments for field in required_fields)


def safe_json_loads(data: str) -> Dict[str, Any]:
    """Safely load JSON data with error handling."""
    try:
        return json.loads(data)
    except json.JSONDecodeError as e:
        logger.error(f"JSON decode error: {e}")
        return {}


def format_error(error: Exception) -> str:
    """Format an error for user-friendly display."""
    return f"Error: {type(error).__name__}: {str(error)}"


class ConfigManager:
    """Manage configuration for the MCP server."""
    
    def __init__(self):
        self._config = {}
    
    def load_config(self, config_path: str = "config.json"):
        """Load configuration from file."""
        try:
            with open(config_path, 'r') as f:
                self._config = json.load(f)
        except FileNotFoundError:
            logger.warning(f"Config file {config_path} not found, using defaults")
        except json.JSONDecodeError as e:
            logger.error(f"Error parsing config file: {e}")
    
    def get(self, key: str, default: Any = None) -> Any:
        """Get configuration value."""
        return self._config.get(key, default)
    
    def set(self, key: str, value: Any):
        """Set configuration value."""
        self._config[key] = value
`;

    this.writeFile(`src/${packageName}/utils/__init__.py`, utilsContent);

    // Test files
    const testServerContent = `"""
Tests for the MCP server.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock

from ${packageName}.server import ${this.getProjectNames().pascal}Server


@pytest.fixture
def server():
    """Create a test server instance."""
    return ${this.getProjectNames().pascal}Server()


def test_server_initialization(server):
    """Test server initializes correctly."""
    assert server.server is not None
    assert server.server.name == "${this.getProjectNames().kebab}"


@pytest.mark.asyncio
async def test_list_tools(server):
    """Test listing available tools."""
    # This would need to be implemented based on your actual server setup
    pass


@pytest.mark.asyncio
async def test_call_tool(server):
    """Test calling a tool."""
    # This would need to be implemented based on your actual tools
    pass
`;

    this.writeFile(`tests/test_server.py`, testServerContent);

    const testToolsContent = `"""
Tests for MCP tools.
"""

import pytest

from ${packageName}.tools import echo_tool, calculate_tool, execute_tool


def test_echo_tool():
    """Test echo tool functionality."""
    result = echo_tool({"text": "Hello, World!"})
    assert result == "Echo: Hello, World!"


def test_calculate_tool():
    """Test calculate tool functionality."""
    result = calculate_tool({"expression": "2 + 2"})
    assert result == "Result: 4"
    
    result = calculate_tool({"expression": "10 * 5"})
    assert result == "Result: 50"


def test_calculate_tool_error():
    """Test calculate tool error handling."""
    result = calculate_tool({"expression": "invalid"})
    assert "Error:" in result


@pytest.mark.asyncio
async def test_execute_tool():
    """Test tool execution."""
    result = await execute_tool("echo", {"text": "test"})
    assert result == "Echo: test"
    
    with pytest.raises(ValueError):
        await execute_tool("nonexistent", {})
`;

    this.writeFile(`tests/tools/test_tools.py`, testToolsContent);
  }

  createEssentialFiles() {
    // README
    const readme = `# ${this.projectName}

A Model Context Protocol (MCP) server that provides AI tools and integrations.

## Overview

This MCP server enables AI assistants to interact with ${this.projectName} through a standardized protocol. It provides tools for various operations and can be integrated with MCP-compatible AI clients.

## Features

- **Echo Tool**: Simple text echoing for testing
- **Calculate Tool**: Basic arithmetic calculations
- **Extensible Architecture**: Easy to add new tools and resources

## Installation

### Using Poetry (Recommended)

\`\`\`bash
poetry install
\`\`\`

### Using pip

\`\`\`bash
pip install -r requirements.txt
\`\`\`

## Usage

### Running the Server

\`\`\`bash
# With Poetry
poetry run ${this.getProjectNames().kebab}

# With pip
python -m ${this.getProjectNames().snake}.server
\`\`\`

### Configuration

Create a \`config.json\` file in the project root:

\`\`\`json
{
  "debug": false,
  "log_level": "INFO"
}
\`\`\`

### Integration with AI Clients

Add this server to your MCP client configuration:

\`\`\`json
{
  "mcpServers": {
    "${this.getProjectNames().kebab}": {
      "command": "python",
      "args": ["-m", "${this.getProjectNames().snake}.server"]
    }
  }
}
\`\`\`

## Development

### Running Tests

\`\`\`bash
# With Poetry
poetry run pytest

# With pip
pytest
\`\`\`

### Code Formatting

\`\`\`bash
# Format code
poetry run black src/ tests/

# Sort imports
poetry run isort src/ tests/

# Type checking
poetry run mypy src/
\`\`\`

### Adding New Tools

1. Create a new tool function in \`src/${this.getProjectNames().snake}/tools/\`
2. Add the tool definition to \`AVAILABLE_TOOLS\` list
3. Update the \`execute_tool\` function to handle the new tool
4. Add tests for the new tool

Example:

\`\`\`python
# In tools/__init__.py
def my_new_tool(arguments: Dict[str, Any]) -> str:
    """Implementation of my new tool."""
    return "Tool result"

# Add to AVAILABLE_TOOLS
Tool(
    name="my_new_tool",
    description="Description of what the tool does",
    inputSchema={
        "type": "object",
        "properties": {
            "param": {"type": "string", "description": "Parameter description"}
        },
        "required": ["param"]
    }
)
\`\`\`

## Project Structure

\`\`\`
src/${this.getProjectNames().snake}/
├── __init__.py          # Package initialization
├── server.py            # Main MCP server
├── tools/               # Tool implementations
│   └── __init__.py
├── handlers/            # Request handlers
│   └── __init__.py
└── utils/               # Utility functions
    └── __init__.py
tests/                   # Test files
docs/                    # Documentation
examples/                # Usage examples
\`\`\`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite
6. Submit a pull request

## License

This project is licensed under the MIT License. See LICENSE file for details.

## Learn More

- [MCP Specification](https://spec.modelcontextprotocol.io/)
- [MCP Python SDK](https://github.com/modelcontextprotocol/python-sdk)
`;

    this.writeFile('README.md', readme);

    // License file
    const license = `MIT License

Copyright (c) ${new Date().getFullYear()} ${this.projectName}

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`;

    this.writeFile('LICENSE', license);

    // Configuration files
    const pytestConfig = `[tool:pytest]
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
addopts = 
    --verbose
    --tb=short
    -ra
asyncio_mode = auto
`;

    this.writeFile('pytest.ini', pytestConfig);

    // Example configuration
    const configExample = `{
  "debug": false,
  "log_level": "INFO",
  "max_retries": 3,
  "timeout": 30
}
`;

    this.writeFile('config.example.json', configExample);

    // Example usage
    const exampleUsage = `#!/usr/bin/env python3
"""
Example usage of the ${this.projectName} MCP server.
"""

import asyncio
import json
from ${this.getProjectNames().snake}.server import ${this.getProjectNames().pascal}Server


async def example_usage():
    """Demonstrate server usage."""
    server = ${this.getProjectNames().pascal}Server()
    
    # This is just an example - actual MCP communication
    # happens through stdio with the MCP client
    print("${this.projectName} MCP Server Example")
    print("In real usage, this server communicates via stdio with MCP clients")
    print("Run: python -m ${this.getProjectNames().snake}.server")


if __name__ == "__main__":
    asyncio.run(example_usage())
`;

    this.writeFile('examples/usage_example.py', exampleUsage);

    // Development requirements
    const devRequirements = `# Development dependencies
pytest>=7.4.0
pytest-asyncio>=0.21.0
black>=23.0.0
isort>=5.12.0
flake8>=6.0.0
mypy>=1.5.0
pre-commit>=3.4.0

# Documentation
sphinx>=7.0.0
sphinx-rtd-theme>=1.3.0
`;

    this.writeFile('requirements-dev.txt', devRequirements);
  }

  supportsDependencyInstallation() {
    return true;
  }

  async installDependencies() {
    try {
      process.chdir(this.targetDirectory);
      
      if (this.usePoetry) {
        execSync('poetry install', { stdio: 'inherit' });
      } else {
        execSync('pip install -r requirements.txt', { stdio: 'inherit' });
      }
    } catch (error) {
      this.log('Failed to install dependencies: ' + error.message, 'warning');
    }
  }

  getNextSteps() {
    const steps = [];
    
    if (this.usePoetry) {
      steps.push('poetry install');
      steps.push('poetry run python -m ' + this.getProjectNames().snake + '.server');
    } else {
      steps.push('pip install -r requirements.txt');
      steps.push('python -m ' + this.getProjectNames().snake + '.server');
    }
    
    steps.push('Configure your MCP client to use this server');
    
    return steps;
  }

  getDefaultGitignore() {
    return `# Byte-compiled / optimized / DLL files
__pycache__/
*.py[cod]
*$py.class

# C extensions
*.so

# Distribution / packaging
.Python
build/
develop-eggs/
dist/
downloads/
eggs/
.eggs/
lib/
lib64/
parts/
sdist/
var/
wheels/
share/python-wheels/
*.egg-info/
.installed.cfg
*.egg
MANIFEST

# PyInstaller
*.manifest
*.spec

# Installer logs
pip-log.txt
pip-delete-this-directory.txt

# Unit test / coverage reports
htmlcov/
.tox/
.nox/
.coverage
.coverage.*
.cache
nosetests.xml
coverage.xml
*.cover
*.py,cover
.hypothesis/
.pytest_cache/
cover/

# Environments
.env
.venv
env/
venv/
ENV/
env.bak/
venv.bak/

# Poetry
poetry.lock

# IDEs
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Project specific
config.json
*.log
`;
  }
}