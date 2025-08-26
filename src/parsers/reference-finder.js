/**
 * Reference Finder
 * 
 * This module finds all references/usages of symbols across the codebase.
 * Unlike find-symbol which finds definitions, this finds where symbols are used.
 */

import { readFileSync } from 'fs';
import { parseJavaScript, extractImports } from '../utils/ast-utils.js';
import traverse from '@babel/traverse';

/**
 * Finds all references to a symbol across multiple files
 * 
 * @param {Array} filePaths - Array of file paths to search
 * @param {string} symbolName - Name of symbol to find references for
 * @param {Object} options - Search options
 * @returns {Object} Reference search results
 */
export async function findReferences(filePaths, symbolName, options = {}) {
  const references = [];
  const importReferences = [];
  const exportReferences = [];
  
  const searchOptions = {
    exact: options.exact || false,
    includeComments: options.includeComments || false,
    includeStrings: options.includeStrings || false,
    caseSensitive: options.caseSensitive !== false
  };

  for (const filePath of filePaths) {
    try {
      const fileReferences = await findReferencesInFile(filePath, symbolName, searchOptions);
      if (fileReferences) {
        references.push(...fileReferences.references);
        importReferences.push(...fileReferences.imports);
        exportReferences.push(...fileReferences.exports);
      }
    } catch (error) {
      console.warn(`Error finding references in ${filePath}: ${error.message}`);
    }
  }

  // Group and categorize results
  const groupedByFile = groupReferencesByFile(references);
  const groupedByType = groupReferencesByType(references);

  return {
    query: {
      symbol: symbolName,
      options: searchOptions
    },
    summary: {
      totalReferences: references.length,
      filesWithReferences: Object.keys(groupedByFile).length,
      importReferences: importReferences.length,
      exportReferences: exportReferences.length
    },
    references,
    importReferences,
    exportReferences,
    groupedByFile,
    groupedByType,
    relatedSymbols: findRelatedSymbols(references, symbolName)
  };
}

/**
 * Finds references to a symbol in a single file
 * 
 * @param {string} filePath - Path to the file
 * @param {string} symbolName - Symbol to search for
 * @param {Object} options - Search options
 * @returns {Object|null} File references
 */
async function findReferencesInFile(filePath, symbolName, options) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const language = getLanguageFromFile(filePath);

    if (language === 'javascript' || language === 'typescript') {
      return findJavaScriptReferences(content, filePath, symbolName, options);
    }

    // For other languages, use regex-based search
    return findReferencesRegex(content, filePath, symbolName, options, language);
  } catch (error) {
    console.warn(`Failed to find references in ${filePath}: ${error.message}`);
    return null;
  }
}

/**
 * Finds JavaScript/TypeScript references using AST
 * 
 * @param {string} content - File content
 * @param {string} filePath - File path
 * @param {string} symbolName - Symbol to search for
 * @param {Object} options - Search options
 * @returns {Object} References found in the file
 */
