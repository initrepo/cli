/**
 * Find Symbol Command
 * 
 * This module handles the find-symbol command for locating specific
 * code symbols (functions, classes, variables) across the codebase.
 */

import * as ui from '../ui-handler.js';
import { getRelevantFiles } from '../file-handler.js';
import { findSymbol, filterSymbols, groupSymbolsByFile } from '../parsers/symbol-parser.js';
import { formatSymbolResults, formatSuccess, formatError, safeStringify } from '../utils/json-formatter.js';

/**
 * Configures the find-symbol command
 * 
 * @param {Command} program - Commander.js program instance
 */
export function configureFindSymbolCommand(program) {
  program
    .command('find-symbol <symbolName>')
    .alias('find')
    .description('Find specific code symbols (functions, classes, variables) in the codebase')
    .option('-t, --type <type>', 'Symbol type filter: function, class, variable, interface, etc.', null)
    .option('-f, --format <format>', 'Output format: json or text', 'text')
    .option('--file-pattern <pattern>', 'Filter by file pattern (regex)', null)
    .option('--exact', 'Exact name match only (no fuzzy matching)', false)
    .option('-o, --output <file>', 'Output to file instead of stdout', null)
    .action(async (symbolName, options) => {
      try {
        await handleFindSymbolCommand(symbolName, options);
      } catch (error) {
        if (options.format === 'json') {
          console.error(safeStringify(formatError(error.message, 'FIND_SYMBOL_ERROR')));
        } else {
          ui.displayError(`Error: ${error.message}`);
        }
        process.exit(1);
      }
    });
}

/**
 * Handles the find-symbol command execution
 * 
 * @param {string} symbolName - Name of symbol to find
 * @param {Object} options - Command options
 */
async function handleFindSymbolCommand(symbolName, options) {
  const workingDir = process.cwd();
  
  if (options.format !== 'json') {
    const searchInfo = options.exact ? 'exact match' : 'fuzzy search';
    const typeInfo = options.type ? ` (type: ${options.type})` : '';
    ui.displayInfo(`Searching for "${symbolName}" using ${searchInfo}${typeInfo}...`);
  }

  try {
    // Get relevant files to search
    const spinner = options.format !== 'json' ? ui.createSpinner('Scanning files...') : null;
    if (spinner) spinner.start();
    
    const filePaths = await getRelevantFiles(workingDir);
    
    if (spinner) spinner.succeed(`Scanning ${filePaths.length} files for symbols...`);

    // Search for symbols
    const searchSpinner = options.format !== 'json' ? ui.createSpinner('Searching for symbols...') : null;
    if (searchSpinner) searchSpinner.start();

    let results = await findSymbol(filePaths, symbolName, options.type);

    // Apply exact match filter if requested
    if (options.exact) {
      results = results.filter(symbol => 
        symbol.name.toLowerCase() === symbolName.toLowerCase()
      );
    }

    // Apply file pattern filter if provided
    if (options.filePattern) {
      results = filterSymbols(results, { filePattern: options.filePattern });
    }

    if (searchSpinner) {
      searchSpinner.succeed(`Found ${results.length} matching symbols`);
    }

    // Output results
    if (options.format === 'json') {
      await outputJsonFormat(results, symbolName, options);
    } else {
      await outputTextFormat(results, symbolName, options);
    }

  } catch (error) {
    throw new Error(`Failed to search for symbol: ${error.message}`);
  }
}

/**
 * Outputs search results in JSON format
 * 
 * @param {Array} results - Search results
 * @param {string} symbolName - Searched symbol name
 * @param {Object} options - Command options
 */
async function outputJsonFormat(results, symbolName, options) {
  const formattedResults = formatSymbolResults(results);
  const successResult = formatSuccess({
    query: {
      symbolName,
      type: options.type,
      exact: options.exact,
      filePattern: options.filePattern
    },
    ...formattedResults
  }, `Found ${results.length} matching symbols`);

  const output = safeStringify(successResult, true);

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
 * @param {Array} results - Search results
 * @param {string} symbolName - Searched symbol name
 * @param {Object} options - Command options
 */
async function outputTextFormat(results, symbolName, options) {
  if (results.length === 0) {
    ui.displayWarning(`No symbols found matching "${symbolName}"`);
    if (options.type) {
      console.log(`  Searched for type: ${options.type}`);
    }
    if (options.filePattern) {
      console.log(`  File pattern: ${options.filePattern}`);
    }
    return;
  }

  let output = `\n🔍 Found ${results.length} symbol${results.length === 1 ? '' : 's'} matching "${symbolName}":\n\n`;

  // Group results by file for better readability
  const groupedResults = groupSymbolsByFile(results);

  Object.entries(groupedResults).forEach(([file, symbols], index) => {
    output += `📁 ${file}\n`;
    
    symbols.forEach((symbol, symbolIndex) => {
      const matchType = symbol.matchType === 'exact' ? '🎯' : '🔍';
      const typeIcon = getTypeIcon(symbol.type);
      
      output += `   ${matchType} ${typeIcon} ${symbol.name}`;
      
      if (symbol.type) {
        output += ` (${symbol.type})`;
      }
      
      if (symbol.line) {
        output += ` - Line ${symbol.line}`;
      }
      
      if (symbol.signature && symbol.signature !== symbol.name) {
        output += `\n      ${symbol.signature}`;
      }
      
      if (symbol.matchType === 'fuzzy' && symbol.score) {
        output += ` [score: ${symbol.score}]`;
      }
      
      output += '\n';
    });
    
    if (index < Object.keys(groupedResults).length - 1) {
      output += '\n';
    }
  });

  // Add summary
  output += '\n📊 Summary:\n';
  const byType = {};
  results.forEach(symbol => {
    byType[symbol.type] = (byType[symbol.type] || 0) + 1;
  });

  Object.entries(byType).forEach(([type, count]) => {
    output += `   ${getTypeIcon(type)} ${type}: ${count}\n`;
  });

  const exactMatches = results.filter(r => r.matchType === 'exact').length;
  const fuzzyMatches = results.length - exactMatches;
  
  if (exactMatches > 0) output += `   🎯 Exact matches: ${exactMatches}\n`;
  if (fuzzyMatches > 0) output += `   🔍 Fuzzy matches: ${fuzzyMatches}\n`;

  if (options.output) {
    const { writeFileSync } = await import('fs');
    writeFileSync(options.output, output, 'utf-8');
    ui.displaySuccess(`Results written to ${options.output}`);
  } else {
    console.log(output);
  }
}

/**
 * Gets an icon for a symbol type
 * 
 * @param {string} type - Symbol type
 * @returns {string} Icon for the type
 */
function getTypeIcon(type) {
  const icons = {
    'function': '⚡',
    'class': '🏗️',
    'variable': '📦',
    'interface': '🔗',
    'enum': '🎯',
    'struct': '🧱',
    'method': '⚡',
    'property': '🔧',
    'export': '📤',
    'import': '📥',
    'type': '🏷️',
    'const': '📌',
    'let': '📦',
    'var': '📦'
  };
  
  return icons[type] || '📄';
}