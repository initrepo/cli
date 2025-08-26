/**
 * Complexity Analyzer
 * 
 * This module analyzes code complexity using various metrics including
 * cyclomatic complexity, cognitive complexity, and maintainability index.
 */

import { readFileSync } from 'fs';
import { parseJavaScript } from '../utils/ast-utils.js';
import traverse from '@babel/traverse';

/**
 * Analyzes code complexity across multiple files
 * 
 * @param {Array} filePaths - Array of file paths to analyze
 * @param {Object} options - Analysis options
 * @returns {Object} Complete complexity analysis results
 */
export async function analyzeComplexity(filePaths, options = {}) {
  const threshold = options.threshold || 10;
  const includeFiles = options.includeFiles !== false;
  
  const fileAnalysis = [];
  const summary = {
    totalFiles: 0,
    totalFunctions: 0,
    averageComplexity: 0,
    highComplexityFunctions: 0,
    complexityDistribution: {
      low: 0,      // 1-5
      medium: 0,   // 6-10
      high: 0,     // 11-20
      veryHigh: 0  // 21+
    }
  };

  let totalComplexity = 0;

  for (const filePath of filePaths) {
    const fileComplexity = await analyzeFileComplexity(filePath, threshold);
    if (fileComplexity && fileComplexity.functions.length > 0) {
      fileAnalysis.push(fileComplexity);
      summary.totalFiles++;
      summary.totalFunctions += fileComplexity.functions.length;
      
      fileComplexity.functions.forEach(func => {
        totalComplexity += func.cyclomaticComplexity;
        
        // Update distribution
        if (func.cyclomaticComplexity <= 5) {
          summary.complexityDistribution.low++;
        } else if (func.cyclomaticComplexity <= 10) {
          summary.complexityDistribution.medium++;
        } else if (func.cyclomaticComplexity <= 20) {
          summary.complexityDistribution.high++;
        } else {
          summary.complexityDistribution.veryHigh++;
        }

        if (func.cyclomaticComplexity > threshold) {
          summary.highComplexityFunctions++;
        }
      });
    }
  }

  summary.averageComplexity = summary.totalFunctions > 0 ? 
    Math.round((totalComplexity / summary.totalFunctions) * 100) / 100 : 0;

  // Find the most complex functions across all files
  const allFunctions = fileAnalysis.flatMap(file => 
    file.functions.map(func => ({ ...func, file: file.file }))
  );
  
  const mostComplexFunctions = allFunctions
    .sort((a, b) => b.cyclomaticComplexity - a.cyclomaticComplexity)
    .slice(0, 20);

  return {
    summary,
    mostComplexFunctions,
    recommendations: generateRecommendations(summary, mostComplexFunctions, threshold),
    ...(includeFiles && { files: fileAnalysis })
  };
}

/**
 * Analyzes complexity in a single file
 * 
 * @param {string} filePath - Path to the file
 * @param {number} threshold - Complexity threshold
 * @returns {Object|null} File complexity analysis
 */
async function analyzeFileComplexity(filePath, threshold = 10) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const language = getLanguageFromFile(filePath);

    if (language === 'javascript' || language === 'typescript') {
      return analyzeJavaScriptComplexity(content, filePath, threshold);
    }

    // For other languages, use basic pattern matching
    return analyzeComplexityRegex(content, filePath, language, threshold);
  } catch (error) {
    console.warn(`Failed to analyze complexity in ${filePath}: ${error.message}`);
    return null;
  }
}

/**
 * Analyzes JavaScript/TypeScript complexity using AST
 * 
 * @param {string} content - File content
 * @param {string} filePath - File path
 * @param {number} threshold - Complexity threshold
 * @returns {Object} Complexity analysis
 */
