/**
 * Rename Modifier
 * 
 * This module provides safe symbol renaming functionality across multiple files
 * using AST-based transformations for accuracy and safety.
 */

import { readFileSync, writeFileSync } from 'fs';
import { parseJavaScript, getLanguageFromFile } from '../utils/ast-utils.js';
import { findSymbol } from '../parsers/symbol-parser.js';
import jscodeshift from 'jscodeshift';
import { parse, print } from 'recast';

/**
 * Safely renames a symbol across multiple files
 * 
 * @param {Array} filePaths - Array of file paths to search and modify
 * @param {string} oldName - Current symbol name
 * @param {string} newName - New symbol name
 * @param {Object} options - Rename options
 * @returns {Object} Rename operation result
 */
export async function renameSymbol(filePaths, oldName, newName, options = {}) {
  const {
    symbolType = null,
    dryRun = false,
    exact = true,
    scope = 'all' // 'file', 'directory', 'all'
  } = options;

  // First, find all occurrences of the symbol
  const symbolMatches = await findSymbol(filePaths, oldName, symbolType);
  
  if (symbolMatches.length === 0) {
    return {
      success: false,
      error: `Symbol '${oldName}' not found in any files`,
      filesModified: 0,
      occurrencesRenamed: 0
    };
  }

  // Group matches by file for processing
  const fileGroups = {};
  symbolMatches.forEach(match => {
    if (!fileGroups[match.file]) {
      fileGroups[match.file] = [];
    }
    fileGroups[match.file].push(match);
  });

  const results = {
    success: true,
    filesModified: 0,
    occurrencesRenamed: 0,
    changes: [],
    errors: []
  };

  // Process each file
  for (const [filePath, matches] of Object.entries(fileGroups)) {
    try {
      const result = await renameInFile(filePath, oldName, newName, matches, { dryRun, exact });
      
      if (result.success) {
        results.filesModified++;
        results.occurrencesRenamed += result.occurrencesRenamed;
        results.changes.push({
          file: filePath,
          occurrencesRenamed: result.occurrencesRenamed,
          preview: result.preview
        });
      } else {
        results.errors.push({
          file: filePath,
          error: result.error
        });
      }
    } catch (error) {
      results.errors.push({
        file: filePath,
        error: error.message
      });
    }
  }

  // If any errors occurred, mark as failed
  if (results.errors.length > 0) {
    results.success = false;
  }

  return results;
}

/**
 * Renames symbol in a single file
 * 
 * @param {string} filePath - File to modify
 * @param {string} oldName - Old symbol name
 * @param {string} newName - New symbol name
 * @param {Array} matches - Symbol matches in this file
 * @param {Object} options - Options
 * @returns {Object} File modification result
 */
async function renameInFile(filePath, oldName, newName, matches, options = {}) {
  const { dryRun = false, exact = true } = options;
  
  try {
    const content = readFileSync(filePath, 'utf-8');
    const language = getLanguageFromFile(filePath);

    // Use AST-based renaming for JavaScript/TypeScript
    if (language === 'javascript' || language === 'typescript') {
      return await renameJavaScriptSymbol(filePath, content, oldName, newName, matches, { dryRun, exact });
    }

    // Use regex-based renaming for other languages
    return await renameWithRegex(filePath, content, oldName, newName, matches, { dryRun, exact });

  } catch (error) {
    return {
      success: false,
      error: `Failed to process ${filePath}: ${error.message}`,
      occurrencesRenamed: 0
    };
  }
}

/**
 * Renames JavaScript/TypeScript symbols using AST transformation
 * 
 * @param {string} filePath - File path
 * @param {string} content - File content
 * @param {string} oldName - Old name
 * @param {string} newName - New name
 * @param {Array} matches - Symbol matches
 * @param {Object} options - Options
 * @returns {Object} Rename result
 */
