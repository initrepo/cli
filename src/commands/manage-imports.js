/**
 * Manage Imports Command
 * 
 * Manages import statements in JavaScript/TypeScript files:
 * - Add new imports
 * - Remove unused imports  
 * - Organize import statements
 * - Update import paths
 */

import { Command } from 'commander';
import { manageImports, validateImportOperations } from '../modifiers/import-modifier.js';
import { getRelevantFiles } from '../file-handler.js';
import picocolors from 'picocolors';

/**
 * Configures the manage-imports command
 * 
 * @param {Command} program - Commander program instance
 */
export function configureManageImportsCommand(program) {
  const importsCommand = new Command('manage-imports')
    .description('Manage import statements in JavaScript/TypeScript files')
    .option('--add <imports...>', 'Add imports (format: "source:specifier1,specifier2" or "source" for default)')
    .option('--remove <imports...>', 'Remove imports (format: "source:specifier1,specifier2" or "source" for all)')
    .option('--update <updates...>', 'Update import paths (format: "oldSource->newSource")')
    .option('--remove-unused', 'Remove unused imports automatically')
    .option('--organize', 'Organize imports (group and sort)')
    .option('--dry-run', 'Preview changes without modifying files')
    .option('-f, --format <format>', 'Output format (json, text)', 'text')
    .option('--include <patterns...>', 'Include file patterns (default: JS/TS files)')
    .option('--exclude <patterns...>', 'Exclude file patterns')
    .action(async (options) => {
      await handleManageImportsCommand(options);
    });

  program.addCommand(importsCommand);
}

/**
 * Handles the manage-imports command execution
 * 
 * @param {Object} options - Command options
 */