function analyzeJavaScriptComplexity(content, filePath, threshold) {
  const ast = parseJavaScript(content, filePath);
  if (!ast) return null;

  const functions = [];
  const classes = [];

  traverse.default(ast, {
    FunctionDeclaration(path) {
      const complexity = calculateCyclomaticComplexity(path);
      const cognitive = calculateCognitiveComplexity(path);
      const maintainability = calculateMaintainabilityIndex(path);
      
      functions.push({
        name: path.node.id?.name || 'anonymous',
        type: 'function',
        line: path.node.loc?.start?.line || 0,
        cyclomaticComplexity: complexity.cyclomatic,
        cognitiveComplexity: cognitive,
        maintainabilityIndex: maintainability,
        linesOfCode: complexity.loc,
        parameters: path.node.params.length,
        isAsync: path.node.async,
        isGenerator: path.node.generator,
        exceedsThreshold: complexity.cyclomatic > threshold,
        suggestions: generateFunctionSuggestions(complexity.cyclomatic, cognitive, path.node.params.length)
      });
    },

    ArrowFunctionExpression(path) {
      // Only analyze named arrow functions or those assigned to variables
      let name = 'anonymous arrow function';
      if (path.parent.type === 'VariableDeclarator' && path.parent.id.name) {
        name = path.parent.id.name;
      }

      const complexity = calculateCyclomaticComplexity(path);
      const cognitive = calculateCognitiveComplexity(path);
      const maintainability = calculateMaintainabilityIndex(path);

      functions.push({
        name,
        type: 'arrow_function',
        line: path.node.loc?.start?.line || 0,
        cyclomaticComplexity: complexity.cyclomatic,
        cognitiveComplexity: cognitive,
        maintainabilityIndex: maintainability,
        linesOfCode: complexity.loc,
        parameters: path.node.params.length,
        isAsync: path.node.async,
        exceedsThreshold: complexity.cyclomatic > threshold,
        suggestions: generateFunctionSuggestions(complexity.cyclomatic, cognitive, path.node.params.length)
      });
    },

    ClassDeclaration(path) {
      const methods = [];
      let totalComplexity = 0;

      path.traverse({
        ClassMethod(methodPath) {
          const complexity = calculateCyclomaticComplexity(methodPath);
          totalComplexity += complexity.cyclomatic;

          methods.push({
            name: methodPath.node.key.name,
            complexity: complexity.cyclomatic,
            line: methodPath.node.loc?.start?.line || 0,
            isStatic: methodPath.node.static,
            isAsync: methodPath.node.async
          });
        }
      });

      classes.push({
        name: path.node.id?.name || 'anonymous',
        line: path.node.loc?.start?.line || 0,
        methodCount: methods.length,
        totalComplexity,
        averageMethodComplexity: methods.length > 0 ? Math.round((totalComplexity / methods.length) * 100) / 100 : 0,
        methods
      });
    }
  });

  return {
    file: filePath,
    language: 'javascript',
    functions,
    classes,
    summary: {
      totalFunctions: functions.length,
      totalClasses: classes.length,
      averageComplexity: functions.length > 0 ? 
        Math.round((functions.reduce((sum, f) => sum + f.cyclomaticComplexity, 0) / functions.length) * 100) / 100 : 0,
      highComplexityFunctions: functions.filter(f => f.exceedsThreshold).length
    }
  };
}

/**
 * Calculates cyclomatic complexity for a function
 * 
 * @param {Object} path - Babel AST path
 * @returns {Object} Complexity metrics
 */
function calculateCyclomaticComplexity(path) {
  let complexity = 1; // Base complexity
  let loc = 0;

  path.traverse({
    // Decision points
    IfStatement() { complexity++; },
    ConditionalExpression() { complexity++; },
    SwitchCase(casePath) { 
      if (casePath.node.test !== null) complexity++; // Don't count default case
    },
    
    // Loops
    WhileStatement() { complexity++; },
    DoWhileStatement() { complexity++; },
    ForStatement() { complexity++; },
    ForInStatement() { complexity++; },
    ForOfStatement() { complexity++; },
    
    // Exception handling
    CatchClause() { complexity++; },
    
    // Logical operators
    LogicalExpression(logicalPath) {
      if (logicalPath.node.operator === '||' || logicalPath.node.operator === '&&') {
        complexity++;
      }
    }
  });

  // Count lines of code (approximate)
  if (path.node.loc) {
    loc = path.node.loc.end.line - path.node.loc.start.line + 1;
  }

  return { cyclomatic: complexity, loc };
}

