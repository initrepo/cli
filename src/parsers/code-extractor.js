/**
 * Code Extractor
 * 
 * This module provides functionality to extract specific code blocks
 * from source files with optional context and dependency analysis.
 */

import { readFileSync } from 'fs';
import { parseJavaScript, extractImports } from '../utils/ast-utils.js';
import traverse from '@babel/traverse';

/**
 * Extracts code for a specific symbol with context
 * 
 * @param {string} filePath - Path to the source file
 * @param {string} symbolName - Name of the symbol to extract
 * @param {string} context - Context level ('minimal', 'full')
 * @returns {Object} Extracted code result
 */
export async function extractSymbolCode(filePath, symbolName, context = 'minimal') {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    // Try JavaScript/TypeScript extraction first
    const jsResult = await extractJavaScriptSymbolCode(content, symbolName, context, filePath);
    if (jsResult) {
      return jsResult;
    }

    // Fallback to regex-based extraction
    return extractSymbolCodeRegex(content, lines, symbolName, context, filePath);

  } catch (error) {
    throw new Error(`Failed to extract code from ${filePath}: ${error.message}`);
  }
}

/**
 * Extracts JavaScript/TypeScript symbol code using AST
 * 
 * @param {string} content - File content
 * @param {string} symbolName - Symbol name to extract
 * @param {string} context - Context level
 * @param {string} filePath - File path for reference
 * @returns {Object|null} Extraction result or null if not found
 */
async function extractJavaScriptSymbolCode(content, symbolName, context, filePath) {
  const ast = parseJavaScript(content, filePath);
  if (!ast) return null;

  let foundSymbol = null;
  const lines = content.split('\n');
  const imports = extractImports(ast);

  traverse.default(ast, {
    FunctionDeclaration(path) {
      const node = path.node;
      if (node.id?.name === symbolName) {
        foundSymbol = {
          type: 'function',
          startLine: node.loc?.start?.line || 1,
          endLine: node.loc?.end?.line || 1,
          startColumn: node.loc?.start?.column || 0,
          endColumn: node.loc?.end?.column || 0
        };
      }
    },

    ClassDeclaration(path) {
      const node = path.node;
      if (node.id?.name === symbolName) {
        foundSymbol = {
          type: 'class',
          startLine: node.loc?.start?.line || 1,
          endLine: node.loc?.end?.line || 1,
          startColumn: node.loc?.start?.column || 0,
          endColumn: node.loc?.end?.column || 0
        };
      }
    },

    VariableDeclarator(path) {
      const node = path.node;
      if (node.id?.name === symbolName) {
        const statement = path.findParent((parent) => parent.isVariableDeclaration());
        if (statement) {
          foundSymbol = {
            type: 'variable',
            startLine: statement.node.loc?.start?.line || 1,
            endLine: statement.node.loc?.end?.line || 1,
            startColumn: statement.node.loc?.start?.column || 0,
            endColumn: statement.node.loc?.end?.column || 0
          };
        }
      }
    },

    ExportDefaultDeclaration(path) {
      const node = path.node;
      if (symbolName === 'default' || 
          (node.declaration?.id?.name === symbolName)) {
        foundSymbol = {
          type: 'export',
          startLine: node.loc?.start?.line || 1,
          endLine: node.loc?.end?.line || 1,
          startColumn: node.loc?.start?.column || 0,
          endColumn: node.loc?.end?.column || 0
        };
      }
    }
  });

  if (!foundSymbol) return null;

  return buildCodeResult(
    lines, 
    foundSymbol, 
    symbolName, 
    filePath, 
    context, 
    imports
  );
}

/**
 * Extracts symbol code using regex patterns for non-JS languages
 * 
 * @param {string} content - File content
 * @param {Array} lines - File lines
 * @param {string} symbolName - Symbol name
 * @param {string} context - Context level
 * @param {string} filePath - File path
 * @returns {Object|null} Extraction result
 */
function extractSymbolCodeRegex(content, lines, symbolName, context, filePath) {
  // Python function/class patterns
  const pythonFunctionRegex = new RegExp(`^(\\s*)def\\s+${symbolName}\\s*\\([^)]*\\):`);
  const pythonClassRegex = new RegExp(`^(\\s*)class\\s+${symbolName}(?:\\([^)]*\\))?:`);
  
  // Rust function/struct patterns
  const rustFunctionRegex = new RegExp(`^\\s*(?:pub\\s+)?fn\\s+${symbolName}`);
  const rustStructRegex = new RegExp(`^\\s*(?:pub\\s+)?struct\\s+${symbolName}`);

  let foundSymbol = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check Python patterns
    let match = line.match(pythonFunctionRegex) || line.match(pythonClassRegex);
    if (match) {
      const indent = match[1] || '';
      const endLine = findPythonBlockEnd(lines, i, indent.length);
      foundSymbol = {
        type: line.includes('def ') ? 'function' : 'class',
        startLine: i + 1,
        endLine: endLine,
        startColumn: 0,
        endColumn: lines[endLine - 1]?.length || 0
      };
      break;
    }

    // Check Rust patterns
    match = line.match(rustFunctionRegex) || line.match(rustStructRegex);
    if (match) {
      const endLine = findRustBlockEnd(lines, i);
      foundSymbol = {
        type: line.includes('fn ') ? 'function' : 'struct',
        startLine: i + 1,
        endLine: endLine,
        startColumn: 0,
        endColumn: lines[endLine - 1]?.length || 0
      };
      break;
    }
  }

  if (!foundSymbol) return null;

  return buildCodeResult(
    lines, 
    foundSymbol, 
    symbolName, 
    filePath, 
    context
  );
}

