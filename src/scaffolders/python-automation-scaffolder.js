/**
 * Python Automation Scaffolder
 * 
 * Creates a Python automation project structure for scripts,
 * workflows, and automation tasks.
 */

import { BaseScaffolder } from './base-scaffolder.js';
import { execSync } from 'child_process';

export class PythonAutomationScaffolder extends BaseScaffolder {
  constructor(options) {
    super(options);
    this.usePoetry = options.poetry !== false;
    this.includeScheduler = options.scheduler !== false;
    this.includeWebInterface = options.web !== false;
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
      `src/${this.getProjectNames().snake}/tasks`,
      `src/${this.getProjectNames().snake}/workflows`,
      `src/${this.getProjectNames().snake}/utils`,
      `src/${this.getProjectNames().snake}/config`,
      'scripts',
      'data',
      'data/input',
      'data/output',
      'data/temp',
      'logs',
      'tests',
      'tests/tasks',
      'tests/workflows',
      'docs',
      'examples'
    ];

    if (this.includeWebInterface) {
      dirs.push(`src/${this.getProjectNames().snake}/web`);
      dirs.push(`src/${this.getProjectNames().snake}/web/templates`);
      dirs.push(`src/${this.getProjectNames().snake}/web/static`);
    }

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
description = "Automation scripts and workflows for ${this.projectName}"
authors = ["Your Name <your.email@example.com>"]
readme = "README.md"
packages = [{include = "${packageName}", from = "src"}]

[tool.poetry.dependencies]
python = "^3.9"
click = "^8.1.0"
pydantic = "^2.0.0"
python-dotenv = "^1.0.0"
loguru = "^0.7.0"
pyyaml = "^6.0.1"
requests = "^2.31.0"
${this.includeScheduler ? 'schedule = "^1.2.0"\napscheduler = "^3.10.0"\n' : ''}${this.includeWebInterface ? 'fastapi = "^0.104.0"\nuvicorn = "^0.24.0"\njinja2 = "^3.1.0"\n' : ''}pandas = "^2.1.0"
openpyxl = "^3.1.0"

[tool.poetry.group.dev.dependencies]
pytest = "^7.4.0"
pytest-asyncio = "^0.21.0"
black = "^23.0.0"
isort = "^5.12.0"
flake8 = "^6.0.0"
mypy = "^1.5.0"
pre-commit = "^3.4.0"

[tool.poetry.scripts]
${projectName} = "${packageName}.cli:main"
${projectName}-server = "${packageName}.server:main"

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
    description="Automation scripts and workflows for ${this.projectName}",
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
            "black>=23.0.0",
            "isort>=5.12.0",
            "flake8>=6.0.0",
            "mypy>=1.5.0",
        ],
        "web": [
            "fastapi>=0.104.0",
            "uvicorn>=0.24.0",
            "jinja2>=3.1.0",
        ],
        "scheduler": [
            "schedule>=1.2.0",
            "apscheduler>=3.10.0",
        ]
    },
    entry_points={
        "console_scripts": [
            "${this.getProjectNames().kebab}=${packageName}.cli:main",
            "${this.getProjectNames().kebab}-server=${packageName}.server:main",
        ],
    },
)
`;

    this.writeFile('setup.py', setupContent);
  }

  createRequirementsTxt() {
    const requirements = `# Core dependencies
click>=8.1.0
pydantic>=2.0.0
python-dotenv>=1.0.0
loguru>=0.7.0
pyyaml>=6.0.1
requests>=2.31.0
pandas>=2.1.0
openpyxl>=3.1.0

# Scheduling (optional)
${this.includeScheduler ? `schedule>=1.2.0
apscheduler>=3.10.0` : `# schedule>=1.2.0
# apscheduler>=3.10.0`}

# Web interface (optional)
${this.includeWebInterface ? `fastapi>=0.104.0
uvicorn>=0.24.0
jinja2>=3.1.0` : `# fastapi>=0.104.0
# uvicorn>=0.24.0
# jinja2>=3.1.0`}
`;

    this.writeFile('requirements.txt', requirements);
  }

  createSourceFiles() {
    const packageName = this.getProjectNames().snake;
    
    // Main package init
    const initContent = `"""
${this.projectName} Automation Package

A comprehensive automation framework for scripts, workflows, and tasks.
"""

__version__ = "0.1.0"
__author__ = "Your Name"
__email__ = "your.email@example.com"

from .config import settings
from .tasks import TaskManager
from .workflows import WorkflowManager

__all__ = ["settings", "TaskManager", "WorkflowManager"]
`;

    this.writeFile(`src/${packageName}/__init__.py`, initContent);

    // CLI interface
    const cliContent = `"""
Command Line Interface for ${this.projectName} automation.
"""

import click
from loguru import logger

from .config import settings
from .tasks import TaskManager
from .workflows import WorkflowManager


