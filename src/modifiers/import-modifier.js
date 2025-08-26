/**
 * Import Modifier
 * 
 * This module provides functionality to safely manage imports:
 * - Add new imports
 * - Remove unused imports
 * - Organize import statements
 * - Update import paths
 */

import { readFileSync, writeFileSync } from 'fs';
import { parseJavaScript, extractImports, getLanguageFromFile } from '../utils/ast-utils.js';
import { parse, print } from 'recast';
import jscodeshift from 'jscodeshift';

/**
 * Manages imports in a file or multiple files
 * 
 * @param {Array} filePaths - Array of file paths to modify
 * @param {Object} operations - Import operations to perform
 * @param {Object} options - Operation options
 * @returns {Object} Operation result
 */
export async function manageImports(filePaths, operations, options = {}) {
  const {
    dryRun = false,
    organize = false,
    removeUnused = false,
    addMissing = false
  } = options;

  const results = {
    success: true,
    filesModified: 0,
    totalChanges: 0,
    changes: [],
    errors: []
  };

  for (const filePath of filePaths) {
    try {
      const result = await modifyFileImports(filePath, operations, options);
      
      if (result.success && result.modified) {
        results.filesModified++;
        results.totalChanges += result.changes.length;
        results.changes.push({
          file: filePath,
          changes: result.changes,
          preview: result.preview
        });
      }

      if (result.errors?.length > 0) {
        results.errors.push(...result.errors.map(err => ({ file: filePath, error: err })));
      }

    } catch (error) {
      results.errors.push({
        file: filePath,
        error: error.message
      });
    }
  }

  if (results.errors.length > 0) {
    results.success = false;
  }

  return results;
}

/**
 * Modifies imports in a single file
 * 
 * @param {string} filePath - File to modify
 * @param {Object} operations - Import operations
 * @param {Object} options - Options
 * @returns {Object} Modification result
 */
async function modifyFileImports(filePath, operations, options = {}) {
  const { dryRun = false, organize = false } = options;
  
  try {
    const content = readFileSync(filePath, 'utf-8');
    const language = getLanguageFromFile(filePath);

    // Only support JavaScript/TypeScript for now
    if (language !== 'javascript' && language !== 'typescript') {
      return {
        success: true,
        modified: false,
        changes: [],
        message: `Import management not supported for ${language} files`
      };
    }

    return await modifyJavaScriptImports(filePath, content, operations, options);

  } catch (error) {
    return {
      success: false,
      error: `Failed to modify imports in ${filePath}: ${error.message}`,
      modified: false,
      changes: []
    };
  }
}

/**
 * Modifies JavaScript/TypeScript imports using AST
 * 
 * @param {string} filePath - File path
 * @param {string} content - File content
 * @param {Object} operations - Import operations
 * @param {Object} options - Options
 * @returns {Object} Modification result
 */
async function modifyJavaScriptImports(filePath, content, operations, options = {}) {
  const { dryRun = false, organize = false, removeUnused = false } = options;

  try {
    const ast = parseJavaScript(content, filePath);
    if (!ast) {
      throw new Error('Failed to parse JavaScript/TypeScript');
    }

    const j = jscodeshift.withParser('babylon');
    const root = j(ast);
    const changes = [];

    // Extract current imports
    const currentImports = extractImports(ast);
    
    // Perform operations
    if (operations.add && operations.add.length > 0) {
      const addResult = addImports(root, operations.add, currentImports);
      changes.push(...addResult.changes);
    }

    if (operations.remove && operations.remove.length > 0) {
      const removeResult = removeImports(root, operations.remove);
      changes.push(...removeResult.changes);
    }

    if (operations.update && operations.update.length > 0) {
      const updateResult = updateImports(root, operations.update);
      changes.push(...updateResult.changes);
    }

    if (removeUnused) {
      const cleanResult = removeUnusedImports(root, filePath, content);
      changes.push(...cleanResult.changes);
    }

    if (organize) {
      const organizeResult = organizeImports(root);
      changes.push(...organizeResult.changes);
    }

    // Generate new content
    const transformed = root.toSource({
      quote: 'single',
      reuseParsers: true
    });

    const modified = transformed !== content;
    const preview = modified ? generatePreview(content, transformed, filePath) : null;

    // Write file if not dry run and content changed
    if (!dryRun && modified) {
      writeFileSync(filePath, transformed, 'utf-8');
    }

    return {
      success: true,
      modified,
      changes,
      preview
    };

  } catch (error) {
    return {
      success: false,
      error: `AST transformation failed: ${error.message}`,
      modified: false,
      changes: []
    };
  }
}

