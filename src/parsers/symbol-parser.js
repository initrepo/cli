/**
 * Symbol Parser
 * 
 * This module provides functionality to parse source code files
 * and extract symbols (functions, classes, variables, etc.) for AI consumption.
 */

import { readFileSync } from 'fs';
import { parseJavaScript, extractJavaScriptSymbols, extractSymbolsRegex, getLanguageFromFile } from '../utils/ast-utils.js';

/**
 * Parses a single file and extracts symbols
 * 
 * @param {string} filePath - Path to the file
 * @returns {Array} Array of symbols found in the file
 */
export async function parseFileSymbols(filePath) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const language = getLanguageFromFile(filePath);

    // Use AST parsing for JavaScript/TypeScript
    if (language === 'javascript' || language === 'typescript') {
      const ast = parseJavaScript(content, filePath);
      return extractJavaScriptSymbols(ast, filePath);
    }

    // Use regex patterns for other languages
    return extractSymbolsRegex(content, filePath, language);

  } catch (error) {
    console.warn(`Failed to parse symbols from ${filePath}: ${error.message}`);
    return [];
  }
}

/**
 * Searches for a specific symbol by name across files
 * 
 * @param {Array} filePaths - Array of file paths to search
 * @param {string} symbolName - Name of symbol to find
 * @param {string} symbolType - Optional type filter (function, class, variable, etc.)
 * @returns {Array} Array of matching symbols
 */
export async function findSymbol(filePaths, symbolName, symbolType = null) {
  const results = [];
  const searchName = symbolName.toLowerCase();

  for (const filePath of filePaths) {
    try {
      const symbols = await parseFileSymbols(filePath);
      
      for (const symbol of symbols) {
        // Exact match or fuzzy match
        const nameMatch = symbol.name.toLowerCase() === searchName || 
                         symbol.name.toLowerCase().includes(searchName);
        
        const typeMatch = !symbolType || symbol.type === symbolType;

        if (nameMatch && typeMatch) {
          results.push({
            ...symbol,
            matchType: symbol.name.toLowerCase() === searchName ? 'exact' : 'fuzzy',
            score: calculateMatchScore(symbol.name, symbolName)
          });
        }
      }
    } catch (error) {
      console.warn(`Error searching in ${filePath}: ${error.message}`);
    }
  }

  // Sort by match score (exact matches first, then by relevance)
  return results.sort((a, b) => {
    if (a.matchType === 'exact' && b.matchType !== 'exact') return -1;
    if (b.matchType === 'exact' && a.matchType !== 'exact') return 1;
    return b.score - a.score;
  });
}

/**
 * Gets all symbols from a list of files
 * 
 * @param {Array} filePaths - Array of file paths
 * @param {string} typeFilter - Optional type filter
 * @returns {Array} Array of all symbols
 */
export async function getAllSymbols(filePaths, typeFilter = null) {
  const allSymbols = [];

  for (const filePath of filePaths) {
    try {
      const symbols = await parseFileSymbols(filePath);
      
      const filteredSymbols = typeFilter 
        ? symbols.filter(s => s.type === typeFilter)
        : symbols;

      allSymbols.push(...filteredSymbols);
    } catch (error) {
      console.warn(`Error parsing ${filePath}: ${error.message}`);
    }
  }

  return allSymbols;
}

/**
 * Calculates a match score between two strings
 * 
 * @param {string} symbolName - Symbol name from code
 * @param {string} searchTerm - Search term from user
 * @returns {number} Match score (0-100)
 */
function calculateMatchScore(symbolName, searchTerm) {
  const symbol = symbolName.toLowerCase();
  const search = searchTerm.toLowerCase();

  // Exact match
  if (symbol === search) return 100;

  // Starts with search term
  if (symbol.startsWith(search)) return 90;

  // Contains search term
  if (symbol.includes(search)) return 70;

  // Levenshtein distance for fuzzy matching
  const distance = levenshteinDistance(symbol, search);
  const maxLength = Math.max(symbol.length, search.length);
  const similarity = (maxLength - distance) / maxLength;

  return Math.round(similarity * 50); // Max 50 points for fuzzy matches
}

/**
 * Calculates Levenshtein distance between two strings
 * 
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} Edit distance
 */
function levenshteinDistance(str1, str2) {
  const matrix = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

/**
 * Groups symbols by file for easier navigation
 * 
 * @param {Array} symbols - Array of symbols
 * @returns {Object} Symbols grouped by file
 */
export function groupSymbolsByFile(symbols) {
  const grouped = {};

  symbols.forEach(symbol => {
    if (!grouped[symbol.file]) {
      grouped[symbol.file] = [];
    }
    grouped[symbol.file].push(symbol);
  });

  // Sort symbols within each file by line number
  Object.keys(grouped).forEach(file => {
    grouped[file].sort((a, b) => (a.line || 0) - (b.line || 0));
  });

  return grouped;
}

/**
 * Filters symbols by multiple criteria
 * 
 * @param {Array} symbols - Array of symbols to filter
 * @param {Object} filters - Filter criteria
 * @returns {Array} Filtered symbols
 */
export function filterSymbols(symbols, filters = {}) {
  return symbols.filter(symbol => {
    // Type filter
    if (filters.type && symbol.type !== filters.type) {
      return false;
    }

    // File pattern filter
    if (filters.filePattern) {
      const pattern = new RegExp(filters.filePattern, 'i');
      if (!pattern.test(symbol.file)) {
        return false;
      }
    }

    // Name pattern filter
    if (filters.namePattern) {
      const pattern = new RegExp(filters.namePattern, 'i');
      if (!pattern.test(symbol.name)) {
        return false;
      }
    }

    return true;
  });
}