async function renameJavaScriptSymbol(filePath, content, oldName, newName, matches, options = {}) {
  const { dryRun = false } = options;

  try {
    // Parse with recast to preserve formatting
    const ast = parse(content, {
      parser: {
        parse: (source) => parseJavaScript(source, filePath)
      }
    });

    let occurrencesRenamed = 0;
    const j = jscodeshift.withParser('babylon');

    // Transform the AST
    const transformed = j(ast)
      .find(j.Identifier, { name: oldName })
      .forEach(path => {
        // Ensure we're renaming the correct symbol type and context
        if (isValidRenameContext(path, matches)) {
          path.node.name = newName;
          occurrencesRenamed++;
        }
      })
      .toSource({ quote: 'single', reuseParsers: true });

    if (occurrencesRenamed === 0) {
      return {
        success: true,
        occurrencesRenamed: 0,
        preview: null
      };
    }

    // Generate preview
    const preview = generatePreview(content, transformed, filePath);

    // Write file if not dry run
    if (!dryRun && transformed !== content) {
      writeFileSync(filePath, transformed, 'utf-8');
    }

    return {
      success: true,
      occurrencesRenamed,
      preview,
      modified: !dryRun && transformed !== content
    };

  } catch (error) {
    return {
      success: false,
      error: `AST transformation failed: ${error.message}`,
      occurrencesRenamed: 0
    };
  }
}

/**
 * Renames symbols using regex for non-JavaScript languages
 * 
 * @param {string} filePath - File path
 * @param {string} content - File content
 * @param {string} oldName - Old name
 * @param {string} newName - New name
 * @param {Array} matches - Symbol matches
 * @param {Object} options - Options
 * @returns {Object} Rename result
 */
async function renameWithRegex(filePath, content, oldName, newName, matches, options = {}) {
  const { dryRun = false, exact = true } = options;

  try {
    let modifiedContent = content;
    let occurrencesRenamed = 0;

    // Create word boundary regex for exact matches
    const pattern = exact 
      ? new RegExp(`\\b${escapeRegExp(oldName)}\\b`, 'g')
      : new RegExp(escapeRegExp(oldName), 'g');

    // Apply replacement
    modifiedContent = content.replace(pattern, (match, offset) => {
      // Check if this replacement is in a valid context based on matches
      const line = content.substring(0, offset).split('\n').length;
      const isValidContext = matches.some(m => Math.abs(m.line - line) <= 2);
      
      if (isValidContext) {
        occurrencesRenamed++;
        return newName;
      }
      return match;
    });

    const preview = generatePreview(content, modifiedContent, filePath);

    // Write file if not dry run
    if (!dryRun && modifiedContent !== content) {
      writeFileSync(filePath, modifiedContent, 'utf-8');
    }

    return {
      success: true,
      occurrencesRenamed,
      preview,
      modified: !dryRun && modifiedContent !== content
    };

  } catch (error) {
    return {
      success: false,
      error: `Regex replacement failed: ${error.message}`,
      occurrencesRenamed: 0
    };
  }
}

/**
 * Checks if an identifier is in a valid context for renaming
 * 
 * @param {Object} path - AST path
 * @param {Array} matches - Symbol matches to validate against
 * @returns {boolean} Whether this is a valid rename context
 */
function isValidRenameContext(path, matches) {
  // Get the line number of this identifier
  const line = path.node.loc?.start?.line;
  if (!line) return false;

  // Check if this line matches one of our expected symbol locations
  return matches.some(match => Math.abs(match.line - line) <= 1);
}

/**
 * Generates a preview of changes made
 * 
 * @param {string} original - Original content
 * @param {string} modified - Modified content
 * @param {string} filePath - File path
 * @returns {Object} Preview information
 */
function generatePreview(original, modified, filePath) {
  if (original === modified) {
    return null;
  }

  const originalLines = original.split('\n');
  const modifiedLines = modified.split('\n');
  const changes = [];

  for (let i = 0; i < Math.max(originalLines.length, modifiedLines.length); i++) {
    const origLine = originalLines[i] || '';
    const modLine = modifiedLines[i] || '';
    
    if (origLine !== modLine) {
      changes.push({
        lineNumber: i + 1,
        original: origLine,
        modified: modLine
      });
    }
  }

  return {
    file: filePath,
    totalChanges: changes.length,
    changes: changes.slice(0, 5) // Limit to first 5 changes for preview
  };
}

/**
 * Escapes special regex characters
 * 
 * @param {string} string - String to escape
 * @returns {string} Escaped string
 */
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Validates rename operation before execution
 * 
 * @param {string} oldName - Old symbol name
 * @param {string} newName - New symbol name
 * @returns {Object} Validation result
 */
export function validateRename(oldName, newName) {
  const errors = [];

  if (!oldName || !oldName.trim()) {
    errors.push('Old name cannot be empty');
  }

  if (!newName || !newName.trim()) {
    errors.push('New name cannot be empty');
  }

  if (oldName === newName) {
    errors.push('Old and new names cannot be the same');
  }

  // Validate identifier format (basic check)
  if (newName && !/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(newName)) {
    errors.push('New name must be a valid identifier');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}