/**
 * Calculates cognitive complexity (similar to cyclomatic but weights nested structures)
 * 
 * @param {Object} path - Babel AST path
 * @returns {number} Cognitive complexity
 */
function calculateCognitiveComplexity(path) {
  let complexity = 0;
  let nestingLevel = 0;

  path.traverse({
    enter(innerPath) {
      const nodeType = innerPath.node.type;
      
      // Increment nesting for certain structures
      if (['IfStatement', 'WhileStatement', 'DoWhileStatement', 
           'ForStatement', 'ForInStatement', 'ForOfStatement',
           'SwitchStatement', 'TryStatement'].includes(nodeType)) {
        nestingLevel++;
      }
    },
    
    exit(innerPath) {
      const nodeType = innerPath.node.type;
      
      // Add complexity based on structure and nesting
      if (['IfStatement', 'ConditionalExpression'].includes(nodeType)) {
        complexity += 1 + nestingLevel;
      } else if (['WhileStatement', 'DoWhileStatement', 'ForStatement', 
                  'ForInStatement', 'ForOfStatement'].includes(nodeType)) {
        complexity += 1 + nestingLevel;
      } else if (nodeType === 'SwitchCase' && innerPath.node.test !== null) {
        complexity += 1 + nestingLevel;
      } else if (nodeType === 'CatchClause') {
        complexity += 1 + nestingLevel;
      } else if (nodeType === 'LogicalExpression' && 
                 (innerPath.node.operator === '||' || innerPath.node.operator === '&&')) {
        complexity += 1;
      }

      // Decrement nesting
      if (['IfStatement', 'WhileStatement', 'DoWhileStatement', 
           'ForStatement', 'ForInStatement', 'ForOfStatement',
           'SwitchStatement', 'TryStatement'].includes(nodeType)) {
        nestingLevel--;
      }
    }
  });

  return complexity;
}

/**
 * Calculates a simple maintainability index
 * 
 * @param {Object} path - Babel AST path
 * @returns {number} Maintainability index (0-100)
 */
function calculateMaintainabilityIndex(path) {
  const complexity = calculateCyclomaticComplexity(path);
  const loc = complexity.loc || 1;
  const cyclomatic = complexity.cyclomatic;
  
  // Simplified maintainability index
  // Higher is better (more maintainable)
  const mi = Math.max(0, 100 - (cyclomatic * 5) - (loc * 0.5));
  return Math.round(mi * 100) / 100;
}

/**
 * Analyzes complexity using regex patterns for non-JS languages
 * 
 * @param {string} content - File content
 * @param {string} filePath - File path
 * @param {string} language - Programming language
 * @param {number} threshold - Complexity threshold
 * @returns {Object} Complexity analysis
 */
