/**
 * Get Code Command
 * 
 * This module handles the get-code command for extracting specific
 * code blocks with optional context and dependencies.
 */

import * as ui from '../ui-handler.js';
import { getRelevantFiles } from '../file-handler.js';
import { findSymbol } from '../parsers/symbol-parser.js';
import { extractSymbolCode, extractMultipleSymbols, extractCodeAtLine } from '../parsers/code-extractor.js';
import { formatCodeResult, formatSuccess, formatError, safeStringify } from '../utils/json-formatter.js';

/**
 * Configures the get-code command
 * 
 * @param {Command} program - Commander.js program instance
 */
export function configureGetCodeCommand(program) {
  program
    .command('get-code <symbolName>')
    .alias('code')
    .description('Extract specific code blocks with optional context')
    .option('-c, --context <level>', 'Context level: minimal or full', 'minimal')
    .option('-f, --format <format>', 'Output format: json or text', 'text')
    .option('--file <file>', 'Extract from specific file only', null)
    .option('--line <number>', 'Extract code around specific line number (requires --file)', null)
    .option('--lines <range>', 'Extract specific line range: start-end (requires --file)', null)
    .option('-o, --output <file>', 'Output to file instead of stdout', null)
    .action(async (symbolName, options) => {
      try {
        await handleGetCodeCommand(symbolName, options);
      } catch (error) {
        if (options.format === 'json') {
          console.error(safeStringify(formatError(error.message, 'GET_CODE_ERROR')));
        } else {
          ui.displayError(`Error: ${error.message}`);
        }
        process.exit(1);
      }
    });
}

/**
 * Handles the get-code command execution
 * 
 * @param {string} symbolName - Name of symbol to extract or line reference
 * @param {Object} options - Command options
 */
async function handleGetCodeCommand(symbolName, options) {
  const workingDir = process.cwd();

  try {
    let results = [];

    if (options.line && options.file) {
      // Extract code around a specific line
      results = await extractCodeByLine(options.file, parseInt(options.line), options);
    } else if (options.lines && options.file) {
      // Extract specific line range
      results = await extractCodeByRange(options.file, options.lines, options);
    } else if (options.file) {
      // Extract from specific file
      results = await extractFromSpecificFile(options.file, symbolName, options);
    } else {
      // Search across codebase
      results = await extractFromCodebase(symbolName, options, workingDir);
    }

    // Output results
    if (options.format === 'json') {
      await outputJsonFormat(results, symbolName, options);
    } else {
      await outputTextFormat(results, symbolName, options);
    }

  } catch (error) {
    throw new Error(`Failed to extract code: ${error.message}`);
  }
}

/**
 * Extracts code around a specific line number
 * 
 * @param {string} filePath - File path
 * @param {number} lineNumber - Line number
 * @param {Object} options - Command options
 * @returns {Array} Extraction results
 */
async function extractCodeByLine(filePath, lineNumber, options) {
  if (options.format !== 'json') {
    ui.displayInfo(`Extracting code around line ${lineNumber} from ${filePath}...`);
  }

  const { extractCodeAtLine } = await import('../parsers/code-extractor.js');
  const contextLines = options.context === 'full' ? 10 : 5;
  const result = extractCodeAtLine(filePath, lineNumber, contextLines);
  
  return [{
    type: 'line-extraction',
    ...result
  }];
}

/**
 * Extracts code from a specific line range
 * 
 * @param {string} filePath - File path
 * @param {string} linesRange - Line range (e.g., "10-20")
 * @param {Object} options - Command options
 * @returns {Array} Extraction results
 */
async function extractCodeByRange(filePath, linesRange, options) {
  const match = linesRange.match(/^(\d+)-(\d+)$/);
  if (!match) {
    throw new Error('Invalid line range format. Use: start-end (e.g., 10-20)');
  }

  const startLine = parseInt(match[1]);
  const endLine = parseInt(match[2]);

  if (startLine > endLine) {
    throw new Error('Start line must be less than or equal to end line');
  }

  if (options.format !== 'json') {
    ui.displayInfo(`Extracting lines ${startLine}-${endLine} from ${filePath}...`);
  }

  const { readFileSync } = await import('fs');
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const extractedLines = lines.slice(startLine - 1, endLine);
  
  return [{
    type: 'range-extraction',
    file: filePath,
    startLine,
    endLine,
    code: extractedLines.join('\n'),
    totalLines: endLine - startLine + 1
  }];
}

/**
 * Extracts symbol from a specific file
 * 
 * @param {string} filePath - File path
 * @param {string} symbolName - Symbol name
 * @param {Object} options - Command options
 * @returns {Array} Extraction results
 */
async function extractFromSpecificFile(filePath, symbolName, options) {
  if (options.format !== 'json') {
    ui.displayInfo(`Extracting "${symbolName}" from ${filePath}...`);
  }

  const result = await extractSymbolCode(filePath, symbolName, options.context);
  return result ? [result] : [];
}

/**
 * Extracts symbol from entire codebase
 * 
 * @param {string} symbolName - Symbol name
 * @param {Object} options - Command options
 * @param {string} workingDir - Working directory
 * @returns {Array} Extraction results
 */
