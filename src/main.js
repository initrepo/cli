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
import colors from 'picocolors';

import { getRelevantFiles, readFiles } from './file-handler.js';
import { generateTechStack } from './generators/generate-tech-stack.js';
import { generateProjectStructure } from './generators/generate-project-structure.js';
import { generateFullCodebase } from './generators/generate-full-codebase.js';

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
    .description('Extract and analyze codebase context for AI consumption')
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
        console.error(colors.red('Error:'), error.message);
        process.exit(1);
      }
    });

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
    console.log(colors.yellow('Warning:'), '.initrepoignore already exists in the current directory');
    return;
  }
  
  try {
    copyFileSync(templatePath, targetPath);
    console.log(colors.green('✓'), 'Created .initrepoignore in the current directory');
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
  
  console.log(colors.blue('🔍 InitRepo CLI - Starting codebase analysis...'));
  console.log(colors.dim(`Working directory: ${workingDir}`));
  console.log();
  
  // Create output directory
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
    console.log(colors.green('✓'), 'Created output directory:', colors.dim('.initrepo/'));
  }
  
  // Step 1: Get relevant files
  console.log(colors.cyan('📁 Scanning files...'));
  const filePaths = await getRelevantFiles(workingDir);
  console.log(colors.green('✓'), `Found ${filePaths.length} relevant files`);
  
  // Step 2: Read file contents
  console.log(colors.cyan('📖 Reading file contents...'));
  const fileContents = await readFiles(filePaths);
  console.log(colors.green('✓'), `Read ${fileContents.length} files successfully`);
  
  // Step 3: Generate tech stack summary
  console.log(colors.cyan('🔧 Generating tech stack summary...'));
  await generateTechStack(workingDir, outputDir);
  console.log(colors.green('✓'), 'Generated tech-stack.md');
  
  // Step 4: Generate project structure
  console.log(colors.cyan('🌳 Generating project structure...'));
  await generateProjectStructure(filePaths, outputDir);
  console.log(colors.green('✓'), 'Generated project-structure.md');
  
  // Step 5: Generate full codebase XML
  console.log(colors.cyan('📄 Generating codebase XML...'));
  await generateFullCodebase(fileContents, outputDir);
  console.log(colors.green('✓'), 'Generated full-codebase.xml');
  
  const duration = Date.now() - startTime;
  console.log();
  console.log(colors.green('🎉 Analysis complete!'));
  console.log(colors.dim(`Total time: ${duration}ms`));
  console.log(colors.dim(`Output saved to: ${outputDir}`));
  console.log();
  console.log('Generated files:');
  console.log(colors.dim('  • tech-stack.md - Dependencies and scripts summary'));
  console.log(colors.dim('  • project-structure.md - File tree visualization'));
  console.log(colors.dim('  • full-codebase.xml - Complete source code export'));
}