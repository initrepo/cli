/**
 * Apply Template Command
 * 
 * Applies code templates and snippets to files:
 * - Insert predefined templates
 * - Apply custom code snippets
 * - Variable substitution in templates
 */

import { Command } from 'commander';
import { applyTemplate, validateTemplate, createTemplate } from '../modifiers/template-modifier.js';
import { getRelevantFiles } from '../file-handler.js';
import { readFileSync, existsSync } from 'fs';
import picocolors from 'picocolors';

/**
 * Configures the apply-template command
 * 
 * @param {Command} program - Commander program instance
 */
export function configureApplyTemplateCommand(program) {
  const templateCommand = new Command('apply-template')
    .description('Apply code templates and snippets to files')
    .argument('[template-name]', 'Name of predefined template or path to template file')
    .option('-c, --content <content>', 'Template content to apply directly')
    .option('-t, --type <type>', 'Template type (text, ast)', 'text')
    .option('-p, --position <position>', 'Position to insert template (start, end, before, after, replace)', 'end')
    .option('--target <target>', 'Target symbol/line for positioning (required for before/after/replace)')
    .option('-v, --variables <variables>', 'Variables for substitution (JSON format or key=value pairs)')
    .option('--list-templates', 'List available predefined templates')
    .option('--dry-run', 'Preview changes without modifying files')
    .option('-f, --format <format>', 'Output format (json, text)', 'text')
    .option('--include <patterns...>', 'Include file patterns')
    .option('--exclude <patterns...>', 'Exclude file patterns')
    .action(async (templateName, options) => {
      await handleApplyTemplateCommand(templateName, options);
    });

  program.addCommand(templateCommand);
}

/**
 * Handles the apply-template command execution
 * 
 * @param {string} templateName - Template name or path
 * @param {Object} options - Command options
 */