async function handleManageImportsCommand(options) {
  try {
    // Parse operations from command line options
    const operations = parseImportOperations(options);

    // Validate operations
    const validation = validateImportOperations(operations);
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

    // Check if any operations were specified
    const hasOperations = Object.keys(operations).some(key => 
      operations[key] && operations[key].length > 0
    ) || options.removeUnused || options.organize;

    if (!hasOperations) {
      if (options.format === 'json') {
        console.log(JSON.stringify({
          success: false,
          error: 'No operations specified'
        }, null, 2));
      } else {
        console.error(picocolors.red('✗ No operations specified'));
        console.log('Use --add, --remove, --update, --remove-unused, or --organize');
      }
      process.exit(1);
    }

    // Default to JS/TS files if no include patterns specified
    const defaultIncludes = options.include || ['**/*.js', '**/*.jsx', '**/*.ts', '**/*.tsx'];

    // Get relevant file paths (filtered to JS/TS files)
    const allFiles = await getRelevantFiles(process.cwd());
    const filePaths = allFiles.filter(file => 
      /\.(js|jsx|ts|tsx)$/.test(file)
    );

    if (filePaths.length === 0) {
      if (options.format === 'json') {
        console.log(JSON.stringify({
          success: false,
          error: 'No JavaScript/TypeScript files found to process'
        }, null, 2));
      } else {
        console.log(picocolors.yellow('No JavaScript/TypeScript files found to process'));
      }
      return;
    }

    // Show operation preview
    if (options.format !== 'json') {
      console.log(picocolors.blue('📦 Managing imports'));
      console.log(picocolors.gray(`   Files: ${filePaths.length}`));
      console.log(picocolors.gray(`   Mode: ${options.dryRun ? 'DRY RUN' : 'LIVE'}`));
      
      if (operations.add?.length > 0) {
        console.log(picocolors.gray(`   Add: ${operations.add.length} imports`));
      }
      if (operations.remove?.length > 0) {
        console.log(picocolors.gray(`   Remove: ${operations.remove.length} imports`));
      }
      if (operations.update?.length > 0) {
        console.log(picocolors.gray(`   Update: ${operations.update.length} imports`));
      }
      if (options.removeUnused) {
        console.log(picocolors.gray(`   Remove unused: enabled`));
      }
      if (options.organize) {
        console.log(picocolors.gray(`   Organize: enabled`));
      }
      console.log();
    }

    // Perform import management
    const result = await manageImports(filePaths, operations, {
      dryRun: options.dryRun,
      organize: options.organize,
      removeUnused: options.removeUnused,
      addMissing: false
    });

    // Output results
    if (options.format === 'json') {
      console.log(JSON.stringify({
        ...result,
        operation: {
          operations,
          dryRun: options.dryRun,
          organize: options.organize,
          removeUnused: options.removeUnused
        }
      }, null, 2));
    } else {
      await displayImportResults(result, options);
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
 * Parses import operations from command line options
 * 
 * @param {Object} options - Command options
 * @returns {Object} Parsed operations
 */
function parseImportOperations(options) {
  const operations = {
    add: [],
    remove: [],
    update: []
  };

  // Parse add operations
  if (options.add) {
    for (const addSpec of options.add) {
      const parsed = parseImportSpec(addSpec, 'add');
      if (parsed) operations.add.push(parsed);
    }
  }

  // Parse remove operations  
  if (options.remove) {
    for (const removeSpec of options.remove) {
      const parsed = parseImportSpec(removeSpec, 'remove');
      if (parsed) operations.remove.push(parsed);
    }
  }

  // Parse update operations
  if (options.update) {
    for (const updateSpec of options.update) {
      if (updateSpec.includes('->')) {
        const [oldSource, newSource] = updateSpec.split('->').map(s => s.trim());
        if (oldSource && newSource) {
          operations.update.push({ oldSource, newSource });
        }
      }
    }
  }

  return operations;
}

/**
 * Parses a single import specification
 * 
 * @param {string} spec - Import specification
 * @param {string} operation - Operation type (add/remove)
 * @returns {Object|null} Parsed import spec
 */
function parseImportSpec(spec, operation) {
  if (spec.includes(':')) {
    // Format: "source:specifier1,specifier2"
    const [source, specifiersStr] = spec.split(':');
    const specifiers = specifiersStr.split(',').map(s => s.trim()).map(name => ({ name }));
    
    return operation === 'remove' 
      ? { source: source.trim(), specifiers: specifiers.map(s => s.name) }
      : { source: source.trim(), specifiers };
  } else {
    // Format: "source" (default import for add, remove all for remove)
    const source = spec.trim();
    
    return operation === 'remove'
      ? { source, removeAll: true }
      : { source, defaultImport: source.split('/').pop().replace(/[^a-zA-Z0-9]/g, '') };
  }
}

/**
 * Displays import management results in text format
 * 
 * @param {Object} result - Import management result
 * @param {Object} options - Command options
 */
async function displayImportResults(result, options) {
  if (!result.success) {
    console.log(picocolors.red('✗ Import management failed'));
    
    if (result.errors?.length > 0) {
      console.log(picocolors.red(`  ${result.errors.length} file(s) had errors:`));
      result.errors.forEach(error => {
        console.log(picocolors.red(`    • ${error.file}: ${error.error}`));
      });
    }
    return;
  }

  console.log(picocolors.green('✓ Import management completed successfully'));
  console.log();

  // Summary
  console.log(picocolors.bold('Summary:'));
  console.log(`  Files modified: ${picocolors.cyan(result.filesModified)}`);
  console.log(`  Total changes: ${picocolors.cyan(result.totalChanges)}`);
  
  if (options.dryRun) {
    console.log(picocolors.yellow('  Mode: DRY RUN (no files were modified)'));
  }
  console.log();

  // Show changes for each file
  if (result.changes?.length > 0) {
    console.log(picocolors.bold('Changes by file:'));
    
    for (const fileChange of result.changes.slice(0, 10)) { // Limit output
      console.log(`  ${picocolors.blue(fileChange.file)}`);
      console.log(`    Changes: ${picocolors.green(fileChange.changes.length)}`);
      
      // Group changes by type
      const changesByType = fileChange.changes.reduce((acc, change) => {
        acc[change.type] = acc[change.type] || [];
        acc[change.type].push(change);
        return acc;
      }, {});

      Object.entries(changesByType).forEach(([type, changes]) => {
        console.log(`      ${type}: ${changes.length}`);
        
        // Show sample changes
        changes.slice(0, 2).forEach(change => {
          if (change.source) {
            let desc = change.source;
            if (change.specifiers && Array.isArray(change.specifiers)) {
              desc += ` (${change.specifiers.join(', ')})`;
            }
            console.log(`        • ${desc}`);
          }
        });
      });
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

  // Show statistics
  if (result.changes?.length > 0) {
    const stats = calculateImportStats(result.changes);
    
    console.log(picocolors.bold('Statistics:'));
    if (stats.added > 0) console.log(`  Imports added: ${picocolors.green(stats.added)}`);
    if (stats.removed > 0) console.log(`  Imports removed: ${picocolors.red(stats.removed)}`);
    if (stats.updated > 0) console.log(`  Imports updated: ${picocolors.blue(stats.updated)}`);
    if (stats.organized > 0) console.log(`  Files organized: ${picocolors.yellow(stats.organized)}`);
    if (stats.unusedRemoved > 0) console.log(`  Unused removed: ${picocolors.gray(stats.unusedRemoved)}`);
    console.log();
  }

  // Recommendations
  if (!options.dryRun && result.filesModified > 0) {
    console.log(picocolors.bold('Recommendations:'));
    console.log('  • Run your linter to ensure import style consistency');
    console.log('  • Test your application to ensure imports are working correctly');
    
    if (result.totalChanges > 20) {
      console.log('  • Consider reviewing the changes before committing');
    }
  }
}

/**
 * Calculates statistics from import changes
 * 
 * @param {Array} changes - Array of file changes
 * @returns {Object} Import statistics
 */
function calculateImportStats(changes) {
  const stats = {
    added: 0,
    removed: 0,
    updated: 0,
    organized: 0,
    unusedRemoved: 0
  };

  changes.forEach(fileChange => {
    fileChange.changes.forEach(change => {
      switch (change.type) {
        case 'add':
          stats.added++;
          break;
        case 'remove':
          stats.removed++;
          break;
        case 'update':
          stats.updated++;
          break;
        case 'organize':
          stats.organized++;
          break;
        case 'remove_unused':
          stats.unusedRemoved++;
          break;
      }
    });
  });

  return stats;
}

export default configureManageImportsCommand;