@click.group()
@click.option("--config", "-c", help="Configuration file path")
@click.option("--verbose", "-v", is_flag=True, help="Enable verbose logging")
def main(config: str = None, verbose: bool = False):
    """${this.projectName} automation CLI."""
    if verbose:
        logger.add("logs/debug.log", level="DEBUG")
    else:
        logger.add("logs/app.log", level="INFO")
    
    if config:
        settings.load_config(config)
    
    logger.info("Starting ${this.projectName} automation")


@main.command()
@click.argument("task_name")
@click.option("--params", "-p", multiple=True, help="Task parameters (key=value)")
def run_task(task_name: str, params: tuple):
    """Run a specific task."""
    task_manager = TaskManager()
    
    # Parse parameters
    task_params = {}
    for param in params:
        if "=" in param:
            key, value = param.split("=", 1)
            task_params[key] = value
    
    logger.info(f"Running task: {task_name}")
    result = task_manager.run_task(task_name, task_params)
    
    if result.success:
        click.echo(f"Task completed successfully: {result.message}")
    else:
        click.echo(f"Task failed: {result.error}", err=True)
        exit(1)


@main.command()
@click.argument("workflow_name")
def run_workflow(workflow_name: str):
    """Run a workflow."""
    workflow_manager = WorkflowManager()
    
    logger.info(f"Running workflow: {workflow_name}")
    result = workflow_manager.run_workflow(workflow_name)
    
    if result.success:
        click.echo(f"Workflow completed successfully")
    else:
        click.echo(f"Workflow failed: {result.error}", err=True)
        exit(1)


@main.command()
def list_tasks():
    """List available tasks."""
    task_manager = TaskManager()
    tasks = task_manager.list_tasks()
    
    click.echo("Available tasks:")
    for task in tasks:
        click.echo(f"  - {task.name}: {task.description}")


@main.command()
def list_workflows():
    """List available workflows."""
    workflow_manager = WorkflowManager()
    workflows = workflow_manager.list_workflows()
    
    click.echo("Available workflows:")
    for workflow in workflows:
        click.echo(f"  - {workflow.name}: {workflow.description}")


${this.includeScheduler ? `@main.command()
def scheduler():
    """Start the task scheduler."""
    from .scheduler import start_scheduler
    
    logger.info("Starting scheduler")
    start_scheduler()` : ''}


if __name__ == "__main__":
    main()
`;

    this.writeFile(`src/${packageName}/cli.py`, cliContent);

    // Configuration module
    const configContent = `"""
Configuration management for ${this.projectName}.
"""

import os
from pathlib import Path
from typing import Any, Dict, Optional

import yaml
from pydantic import BaseSettings, Field
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


class Settings(BaseSettings):
    """Application settings."""
    
    # Basic settings
    app_name: str = "${this.projectName}"
    debug: bool = Field(default=False, env="DEBUG")
    log_level: str = Field(default="INFO", env="LOG_LEVEL")
    
    # Directories
    data_dir: str = Field(default="data", env="DATA_DIR")
    logs_dir: str = Field(default="logs", env="LOGS_DIR")
    temp_dir: str = Field(default="data/temp", env="TEMP_DIR")
    
    # Task settings
    max_retries: int = Field(default=3, env="MAX_RETRIES")
    retry_delay: int = Field(default=5, env="RETRY_DELAY")
    timeout: int = Field(default=300, env="TIMEOUT")
    
    # Database (if needed)
    database_url: Optional[str] = Field(default=None, env="DATABASE_URL")
    
    # API settings
    api_host: str = Field(default="localhost", env="API_HOST")
    api_port: int = Field(default=8000, env="API_PORT")
    
    class Config:
        env_file = ".env"
        case_sensitive = False
    
    def load_config(self, config_path: str):
        """Load configuration from YAML file."""
        config_file = Path(config_path)
        if config_file.exists():
            with open(config_file) as f:
                config_data = yaml.safe_load(f)
                for key, value in config_data.items():
                    if hasattr(self, key):
                        setattr(self, key, value)
    
    def ensure_directories(self):
        """Ensure required directories exist."""
        directories = [self.data_dir, self.logs_dir, self.temp_dir]
        for directory in directories:
            Path(directory).mkdir(parents=True, exist_ok=True)


# Global settings instance
settings = Settings()
`;

    this.writeFile(`src/${packageName}/config/__init__.py`, configContent);

    // Task management
    const tasksContent = `"""
Task management system for ${this.projectName}.
"""

import time
from datetime import datetime
from typing import Any, Dict, List, Optional
from dataclasses import dataclass, field
from pathlib import Path

from loguru import logger
from pydantic import BaseModel

from ..config import settings


class TaskResult(BaseModel):
    """Result of a task execution."""
    success: bool
    message: str = ""
    error: Optional[str] = None
    data: Dict[str, Any] = {}
    execution_time: float = 0.0


@dataclass
class Task:
    """Task definition."""
    name: str
    description: str
    function: callable
    params: Dict[str, Any] = field(default_factory=dict)
    retries: int = 3
    timeout: int = 300


