/**
 * Safe Rename Command
 * 
 * Safely renames symbols (functions, classes, variables) across multiple files
 * using AST-based analysis to ensure accuracy and prevent breaking changes.
 */

import { Command } from 'commander';
import { renameSymbol, validateRename } from '../modifiers/rename-modifier.js';
import { getRelevantFiles } from '../file-handler.js';
import picocolors from 'picocolors';

/**
 * Configures the safe-rename command
 * 
 * @param {Command} program - Commander program instance
 */
export function configureSafeRenameCommand(program) {
  const renameCommand = new Command('safe-rename')
    .description('Safely rename symbols across multiple files using AST analysis')
    .argument('<old-name>', 'Current symbol name to rename')
    .argument('<new-name>', 'New symbol name')
    .option('-t, --type <type>', 'Filter by symbol type (function, class, variable, etc.)')
    .option('--dry-run', 'Preview changes without modifying files')
    .option('--exact', 'Use exact matching only (default: true)', true)
    .option('--scope <scope>', 'Rename scope (file, directory, all)', 'all')
    .option('-f, --format <format>', 'Output format (json, text)', 'text')
    .option('--include <patterns...>', 'Include file patterns')
    .option('--exclude <patterns...>', 'Exclude file patterns')
    .action(async (oldName, newName, options) => {
      await handleSafeRenameCommand(oldName, newName, options);
    });

  program.addCommand(renameCommand);
}

/**
 * Handles the safe-rename command execution
 * 
 * @param {string} oldName - Current symbol name
 * @param {string} newName - New symbol name  
 * @param {Object} options - Command options
 */
async function handleSafeRenameCommand(oldName, newName, options) {
  try {
    // Validate rename operation
    const validation = validateRename(oldName, newName);
    if (!validation.valid) {
      if (options.format === 'json') {
        console.log(JSON.stringify({
          success: false,
          error: 'Validation failed',
          details: validation.errors
        }, null, 2));
      } else {
        console.error(picocolors.red('✗ Validation failed:'));
        validation.errors.forEach(error => {
          console.error(picocolors.red(`  • ${error}`));
        });
      }
      process.exit(1);
    }

    // Get relevant file paths
    const filePaths = await getRelevantFiles(process.cwd());

    if (filePaths.length === 0) {
      if (options.format === 'json') {
        console.log(JSON.stringify({
          success: false,
          error: 'No files found to process'
        }, null, 2));
      } else {
        console.log(picocolors.yellow('No files found to process'));
      }
      return;
    }

    // Show operation preview
    if (options.format !== 'json') {
      console.log(picocolors.blue(`🔄 Renaming '${oldName}' to '${newName}'`));
      console.log(picocolors.gray(`   Scope: ${options.scope}`));
      console.log(picocolors.gray(`   Files: ${filePaths.length}`));
      console.log(picocolors.gray(`   Mode: ${options.dryRun ? 'DRY RUN' : 'LIVE'}`));
      console.log();
    }

    // Perform rename operation
    const result = await renameSymbol(filePaths, oldName, newName, {
      symbolType: options.type,
      dryRun: options.dryRun,
      exact: options.exact,
      scope: options.scope
    });

    // Output results
    if (options.format === 'json') {
      console.log(JSON.stringify({
        ...result,
        operation: {
          oldName,
          newName,
          scope: options.scope,
          dryRun: options.dryRun,
          type: options.type,
          exact: options.exact
        }
      }, null, 2));
    } else {
      await displayRenameResults(result, oldName, newName, options);
    }

    // Exit with error code if operation failed
    if (!result.success) {
      process.exit(1);
    }

  } catch (error) {
    if (options.format === 'json') {
      console.log(JSON.stringify({
        success: false,
        error: error.message
      }, null, 2));
    } else {
      console.error(picocolors.red(`✗ Error: ${error.message}`));
    }
    process.exit(1);
  }
}

/**
 * Displays rename operation results in text format
 * 
 * @param {Object} result - Rename operation result
 * @param {string} oldName - Old symbol name
 * @param {string} newName - New symbol name
 * @param {Object} options - Command options
 */
async function displayRenameResults(result, oldName, newName, options) {
  if (!result.success) {
    console.log(picocolors.red('✗ Rename operation failed'));
    
    if (result.error) {
      console.log(picocolors.red(`  Error: ${result.error}`));
    }

    if (result.errors?.length > 0) {
      console.log(picocolors.red(`  ${result.errors.length} file(s) had errors:`));
      result.errors.forEach(error => {
        console.log(picocolors.red(`    • ${error.file}: ${error.error}`));
      });
    }
    return;
  }

  console.log(picocolors.green('✓ Rename operation completed successfully'));
  console.log();

  // Summary
  console.log(picocolors.bold('Summary:'));
  console.log(`  Files modified: ${picocolors.cyan(result.filesModified)}`);
  console.log(`  Total renames: ${picocolors.cyan(result.occurrencesRenamed)}`);
  
  if (options.dryRun) {
    console.log(picocolors.yellow('  Mode: DRY RUN (no files were modified)'));
  }
  console.log();

  // Show changes for each file
  if (result.changes?.length > 0) {
    console.log(picocolors.bold('Changes:'));
    
    for (const change of result.changes.slice(0, 10)) { // Limit output
      console.log(`  ${picocolors.blue(change.file)}`);
      console.log(`    Renames: ${picocolors.green(change.occurrencesRenamed)}`);
      
      if (change.preview && change.preview.changes?.length > 0) {
        console.log('    Preview:');
        change.preview.changes.slice(0, 3).forEach(lineChange => {
          console.log(picocolors.red(`      - ${lineChange.original.trim()}`));
          console.log(picocolors.green(`      + ${lineChange.modified.trim()}`));
        });
        
        if (change.preview.changes.length > 3) {
          console.log(picocolors.gray(`      ... and ${change.preview.changes.length - 3} more changes`));
        }
      }
      console.log();
    }

    if (result.changes.length > 10) {
      console.log(picocolors.gray(`... and ${result.changes.length - 10} more files`));
      console.log();
    }
  }

  // Show errors if any
  if (result.errors?.length > 0) {
    console.log(picocolors.yellow(`⚠ ${result.errors.length} file(s) had warnings/errors:`));
    result.errors.forEach(error => {
      console.log(picocolors.yellow(`  • ${error.file}: ${error.error}`));
    });
    console.log();
  }

  // Recommendations
  if (!options.dryRun && result.filesModified > 0) {
    console.log(picocolors.bold('Recommendations:'));
    console.log('  • Run your tests to ensure no functionality was broken');
    console.log('  • Check imports/exports that might reference the old symbol');
    console.log('  • Review any comments or documentation that mention the old name');
    
    if (result.filesModified > 5) {
      console.log('  • Consider committing these changes in a single atomic commit');
    }
  }
}

export default configureSafeRenameCommand;