/**
 * Find References Command
 * 
 * This module handles the find-references command for finding all usages
 * of a symbol across the codebase (as opposed to find-symbol which finds definitions).
 */

import * as ui from '../ui-handler.js';
import { getRelevantFiles } from '../file-handler.js';
import { findReferences } from '../parsers/reference-finder.js';
import { formatSuccess, formatError, safeStringify } from '../utils/json-formatter.js';

/**
 * Configures the find-references command
 * 
 * @param {Command} program - Commander.js program instance
 */
export function configureFindReferencesCommand(program) {
  program
    .command('find-references <symbolName>')
    .alias('refs')
    .description('Find all references/usages of a symbol across the codebase')
    .option('-f, --format <format>', 'Output format: json or text', 'text')
    .option('--exact', 'Exact name match only (no partial matching)', false)
    .option('--case-sensitive', 'Case sensitive search', false)
    .option('--include-comments', 'Include references in comments', false)
    .option('--include-strings', 'Include references in string literals', false)
    .option('--group-by <type>', 'Group results by: file, type, or none', 'file')
    .option('--limit <number>', 'Limit number of results shown', '50')
    .option('-o, --output <file>', 'Output to file instead of stdout', null)
    .action(async (symbolName, options) => {
      try {
        await handleFindReferencesCommand(symbolName, options);
      } catch (error) {
        if (options.format === 'json') {
          console.error(safeStringify(formatError(error.message, 'FIND_REFERENCES_ERROR')));
        } else {
          ui.displayError(`Error: ${error.message}`);
        }
        process.exit(1);
      }
    });
}

/**
 * Handles the find-references command execution
 * 
 * @param {string} symbolName - Name of symbol to find references for
 * @param {Object} options - Command options
 */
async function handleFindReferencesCommand(symbolName, options) {
  const workingDir = process.cwd();
  const limit = parseInt(options.limit, 10) || 50;

  if (options.format !== 'json') {
    const searchType = options.exact ? 'exact references' : 'partial references';
    ui.displayInfo(`Finding ${searchType} for "${symbolName}"...`);
  }

  try {
    // Get relevant files to search
    const spinner = options.format !== 'json' ? ui.createSpinner('Scanning files...') : null;
    if (spinner) spinner.start();
    
    const filePaths = await getRelevantFiles(workingDir);

    if (spinner) spinner.succeed(`Searching ${filePaths.length} files for references...`);

    // Search for references
    const searchSpinner = options.format !== 'json' ? ui.createSpinner('Finding references...') : null;
    if (searchSpinner) searchSpinner.start();

    const searchOptions = {
      exact: options.exact,
      caseSensitive: options.caseSensitive,
      includeComments: options.includeComments,
      includeStrings: options.includeStrings
    };

    const results = await findReferences(filePaths, symbolName, searchOptions);

    if (searchSpinner) {
      searchSpinner.succeed(`Found ${results.summary.totalReferences} references in ${results.summary.filesWithReferences} files`);
    }

    // Output results
    if (options.format === 'json') {
      await outputJsonFormat(results, options, limit);
    } else {
      await outputTextFormat(results, options, limit);
    }

  } catch (error) {
    throw new Error(`Failed to find references: ${error.message}`);
  }
}

/**
 * Outputs search results in JSON format
 * 
 * @param {Object} results - Reference search results
 * @param {Object} options - Command options
 * @param {number} limit - Limit for results
 */
async function outputJsonFormat(results, options, limit) {
  const limitedReferences = results.references.slice(0, limit);

  const result = formatSuccess({
    query: results.query,
    summary: results.summary,
    references: limitedReferences,
    importReferences: results.importReferences,
    exportReferences: results.exportReferences,
    groupedByFile: options.groupBy === 'file' ? results.groupedByFile : undefined,
    groupedByType: options.groupBy === 'type' ? results.groupedByType : undefined,
    relatedSymbols: results.relatedSymbols,
    truncated: results.references.length > limit
  }, `Found ${results.summary.totalReferences} references`);

  const output = safeStringify(result, true);

  if (options.output) {
    const { writeFileSync } = await import('fs');
    writeFileSync(options.output, output, 'utf-8');
  } else {
    console.log(output);
  }
}

/**
 * Outputs search results in text format
 * 
 * @param {Object} results - Reference search results
 * @param {Object} options - Command options
 * @param {number} limit - Limit for results
 */
