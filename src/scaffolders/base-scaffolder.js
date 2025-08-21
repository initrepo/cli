/**
 * Base Scaffolder
 * 
 * Abstract base class for all project scaffolders.
 * Provides common functionality and interface definition.
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { execSync } from 'child_process';
import colors from 'picocolors';

export class BaseScaffolder {
  constructor(options) {
    this.projectName = options.projectName;
    this.targetDirectory = options.targetDirectory;
    this.architecture = options.architecture;
    this.template = options.template;
    this.installDeps = options.installDeps !== false;
    this.initGit = options.initGit !== false;
  }

  /**
   * Main scaffolding method - must be implemented by subclasses
   */
  async scaffold() {
    throw new Error('scaffold() method must be implemented by subclass');
  }

  /**
   * Get next steps for the user - should be overridden by subclasses
   */
  getNextSteps() {
    return [
      'npm install',
      'npm run dev'
    ];
  }

  /**
   * Check if this scaffolder supports dependency installation
   */
  supportsDependencyInstallation() {
    return false;
  }

  /**
   * Install dependencies - should be overridden by subclasses that support it
   */
  async installDependencies() {
    throw new Error('installDependencies() not supported by this scaffolder');
  }

  /**
   * Initialize git repository
   */
  async initializeGit() {
    try {
      process.chdir(this.targetDirectory);
      
      execSync('git init', { stdio: 'pipe' });
      
      // Create .gitignore if it doesn't exist
      const gitignorePath = join(this.targetDirectory, '.gitignore');
      if (!existsSync(gitignorePath)) {
        this.writeFile('.gitignore', this.getDefaultGitignore());
      }
      
      execSync('git add .', { stdio: 'pipe' });
      execSync('git commit -m "Initial commit from initrepo scaffold"', { stdio: 'pipe' });
      
    } catch (error) {
      console.warn(colors.yellow('⚠️'), 'Could not initialize git repository:', error.message);
    }
  }

  /**
   * Get default .gitignore content - should be overridden by subclasses
   */
  getDefaultGitignore() {
    return `# Dependencies
node_modules/
.pnp
.pnp.js

# Testing
/coverage

# Production
/build
/dist

# Environment variables
.env.local
.env.development.local
.env.test.local
.env.production.local

# Logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db
`;
  }

  /**
   * Create a directory if it doesn't exist
   */
  createDirectory(relativePath) {
    const fullPath = join(this.targetDirectory, relativePath);
    if (!existsSync(fullPath)) {
      mkdirSync(fullPath, { recursive: true });
    }
  }

  /**
   * Write a file with content
   */
  writeFile(relativePath, content) {
    const fullPath = join(this.targetDirectory, relativePath);
    const dir = dirname(fullPath);
    
    // Ensure directory exists
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    
    writeFileSync(fullPath, content, 'utf-8');
  }

  /**
   * Get project name in various formats
   */
  getProjectNames() {
    return {
      original: this.projectName,
      kebab: this.projectName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      camel: this.projectName.replace(/[^a-zA-Z0-9]/g, '').replace(/^./, str => str.toLowerCase()),
      pascal: this.projectName.replace(/[^a-zA-Z0-9]/g, '').replace(/^./, str => str.toUpperCase()),
      snake: this.projectName.toLowerCase().replace(/[^a-z0-9]/g, '_')
    };
  }

  /**
   * Replace template variables in content
   */
  replaceTemplateVariables(content) {
    const names = this.getProjectNames();
    
    return content
      .replace(/{{PROJECT_NAME}}/g, names.original)
      .replace(/{{PROJECT_NAME_KEBAB}}/g, names.kebab)
      .replace(/{{PROJECT_NAME_CAMEL}}/g, names.camel)
      .replace(/{{PROJECT_NAME_PASCAL}}/g, names.pascal)
      .replace(/{{PROJECT_NAME_SNAKE}}/g, names.snake)
      .replace(/{{CURRENT_YEAR}}/g, new Date().getFullYear().toString())
      .replace(/{{CURRENT_DATE}}/g, new Date().toISOString().split('T')[0]);
  }

  /**
   * Create standard project structure from architecture or default
   */
  createStructureFromArchitecture() {
    if (!this.architecture || !this.architecture.structure) {
      return this.createDefaultStructure();
    }

    const { directories, files } = this.architecture.structure;

    // Create directories
    directories.forEach(dir => {
      this.createDirectory(dir);
    });

    // Create placeholder files or use templates
    files.forEach(file => {
      const content = this.getFileTemplate(file);
      this.writeFile(file, content);
    });
  }

  /**
   * Create default structure - should be overridden by subclasses
   */
  createDefaultStructure() {
    throw new Error('createDefaultStructure() must be implemented by subclass');
  }

  /**
   * Get template content for a file - should be overridden by subclasses
   */
  getFileTemplate(filePath) {
    return `// ${filePath}\n// Generated by initrepo scaffold\n`;
  }

  /**
   * Log progress message
   */
  log(message, type = 'info') {
    const colors_map = {
      info: colors.blue,
      success: colors.green,
      warning: colors.yellow,
      error: colors.red
    };
    
    const colorFn = colors_map[type] || colors.blue;
    console.log(colorFn(`  ${message}`));
  }
}