function findJavaScriptReferences(content, filePath, symbolName, options) {
  const ast = parseJavaScript(content, filePath);
  if (!ast) return null;

  const references = [];
  const imports = [];
  const exports = [];
  const lines = content.split('\n');

  traverse.default(ast, {
    Identifier(path) {
      const node = path.node;
      
      if (matchesSymbolName(node.name, symbolName, options)) {
        const context = determineIdentifierContext(path);
        
        references.push({
          name: node.name,
          file: filePath,
          line: node.loc?.start?.line || 0,
          column: node.loc?.start?.column || 0,
          context,
          usage: getUsageType(path),
          parentType: path.parent?.type || null,
          scope: path.scope?.block?.type || 'global',
          lineContent: lines[node.loc?.start?.line - 1]?.trim() || ''
        });
      }
    },

    ImportSpecifier(path) {
      const node = path.node;
      if (matchesSymbolName(node.imported?.name || node.local.name, symbolName, options)) {
        imports.push({
          name: node.imported?.name || node.local.name,
          localName: node.local.name,
          file: filePath,
          line: node.loc?.start?.line || 0,
          source: path.parent.source.value,
          type: 'named'
        });
      }
    },

    ImportDefaultSpecifier(path) {
      const node = path.node;
      if (matchesSymbolName(node.local.name, symbolName, options)) {
        imports.push({
          name: 'default',
          localName: node.local.name,
          file: filePath,
          line: node.loc?.start?.line || 0,
          source: path.parent.source.value,
          type: 'default'
        });
      }
    },

    ExportSpecifier(path) {
      const node = path.node;
      if (matchesSymbolName(node.exported.name, symbolName, options)) {
        exports.push({
          name: node.exported.name,
          localName: node.local.name,
          file: filePath,
          line: node.loc?.start?.line || 0,
          source: path.parent.source?.value || null,
          type: 'named'
        });
      }
    },

    // Handle JSX element references
    JSXIdentifier(path) {
      const node = path.node;
      if (matchesSymbolName(node.name, symbolName, options)) {
        references.push({
          name: node.name,
          file: filePath,
          line: node.loc?.start?.line || 0,
          column: node.loc?.start?.column || 0,
          context: 'jsx_element',
          usage: path.isJSXOpeningElement() ? 'component_usage' : 'jsx_reference',
          parentType: path.parent?.type || null,
          scope: 'jsx',
          lineContent: lines[node.loc?.start?.line - 1]?.trim() || ''
        });
      }
    },

    // Handle string literals if requested
    StringLiteral(path) {
      if (options.includeStrings) {
        const node = path.node;
        if (node.value.includes(symbolName)) {
          references.push({
            name: symbolName,
            file: filePath,
            line: node.loc?.start?.line || 0,
            column: node.loc?.start?.column || 0,
            context: 'string_literal',
            usage: 'string_reference',
            value: node.value,
            parentType: path.parent?.type || null,
            scope: 'string',
            lineContent: lines[node.loc?.start?.line - 1]?.trim() || ''
          });
        }
      }
    }
  });

  // Handle comments if requested
  if (options.includeComments) {
    const commentRefs = findReferencesInComments(content, symbolName, filePath, options);
    references.push(...commentRefs);
  }

  return {
    references,
    imports,
    exports
  };
}

/**
 * Finds references using regex patterns for non-JS languages
 * 
 * @param {string} content - File content
 * @param {string} filePath - File path
 * @param {string} symbolName - Symbol to search for
 * @param {Object} options - Search options
 * @param {string} language - Programming language
 * @returns {Object} References found
 */
function findReferencesRegex(content, filePath, symbolName, options, language) {
  const references = [];
  const imports = [];
  const exports = [];
  const lines = content.split('\n');

  // Create regex pattern based on options
  const flags = options.caseSensitive ? 'g' : 'gi';
  const pattern = options.exact ? 
    new RegExp(`\\b${escapeRegex(symbolName)}\\b`, flags) :
    new RegExp(escapeRegex(symbolName), flags);

  lines.forEach((line, index) => {
    const matches = [...line.matchAll(pattern)];
    matches.forEach(match => {
      const context = determineContextFromLine(line, match.index, language);
      
      references.push({
        name: match[0],
        file: filePath,
        line: index + 1,
        column: match.index || 0,
        context: context.type,
        usage: context.usage,
        lineContent: line.trim(),
        language
      });
    });

    // Check for imports/exports based on language patterns
    const importExportRefs = findImportExportReferencesRegex(line, index + 1, symbolName, filePath, language);
    imports.push(...importExportRefs.imports);
    exports.push(...importExportRefs.exports);
  });

  return { references, imports, exports };
}

/**
 * Finds references in comments
 * 
 * @param {string} content - File content
 * @param {string} symbolName - Symbol to search for
 * @param {string} filePath - File path
 * @param {Object} options - Search options
 * @returns {Array} Comment references
 */