async function outputTextFormat(results, options, limit) {
  const summary = results.summary;
  
  if (summary.totalReferences === 0) {
    const output = `\n🔍 No references found for "${results.query.symbol}"\n\n`;
    console.log(output);
    return;
  }

  let output = `\n🔍 Found ${summary.totalReferences} reference${summary.totalReferences === 1 ? '' : 's'} for "${results.query.symbol}"\n\n`;

  // Summary
  output += `📊 Summary:\n`;
  output += `   Total References: ${summary.totalReferences}\n`;
  output += `   Files with References: ${summary.filesWithReferences}\n`;
  output += `   Import References: ${summary.importReferences}\n`;
  output += `   Export References: ${summary.exportReferences}\n\n`;

  // Show results based on grouping preference
  if (options.groupBy === 'type') {
    output += outputGroupedByType(results.groupedByType, limit);
  } else if (options.groupBy === 'file') {
    output += outputGroupedByFile(results.groupedByFile, limit);
  } else {
    output += outputFlatResults(results.references, limit);
  }

  // Import/Export References
  if (results.importReferences.length > 0) {
    output += `📥 Import References (${results.importReferences.length}):\n`;
    results.importReferences.forEach((imp, index) => {
      output += `   ${index + 1}. ${imp.file}:${imp.line}\n`;
      output += `      Import: ${imp.name} from '${imp.source}'\n`;
      if (imp.localName !== imp.name) {
        output += `      Local Name: ${imp.localName}\n`;
      }
      output += `\n`;
    });
  }

  if (results.exportReferences.length > 0) {
    output += `📤 Export References (${results.exportReferences.length}):\n`;
    results.exportReferences.forEach((exp, index) => {
      output += `   ${index + 1}. ${exp.file}:${exp.line}\n`;
      output += `      Export: ${exp.name}\n`;
      if (exp.source) {
        output += `      Re-exported from: ${exp.source}\n`;
      }
      output += `\n`;
    });
  }

  // Related Symbols
  if (results.relatedSymbols.length > 0) {
    output += `🔗 Related Symbols:\n`;
    output += `   ${results.relatedSymbols.join(', ')}\n\n`;
  }

  // Truncation notice
  if (results.references.length > limit) {
    output += `⚠️  Results truncated to ${limit} items. Use --limit to show more.\n\n`;
  }

  if (options.output) {
    const { writeFileSync } = await import('fs');
    writeFileSync(options.output, output, 'utf-8');
    ui.displaySuccess(`Reference results written to ${options.output}`);
  } else {
    console.log(output);
  }
}

/**
 * Outputs results grouped by type
 * 
 * @param {Object} groupedByType - References grouped by type
 * @param {number} limit - Limit for results
 * @returns {string} Formatted output
 */
function outputGroupedByType(groupedByType, limit) {
  let output = '';
  let totalShown = 0;

  const typeOrder = ['declarations', 'function_calls', 'references', 'property_access', 'assignments', 'jsx_usage', 'comments', 'strings', 'other'];
  const typeIcons = {
    declarations: '📝',
    function_calls: '🔧',
    references: '👁️',
    property_access: '🔗',
    assignments: '📝',
    jsx_usage: '⚛️',
    comments: '💬',
    strings: '🔤',
    other: '❓'
  };

  for (const type of typeOrder) {
    const refs = groupedByType[type] || [];
    if (refs.length === 0 || totalShown >= limit) continue;

    const icon = typeIcons[type] || '❓';
    const typeName = type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    
    output += `${icon} ${typeName} (${refs.length}):\n`;

    const toShow = Math.min(refs.length, limit - totalShown);
    for (let i = 0; i < toShow; i++) {
      const ref = refs[i];
      output += `   ${totalShown + i + 1}. ${ref.file}:${ref.line}:${ref.column}\n`;
      output += `      ${ref.lineContent}\n`;
      if (ref.usage && ref.usage !== 'reference') {
        output += `      Usage: ${ref.usage}\n`;
      }
      output += `\n`;
    }

    totalShown += toShow;
  }

  return output;
}

/**
 * Outputs results grouped by file
 * 
 * @param {Object} groupedByFile - References grouped by file
 * @param {number} limit - Limit for results
 * @returns {string} Formatted output
 */
function outputGroupedByFile(groupedByFile, limit) {
  let output = '';
  let totalShown = 0;

  const files = Object.keys(groupedByFile).sort();
  
  for (const file of files) {
    const refs = groupedByFile[file];
    if (totalShown >= limit) break;

    output += `📁 ${file} (${refs.length} references):\n`;

    const toShow = Math.min(refs.length, limit - totalShown);
    for (let i = 0; i < toShow; i++) {
      const ref = refs[i];
      const usageIcon = getUsageIcon(ref.usage);
      
      output += `   ${totalShown + i + 1}. ${usageIcon} Line ${ref.line}:${ref.column}\n`;
      output += `      ${ref.lineContent}\n`;
      if (ref.context && ref.context !== 'reference') {
        output += `      Context: ${ref.context} | Usage: ${ref.usage}\n`;
      }
      output += `\n`;
    }

    totalShown += toShow;
  }

  return output;
}

/**
 * Outputs results in flat format
 * 
 * @param {Array} references - Array of references
 * @param {number} limit - Limit for results
 * @returns {string} Formatted output
 */
function outputFlatResults(references, limit) {
  let output = `📋 References:\n`;

  const toShow = Math.min(references.length, limit);
  for (let i = 0; i < toShow; i++) {
    const ref = references[i];
    const usageIcon = getUsageIcon(ref.usage);
    
    output += `   ${i + 1}. ${usageIcon} ${ref.file}:${ref.line}:${ref.column}\n`;
    output += `      ${ref.lineContent}\n`;
    if (ref.context && ref.context !== 'reference') {
      output += `      Context: ${ref.context} | Usage: ${ref.usage}\n`;
    }
    output += `\n`;
  }

  return output;
}

/**
 * Gets an icon for usage type
 * 
 * @param {string} usage - Usage type
 * @returns {string} Icon for the usage type
 */
function getUsageIcon(usage) {
  const icons = {
    'declaration': '📝',
    'function_call': '🔧',
    'property_access': '🔗',
    'assignment': '📝',
    'jsx_component': '⚛️',
    'comment_reference': '💬',
    'string_reference': '🔤',
    'reference': '👁️'
  };
  
  return icons[usage] || '📄';
}