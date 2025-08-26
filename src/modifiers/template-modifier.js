/**
 * Template Modifier
 * 
 * This module provides functionality to apply code templates and snippets:
 * - Insert code templates at specific locations
 * - Replace code blocks with templates
 * - Apply patterns with variable substitution
 */

import { readFileSync, writeFileSync } from 'fs';
import { parseJavaScript, getLanguageFromFile } from '../utils/ast-utils.js';
import { parse } from 'recast';
import jscodeshift from 'jscodeshift';

/**
 * Applies code templates to files
 * 
 * @param {Array} filePaths - Array of file paths to modify
 * @param {Object} template - Template configuration
 * @param {Object} options - Application options
 * @returns {Object} Application result
 */
export async function applyTemplate(filePaths, template, options = {}) {
  const {
    dryRun = false,
    position = 'end', // 'start', 'end', 'before', 'after', 'replace'
    target = null,     // target symbol/line for positioning
    variables = {}     // variables for template substitution
  } = options;

  const results = {
    success: true,
    filesModified: 0,
    totalInsertions: 0,
    changes: [],
    errors: []
  };

  for (const filePath of filePaths) {
    try {
      const result = await applyTemplateToFile(filePath, template, options);
      
      if (result.success && result.modified) {
        results.filesModified++;
        results.totalInsertions += result.insertions;
        results.changes.push({
          file: filePath,
          insertions: result.insertions,
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
 * Applies template to a single file
 * 
 * @param {string} filePath - File to modify
 * @param {Object} template - Template configuration
 * @param {Object} options - Options
 * @returns {Object} Application result
 */
async function applyTemplateToFile(filePath, template, options = {}) {
  const { dryRun = false } = options;
  
  try {
    const content = readFileSync(filePath, 'utf-8');
    const language = getLanguageFromFile(filePath);

    // Process template content with variables
    const processedTemplate = processTemplate(template.content, options.variables || {});

    // Apply based on file type
    if (language === 'javascript' || language === 'typescript') {
      return await applyJavaScriptTemplate(filePath, content, processedTemplate, template, options);
    } else {
      return await applyTextTemplate(filePath, content, processedTemplate, template, options);
    }

  } catch (error) {
    return {
      success: false,
      error: `Failed to apply template to ${filePath}: ${error.message}`,
      modified: false,
      insertions: 0
    };
  }
}

/**
 * Applies template to JavaScript/TypeScript files using AST
 * 
 * @param {string} filePath - File path
 * @param {string} content - File content
 * @param {string} processedTemplate - Processed template content
 * @param {Object} template - Template configuration
 * @param {Object} options - Options
 * @returns {Object} Application result
 */
async function applyJavaScriptTemplate(filePath, content, processedTemplate, template, options = {}) {
  const { dryRun = false, position = 'end', target = null } = options;

  try {
    let modifiedContent = content;
    let insertions = 0;

    if (template.type === 'ast') {
      // AST-based insertion for complex templates
      modifiedContent = await applyASTTemplate(content, processedTemplate, options, filePath);
      insertions = 1;
    } else {
      // Text-based insertion
      const result = insertTemplateText(content, processedTemplate, position, target);
      modifiedContent = result.content;
      insertions = result.insertions;
    }

    const modified = modifiedContent !== content;
    const preview = modified ? generatePreview(content, modifiedContent, filePath) : null;

    // Write file if not dry run and content changed
    if (!dryRun && modified) {
      writeFileSync(filePath, modifiedContent, 'utf-8');
    }

    return {
      success: true,
      modified,
      insertions,
      preview
    };

  } catch (error) {
    return {
      success: false,
      error: `JavaScript template application failed: ${error.message}`,
      modified: false,
      insertions: 0
    };
  }
}

/**
 * Applies template to text files
 * 
 * @param {string} filePath - File path
 * @param {string} content - File content
 * @param {string} processedTemplate - Processed template content
 * @param {Object} template - Template configuration
 * @param {Object} options - Options
 * @returns {Object} Application result
 */
async function applyTextTemplate(filePath, content, processedTemplate, template, options = {}) {
  const { dryRun = false, position = 'end', target = null } = options;

  try {
    const result = insertTemplateText(content, processedTemplate, position, target);
    const modifiedContent = result.content;
    const insertions = result.insertions;

    const modified = modifiedContent !== content;
    const preview = modified ? generatePreview(content, modifiedContent, filePath) : null;

    // Write file if not dry run and content changed
    if (!dryRun && modified) {
      writeFileSync(filePath, modifiedContent, 'utf-8');
    }

    return {
      success: true,
      modified,
      insertions,
      preview
    };

  } catch (error) {
    return {
      success: false,
      error: `Text template application failed: ${error.message}`,
      modified: false,
      insertions: 0
    };
  }
}

/**
 * Applies AST-based template transformation
 * 
 * @param {string} content - File content
 * @param {string} templateCode - Template code to insert
 * @param {Object} options - Options
 * @param {string} filePath - File path for context
 * @returns {string} Modified content
 */
async function applyASTTemplate(content, templateCode, options, filePath) {
  const { position = 'end', target = null } = options;

  // Parse both the existing code and template
  const ast = parseJavaScript(content, filePath);
  const templateAst = parseJavaScript(templateCode, 'template');

  if (!ast || !templateAst) {
    throw new Error('Failed to parse JavaScript for AST template');
  }

  const j = jscodeshift.withParser('babylon');
  const root = j(ast);

  // Extract statements from template
  const templateStatements = templateAst.body;

  if (position === 'end') {
    // Add to end of program body
    const program = root.find(j.Program);
    program.forEach(path => {
      path.value.body.push(...templateStatements);
    });
  } else if (position === 'start') {
    // Add to start of program body
    const program = root.find(j.Program);
    program.forEach(path => {
      path.value.body.unshift(...templateStatements);
    });
  } else if (position === 'before' || position === 'after') {
    // Insert relative to target
    if (!target) {
      throw new Error('Target is required for before/after positioning');
    }

    // Find target function/class/variable
    let targetFound = false;
    
    root.find(j.FunctionDeclaration, { id: { name: target } })
      .forEach(path => {
        if (position === 'before') {
          j(path).insertBefore(templateStatements);
        } else {
          j(path).insertAfter(templateStatements);
        }
        targetFound = true;
      });

    if (!targetFound) {
      root.find(j.ClassDeclaration, { id: { name: target } })
        .forEach(path => {
          if (position === 'before') {
            j(path).insertBefore(templateStatements);
          } else {
            j(path).insertAfter(templateStatements);
          }
          targetFound = true;
        });
    }

    if (!targetFound) {
      throw new Error(`Target '${target}' not found for positioning`);
    }
  }

  return root.toSource({
    quote: 'single',
    reuseParsers: true
  });
}

/**
 * Inserts template text at specified position
 * 
 * @param {string} content - Original content
 * @param {string} template - Template to insert
 * @param {string} position - Position to insert
 * @param {string} target - Target for positioning
 * @returns {Object} Insertion result
 */
function insertTemplateText(content, template, position, target) {
  const lines = content.split('\n');
  let insertions = 0;

  if (position === 'start') {
    lines.unshift(template);
    insertions = 1;
  } else if (position === 'end') {
    lines.push(template);
    insertions = 1;
  } else if (position === 'before' || position === 'after') {
    if (!target) {
      throw new Error('Target is required for before/after positioning');
    }

    // Find target line
    const targetLineIndex = lines.findIndex(line => 
      line.includes(target) || line.match(new RegExp(`\\b${target}\\b`))
    );

    if (targetLineIndex === -1) {
      throw new Error(`Target '${target}' not found in file`);
    }

    if (position === 'before') {
      lines.splice(targetLineIndex, 0, template);
    } else {
      lines.splice(targetLineIndex + 1, 0, template);
    }
    insertions = 1;
  } else if (position === 'replace') {
    if (!target) {
      throw new Error('Target is required for replace positioning');
    }

    // Replace lines containing target
    let replaced = false;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(target) || lines[i].match(new RegExp(`\\b${target}\\b`))) {
        lines[i] = template;
        insertions = 1;
        replaced = true;
        break;
      }
    }

    if (!replaced) {
      throw new Error(`Target '${target}' not found for replacement`);
    }
  }

  return {
    content: lines.join('\n'),
    insertions
  };
}

/**
 * Processes template content with variable substitution
 * 
 * @param {string} template - Template content
 * @param {Object} variables - Variables for substitution
 * @returns {string} Processed template
 */
function processTemplate(template, variables) {
  let processed = template;

  // Replace variables in format {{variableName}}
  Object.keys(variables).forEach(key => {
    const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
    processed = processed.replace(regex, variables[key]);
  });

  // Replace common template patterns
  processed = processed.replace(/\{\{NOW\}\}/g, new Date().toISOString());
  processed = processed.replace(/\{\{DATE\}\}/g, new Date().toDateString());
  processed = processed.replace(/\{\{TIMESTAMP\}\}/g, Date.now().toString());

  return processed;
}

/**
 * Generates preview of template application
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
        type: origLine === '' ? 'added' : (modLine === '' ? 'removed' : 'modified'),
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
 * Validates template configuration
 * 
 * @param {Object} template - Template to validate
 * @returns {Object} Validation result
 */
export function validateTemplate(template) {
  const errors = [];

  if (!template.content) {
    errors.push('Template content is required');
  }

  if (template.type && !['text', 'ast'].includes(template.type)) {
    errors.push('Template type must be "text" or "ast"');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Creates common code templates
 * 
 * @param {string} templateType - Type of template to create
 * @param {Object} options - Template options
 * @returns {Object} Template configuration
 */
export function createTemplate(templateType, options = {}) {
  const templates = {
    'react-component': {
      type: 'ast',
      content: `
import React from 'react';

const {{componentName}} = ({{props}}) => {
  return (
    <div>
      {{componentContent}}
    </div>
  );
};

export default {{componentName}};
      `.trim()
    },
    
    'function': {
      type: 'ast',
      content: `
function {{functionName}}({{parameters}}) {
  {{functionBody}}
}
      `.trim()
    },
    
    'class': {
      type: 'ast',
      content: `
class {{className}} {
  constructor({{constructorParams}}) {
    {{constructorBody}}
  }

  {{methods}}
}
      `.trim()
    },
    
    'test': {
      type: 'ast',
      content: `
describe('{{testName}}', () => {
  it('{{testDescription}}', () => {
    {{testBody}}
  });
});
      `.trim()
    }
  };

  const template = templates[templateType];
  if (!template) {
    throw new Error(`Unknown template type: ${templateType}`);
  }

  return template;
}