/**
 * Adds new import statements
 * 
 * @param {Object} root - jscodeshift root
 * @param {Array} imports - Imports to add
 * @param {Array} currentImports - Current imports to check for duplicates
 * @returns {Object} Add operation result
 */
function addImports(root, imports, currentImports) {
  const j = jscodeshift;
  const changes = [];

  for (const importSpec of imports) {
    const { source, specifiers = [], defaultImport } = importSpec;

    // Check if import already exists
    const exists = currentImports.some(imp => imp.source === source);
    if (exists) {
      changes.push({
        type: 'skip',
        action: 'add',
        source,
        reason: 'Import already exists'
      });
      continue;
    }

    // Create import declaration
    let importDeclaration;

    if (defaultImport && specifiers.length === 0) {
      // Default import only: import React from 'react'
      importDeclaration = j.importDeclaration(
        [j.importDefaultSpecifier(j.identifier(defaultImport))],
        j.literal(source)
      );
    } else if (specifiers.length > 0 && !defaultImport) {
      // Named imports only: import { useState, useEffect } from 'react'
      const namedSpecifiers = specifiers.map(spec =>
        j.importSpecifier(j.identifier(spec.imported || spec.name), j.identifier(spec.name))
      );
      importDeclaration = j.importDeclaration(namedSpecifiers, j.literal(source));
    } else if (defaultImport && specifiers.length > 0) {
      // Mixed: import React, { useState } from 'react'
      const namedSpecifiers = specifiers.map(spec =>
        j.importSpecifier(j.identifier(spec.imported || spec.name), j.identifier(spec.name))
      );
      importDeclaration = j.importDeclaration(
        [j.importDefaultSpecifier(j.identifier(defaultImport)), ...namedSpecifiers],
        j.literal(source)
      );
    } else {
      // Side effect import: import 'style.css'
      importDeclaration = j.importDeclaration([], j.literal(source));
    }

    // Add to the top of the file
    const body = root.find(j.Program).get('body');
    const firstNonImport = body.value.findIndex(node => 
      node.type !== 'ImportDeclaration'
    );

    if (firstNonImport === -1) {
      body.value.push(importDeclaration);
    } else {
      body.value.splice(firstNonImport, 0, importDeclaration);
    }

    changes.push({
      type: 'add',
      action: 'add',
      source,
      defaultImport,
      specifiers
    });
  }

  return { changes };
}

/**
 * Removes import statements
 * 
 * @param {Object} root - jscodeshift root
 * @param {Array} imports - Imports to remove
 * @returns {Object} Remove operation result
 */
function removeImports(root, imports) {
  const j = jscodeshift;
  const changes = [];

  for (const importSpec of imports) {
    const { source, specifiers = [], removeAll = false } = importSpec;

    if (removeAll) {
      // Remove entire import declaration
      root.find(j.ImportDeclaration, { source: { value: source } })
        .forEach(path => {
          changes.push({
            type: 'remove',
            action: 'remove_all',
            source
          });
          j(path).remove();
        });
    } else {
      // Remove specific specifiers
      root.find(j.ImportDeclaration, { source: { value: source } })
        .forEach(path => {
          const declaration = path.value;
          const newSpecifiers = declaration.specifiers.filter(spec => {
            if (spec.type === 'ImportDefaultSpecifier') {
              return !specifiers.includes('default');
            }
            return !specifiers.includes(spec.imported?.name || spec.local.name);
          });

          if (newSpecifiers.length === 0) {
            // Remove entire declaration if no specifiers left
            j(path).remove();
            changes.push({
              type: 'remove',
              action: 'remove_all',
              source
            });
          } else {
            // Update specifiers
            declaration.specifiers = newSpecifiers;
            changes.push({
              type: 'remove',
              action: 'remove_specifiers',
              source,
              specifiers
            });
          }
        });
    }
  }

  return { changes };
}

/**
 * Updates import statements (changes source paths)
 * 
 * @param {Object} root - jscodeshift root
 * @param {Array} updates - Import updates
 * @returns {Object} Update operation result
 */
function updateImports(root, updates) {
  const j = jscodeshift;
  const changes = [];

  for (const update of updates) {
    const { oldSource, newSource } = update;

    root.find(j.ImportDeclaration, { source: { value: oldSource } })
      .forEach(path => {
        path.value.source.value = newSource;
        changes.push({
          type: 'update',
          action: 'update_source',
          oldSource,
          newSource
        });
      });
  }

  return { changes };
}

