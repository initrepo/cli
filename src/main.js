/**
 * Main Application Logic for InitRepo CLI
 * 
 * This module handles the core CLI functionality, command parsing,
 * and orchestrates the different commands for codebase analysis and AI interaction.
 */

import { Command } from 'commander';
import { existsSync, copyFileSync } from 'fs';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import * as ui from './ui-handler.js';
import { handleAnalyzeCommand } from './commands/analyze.js';
import { configureScaffoldCommand } from './commands/scaffold.js';
import { configureDepsCommand } from './commands/deps.js';
import { configureFindSymbolCommand } from './commands/find-symbol.js';
import { configureGetCodeCommand } from './commands/get-code.js';
import { configureTasksCommand } from './commands/tasks.js';
import { configureAnalyzeImportsCommand } from './commands/analyze-imports.js';
import { configureFindReferencesCommand } from './commands/find-references.js';
import { configureAnalyzeComplexityCommand } from './commands/analyze-complexity.js';
import { configureSafeRenameCommand } from './commands/safe-rename.js';
import { configureManageImportsCommand } from './commands/manage-imports.js';
import { configureApplyTemplateCommand } from './commands/apply-template.js';
import { configureGenerateStructureCommand } from './commands/generate-structure.js';
import { configureValidateStructureCommand } from './commands/validate-structure.js';
import { configureSuggestRefactorCommand } from './commands/suggest-refactor.js';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Main function that sets up and runs the CLI application
 */
export async function main() {
  const program = new Command();
  
  // Configure the main command (analyze)
  program
    .name('initrepo')
    .description('AI-enhanced codebase analysis and project management CLI tool')
    .version('2.0.0')
    .option('--init', 'Create a default .initrepoignore file in the current directory')
    .action(async (options) => {
      try {
        if (options.init) {
          await handleInitCommand();
        } else {
          await handleAnalyzeCommand();
        }
      } catch (error) {
        ui.displayError(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  // Configure analyze command (explicit)
  program
    .command('analyze')
    .alias('a')
    .description('Analyze codebase and generate documentation')
    .action(async () => {
      try {
        await handleAnalyzeCommand();
      } catch (error) {
        ui.displayError(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  // Configure AI-enhanced commands
  configureDepsCommand(program);
  configureFindSymbolCommand(program);
  configureGetCodeCommand(program);
  configureTasksCommand(program);

  // Configure Phase 1: Advanced Code Analysis commands
  configureAnalyzeImportsCommand(program);
  configureFindReferencesCommand(program);
  configureAnalyzeComplexityCommand(program);

  // Configure Phase 2: Safe Code Modifications commands
  configureSafeRenameCommand(program);
  configureManageImportsCommand(program);
  configureApplyTemplateCommand(program);

  // Configure Phase 3: Project Structure Management commands
  configureGenerateStructureCommand(program);
  configureValidateStructureCommand(program);
  configureSuggestRefactorCommand(program);

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