/**
 * Scaffold Command Handler
 * 
 * This module handles the scaffold command for creating organized project structures.
 * It supports reading from technical_architecture.md files or using predefined templates.
 */

import { existsSync, mkdirSync } from 'fs';
import { join, resolve } from 'path';
import colors from 'picocolors';
import { Command } from 'commander';

import { parseArchitectureFile } from '../parsers/architecture-parser.js';
import { NextJSScaffolder } from '../scaffolders/nextjs-scaffolder.js';
import { ReactScaffolder } from '../scaffolders/react-scaffolder.js';
import { ReactNativeScaffolder } from '../scaffolders/react-native-scaffolder.js';
import { PythonMCPScaffolder } from '../scaffolders/python-mcp-scaffolder.js';
import { PythonAutomationScaffolder } from '../scaffolders/python-automation-scaffolder.js';

/**
 * Supported project types and their corresponding scaffolders
 */
const SCAFFOLDERS = {
  'nextjs': NextJSScaffolder,
  'react': ReactScaffolder,
  'react-native': ReactNativeScaffolder,
  'python-mcp': PythonMCPScaffolder,
  'python-automation': PythonAutomationScaffolder
};

/**
 * Configures the scaffold command for the CLI
 * 
 * @param {Command} program - Commander.js program instance
 */
export function configureScaffoldCommand(program) {
  program
    .command('scaffold')
    .description('Create a new project with organized structure')
    .argument('<type>', `Project type: ${Object.keys(SCAFFOLDERS).join(', ')}`)
    .argument('<name>', 'Project name')
    .option('-a, --architecture <file>', 'Path to technical_architecture.md file')
    .option('-d, --directory <dir>', 'Target directory (defaults to project name)')
    .option('--no-install', 'Skip dependency installation')
    .option('--no-git', 'Skip git initialization')
    .option('-t, --template <template>', 'Use specific template variant')
    .action(async (type, name, options) => {
      try {
        await handleScaffoldCommand(type, name, options);
      } catch (error) {
        console.error(colors.red('Scaffold Error:'), error.message);
        process.exit(1);
      }
    });
}

/**
 * Handles the scaffold command execution
 * 
 * @param {string} type - Project type
 * @param {string} name - Project name
 * @param {Object} options - Command options
 */
export async function handleScaffoldCommand(type, name, options) {
  const startTime = Date.now();
  
  // Validate project type
  if (!SCAFFOLDERS[type]) {
    throw new Error(`Unsupported project type: ${type}. Supported types: ${Object.keys(SCAFFOLDERS).join(', ')}`);
  }
  
  // Determine target directory
  const targetDir = options.directory ? resolve(options.directory) : resolve(name);
  
  console.log(colors.blue('🏗️  InitRepo Scaffolder'));
  console.log(colors.dim(`Creating ${type} project: ${colors.bold(name)}`));
  console.log(colors.dim(`Target directory: ${targetDir}`));
  console.log();
  
  // Check if target directory exists
  if (existsSync(targetDir)) {
    throw new Error(`Directory already exists: ${targetDir}`);
  }
  
  // Create target directory
  mkdirSync(targetDir, { recursive: true });
  console.log(colors.green('✓'), 'Created project directory');
  
  // Check for architecture file
  let architectureData = null;
  const archFile = options.architecture || 'technical_architecture.md';
  const archPath = resolve(archFile);
  
  if (existsSync(archPath)) {
    console.log(colors.cyan('📋 Reading architecture file...'));
    try {
      architectureData = await parseArchitectureFile(archPath);
      console.log(colors.green('✓'), 'Parsed architecture file successfully');
    } catch (error) {
      console.warn(colors.yellow('⚠️'), `Could not parse architecture file: ${error.message}`);
      console.log(colors.dim('   Using default template instead'));
    }
  }
  
  // Initialize scaffolder
  const ScaffolderClass = SCAFFOLDERS[type];
  const scaffolder = new ScaffolderClass({
    projectName: name,
    targetDirectory: targetDir,
    architecture: architectureData,
    template: options.template,
    installDeps: options.install !== false,
    initGit: options.git !== false
  });
  
  // Execute scaffolding
  console.log(colors.cyan('🔨 Scaffolding project structure...'));
  await scaffolder.scaffold();
  console.log(colors.green('✓'), 'Project structure created');
  
  // Install dependencies if requested
  if (options.install !== false && scaffolder.supportsDependencyInstallation()) {
    console.log(colors.cyan('📦 Installing dependencies...'));
    await scaffolder.installDependencies();
    console.log(colors.green('✓'), 'Dependencies installed');
  }
  
  // Initialize git if requested
  if (options.git !== false) {
    console.log(colors.cyan('🔧 Initializing git repository...'));
    await scaffolder.initializeGit();
    console.log(colors.green('✓'), 'Git repository initialized');
  }
  
  const duration = Date.now() - startTime;
  console.log();
  console.log(colors.green('🎉 Project scaffolded successfully!'));
  console.log(colors.dim(`Total time: ${duration}ms`));
  console.log();
  console.log('Next steps:');
  console.log(colors.dim(`  cd ${name}`));
  
  // Show type-specific next steps
  const nextSteps = scaffolder.getNextSteps();
  nextSteps.forEach(step => {
    console.log(colors.dim(`  ${step}`));
  });
}

/**
 * Validates project name
 * 
 * @param {string} name - Project name to validate
 * @returns {boolean} True if valid
 */
export function validateProjectName(name) {
  const validNameRegex = /^[a-zA-Z0-9-_]+$/;
  return validNameRegex.test(name) && name.length > 0 && name.length <= 50;
}

/**
 * Sanitizes project name for use in file paths and package names
 * 
 * @param {string} name - Raw project name
 * @returns {string} Sanitized name
 */
export function sanitizeProjectName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-zA-Z0-9-_]/g, '-')
    .replace(/--+/g, '-')
    .replace(/^-|-$/g, '');
}