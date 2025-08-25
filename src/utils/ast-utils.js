/**
 * AST (Abstract Syntax Tree) Utilities
 * 
 * This module provides utilities for parsing and analyzing code using AST.
 * Primarily focuses on JavaScript/TypeScript but includes patterns for other languages.
 */

import { parse } from '@babel/parser';
import traverse from '@babel/traverse';

/**
 * Parses JavaScript/TypeScript code into AST
 * 
 * @param {string} code - Source code to parse
 * @param {string} filename - Optional filename for better error messages
 * @returns {Object} AST or null if parsing fails
 */
export function parseJavaScript(code, filename = 'unknown') {
  try {
    return parse(code, {
      sourceType: 'module',
      allowImportExportEverywhere: true,
      allowReturnOutsideFunction: true,
      plugins: [
        'jsx',
        'typescript',
        'decorators-legacy',
        'classProperties',
        'asyncGenerators',
        'functionBind',
        'exportDefaultFrom',
        'exportNamespaceFrom',
        'dynamicImport',
        'nullishCoalescingOperator',
        'optionalChaining'
      ]
    });
  } catch (error) {
    console.warn(`Failed to parse ${filename}: ${error.message}`);
    return null;
  }
}

/**
 * Extracts symbols (functions, classes, variables) from JavaScript/TypeScript AST
 * 
 * @param {Object} ast - Babel AST
 * @param {string} filename - Source filename
 * @returns {Array} Array of symbol objects
 */
export function extractJavaScriptSymbols(ast, filename) {
  if (!ast) return [];

  const symbols = [];

  traverse.default(ast, {
    FunctionDeclaration(path) {
      const node = path.node;
      symbols.push({
        name: node.id?.name || 'anonymous',
        type: 'function',
        file: filename,
        line: node.loc?.start?.line || 0,
        column: node.loc?.start?.column || 0,
        signature: generateFunctionSignature(node),
        async: node.async,
        generator: node.generator
      });
    },

    ClassDeclaration(path) {
      const node = path.node;
      symbols.push({
        name: node.id?.name || 'anonymous',
        type: 'class',
        file: filename,
        line: node.loc?.start?.line || 0,
        column: node.loc?.start?.column || 0,
        signature: `class ${node.id?.name || 'anonymous'}`,
        superClass: node.superClass?.name || null
      });
    },

    VariableDeclarator(path) {
      const node = path.node;
      if (node.id?.name && path.isVariableDeclarator()) {
        const kind = path.parent.kind; // const, let, var
        symbols.push({
          name: node.id.name,
          type: 'variable',
          file: filename,
          line: node.loc?.start?.line || 0,
          column: node.loc?.start?.column || 0,
          signature: `${kind} ${node.id.name}`,
          kind
        });
      }
    },

    ExportDefaultDeclaration(path) {
      const node = path.node;
      let name = 'default';
      let type = 'export';
      
      if (node.declaration) {
        if (node.declaration.id?.name) {
          name = node.declaration.id.name;
        } else if (node.declaration.type === 'FunctionExpression') {
          type = 'function';
          name = node.declaration.id?.name || 'default';
        } else if (node.declaration.type === 'ClassExpression') {
          type = 'class';
          name = node.declaration.id?.name || 'default';
        }
      }

      symbols.push({
        name,
        type,
        file: filename,
        line: node.loc?.start?.line || 0,
        column: node.loc?.start?.column || 0,
        signature: `export default ${name}`,
        export: true
      });
    },

    ExportNamedDeclaration(path) {
      const node = path.node;
      if (node.declaration) {
        // Handle export function, export class, etc.
        if (node.declaration.id?.name) {
          symbols.push({
            name: node.declaration.id.name,
            type: node.declaration.type.toLowerCase().replace('declaration', ''),
            file: filename,
            line: node.loc?.start?.line || 0,
            column: node.loc?.start?.column || 0,
            signature: `export ${node.declaration.id.name}`,
            export: true
          });
        }
      }
    }
  });

  return symbols;
}

/**
 * Extracts imports from JavaScript/TypeScript AST
 * 
 * @param {Object} ast - Babel AST
 * @returns {Array} Array of import objects
 */