class TaskManager:
    """Manages and executes tasks."""
    
    def __init__(self):
        self.tasks: Dict[str, Task] = {}
        self._register_default_tasks()
    
    def register_task(self, task: Task):
        """Register a new task."""
        self.tasks[task.name] = task
        logger.info(f"Registered task: {task.name}")
    
    def run_task(self, name: str, params: Dict[str, Any] = None) -> TaskResult:
        """Run a task by name."""
        if name not in self.tasks:
            return TaskResult(
                success=False,
                error=f"Task '{name}' not found"
            )
        
        task = self.tasks[name]
        merged_params = {**task.params, **(params or {})}
        
        start_time = time.time()
        
        for attempt in range(task.retries + 1):
            try:
                logger.info(f"Running task '{name}' (attempt {attempt + 1})")
                result_data = task.function(**merged_params)
                
                execution_time = time.time() - start_time
                
                return TaskResult(
                    success=True,
                    message=f"Task '{name}' completed successfully",
                    data=result_data or {},
                    execution_time=execution_time
                )
                
            except Exception as e:
                logger.error(f"Task '{name}' failed (attempt {attempt + 1}): {e}")
                
                if attempt == task.retries:
                    execution_time = time.time() - start_time
                    return TaskResult(
                        success=False,
                        error=str(e),
                        execution_time=execution_time
                    )
                
                time.sleep(settings.retry_delay)
    
    def list_tasks(self) -> List[Task]:
        """List all registered tasks."""
        return list(self.tasks.values())
    
    def _register_default_tasks(self):
        """Register default tasks."""
        # Example tasks
        self.register_task(Task(
            name="hello_world",
            description="Simple hello world task",
            function=self._hello_world_task
        ))
        
        self.register_task(Task(
            name="file_processor",
            description="Process files in a directory",
            function=self._file_processor_task
        ))
        
        self.register_task(Task(
            name="data_backup",
            description="Backup data files",
            function=self._data_backup_task
        ))
    
    def _hello_world_task(self, message: str = "Hello, World!") -> Dict[str, Any]:
        """Example hello world task."""
        logger.info(f"Hello World Task: {message}")
        return {"message": message, "timestamp": datetime.now().isoformat()}
    
    def _file_processor_task(self, input_dir: str = "data/input", 
                           output_dir: str = "data/output") -> Dict[str, Any]:
        """Example file processing task."""
        input_path = Path(input_dir)
        output_path = Path(output_dir)
        
        output_path.mkdir(parents=True, exist_ok=True)
        
        processed_files = []
        
        if input_path.exists():
            for file_path in input_path.iterdir():
                if file_path.is_file():
                    logger.info(f"Processing file: {file_path}")
                    
                    # Simple file copy as example
                    output_file = output_path / f"processed_{file_path.name}"
                    output_file.write_bytes(file_path.read_bytes())
                    
                    processed_files.append(str(file_path))
        
        return {
            "processed_files": processed_files,
            "count": len(processed_files)
        }
    
    def _data_backup_task(self, source_dir: str = "data", 
                         backup_dir: str = "backup") -> Dict[str, Any]:
        """Example data backup task."""
        import shutil
        from datetime import datetime
        
        source_path = Path(source_dir)
        backup_path = Path(backup_dir)
        
        if not source_path.exists():
            raise ValueError(f"Source directory does not exist: {source_dir}")
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_target = backup_path / f"backup_{timestamp}"
        
        logger.info(f"Creating backup: {backup_target}")
        shutil.copytree(source_path, backup_target)
        
        return {
            "source": str(source_path),
            "backup": str(backup_target),
            "timestamp": timestamp
        }
`;

    this.writeFile(`src/${packageName}/tasks/__init__.py`, tasksContent);

    // Workflow management
    const workflowsContent = `"""
Workflow management system for ${this.projectName}.
"""

import time
from datetime import datetime
from typing import Any, Dict, List, Optional
from dataclasses import dataclass, field
from enum import Enum

from loguru import logger
from pydantic import BaseModel

from ..tasks import TaskManager, TaskResult


class WorkflowStatus(Enum):
    """Workflow execution status."""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class WorkflowResult(BaseModel):
    """Result of a workflow execution."""
    success: bool
    status: WorkflowStatus
    message: str = ""
    error: Optional[str] = None
    task_results: List[TaskResult] = []
    execution_time: float = 0.0


@dataclass
class WorkflowStep:
    """A single step in a workflow."""
    task_name: str
    params: Dict[str, Any] = field(default_factory=dict)
    depends_on: List[str] = field(default_factory=list)
    optional: bool = False


@dataclass
class Workflow:
    """Workflow definition."""
    name: str
    description: str
    steps: List[WorkflowStep]
    parallel: bool = False