async function extractFromCodebase(symbolName, options, workingDir) {
  if (options.format !== 'json') {
    ui.displayInfo(`Searching for "${symbolName}" in codebase...`);
  }

  // First, find the symbol
  const spinner = options.format !== 'json' ? ui.createSpinner('Locating symbol...') : null;
  if (spinner) spinner.start();

  const filePaths = await getRelevantFiles(workingDir);
  const symbols = await findSymbol(filePaths, symbolName);

  if (symbols.length === 0) {
    if (spinner) spinner.fail('Symbol not found');
    return [];
  }

  if (spinner) spinner.succeed(`Found ${symbols.length} matching symbol${symbols.length === 1 ? '' : 's'}`);

  // Extract code for each matching symbol
  const extractSpinner = options.format !== 'json' ? ui.createSpinner('Extracting code...') : null;
  if (extractSpinner) extractSpinner.start();

  const results = [];
  for (const symbol of symbols) {
    try {
      const codeResult = await extractSymbolCode(symbol.file, symbol.name, options.context);
      if (codeResult) {
        results.push({
          ...codeResult,
          matchScore: symbol.score,
          matchType: symbol.matchType
        });
      }
    } catch (error) {
      console.warn(`Failed to extract ${symbol.name} from ${symbol.file}: ${error.message}`);
    }
  }

  if (extractSpinner) {
    extractSpinner.succeed(`Extracted ${results.length} code block${results.length === 1 ? '' : 's'}`);
  }

  return results;
}

/**
 * Outputs extraction results in JSON format
 * 
 * @param {Array} results - Extraction results
 * @param {string} symbolName - Searched symbol name
 * @param {Object} options - Command options
 */
async function outputJsonFormat(results, symbolName, options) {
  const formattedResults = results.map(result => formatCodeResult(result));
  const successResult = formatSuccess({
    query: {
      symbol: symbolName,
      context: options.context,
      file: options.file,
      line: options.line,
      lines: options.lines
    },
    count: results.length,
    results: formattedResults
  }, `Extracted ${results.length} code block${results.length === 1 ? '' : 's'}`);

  const output = safeStringify(successResult, true);

  if (options.output) {
    const { writeFileSync } = await import('fs');
    writeFileSync(options.output, output, 'utf-8');
  } else {
    console.log(output);
  }
}

/**
 * Outputs extraction results in text format
 * 
 * @param {Array} results - Extraction results
 * @param {string} symbolName - Searched symbol name
 * @param {Object} options - Command options
 */
async function outputTextFormat(results, symbolName, options) {
  if (results.length === 0) {
    ui.displayWarning(`No code found for "${symbolName}"`);
    return;
  }

  let output = `\n📄 Extracted ${results.length} code block${results.length === 1 ? '' : 's'}:\n\n`;

  results.forEach((result, index) => {
    // Header
    output += `${'='.repeat(60)}\n`;
    if (result.type === 'line-extraction') {
      output += `📍 ${result.file} (Line ${result.targetLine} ± ${Math.floor(result.contextLines / 2)})\n`;
    } else if (result.type === 'range-extraction') {
      output += `📍 ${result.file} (Lines ${result.startLine}-${result.endLine})\n`;
    } else {
      output += `📍 ${result.symbol} in ${result.file}`;
      if (result.startLine) {
        output += ` (Lines ${result.startLine}-${result.endLine})`;
      }
      if (result.matchType) {
        output += ` [${result.matchType} match]`;
      }
      output += '\n';
    }
    output += `${'='.repeat(60)}\n`;

    // Code block
    if (result.code) {
      // Add syntax highlighting hint for common languages
      const fileExt = result.file ? result.file.split('.').pop() : '';
      const language = getLanguageHint(fileExt);
      
      output += `\`\`\`${language}\n`;
      output += result.code;
      if (!result.code.endsWith('\n')) {
        output += '\n';
      }
      output += '```\n';
    }

    // Context if available
    if (result.context && options.context === 'full') {
      output += '\n📋 Additional Context:\n';
      output += '```\n';
      output += result.context;
      if (!result.context.endsWith('\n')) {
        output += '\n';
      }
      output += '```\n';
    }

    // Imports if available
    if (result.imports && result.imports.length > 0) {
      output += '\n📦 Imports:\n';
      result.imports.forEach(imp => {
        output += `   ${imp.source}\n`;
      });
    }

    // Metadata
    if (result.type || result.matchScore) {
      output += '\n📊 Metadata:\n';
      if (result.type) output += `   Type: ${result.type}\n`;
      if (result.matchScore) output += `   Match Score: ${result.matchScore}\n`;
    }

    if (index < results.length - 1) {
      output += '\n';
    }
  });

  if (options.output) {
    const { writeFileSync } = await import('fs');
    writeFileSync(options.output, output, 'utf-8');
    ui.displaySuccess(`Code extracted to ${options.output}`);
  } else {
    console.log(output);
  }
}

/**
 * Gets a language hint for syntax highlighting
 * 
 * @param {string} extension - File extension
 * @returns {string} Language hint
 */
function getLanguageHint(extension) {
  const languageMap = {
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'py': 'python',
    'rs': 'rust',
    'go': 'go',
    'java': 'java',
    'rb': 'ruby',
    'php': 'php',
    'cpp': 'cpp',
    'c': 'c',
    'cs': 'csharp',
    'swift': 'swift',
    'kt': 'kotlin',
    'scala': 'scala',
    'html': 'html',
    'css': 'css',
    'scss': 'scss',
    'json': 'json',
    'yaml': 'yaml',
    'yml': 'yaml',
    'xml': 'xml',
    'sh': 'bash',
    'bash': 'bash'
  };

  return languageMap[extension] || '';
}