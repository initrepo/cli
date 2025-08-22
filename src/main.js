/**
 * Main Application Logic for InitRepo CLI
 * 
 * This module handles the core CLI functionality, command parsing,
 * and orchestrates the different generators to create output files.
 */

import { Command } from 'commander';
import { existsSync, mkdirSync, copyFileSync } from 'fs';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import * as ui from './ui-handler.js';
import { getRelevantFiles, readFiles } from './file-handler.js';
import { generateTechStack } from './generators/generate-tech-stack.js';
import { generateProjectStructure } from './generators/generate-project-structure.js';
import { generateFullCodebase } from './generators/generate-full-codebase.js';
import { configureScaffoldCommand } from './commands/scaffold.js';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Main function that sets up and runs the CLI application
 */
export async function main() {
  const program = new Command();
  
  // Configure the main command
  program
    .name('initrepo')
    .description('Extract and analyze codebase context for AI consumption, and scaffold new projects')
    .version('1.0.0')
    .option('--init', 'Create a default .initrepoignore file in the current directory')
    .action(async (options) => {
      try {
        if (options.init) {
          await handleInitCommand();
        } else {
          await handleExtractCommand();
        }
      } catch (error) {
        ui.displayError(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  // Configure scaffold command
  configureScaffoldCommand(program);

  // Parse command line arguments
  program.parse();
}

/**
 * Handles the --init command to create a default .initrepoignore file
 */
async function handleInitCommand() {
  const targetPath = resolve(process.cwd(), '.initrepoignore');
  const templatePath = join(__dirname, 'templates', 'initrepoignore.default');
  
  if (existsSync(targetPath)) {
    ui.displayWarning('.initrepoignore already exists in the current directory');
    return;
  }
  
  try {
    copyFileSync(templatePath, targetPath);
    ui.displaySuccess('Created .initrepoignore in the current directory');
  } catch (error) {
    throw new Error(`Failed to create .initrepoignore: ${error.message}`);
  }
}

/**
 * Handles the main extract command to analyze the codebase
 */
async function handleExtractCommand() {
  const startTime = Date.now();
  const workingDir = process.cwd();
  const outputDir = join(workingDir, '.initrepo');
  
  ui.displayHeader();
  ui.displayInfo('Starting codebase analysis...');
  ui.displayWorkingDir(workingDir);
  
  // Create output directory
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
    ui.displaySuccess('Created output directory: .initrepo/');
  }
  
  // Step 1: Get relevant files
  const scanSpinner = ui.createSpinner('Scanning files...');
  scanSpinner.start();
  const filePaths = await getRelevantFiles(workingDir);
  scanSpinner.succeed(`Found ${filePaths.length} relevant files`);
  
  // Step 2: Read file contents
  const readSpinner = ui.createSpinner('Reading file contents...');
  readSpinner.start();
  const fileContents = await readFiles(filePaths);
  readSpinner.succeed(`Read ${fileContents.length} files successfully`);
  
  // Step 3: Generate tech stack summary
  const techStackSpinner = ui.createSpinner('Generating tech stack summary...');
  techStackSpinner.start();
  await generateTechStack(workingDir, outputDir);
  techStackSpinner.succeed('Generated tech-stack.md');
  
  // Step 4: Generate project structure
  const structureSpinner = ui.createSpinner('Generating project structure...');
  structureSpinner.start();
  await generateProjectStructure(filePaths, outputDir);
  structureSpinner.succeed('Generated project-structure.md');
  
  // Step 5: Generate full codebase XML
  const codebaseSpinner = ui.createSpinner('Generating codebase XML...');
  codebaseSpinner.start();
  await generateFullCodebase(fileContents, outputDir);
  codebaseSpinner.succeed('Generated full-codebase.xml');
  
  const duration = Date.now() - startTime;
  
  ui.displayCompletion('Analysis complete!');
  ui.displayTiming(duration);
  ui.displayOutputDir(outputDir);
  
  const generatedFiles = [
    'tech-stack.md - Dependencies and scripts summary',
    'project-structure.md - File tree visualization',
    'full-codebase.xml - Complete source code export'
  ];
  ui.displayGeneratedFiles(generatedFiles);
}