async function handleApplyTemplateCommand(templateName, options) {
  try {
    // Handle list templates option
    if (options.listTemplates) {
      return listPredefinedTemplates(options.format);
    }

    // Resolve template
    const template = await resolveTemplate(templateName, options);
    
    // Validate template
    const validation = validateTemplate(template);
    if (!validation.valid) {
      if (options.format === 'json') {
        console.log(JSON.stringify({
          success: false,
          error: 'Template validation failed',
          details: validation.errors
        }, null, 2));
      } else {
        console.error(picocolors.red('✗ Template validation failed:'));
        validation.errors.forEach(error => {
          console.error(picocolors.red(`  • ${error}`));
        });
      }
      process.exit(1);
    }

    // Parse variables
    const variables = parseVariables(options.variables);

    // Validate positioning options
    if (['before', 'after', 'replace'].includes(options.position) && !options.target) {
      if (options.format === 'json') {
        console.log(JSON.stringify({
          success: false,
          error: `Target is required when using position '${options.position}'`
        }, null, 2));
      } else {
        console.error(picocolors.red(`✗ Target is required when using position '${options.position}'`));
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
      console.log(picocolors.blue('📝 Applying template'));
      console.log(picocolors.gray(`   Template: ${templateName || 'inline'}`));
      console.log(picocolors.gray(`   Position: ${options.position}${options.target ? ` (${options.target})` : ''}`));
      console.log(picocolors.gray(`   Files: ${filePaths.length}`));
      console.log(picocolors.gray(`   Mode: ${options.dryRun ? 'DRY RUN' : 'LIVE'}`));
      
      if (Object.keys(variables).length > 0) {
        console.log(picocolors.gray(`   Variables: ${Object.keys(variables).join(', ')}`));
      }
      console.log();
    }

    // Apply template
    const result = await applyTemplate(filePaths, template, {
      dryRun: options.dryRun,
      position: options.position,
      target: options.target,
      variables
    });

    // Output results
    if (options.format === 'json') {
      console.log(JSON.stringify({
        ...result,
        operation: {
          template: templateName || 'inline',
          position: options.position,
          target: options.target,
          dryRun: options.dryRun,
          variables
        }
      }, null, 2));
    } else {
      await displayTemplateResults(result, templateName, options);
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
 * Resolves template from name, path, or inline content
 * 
 * @param {string} templateName - Template identifier
 * @param {Object} options - Command options
 * @returns {Object} Resolved template
 */
async function resolveTemplate(templateName, options) {
  // Direct content provided
  if (options.content) {
    return {
      type: options.type,
      content: options.content
    };
  }

  // No template specified
  if (!templateName) {
    throw new Error('Template name, file path, or --content must be provided');
  }

  // Check if it's a file path
  if (existsSync(templateName)) {
    try {
      const content = readFileSync(templateName, 'utf-8');
      return {
        type: options.type,
        content: content
      };
    } catch (error) {
      throw new Error(`Failed to read template file '${templateName}': ${error.message}`);
    }
  }

  // Check if it's a predefined template
  try {
    return createTemplate(templateName, options);
  } catch (error) {
    throw new Error(`Unknown template '${templateName}'. Use --list-templates to see available options.`);
  }
}

/**
 * Parses variables from command line input
 * 
 * @param {string} variablesInput - Variables input string
 * @returns {Object} Parsed variables
 */
function parseVariables(variablesInput) {
  if (!variablesInput) {
    return {};
  }

  try {
    // Try parsing as JSON first
    return JSON.parse(variablesInput);
  } catch {
    // Parse as key=value pairs
    const variables = {};
    const pairs = variablesInput.split(',');
    
    pairs.forEach(pair => {
      const [key, value] = pair.split('=').map(s => s.trim());
      if (key && value) {
        variables[key] = value;
      }
    });
    
    return variables;
  }
}

/**
 * Lists available predefined templates
 * 
 * @param {string} format - Output format
 */
function listPredefinedTemplates(format) {
  const templates = {
    'react-component': {
      description: 'React functional component template',
      variables: ['componentName', 'props', 'componentContent'],
      type: 'ast'
    },
    'function': {
      description: 'JavaScript/TypeScript function template',
      variables: ['functionName', 'parameters', 'functionBody'],
      type: 'ast'
    },
    'class': {
      description: 'JavaScript/TypeScript class template',
      variables: ['className', 'constructorParams', 'constructorBody', 'methods'],
      type: 'ast'
    },
    'test': {
      description: 'Test suite template',
      variables: ['testName', 'testDescription', 'testBody'],
      type: 'ast'
    }
  };

  if (format === 'json') {
    console.log(JSON.stringify({
      templates: Object.entries(templates).map(([name, info]) => ({
        name,
        ...info
      }))
    }, null, 2));
  } else {
    console.log(picocolors.bold('Available Templates:'));
    console.log();

    Object.entries(templates).forEach(([name, info]) => {
      console.log(`  ${picocolors.blue(name)}`);
      console.log(`    ${picocolors.gray(info.description)}`);
      console.log(`    Type: ${picocolors.cyan(info.type)}`);
      console.log(`    Variables: ${picocolors.yellow(info.variables.join(', '))}`);
      console.log();
    });

    console.log(picocolors.gray('Usage examples:'));
    console.log(picocolors.gray('  initrepo-cli apply-template react-component --variables "componentName=MyComponent,props=props"'));
    console.log(picocolors.gray('  initrepo-cli apply-template function --variables \'{"functionName":"myFunc","parameters":"a, b"}\''));
  }
}

/**
 * Displays template application results in text format
 * 
 * @param {Object} result - Template application result
 * @param {string} templateName - Template name
 * @param {Object} options - Command options
 */
async function displayTemplateResults(result, templateName, options) {
  if (!result.success) {
    console.log(picocolors.red('✗ Template application failed'));
    
    if (result.errors?.length > 0) {
      console.log(picocolors.red(`  ${result.errors.length} file(s) had errors:`));
      result.errors.forEach(error => {
        console.log(picocolors.red(`    • ${error.file}: ${error.error}`));
      });
    }
    return;
  }

  console.log(picocolors.green('✓ Template applied successfully'));
  console.log();

  // Summary
  console.log(picocolors.bold('Summary:'));
  console.log(`  Files modified: ${picocolors.cyan(result.filesModified)}`);
  console.log(`  Total insertions: ${picocolors.cyan(result.totalInsertions)}`);
  
  if (options.dryRun) {
    console.log(picocolors.yellow('  Mode: DRY RUN (no files were modified)'));
  }
  console.log();

  // Show changes for each file
  if (result.changes?.length > 0) {
    console.log(picocolors.bold('Changes:'));
    
    for (const change of result.changes.slice(0, 8)) { // Limit output
      console.log(`  ${picocolors.blue(change.file)}`);
      console.log(`    Insertions: ${picocolors.green(change.insertions)}`);
      
      if (change.preview && change.preview.changes?.length > 0) {
        console.log('    Preview:');
        change.preview.changes.slice(0, 5).forEach(lineChange => {
          if (lineChange.type === 'added') {
            console.log(picocolors.green(`      + ${lineChange.modified.trim()}`));
          } else if (lineChange.type === 'modified') {
            console.log(picocolors.red(`      - ${lineChange.original.trim()}`));
            console.log(picocolors.green(`      + ${lineChange.modified.trim()}`));
          }
        });
        
        if (change.preview.changes.length > 5) {
          console.log(picocolors.gray(`      ... and ${change.preview.changes.length - 5} more changes`));
        }
      }
      console.log();
    }

    if (result.changes.length > 8) {
      console.log(picocolors.gray(`... and ${result.changes.length - 8} more files`));
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
    console.log('  • Review the inserted code to ensure it matches your expectations');
    console.log('  • Run your linter to ensure code style consistency');
    console.log('  • Test your application to ensure the new code works correctly');
    
    if (result.totalInsertions > 10) {
      console.log('  • Consider committing these changes with a descriptive message');
    }
  }
}

export default configureApplyTemplateCommand;