function findReferencesInComments(content, symbolName, filePath, options) {
  const references = [];
  const lines = content.split('\n');
  
  const flags = options.caseSensitive ? 'g' : 'gi';
  const pattern = options.exact ? 
    new RegExp(`\\b${escapeRegex(symbolName)}\\b`, flags) :
    new RegExp(escapeRegex(symbolName), flags);

  lines.forEach((line, index) => {
    // Check for single-line comments
    const singleLineComment = line.match(/\/\/(.*)$/);
    if (singleLineComment) {
      const commentText = singleLineComment[1];
      const matches = [...commentText.matchAll(pattern)];
      matches.forEach(match => {
        references.push({
          name: match[0],
          file: filePath,
          line: index + 1,
          column: line.indexOf('//') + match.index + 2,
          context: 'comment',
          usage: 'comment_reference',
          lineContent: line.trim()
        });
      });
    }

    // Check for block comments (simple approach)
    const blockCommentMatch = line.match(/\/\*(.*?)\*\//g);
    if (blockCommentMatch) {
      blockCommentMatch.forEach(comment => {
        const matches = [...comment.matchAll(pattern)];
        matches.forEach(match => {
          references.push({
            name: match[0],
            file: filePath,
            line: index + 1,
            column: line.indexOf(comment) + match.index,
            context: 'comment',
            usage: 'comment_reference',
            lineContent: line.trim()
          });
        });
      });
    }
  });

  return references;
}

/**
 * Helper functions
 */

function matchesSymbolName(name, symbolName, options) {
  if (options.exact) {
    return options.caseSensitive ? name === symbolName : name.toLowerCase() === symbolName.toLowerCase();
  } else {
    return options.caseSensitive ? name.includes(symbolName) : name.toLowerCase().includes(symbolName.toLowerCase());
  }
}

function determineIdentifierContext(path) {
  // Determine the context of how the identifier is being used
  if (path.isReferencedIdentifier()) {
    if (path.isAssignmentExpression()) return 'assignment';
    if (path.isCallExpression()) return 'function_call';
    if (path.isMemberExpression()) return 'property_access';
    if (path.isVariableDeclarator()) return 'variable_declaration';
    return 'reference';
  } else if (path.isBindingIdentifier()) {
    return 'declaration';
  }
  return 'identifier';
}

function getUsageType(path) {
  if (path.parent) {
    switch (path.parent.type) {
      case 'CallExpression':
        return path.parent.callee === path.node ? 'function_call' : 'argument';
      case 'MemberExpression':
        return path.parent.object === path.node ? 'object_access' : 'property_access';
      case 'AssignmentExpression':
        return path.parent.left === path.node ? 'assignment_target' : 'assignment_value';
      case 'VariableDeclarator':
        return 'variable_initialization';
      case 'JSXOpeningElement':
        return 'jsx_component';
      case 'Property':
        return 'object_property';
      default:
        return 'reference';
    }
  }
  return 'reference';
}

function determineContextFromLine(line, index, language) {
  const beforeMatch = line.substring(0, index).trim();
  const afterMatch = line.substring(index).trim();

  // Language-specific context detection
  if (language === 'python') {
    if (beforeMatch.endsWith('def ') || beforeMatch.includes('def ')) {
      return { type: 'function_definition', usage: 'declaration' };
    }
    if (beforeMatch.endsWith('class ')) {
      return { type: 'class_definition', usage: 'declaration' };
    }
    if (beforeMatch.includes('import ') || beforeMatch.includes('from ')) {
      return { type: 'import', usage: 'import_reference' };
    }
  } else if (language === 'rust') {
    if (beforeMatch.endsWith('fn ')) {
      return { type: 'function_definition', usage: 'declaration' };
    }
    if (beforeMatch.includes('use ')) {
      return { type: 'import', usage: 'use_statement' };
    }
  }

  // Generic patterns
  if (afterMatch.startsWith('(')) {
    return { type: 'function_call', usage: 'function_call' };
  }
  if (beforeMatch.endsWith('.') || afterMatch.startsWith('.')) {
    return { type: 'property_access', usage: 'property_access' };
  }
  if (beforeMatch.includes('=') && !beforeMatch.includes('==')) {
    return { type: 'assignment', usage: 'assignment' };
  }

  return { type: 'reference', usage: 'reference' };
}

function findImportExportReferencesRegex(line, lineNumber, symbolName, filePath, language) {
  const imports = [];
  const exports = [];

  if (language === 'python') {
    // Python imports: import symbol, from module import symbol
    const importMatch = line.match(/(?:^|\s)(?:import\s+(\w+)|from\s+\w+\s+import\s+([^#\n]+))/);
    if (importMatch) {
      const imported = importMatch[1] || importMatch[2];
      if (imported && imported.includes(symbolName)) {
        imports.push({
          name: symbolName,
          file: filePath,
          line: lineNumber,
          source: 'unknown',
          type: 'import'
        });
      }
    }
  } else if (language === 'rust') {
    // Rust use statements
    const useMatch = line.match(/use\s+([^;]+);?/);
    if (useMatch && useMatch[1].includes(symbolName)) {
      imports.push({
        name: symbolName,
        file: filePath,
        line: lineNumber,
        source: useMatch[1],
        type: 'use'
      });
    }
  }

  return { imports, exports };
}

function groupReferencesByFile(references) {
  const grouped = {};
  references.forEach(ref => {
    if (!grouped[ref.file]) {
      grouped[ref.file] = [];
    }
    grouped[ref.file].push(ref);
  });

  // Sort references within each file by line number
  Object.keys(grouped).forEach(file => {
    grouped[file].sort((a, b) => a.line - b.line);
  });

  return grouped;
}

function groupReferencesByType(references) {
  const grouped = {
    declarations: [],
    references: [],
    function_calls: [],
    property_access: [],
    assignments: [],
    jsx_usage: [],
    comments: [],
    strings: [],
    other: []
  };

  references.forEach(ref => {
    switch (ref.context) {
      case 'declaration':
      case 'variable_declaration':
      case 'function_definition':
      case 'class_definition':
        grouped.declarations.push(ref);
        break;
      case 'function_call':
        grouped.function_calls.push(ref);
        break;
      case 'property_access':
      case 'object_access':
        grouped.property_access.push(ref);
        break;
      case 'assignment':
      case 'assignment_target':
      case 'assignment_value':
        grouped.assignments.push(ref);
        break;
      case 'jsx_element':
      case 'jsx_component':
        grouped.jsx_usage.push(ref);
        break;
      case 'comment':
        grouped.comments.push(ref);
        break;
      case 'string_literal':
        grouped.strings.push(ref);
        break;
      case 'reference':
        grouped.references.push(ref);
        break;
      default:
        grouped.other.push(ref);
    }
  });

  return grouped;
}

function findRelatedSymbols(references, symbolName) {
  const related = new Set();
  
  references.forEach(ref => {
    // Find symbols that appear in the same contexts
    if (ref.context === 'property_access' && ref.lineContent) {
      const propertyMatch = ref.lineContent.match(/(\w+)\.(\w+)/g);
      if (propertyMatch) {
        propertyMatch.forEach(match => {
          if (match.includes(symbolName)) {
            const parts = match.split('.');
            parts.forEach(part => {
              if (part !== symbolName) {
                related.add(part);
              }
            });
          }
        });
      }
    }
  });

  return Array.from(related);
}

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getLanguageFromFile(filename) {
  const ext = filename.split('.').pop()?.toLowerCase();
  const languageMap = {
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'py': 'python',
    'rs': 'rust',
    'go': 'go'
  };
  return languageMap[ext] || 'unknown';
}