class WorkflowManager:
    """Manages and executes workflows."""
    
    def __init__(self):
        self.workflows: Dict[str, Workflow] = {}
        self.task_manager = TaskManager()
        self._register_default_workflows()
    
    def register_workflow(self, workflow: Workflow):
        """Register a new workflow."""
        self.workflows[workflow.name] = workflow
        logger.info(f"Registered workflow: {workflow.name}")
    
    def run_workflow(self, name: str) -> WorkflowResult:
        """Run a workflow by name."""
        if name not in self.workflows:
            return WorkflowResult(
                success=False,
                status=WorkflowStatus.FAILED,
                error=f"Workflow '{name}' not found"
            )
        
        workflow = self.workflows[name]
        start_time = time.time()
        task_results = []
        
        logger.info(f"Starting workflow: {name}")
        
        try:
            if workflow.parallel:
                task_results = self._run_parallel_workflow(workflow)
            else:
                task_results = self._run_sequential_workflow(workflow)
            
            execution_time = time.time() - start_time
            
            # Check if all required tasks succeeded
            failed_tasks = [r for r in task_results if not r.success]
            
            if failed_tasks:
                return WorkflowResult(
                    success=False,
                    status=WorkflowStatus.FAILED,
                    error=f"Workflow failed: {len(failed_tasks)} tasks failed",
                    task_results=task_results,
                    execution_time=execution_time
                )
            
            return WorkflowResult(
                success=True,
                status=WorkflowStatus.COMPLETED,
                message=f"Workflow '{name}' completed successfully",
                task_results=task_results,
                execution_time=execution_time
            )
            
        except Exception as e:
            execution_time = time.time() - start_time
            logger.error(f"Workflow '{name}' failed: {e}")
            
            return WorkflowResult(
                success=False,
                status=WorkflowStatus.FAILED,
                error=str(e),
                task_results=task_results,
                execution_time=execution_time
            )
    
    def _run_sequential_workflow(self, workflow: Workflow) -> List[TaskResult]:
        """Run workflow steps sequentially."""
        task_results = []
        
        for step in workflow.steps:
            logger.info(f"Executing step: {step.task_name}")
            
            result = self.task_manager.run_task(step.task_name, step.params)
            task_results.append(result)
            
            if not result.success and not step.optional:
                logger.error(f"Required step '{step.task_name}' failed, stopping workflow")
                break
        
        return task_results
    
    def _run_parallel_workflow(self, workflow: Workflow) -> List[TaskResult]:
        """Run workflow steps in parallel (simplified implementation)."""
        # For now, just run sequentially
        # In a real implementation, you'd use threading or asyncio
        return self._run_sequential_workflow(workflow)
    
    def list_workflows(self) -> List[Workflow]:
        """List all registered workflows."""
        return list(self.workflows.values())
    
    def _register_default_workflows(self):
        """Register default workflows."""
        # Example: Data processing workflow
        data_processing = Workflow(
            name="data_processing",
            description="Complete data processing pipeline",
            steps=[
                WorkflowStep(
                    task_name="file_processor",
                    params={"input_dir": "data/input", "output_dir": "data/processed"}
                ),
                WorkflowStep(
                    task_name="data_backup",
                    params={"source_dir": "data/processed"}
                )
            ]
        )
        self.register_workflow(data_processing)
        
        # Example: Daily maintenance workflow
        maintenance = Workflow(
            name="daily_maintenance",
            description="Daily maintenance tasks",
            steps=[
                WorkflowStep(
                    task_name="data_backup",
                    params={"source_dir": "data"}
                ),
                WorkflowStep(
                    task_name="hello_world",
                    params={"message": "Daily maintenance completed"},
                    optional=True
                )
            ]
        )
        self.register_workflow(maintenance)
`;

    this.writeFile(`src/${packageName}/workflows/__init__.py`, workflowsContent);

    // Utilities
    const utilsContent = `"""
Utility functions for ${this.projectName}.
"""

import os
import json
import csv
from pathlib import Path
from typing import Any, Dict, List, Union
from datetime import datetime

import pandas as pd
from loguru import logger


def read_file(file_path: Union[str, Path], encoding: str = "utf-8") -> str:
    """Read text file content."""
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"File not found: {file_path}")
    
    return path.read_text(encoding=encoding)


def write_file(file_path: Union[str, Path], content: str, encoding: str = "utf-8"):
    """Write content to text file."""
    path = Path(file_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding=encoding)


def read_json(file_path: Union[str, Path]) -> Dict[str, Any]:
    """Read JSON file."""
    content = read_file(file_path)
    return json.loads(content)


def write_json(file_path: Union[str, Path], data: Dict[str, Any], indent: int = 2):
    """Write data to JSON file."""
    content = json.dumps(data, indent=indent, ensure_ascii=False)
    write_file(file_path, content)