/**
 * Finds the end of a Python code block based on indentation
 * 
 * @param {Array} lines - File lines
 * @param {number} startIndex - Starting line index
 * @param {number} baseIndent - Base indentation level
 * @returns {number} End line number (1-based)
 */
function findPythonBlockEnd(lines, startIndex, baseIndent) {
  for (let i = startIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    
    // Empty lines or comments continue the block
    if (line.trim() === '' || line.trim().startsWith('#')) {
      continue;
    }

    // Calculate indentation
    const indent = line.length - line.trimStart().length;
    
    // If we hit a line with same or less indentation, we've found the end
    if (indent <= baseIndent) {
      return i;
    }
  }
  
  return lines.length;
}

/**
 * Finds the end of a Rust code block based on braces
 * 
 * @param {Array} lines - File lines
 * @param {number} startIndex - Starting line index
 * @returns {number} End line number (1-based)
 */
function findRustBlockEnd(lines, startIndex) {
  let braceCount = 0;
  let foundOpenBrace = false;

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];
    
    for (const char of line) {
      if (char === '{') {
        braceCount++;
        foundOpenBrace = true;
      } else if (char === '}') {
        braceCount--;
        if (foundOpenBrace && braceCount === 0) {
          return i + 1;
        }
      }
    }
  }
  
  return lines.length;
}

/**
 * Builds the final code extraction result
 * 
 * @param {Array} lines - File lines
 * @param {Object} symbolInfo - Symbol location info
 * @param {string} symbolName - Symbol name
 * @param {string} filePath - File path
 * @param {string} context - Context level
 * @param {Array} imports - Import statements (optional)
 * @returns {Object} Code extraction result
 */
function buildCodeResult(lines, symbolInfo, symbolName, filePath, context, imports = []) {
  const { startLine, endLine } = symbolInfo;
  
  let codeStartLine = startLine;
  let codeEndLine = endLine;
  let contextLines = [];

  // Add context based on level
  if (context === 'full') {
    // Add 5 lines before and after for full context
    codeStartLine = Math.max(1, startLine - 5);
    codeEndLine = Math.min(lines.length, endLine + 5);
    
    // Capture context lines separately
    contextLines = [
      ...lines.slice(codeStartLine - 1, startLine - 1),
      ...lines.slice(endLine, codeEndLine)
    ];
  }

  // Extract the main code
  const codeLines = lines.slice(startLine - 1, endLine);
  const code = codeLines.join('\n');

  // Build dependencies list for imports
  const dependencies = imports.map(imp => ({
    source: imp.source,
    specifiers: imp.specifiers.map(spec => spec.name)
  }));

  return {
    symbol: symbolName,
    file: filePath,
    startLine,
    endLine,
    code,
    context: context === 'full' ? contextLines.join('\n') : null,
    imports: imports,
    dependencies,
    type: symbolInfo.type
  };
}

/**
 * Extracts multiple symbols from a file
 * 
 * @param {string} filePath - File path
 * @param {Array} symbolNames - Array of symbol names to extract
 * @param {string} context - Context level
 * @returns {Array} Array of extraction results
 */
export async function extractMultipleSymbols(filePath, symbolNames, context = 'minimal') {
  const results = [];

  for (const symbolName of symbolNames) {
    try {
      const result = await extractSymbolCode(filePath, symbolName, context);
      if (result) {
        results.push(result);
      }
    } catch (error) {
      console.warn(`Failed to extract ${symbolName} from ${filePath}: ${error.message}`);
    }
  }

  return results;
}

/**
 * Extracts code around a specific line number
 * 
 * @param {string} filePath - File path
 * @param {number} lineNumber - Target line number
 * @param {number} contextLines - Number of context lines before/after
 * @returns {Object} Code extraction result
 */
export function extractCodeAtLine(filePath, lineNumber, contextLines = 5) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    const startLine = Math.max(1, lineNumber - contextLines);
    const endLine = Math.min(lines.length, lineNumber + contextLines);

    const code = lines.slice(startLine - 1, endLine).join('\n');

    return {
      file: filePath,
      targetLine: lineNumber,
      startLine,
      endLine,
      code,
      contextLines: contextLines * 2 + 1
    };
  } catch (error) {
    throw new Error(`Failed to extract code at line ${lineNumber}: ${error.message}`);
  }
}