/**
 * Import Analyzer
 * 
 * This module analyzes import/export relationships across the codebase,
 * detects unused imports, circular dependencies, and provides dependency graphs.
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { parseJavaScript, extractImports } from '../utils/ast-utils.js';
import traverse from '@babel/traverse';

/**
 * Analyzes import/export relationships across multiple files
 * 
 * @param {Array} filePaths - Array of file paths to analyze
 * @returns {Object} Complete import analysis results
 */
export async function analyzeImports(filePaths) {
  const fileAnalysis = new Map();
  const importGraph = new Map();
  const exportGraph = new Map();

  // Step 1: Analyze each file individually
  for (const filePath of filePaths) {
    const analysis = await analyzeFileImports(filePath);
    if (analysis) {
      fileAnalysis.set(filePath, analysis);
      
      // Build import graph
      analysis.imports.forEach(imp => {
        if (!importGraph.has(filePath)) {
          importGraph.set(filePath, new Set());
        }
        importGraph.get(filePath).add(imp.resolvedPath || imp.source);
      });

      // Build export graph
      if (analysis.exports.length > 0) {
        exportGraph.set(filePath, analysis.exports);
      }
    }
  }

  // Step 2: Detect unused imports
  const unusedImports = detectUnusedImports(fileAnalysis);

  // Step 3: Detect circular dependencies
  const circularDependencies = detectCircularDependencies(importGraph);

  // Step 4: Create dependency statistics
  const dependencyStats = calculateDependencyStats(fileAnalysis);

  return {
    fileCount: fileAnalysis.size,
    totalImports: Array.from(fileAnalysis.values()).reduce((sum, file) => sum + file.imports.length, 0),
    totalExports: Array.from(fileAnalysis.values()).reduce((sum, file) => sum + file.exports.length, 0),
    unusedImports,
    circularDependencies,
    dependencyStats,
    importGraph: convertMapToObject(importGraph),
    exportGraph: convertMapToObject(exportGraph),
    fileAnalysis: convertMapToObject(fileAnalysis)
  };
}

/**
 * Analyzes imports and exports in a single file
 * 
 * @param {string} filePath - Path to the file
 * @returns {Object|null} File analysis or null if failed
 */
async function analyzeFileImports(filePath) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const language = getLanguageFromFile(filePath);

    if (language === 'javascript' || language === 'typescript') {
      return analyzeJavaScriptImports(content, filePath);
    }

    // For other languages, use basic regex patterns
    return analyzeImportsRegex(content, filePath, language);
  } catch (error) {
    console.warn(`Failed to analyze imports in ${filePath}: ${error.message}`);
    return null;
  }
}

/**
 * Analyzes JavaScript/TypeScript imports using AST
 * 
 * @param {string} content - File content
 * @param {string} filePath - File path
 * @returns {Object} Import analysis
 */
function analyzeJavaScriptImports(content, filePath) {
  const ast = parseJavaScript(content, filePath);
  if (!ast) return null;

  const imports = [];
  const exports = [];
  const usedIdentifiers = new Set();

  traverse.default(ast, {
    ImportDeclaration(path) {
      const node = path.node;
      const importInfo = {
        source: node.source.value,
        specifiers: node.specifiers.map(spec => ({
          name: spec.local.name,
          imported: spec.imported?.name || spec.local.name,
          type: spec.type,
          line: spec.loc?.start?.line || 0
        })),
        line: node.loc?.start?.line || 0,
        isTypeOnly: node.importKind === 'type'
      };
      
      // Try to resolve relative imports
      if (importInfo.source.startsWith('./') || importInfo.source.startsWith('../')) {
        importInfo.resolvedPath = resolveRelativeImport(filePath, importInfo.source);
      }
      
      imports.push(importInfo);
    },

    ExportNamedDeclaration(path) {
      const node = path.node;
      if (node.declaration) {
        // export const foo = ...
        if (node.declaration.declarations) {
          node.declaration.declarations.forEach(decl => {
            if (decl.id?.name) {
              exports.push({
                name: decl.id.name,
                type: 'named',
                line: decl.loc?.start?.line || 0
              });
            }
          });
        } else if (node.declaration.id?.name) {
          // export function foo() {} or export class Foo {}
          exports.push({
            name: node.declaration.id.name,
            type: 'named',
            line: node.declaration.loc?.start?.line || 0
          });
        }
      } else if (node.specifiers) {
        // export { foo, bar }
        node.specifiers.forEach(spec => {
          exports.push({
            name: spec.exported.name,
            type: 'named',
            line: spec.loc?.start?.line || 0,
            source: node.source?.value || null
          });
        });
      }
    },

    ExportDefaultDeclaration(path) {
      const node = path.node;
      exports.push({
        name: 'default',
        type: 'default',
        line: node.loc?.start?.line || 0,
        declaration: node.declaration.type
      });
    },

    Identifier(path) {
      // Track used identifiers to detect unused imports
      if (path.isReferencedIdentifier()) {
        usedIdentifiers.add(path.node.name);
      }
    }
  });

  return {
    imports,
    exports,
    usedIdentifiers: Array.from(usedIdentifiers),
    language: 'javascript'
  };
}

/**
 * Analyzes imports using regex patterns for non-JS languages
 * 
 * @param {string} content - File content
 * @param {string} filePath - File path
 * @param {string} language - Programming language
 * @returns {Object} Import analysis
 */