def read_csv(file_path: Union[str, Path]) -> List[Dict[str, Any]]:
    """Read CSV file as list of dictionaries."""
    path = Path(file_path)
    with open(path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        return list(reader)


def write_csv(file_path: Union[str, Path], data: List[Dict[str, Any]]):
    """Write data to CSV file."""
    if not data:
        return
    
    path = Path(file_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=data[0].keys())
        writer.writeheader()
        writer.writerows(data)


def read_excel(file_path: Union[str, Path], sheet_name: str = None) -> pd.DataFrame:
    """Read Excel file."""
    return pd.read_excel(file_path, sheet_name=sheet_name)


def write_excel(file_path: Union[str, Path], data: pd.DataFrame, sheet_name: str = "Sheet1"):
    """Write DataFrame to Excel file."""
    path = Path(file_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    data.to_excel(path, sheet_name=sheet_name, index=False)


def ensure_directory(directory: Union[str, Path]):
    """Ensure directory exists."""
    Path(directory).mkdir(parents=True, exist_ok=True)


def get_timestamp(format_str: str = "%Y%m%d_%H%M%S") -> str:
    """Get current timestamp as string."""
    return datetime.now().strftime(format_str)


def get_file_size(file_path: Union[str, Path]) -> int:
    """Get file size in bytes."""
    return Path(file_path).stat().st_size


def get_file_modification_time(file_path: Union[str, Path]) -> datetime:
    """Get file modification time."""
    timestamp = Path(file_path).stat().st_mtime
    return datetime.fromtimestamp(timestamp)


class FileWatcher:
    """Simple file watcher utility."""
    
    def __init__(self, directory: Union[str, Path]):
        self.directory = Path(directory)
        self.last_check = {}
    
    def check_for_changes(self) -> List[Path]:
        """Check for file changes since last check."""
        changes = []
        
        if not self.directory.exists():
            return changes
        
        for file_path in self.directory.rglob("*"):
            if file_path.is_file():
                mtime = file_path.stat().st_mtime
                
                if str(file_path) not in self.last_check:
                    changes.append(file_path)
                elif self.last_check[str(file_path)] != mtime:
                    changes.append(file_path)
                
                self.last_check[str(file_path)] = mtime
        
        return changes


def retry_on_failure(max_retries: int = 3, delay: float = 1.0):
    """Decorator to retry function on failure."""
    def decorator(func):
        def wrapper(*args, **kwargs):
            for attempt in range(max_retries):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    if attempt == max_retries - 1:
                        raise e
                    
                    logger.warning(f"Attempt {attempt + 1} failed: {e}")
                    time.sleep(delay)
            
        return wrapper
    return decorator
`;

    this.writeFile(`src/${packageName}/utils/__init__.py`, utilsContent);

    if (this.includeWebInterface) {
      this.createWebInterface();
    }

    if (this.includeScheduler) {
      this.createScheduler();
    }
  }

  createWebInterface() {
    const packageName = this.getProjectNames().snake;
    
    // Web server
    const serverContent = `"""
Web interface for ${this.projectName} automation.
"""

from fastapi import FastAPI, Request, Form, BackgroundTasks
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, JSONResponse
import uvicorn

from ..tasks import TaskManager, TaskResult
from ..workflows import WorkflowManager, WorkflowResult
from ..config import settings

app = FastAPI(title="${this.projectName} Automation")

# Mount static files and templates
app.mount("/static", StaticFiles(directory="src/${packageName}/web/static"), name="static")
templates = Jinja2Templates(directory="src/${packageName}/web/templates")

# Initialize managers
task_manager = TaskManager()
workflow_manager = WorkflowManager()


@app.get("/", response_class=HTMLResponse)
async def dashboard(request: Request):
    """Main dashboard."""
    tasks = task_manager.list_tasks()
    workflows = workflow_manager.list_workflows()
    
    return templates.TemplateResponse("dashboard.html", {
        "request": request,
        "tasks": tasks,
        "workflows": workflows
    })


@app.get("/api/tasks", response_model=list)
async def api_list_tasks():
    """API endpoint to list tasks."""
    tasks = task_manager.list_tasks()
    return [{"name": t.name, "description": t.description} for t in tasks]


@app.post("/api/tasks/{task_name}/run")
async def api_run_task(task_name: str, background_tasks: BackgroundTasks):
    """API endpoint to run a task."""
    def run_task_bg():
        result = task_manager.run_task(task_name)
        # In a real app, you'd store this result somewhere
        
    background_tasks.add_task(run_task_bg)
    return {"message": f"Task {task_name} started"}


@app.get("/api/workflows", response_model=list)
async def api_list_workflows():
    """API endpoint to list workflows."""
    workflows = workflow_manager.list_workflows()
    return [{"name": w.name, "description": w.description} for w in workflows]


@app.post("/api/workflows/{workflow_name}/run")
async def api_run_workflow(workflow_name: str, background_tasks: BackgroundTasks):
    """API endpoint to run a workflow."""
    def run_workflow_bg():
        result = workflow_manager.run_workflow(workflow_name)
        # In a real app, you'd store this result somewhere
        
    background_tasks.add_task(run_workflow_bg)
    return {"message": f"Workflow {workflow_name} started"}


def main():
    """Start the web server."""
    uvicorn.run(
        "src.${packageName}.server:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=settings.debug
    )


if __name__ == "__main__":
    main()
`;

    this.writeFile(`src/${packageName}/server.py`, serverContent);

    // Dashboard template
    const dashboardTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this.projectName} Automation Dashboard</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        h1 {
            color: #333;
            margin-bottom: 30px;
        }
        .section {
            margin-bottom: 40px;
        }
        .section h2 {
            color: #555;
            border-bottom: 2px solid #e0e0e0;
            padding-bottom: 10px;
        }
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 20px;
        }
        .card {
            border: 1px solid #ddd;
            border-radius: 6px;
            padding: 15px;
            background: #fafafa;
        }
        .card h3 {
            margin-top: 0;
            color: #333;
        }
        .card p {
            color: #666;
            margin-bottom: 15px;
        }
        .btn {
            background: #007bff;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            text-decoration: none;
            display: inline-block;
        }
        .btn:hover {
            background: #0056b3;
        }
        .btn-success {
            background: #28a745;
        }
        .btn-success:hover {
            background: #1e7e34;
        }
        .status {
            padding: 20px;
            background: #e7f3ff;
            border-radius: 4px;
            margin-bottom: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>${this.projectName} Automation Dashboard</h1>
        
        <div class="status">
            <strong>System Status:</strong> Running | 
            <strong>Tasks Available:</strong> {{ tasks|length }} | 
            <strong>Workflows Available:</strong> {{ workflows|length }}
        </div>

        <div class="section">
            <h2>Available Tasks</h2>
            <div class="grid">
                {% for task in tasks %}
                <div class="card">
                    <h3>{{ task.name }}</h3>
                    <p>{{ task.description }}</p>
                    <button class="btn" onclick="runTask('{{ task.name }}')">Run Task</button>
                </div>
                {% endfor %}
            </div>
        </div>

        <div class="section">
            <h2>Available Workflows</h2>
            <div class="grid">
                {% for workflow in workflows %}
                <div class="card">
                    <h3>{{ workflow.name }}</h3>
                    <p>{{ workflow.description }}</p>
                    <button class="btn btn-success" onclick="runWorkflow('{{ workflow.name }}')">Run Workflow</button>
                </div>
                {% endfor %}
            </div>
        </div>
    </div>

    <script>
        async function runTask(taskName) {
            try {
                const response = await fetch(\`/api/tasks/\${taskName}/run\`, {
                    method: 'POST'
                });
                const result = await response.json();
                alert(result.message);
            } catch (error) {
                alert('Error running task: ' + error.message);
            }
        }

        async function runWorkflow(workflowName) {
            try {
                const response = await fetch(\`/api/workflows/\${workflowName}/run\`, {
                    method: 'POST'
                });
                const result = await response.json();
                alert(result.message);
            } catch (error) {
                alert('Error running workflow: ' + error.message);
            }
        }
    </script>
</body>
</html>
`;

    this.writeFile(`src/${packageName}/web/templates/dashboard.html`, dashboardTemplate);

    // Static CSS (placeholder)
    const staticCss = `/* Additional styles for ${this.projectName} */
.custom-styles {
    /* Add your custom styles here */
}
`;

    this.writeFile(`src/${packageName}/web/static/styles.css`, staticCss);
  }

  createScheduler() {
    const packageName = this.getProjectNames().snake;
    
    const schedulerContent = `"""
Task scheduler for ${this.projectName}.
"""

import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional

import schedule
from apscheduler.schedulers.blocking import BlockingScheduler
from apscheduler.triggers.cron import CronTrigger
from loguru import logger

from .tasks import TaskManager
from .workflows import WorkflowManager
from .config import settings


class TaskScheduler:
    """Scheduler for automating task and workflow execution."""
    
    def __init__(self):
        self.task_manager = TaskManager()
        self.workflow_manager = WorkflowManager()
        self.scheduler = BlockingScheduler()
        self._setup_default_schedules()
    
    def schedule_task(self, task_name: str, cron_expression: str, params: Dict = None):
        """Schedule a task with cron expression."""
        def job():
            logger.info(f"Running scheduled task: {task_name}")
            result = self.task_manager.run_task(task_name, params or {})
            if result.success:
                logger.info(f"Scheduled task '{task_name}' completed successfully")
            else:
                logger.error(f"Scheduled task '{task_name}' failed: {result.error}")
        
        trigger = CronTrigger.from_crontab(cron_expression)
        self.scheduler.add_job(job, trigger, id=f"task_{task_name}")
        logger.info(f"Scheduled task '{task_name}' with cron: {cron_expression}")
    
    def schedule_workflow(self, workflow_name: str, cron_expression: str):
        """Schedule a workflow with cron expression."""
        def job():
            logger.info(f"Running scheduled workflow: {workflow_name}")
            result = self.workflow_manager.run_workflow(workflow_name)
            if result.success:
                logger.info(f"Scheduled workflow '{workflow_name}' completed successfully")
            else:
                logger.error(f"Scheduled workflow '{workflow_name}' failed: {result.error}")
        
        trigger = CronTrigger.from_crontab(cron_expression)
        self.scheduler.add_job(job, trigger, id=f"workflow_{workflow_name}")
        logger.info(f"Scheduled workflow '{workflow_name}' with cron: {cron_expression}")
    
    def start(self):
        """Start the scheduler."""
        logger.info("Starting task scheduler")
        try:
            self.scheduler.start()
        except KeyboardInterrupt:
            logger.info("Scheduler stopped by user")
            self.scheduler.shutdown()
    
    def _setup_default_schedules(self):
        """Set up default scheduled tasks."""
        # Example: Run data backup daily at 2 AM
        self.schedule_task("data_backup", "0 2 * * *")
        
        # Example: Run maintenance workflow weekly on Sunday at 3 AM
        self.schedule_workflow("daily_maintenance", "0 3 * * 0")


def start_scheduler():
    """Start the task scheduler."""
    scheduler = TaskScheduler()
    scheduler.start()


# Simple schedule-based scheduler (alternative)
class SimpleScheduler:
    """Simple scheduler using the schedule library."""
    
    def __init__(self):
        self.task_manager = TaskManager()
        self.workflow_manager = WorkflowManager()
        self._setup_schedules()
    
    def _setup_schedules(self):
        """Set up scheduled tasks."""
        # Daily backup at 2 AM
        schedule.every().day.at("02:00").do(self._run_backup)
        
        # Weekly maintenance on Sunday at 3 AM
        schedule.every().sunday.at("03:00").do(self._run_maintenance)
        
        # Hourly health check
        schedule.every().hour.do(self._health_check)
    
    def _run_backup(self):
        """Run backup task."""
        logger.info("Running scheduled backup")
        result = self.task_manager.run_task("data_backup")
        return result.success
    
    def _run_maintenance(self):
        """Run maintenance workflow."""
        logger.info("Running scheduled maintenance")
        result = self.workflow_manager.run_workflow("daily_maintenance")
        return result.success
    
    def _health_check(self):
        """Simple health check."""
        logger.info("Health check - system running normally")
        return True
    
    def start(self):
        """Start the simple scheduler."""
        logger.info("Starting simple scheduler")
        
        while True:
            schedule.run_pending()
            time.sleep(60)  # Check every minute
`;

    this.writeFile(`src/${packageName}/scheduler.py`, schedulerContent);
  }

  createEssentialFiles() {
    const packageName = this.getProjectNames().snake;
    
    // README
    const readme = `# ${this.projectName}

A comprehensive Python automation framework for scripts, workflows, and scheduled tasks.

## Features

- **Task Management**: Define and execute individual automation tasks
- **Workflow Engine**: Chain tasks together into complex workflows
- **CLI Interface**: Command-line tools for running tasks and workflows
${this.includeScheduler ? '- **Scheduler**: Automated task scheduling with cron-like expressions\n' : ''}${this.includeWebInterface ? '- **Web Interface**: Browser-based dashboard for monitoring and control\n' : ''}- **Configuration Management**: Flexible configuration with environment variables
- **Logging**: Comprehensive logging with loguru
- **Data Processing**: Built-in support for CSV, JSON, Excel files

## Installation

### Using Poetry (Recommended)

\`\`\`bash
poetry install
\`\`\`

### Using pip

\`\`\`bash
pip install -r requirements.txt
\`\`\`

## Quick Start

### Running Tasks

\`\`\`bash
# List available tasks
${this.getProjectNames().kebab} list-tasks

# Run a specific task
${this.getProjectNames().kebab} run-task hello_world

# Run task with parameters
${this.getProjectNames().kebab} run-task file_processor -p input_dir=data/input -p output_dir=data/output
\`\`\`

### Running Workflows

\`\`\`bash
# List available workflows
${this.getProjectNames().kebab} list-workflows

# Run a workflow
${this.getProjectNames().kebab} run-workflow data_processing
\`\`\`

${this.includeScheduler ? `### Starting the Scheduler

\`\`\`bash
# Start the task scheduler
${this.getProjectNames().kebab} scheduler
\`\`\`
` : ''}

${this.includeWebInterface ? `### Web Interface

\`\`\`bash
# Start the web server
${this.getProjectNames().kebab}-server

# Access dashboard at http://localhost:8000
\`\`\`
` : ''}

## Configuration

Create a \`.env\` file in the project root:

\`\`\`env
DEBUG=false
LOG_LEVEL=INFO
DATA_DIR=data
LOGS_DIR=logs
MAX_RETRIES=3
RETRY_DELAY=5
TIMEOUT=300
${this.includeWebInterface ? `
# Web interface settings
API_HOST=localhost
API_PORT=8000` : ''}
\`\`\`

## Project Structure

\`\`\`
src/${packageName}/
├── __init__.py          # Package initialization
├── cli.py              # Command-line interface
├── config/             # Configuration management
├── tasks/              # Task definitions and management
├── workflows/          # Workflow definitions and execution
├── utils/              # Utility functions
${this.includeScheduler ? '├── scheduler.py        # Task scheduling\n' : ''}${this.includeWebInterface ? '├── server.py           # Web interface\n├── web/                # Web templates and static files\n' : ''}data/
├── input/              # Input files
├── output/             # Processed output files
└── temp/               # Temporary files
logs/                   # Application logs
scripts/                # Additional utility scripts
\`\`\`

## Creating Custom Tasks

Define new tasks by adding them to the TaskManager:

\`\`\`python
from ${packageName}.tasks import TaskManager, Task

def my_custom_task(param1: str, param2: int = 10) -> dict:
    # Your task logic here
    return {"result": f"Processed {param1} with {param2}"}

task_manager = TaskManager()
task_manager.register_task(Task(
    name="my_custom_task",
    description="Description of what this task does",
    function=my_custom_task
))
\`\`\`

## Creating Custom Workflows

Define workflows by specifying a sequence of tasks:

\`\`\`python
from ${packageName}.workflows import WorkflowManager, Workflow, WorkflowStep

workflow = Workflow(
    name="my_workflow",
    description="Custom workflow description",
    steps=[
        WorkflowStep(
            task_name="task1",
            params={"param": "value"}
        ),
        WorkflowStep(
            task_name="task2",
            depends_on=["task1"]
        )
    ]
)

workflow_manager = WorkflowManager()
workflow_manager.register_workflow(workflow)
\`\`\`

## Built-in Tasks

- **hello_world**: Simple greeting task for testing
- **file_processor**: Process files from input to output directory
- **data_backup**: Create timestamped backups of data directories

## Built-in Workflows

- **data_processing**: Complete data processing pipeline
- **daily_maintenance**: Daily maintenance tasks including backups

## Development

### Running Tests

\`\`\`bash
pytest
\`\`\`

### Code Formatting

\`\`\`bash
black src/ tests/
isort src/ tests/
\`\`\`

### Type Checking

\`\`\`bash
mypy src/
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
`;

    this.writeFile('README.md', readme);

    // Configuration files
    const configYaml = `# ${this.projectName} Configuration

# Application settings
app_name: "${this.projectName}"
debug: false
log_level: "INFO"

# Directories
data_dir: "data"
logs_dir: "logs"
temp_dir: "data/temp"

# Task settings
max_retries: 3
retry_delay: 5
timeout: 300

${this.includeWebInterface ? `# API settings
api_host: "localhost"
api_port: 8000
` : ''}

# Custom settings
# Add your application-specific settings here
`;

    this.writeFile('config.yaml', configYaml);

    // Environment template
    const envExample = `# Environment Configuration for ${this.projectName}

# Debug mode
DEBUG=false

# Logging
LOG_LEVEL=INFO

# Directories
DATA_DIR=data
LOGS_DIR=logs
TEMP_DIR=data/temp

# Task execution
MAX_RETRIES=3
RETRY_DELAY=5
TIMEOUT=300

${this.includeWebInterface ? `# Web interface
API_HOST=localhost
API_PORT=8000
` : ''}

# Database (if needed)
# DATABASE_URL=sqlite:///app.db

# External APIs
# API_KEY=your-api-key-here
# API_BASE_URL=https://api.example.com
`;

    this.writeFile('.env.example', envExample);

    // Sample data
    const sampleData = `name,value,category
Sample 1,100,A
Sample 2,200,B
Sample 3,150,A
Sample 4,300,C
`;

    this.writeFile('data/input/sample.csv', sampleData);

    // Script examples
    const runScript = `#!/bin/bash
# Run ${this.projectName} automation

echo "Starting ${this.projectName} automation..."

# Activate virtual environment if using venv
# source venv/bin/activate

# Run with Poetry
poetry run ${this.getProjectNames().kebab} "$@"

# Or run with pip
# python -m ${packageName}.cli "$@"
`;

    this.writeFile('scripts/run.sh', runScript);

    // Make script executable
    this.writeFile('scripts/run.bat', `@echo off
REM Run ${this.projectName} automation on Windows

echo Starting ${this.projectName} automation...

REM Run with Poetry
poetry run ${this.getProjectNames().kebab} %*

REM Or run with pip
REM python -m ${packageName}.cli %*
`);
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
      steps.push('poetry run ' + this.getProjectNames().kebab + ' list-tasks');
    } else {
      steps.push('pip install -r requirements.txt');
      steps.push('python -m ' + this.getProjectNames().snake + '.cli list-tasks');
    }
    
    steps.push('Edit config.yaml or .env to customize settings');
    
    if (this.includeWebInterface) {
      steps.push('Start web interface: ' + this.getProjectNames().kebab + '-server');
    }
    
    if (this.includeScheduler) {
      steps.push('Start scheduler: ' + this.getProjectNames().kebab + ' scheduler');
    }
    
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

# Virtual environments
.env
.venv
env/
venv/
ENV/
env.bak/
venv.bak/

# Poetry
poetry.lock

# Data and logs
data/temp/
logs/
*.log

# Configuration
config.json
.env.local

# IDEs
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Temporary files
*.tmp
*.temp
.cache/
`;
  }
}