/**
 * Removes unused imports (basic implementation)
 * 
 * @param {Object} root - jscodeshift root
 * @param {string} filePath - File path for context
 * @param {string} content - File content for usage analysis
 * @returns {Object} Cleanup operation result
 */
function removeUnusedImports(root, filePath, content) {
  const j = jscodeshift;
  const changes = [];

  // Simple unused import detection - looks for identifiers in code
  root.find(j.ImportDeclaration)
    .forEach(path => {
      const declaration = path.value;
      const source = declaration.source.value;
      const unusedSpecifiers = [];

      declaration.specifiers.forEach(spec => {
        let identifier;
        if (spec.type === 'ImportDefaultSpecifier') {
          identifier = spec.local.name;
        } else if (spec.type === 'ImportSpecifier') {
          identifier = spec.local.name;
        }

        if (identifier) {
          // Simple check - look for identifier in content (excluding import line)
          const importRegex = new RegExp(`import.*from\\s+['"]${source}['"]`);
          const contentWithoutImport = content.replace(importRegex, '');
          const usageRegex = new RegExp(`\\b${identifier}\\b`);
          
          if (!usageRegex.test(contentWithoutImport)) {
            unusedSpecifiers.push(spec);
          }
        }
      });

      // Remove unused specifiers
      if (unusedSpecifiers.length > 0) {
        if (unusedSpecifiers.length === declaration.specifiers.length) {
          // Remove entire import
          j(path).remove();
          changes.push({
            type: 'remove_unused',
            action: 'remove_all',
            source
          });
        } else {
          // Remove only unused specifiers
          declaration.specifiers = declaration.specifiers.filter(spec => 
            !unusedSpecifiers.includes(spec)
          );
          changes.push({
            type: 'remove_unused',
            action: 'remove_specifiers',
            source,
            specifiers: unusedSpecifiers.map(s => s.local.name)
          });
        }
      }
    });

  return { changes };
}

/**
 * Organizes imports by grouping and sorting
 * 
 * @param {Object} root - jscodeshift root
 * @returns {Object} Organize operation result
 */
function organizeImports(root) {
  const j = jscodeshift;
  const changes = [];
  
  // Get all import declarations
  const imports = [];
  root.find(j.ImportDeclaration).forEach(path => {
    imports.push(path.value);
    j(path).remove();
  });

  if (imports.length === 0) {
    return { changes: [] };
  }

  // Group imports
  const groups = {
    external: [], // npm packages
    internal: [], // relative imports starting with ./ or ../
    types: []     // type imports
  };

  imports.forEach(imp => {
    const source = imp.source.value;
    
    if (source.startsWith('.')) {
      groups.internal.push(imp);
    } else {
      groups.external.push(imp);
    }
  });

  // Sort each group
  const sortImports = (a, b) => a.source.value.localeCompare(b.source.value);
  groups.external.sort(sortImports);
  groups.internal.sort(sortImports);

  // Add back to AST in order
  const body = root.find(j.Program).get('body');
  const organizedImports = [
    ...groups.external,
    ...(groups.external.length > 0 && groups.internal.length > 0 ? [] : []),
    ...groups.internal
  ];

  // Insert at the beginning
  organizedImports.reverse().forEach(imp => {
    body.value.unshift(imp);
  });

  if (organizedImports.length > 0) {
    changes.push({
      type: 'organize',
      action: 'organize',
      totalImports: organizedImports.length,
      groups: {
        external: groups.external.length,
        internal: groups.internal.length
      }
    });
  }

  return { changes };
}

/**
 * Generates a preview of changes
 * 
 * @param {string} original - Original content
 * @param {string} modified - Modified content
 * @param {string} filePath - File path
 * @returns {Object} Preview information
 */
function generatePreview(original, modified, filePath) {
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
    changes: changes.slice(0, 10) // Limit preview
  };
}

/**
 * Validates import operations
 * 
 * @param {Object} operations - Import operations to validate
 * @returns {Object} Validation result
 */
export function validateImportOperations(operations) {
  const errors = [];

  if (operations.add) {
    operations.add.forEach((imp, index) => {
      if (!imp.source) {
        errors.push(`Add operation ${index}: source is required`);
      }
    });
  }

  if (operations.remove) {
    operations.remove.forEach((imp, index) => {
      if (!imp.source) {
        errors.push(`Remove operation ${index}: source is required`);
      }
    });
  }

  if (operations.update) {
    operations.update.forEach((imp, index) => {
      if (!imp.oldSource || !imp.newSource) {
        errors.push(`Update operation ${index}: both oldSource and newSource are required`);
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors
  };
}