function analyzeImportsRegex(content, filePath, language) {
  const imports = [];
  const exports = [];
  const lines = content.split('\n');

  const patterns = {
    python: {
      import: /^(?:from\s+(\S+)\s+)?import\s+(.+)$/,
      export: /^__all__\s*=\s*\[([^\]]+)\]/
    },
    rust: {
      import: /^use\s+([^;]+);?$/,
      export: /^pub\s+(fn|struct|enum|trait|const|static)\s+(\w+)/
    },
    go: {
      import: /^import\s+(?:"([^"]+)"|`([^`]+)`|\(([^)]+)\))$/,
      export: /^(?:func|type|const|var)\s+([A-Z]\w*)/
    }
  };

  const langPatterns = patterns[language];
  if (!langPatterns) return { imports, exports, language };

  lines.forEach((line, index) => {
    const trimmedLine = line.trim();
    
    // Check for import patterns
    if (langPatterns.import) {
      const importMatch = trimmedLine.match(langPatterns.import);
      if (importMatch) {
        imports.push({
          source: importMatch[1] || importMatch[0],
          line: index + 1,
          raw: trimmedLine
        });
      }
    }

    // Check for export patterns
    if (langPatterns.export) {
      const exportMatch = trimmedLine.match(langPatterns.export);
      if (exportMatch) {
        exports.push({
          name: exportMatch[2] || exportMatch[1],
          type: 'named',
          line: index + 1,
          raw: trimmedLine
        });
      }
    }
  });

  return { imports, exports, language };
}

/**
 * Detects unused imports across all files
 * 
 * @param {Map} fileAnalysis - File analysis map
 * @returns {Array} Unused imports
 */
function detectUnusedImports(fileAnalysis) {
  const unusedImports = [];

  for (const [filePath, analysis] of fileAnalysis) {
    if (analysis.language === 'javascript' && analysis.usedIdentifiers) {
      const usedSet = new Set(analysis.usedIdentifiers);
      
      analysis.imports.forEach(imp => {
        imp.specifiers.forEach(spec => {
          if (!usedSet.has(spec.name) && !spec.isTypeOnly) {
            unusedImports.push({
              file: filePath,
              importSource: imp.source,
              unusedIdentifier: spec.name,
              line: spec.line,
              suggestion: `Remove unused import: ${spec.name}`
            });
          }
        });
      });
    }
  }

  return unusedImports;
}

/**
 * Detects circular dependencies in the import graph
 * 
 * @param {Map} importGraph - Import dependency graph
 * @returns {Array} Circular dependency chains
 */
function detectCircularDependencies(importGraph) {
  const visited = new Set();
  const visiting = new Set();
  const cycles = [];

  function findCycles(file, path = []) {
    if (visiting.has(file)) {
      // Found a cycle
      const cycleStart = path.indexOf(file);
      if (cycleStart !== -1) {
        cycles.push([...path.slice(cycleStart), file]);
      }
      return;
    }

    if (visited.has(file)) return;

    visiting.add(file);
    const dependencies = importGraph.get(file) || new Set();

    for (const dep of dependencies) {
      findCycles(dep, [...path, file]);
    }

    visiting.delete(file);
    visited.add(file);
  }

  for (const file of importGraph.keys()) {
    if (!visited.has(file)) {
      findCycles(file);
    }
  }

  return cycles.map(cycle => ({
    cycle,
    length: cycle.length - 1,
    severity: cycle.length > 3 ? 'high' : 'medium'
  }));
}

/**
 * Calculates dependency statistics
 * 
 * @param {Map} fileAnalysis - File analysis map
 * @returns {Object} Dependency statistics
 */
function calculateDependencyStats(fileAnalysis) {
  const stats = {
    totalFiles: fileAnalysis.size,
    filesWithImports: 0,
    filesWithExports: 0,
    averageImportsPerFile: 0,
    averageExportsPerFile: 0,
    mostImportedFiles: [],
    mostExportingFiles: [],
    externalDependencies: new Set(),
    internalDependencies: new Set()
  };

  let totalImports = 0;
  let totalExports = 0;
  const importCounts = new Map();
  const exportCounts = new Map();

  for (const [filePath, analysis] of fileAnalysis) {
    const importCount = analysis.imports.length;
    const exportCount = analysis.exports.length;

    if (importCount > 0) stats.filesWithImports++;
    if (exportCount > 0) stats.filesWithExports++;

    totalImports += importCount;
    totalExports += exportCount;

    importCounts.set(filePath, importCount);
    exportCounts.set(filePath, exportCount);

    // Categorize dependencies
    analysis.imports.forEach(imp => {
      if (imp.source.startsWith('./') || imp.source.startsWith('../')) {
        stats.internalDependencies.add(imp.source);
      } else {
        stats.externalDependencies.add(imp.source);
      }
    });
  }

  stats.averageImportsPerFile = stats.totalFiles > 0 ? totalImports / stats.totalFiles : 0;
  stats.averageExportsPerFile = stats.totalFiles > 0 ? totalExports / stats.totalFiles : 0;

  // Find most importing/exporting files
  stats.mostImportingFiles = Array.from(importCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([file, count]) => ({ file, importCount: count }));

  stats.mostExportingFiles = Array.from(exportCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([file, count]) => ({ file, exportCount: count }));

  // Convert sets to arrays for JSON serialization
  stats.externalDependencies = Array.from(stats.externalDependencies);
  stats.internalDependencies = Array.from(stats.internalDependencies);

  return stats;
}

/**
 * Utility functions
 */

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

function resolveRelativeImport(currentFile, importPath) {
  // Basic relative path resolution - could be enhanced
  try {
    return resolve(dirname(currentFile), importPath);
  } catch {
    return importPath;
  }
}

function convertMapToObject(map) {
  const obj = {};
  for (const [key, value] of map) {
    if (value instanceof Set) {
      obj[key] = Array.from(value);
    } else {
      obj[key] = value;
    }
  }
  return obj;
}