function analyzeComplexityRegex(content, filePath, language, threshold) {
  const functions = [];
  const lines = content.split('\n');

  // Simple complexity estimation based on control structures
  const patterns = {
    python: {
      function: /^(\s*)def\s+(\w+)\s*\([^)]*\):/,
      complexity: /(if\s|elif\s|while\s|for\s|except\s|and\s|or\s)/g
    },
    rust: {
      function: /^(\s*)(?:pub\s+)?fn\s+(\w+)/,
      complexity: /(if\s|while\s|for\s|match\s|\|\||&&)/g
    },
    go: {
      function: /^func\s+(?:\([^)]*\)\s+)?(\w+)/,
      complexity: /(if\s|for\s|switch\s|case\s|\|\||&&)/g
    }
  };

  const langPatterns = patterns[language];
  if (!langPatterns) return { file: filePath, functions, language };

  let currentFunction = null;
  let functionContent = [];

  lines.forEach((line, index) => {
    const functionMatch = line.match(langPatterns.function);
    
    if (functionMatch) {
      // Save previous function if exists
      if (currentFunction) {
        const complexityMatches = functionContent.join('\n').match(langPatterns.complexity) || [];
        functions.push({
          ...currentFunction,
          cyclomaticComplexity: complexityMatches.length + 1, // +1 for base complexity
          linesOfCode: functionContent.length,
          exceedsThreshold: complexityMatches.length + 1 > threshold
        });
      }
      
      // Start new function
      currentFunction = {
        name: functionMatch[2] || functionMatch[1],
        type: 'function',
        line: index + 1,
        startLine: index + 1
      };
      functionContent = [line];
    } else if (currentFunction) {
      functionContent.push(line);
      
      // Check if function ended (simplified heuristic)
      const indent = line.length - line.trimStart().length;
      if (line.trim() && langPatterns.function.test(line) && indent === 0) {
        // New function at root level, end current function
        const complexityMatches = functionContent.slice(0, -1).join('\n').match(langPatterns.complexity) || [];
        functions.push({
          ...currentFunction,
          cyclomaticComplexity: complexityMatches.length + 1,
          linesOfCode: functionContent.length - 1,
          exceedsThreshold: complexityMatches.length + 1 > threshold
        });
        currentFunction = null;
        functionContent = [];
      }
    }
  });

  // Handle last function
  if (currentFunction && functionContent.length > 0) {
    const complexityMatches = functionContent.join('\n').match(langPatterns.complexity) || [];
    functions.push({
      ...currentFunction,
      cyclomaticComplexity: complexityMatches.length + 1,
      linesOfCode: functionContent.length,
      exceedsThreshold: complexityMatches.length + 1 > threshold
    });
  }

  return {
    file: filePath,
    language,
    functions,
    summary: {
      totalFunctions: functions.length,
      averageComplexity: functions.length > 0 ? 
        Math.round((functions.reduce((sum, f) => sum + f.cyclomaticComplexity, 0) / functions.length) * 100) / 100 : 0,
      highComplexityFunctions: functions.filter(f => f.exceedsThreshold).length
    }
  };
}

/**
 * Generates function-specific suggestions for complexity reduction
 * 
 * @param {number} cyclomaticComplexity - Cyclomatic complexity
 * @param {number} cognitiveComplexity - Cognitive complexity
 * @param {number} parameterCount - Number of parameters
 * @returns {Array} Array of suggestions
 */
function generateFunctionSuggestions(cyclomaticComplexity, cognitiveComplexity, parameterCount) {
  const suggestions = [];

  if (cyclomaticComplexity > 15) {
    suggestions.push('Consider breaking this function into smaller functions');
  } else if (cyclomaticComplexity > 10) {
    suggestions.push('Function complexity is high - consider refactoring');
  }

  if (cognitiveComplexity > cyclomaticComplexity * 1.5) {
    suggestions.push('High cognitive complexity - consider reducing nesting levels');
  }

  if (parameterCount > 5) {
    suggestions.push('Too many parameters - consider using an options object');
  }

  return suggestions;
}

/**
 * Generates overall recommendations based on analysis
 * 
 * @param {Object} summary - Analysis summary
 * @param {Array} mostComplex - Most complex functions
 * @param {number} threshold - Complexity threshold
 * @returns {Array} Array of recommendations
 */
function generateRecommendations(summary, mostComplex, threshold) {
  const recommendations = [];

  if (summary.highComplexityFunctions > 0) {
    recommendations.push({
      priority: 'high',
      type: 'complexity',
      message: `${summary.highComplexityFunctions} functions exceed complexity threshold of ${threshold}`,
      action: 'Refactor the most complex functions first'
    });
  }

  if (summary.averageComplexity > 8) {
    recommendations.push({
      priority: 'medium',
      type: 'overall_complexity',
      message: `Average complexity is ${summary.averageComplexity} (consider keeping below 8)`,
      action: 'Review overall architecture and function design patterns'
    });
  }

  const veryHighComplexity = summary.complexityDistribution.veryHigh;
  if (veryHighComplexity > 0) {
    recommendations.push({
      priority: 'high',
      type: 'very_high_complexity',
      message: `${veryHighComplexity} functions have very high complexity (21+)`,
      action: 'These functions should be refactored immediately'
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      priority: 'info',
      type: 'good_complexity',
      message: 'Code complexity is within acceptable ranges',
      action: 'Continue following current patterns'
    });
  }

  return recommendations;
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