export function extractImports(ast) {
  if (!ast) return [];

  const imports = [];

  traverse.default(ast, {
    ImportDeclaration(path) {
      const node = path.node;
      imports.push({
        source: node.source.value,
        specifiers: node.specifiers.map(spec => ({
          name: spec.local.name,
          imported: spec.imported?.name || 'default',
          type: spec.type
        }))
      });
    }
  });

  return imports;
}

/**
 * Generates a function signature string from AST node
 * 
 * @param {Object} node - Function AST node
 * @returns {string} Function signature
 */
function generateFunctionSignature(node) {
  const name = node.id?.name || 'anonymous';
  const params = node.params.map(param => {
    if (param.type === 'Identifier') {
      return param.name;
    } else if (param.type === 'AssignmentPattern') {
      return `${param.left.name} = ...`;
    } else if (param.type === 'RestElement') {
      return `...${param.argument.name}`;
    }
    return 'param';
  }).join(', ');

  const async = node.async ? 'async ' : '';
  const generator = node.generator ? '*' : '';
  
  return `${async}function${generator} ${name}(${params})`;
}

/**
 * Simple regex-based symbol extraction for non-JavaScript files
 * 
 * @param {string} content - File content
 * @param {string} filename - Source filename
 * @param {string} language - Programming language
 * @returns {Array} Array of symbol objects
 */
export function extractSymbolsRegex(content, filename, language) {
  const symbols = [];
  const lines = content.split('\n');

  // Language-specific patterns
  const patterns = {
    python: [
      { regex: /^def\s+(\w+)\s*\([^)]*\):/g, type: 'function' },
      { regex: /^class\s+(\w+)(?:\([^)]*\))?:/g, type: 'class' },
      { regex: /^(\w+)\s*=\s*(?:lambda|[\w\[\]{}'".-]+)/g, type: 'variable' }
    ],
    rust: [
      { regex: /^(?:pub\s+)?fn\s+(\w+)/g, type: 'function' },
      { regex: /^(?:pub\s+)?struct\s+(\w+)/g, type: 'struct' },
      { regex: /^(?:pub\s+)?enum\s+(\w+)/g, type: 'enum' },
      { regex: /^(?:pub\s+)?trait\s+(\w+)/g, type: 'trait' }
    ],
    go: [
      { regex: /^func\s+(?:\([^)]*\)\s+)?(\w+)/g, type: 'function' },
      { regex: /^type\s+(\w+)\s+struct/g, type: 'struct' },
      { regex: /^type\s+(\w+)\s+interface/g, type: 'interface' }
    ],
    java: [
      { regex: /(?:public|private|protected)?\s*(?:static)?\s*(?:final)?\s*(?:abstract)?\s*class\s+(\w+)/g, type: 'class' },
      { regex: /(?:public|private|protected)?\s*(?:static)?\s*(?:final)?\s*(?:abstract)?\s*interface\s+(\w+)/g, type: 'interface' },
      { regex: /(?:public|private|protected)?\s*(?:static)?\s*(?:final)?\s*\w+\s+(\w+)\s*\([^)]*\)/g, type: 'method' }
    ]
  };

  const langPatterns = patterns[language] || [];

  lines.forEach((line, index) => {
    langPatterns.forEach(({ regex, type }) => {
      const matches = [...line.matchAll(regex)];
      matches.forEach(match => {
        if (match[1]) {
          symbols.push({
            name: match[1],
            type,
            file: filename,
            line: index + 1,
            column: match.index || 0,
            signature: line.trim()
          });
        }
      });
    });
  });

  return symbols;
}

/**
 * Gets the programming language from file extension
 * 
 * @param {string} filename - File name
 * @returns {string} Programming language identifier
 */
export function getLanguageFromFile(filename) {
  const ext = filename.split('.').pop()?.toLowerCase();
  
  const languageMap = {
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'py': 'python',
    'rs': 'rust',
    'go': 'go',
    'java': 'java',
    'kt': 'kotlin',
    'rb': 'ruby',
    'php': 'php',
    'cpp': 'cpp',
    'c': 'c',
    'h': 'c',
    'hpp': 'cpp',
    'cs': 'csharp',
    'swift': 'swift'
  };

  return languageMap[ext] || 'unknown';
}