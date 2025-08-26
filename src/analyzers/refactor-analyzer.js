/**
 * Refactor Analyzer
 * 
 * This module provides functionality to analyze code structure and suggest refactoring opportunities:
 * - Identify code smells and anti-patterns
 * - Suggest structural improvements
 * - Detect refactoring opportunities
 * - Provide architectural recommendations
 */

import { readFileSync, statSync } from 'fs';
import { join, relative, dirname, basename, extname } from 'path';
import { parseFileSymbols } from '../parsers/symbol-parser.js';
import { analyzeComplexity } from './complexity-analyzer.js';

/**
 * Analyzes code structure and suggests refactoring opportunities
 * 
 * @param {Array} filePaths - Array of file paths to analyze
 * @param {Object} options - Analysis options
 * @returns {Object} Refactoring suggestions and analysis
 */
export async function suggestRefactoring(filePaths, options = {}) {
  const {
    includeComplexity = true,
    includeStructural = true,
    includeNaming = true,
    includeDuplication = true,
    complexityThreshold = 10,
    fileSizeThreshold = 500, // lines
    minSeverity = 'low'
  } = options;

  try {
    const suggestions = {
      structural: [],
      complexity: [],
      naming: [],
      duplication: [],
      organization: [],
      summary: {
        totalSuggestions: 0,
        highPriority: 0,
        mediumPriority: 0,
        lowPriority: 0,
        categories: {}
      }
    };

    // Analyze complexity issues if requested
    if (includeComplexity) {
      const complexityIssues = await analyzeComplexityIssues(filePaths, complexityThreshold);
      suggestions.complexity = complexityIssues;
    }

    // Analyze structural issues
    if (includeStructural) {
      const structuralIssues = await analyzeStructuralIssues(filePaths, fileSizeThreshold);
      suggestions.structural = structuralIssues;
    }

    // Analyze naming conventions
    if (includeNaming) {
      const namingIssues = await analyzeNamingIssues(filePaths);
      suggestions.naming = namingIssues;
    }

    // Analyze potential duplication
    if (includeDuplication) {
      const duplicationIssues = await analyzeDuplicationIssues(filePaths);
      suggestions.duplication = duplicationIssues;
    }

    // Analyze organization opportunities
    const organizationSuggestions = analyzeOrganizationOpportunities(filePaths);
    suggestions.organization = organizationSuggestions;

    // Calculate summary
    suggestions.summary = calculateSummary(suggestions, minSeverity);

    return suggestions;

  } catch (error) {
    throw new Error(`Failed to analyze refactoring opportunities: ${error.message}`);
  }
}

/**
 * Analyzes complexity-related issues
 * 
 * @param {Array} filePaths - Array of file paths
 * @param {number} threshold - Complexity threshold
 * @returns {Array} Complexity issues
 */
async function analyzeComplexityIssues(filePaths, threshold) {
  const issues = [];

  try {
    const complexityResult = await analyzeComplexity(filePaths, { threshold });
    
    if (complexityResult.complexityIssues) {
      complexityResult.complexityIssues.forEach(issue => {
        issues.push({
          type: 'complexity',
          severity: issue.complexity > threshold * 2 ? 'high' : issue.complexity > threshold * 1.5 ? 'medium' : 'low',
          file: issue.file,
          function: issue.name,
          complexity: issue.complexity,
          line: issue.line,
          suggestion: generateComplexitySuggestion(issue),
          description: `Function '${issue.name}' has high complexity (${issue.complexity})`
        });
      });
    }
  } catch (error) {
    // If complexity analysis fails, continue with other analyses
    console.warn('Complexity analysis failed:', error.message);
  }

  return issues;
}

/**
 * Analyzes structural issues in the codebase
 * 
 * @param {Array} filePaths - Array of file paths
 * @param {number} fileSizeThreshold - File size threshold in lines
 * @returns {Array} Structural issues
 */
async function analyzeStructuralIssues(filePaths, fileSizeThreshold) {
  const issues = [];

  for (const filePath of filePaths) {
    try {
      // Check file size
      const content = readFileSync(filePath, 'utf-8');
      const lineCount = content.split('\n').length;
      
      if (lineCount > fileSizeThreshold) {
        issues.push({
          type: 'file_size',
          severity: lineCount > fileSizeThreshold * 2 ? 'high' : 'medium',
          file: filePath,
          lines: lineCount,
          suggestion: 'Consider breaking this large file into smaller, more focused modules',
          description: `File is too large (${lineCount} lines)`
        });
      }

      // Analyze file symbols for structural issues
      const symbols = await parseFileSymbols(filePath);
      const symbolAnalysis = analyzeFileSymbols(symbols, filePath);
      issues.push(...symbolAnalysis);

    } catch (error) {
      // Skip files that can't be analyzed
      continue;
    }
  }

  return issues;
}

/**
 * Analyzes symbols within a single file for structural issues
 * 
 * @param {Array} symbols - Array of symbols from file
 * @param {string} filePath - File path
 * @returns {Array} Symbol-related issues
 */
function analyzeFileSymbols(symbols, filePath) {
  const issues = [];
  const functionNames = new Set();
  const classNames = new Set();

  symbols.forEach(symbol => {
    // Check for duplicate function names (potential overloading issues)
    if (symbol.type === 'function') {
      if (functionNames.has(symbol.name)) {
        issues.push({
          type: 'duplicate_functions',
          severity: 'medium',
          file: filePath,
          function: symbol.name,
          line: symbol.line,
          suggestion: 'Consider using different names or combining similar functions',
          description: `Duplicate function name '${symbol.name}' found`
        });
      }
      functionNames.add(symbol.name);
    }

    // Check for large classes (too many methods)
    if (symbol.type === 'class') {
      classNames.add(symbol.name);
    }

    // Check for very long function signatures
    if (symbol.signature && symbol.signature.length > 100) {
      issues.push({
        type: 'long_signature',
        severity: 'low',
        file: filePath,
        function: symbol.name,
        line: symbol.line,
        suggestion: 'Consider using parameter objects or breaking down the function',
        description: `Function '${symbol.name}' has a very long signature`
      });
    }
  });

  // Check for too many functions in a single file
  const functionCount = symbols.filter(s => s.type === 'function').length;
  if (functionCount > 20) {
    issues.push({
      type: 'too_many_functions',
      severity: functionCount > 50 ? 'high' : 'medium',
      file: filePath,
      count: functionCount,
      suggestion: 'Consider splitting this file into multiple modules with related functionality',
      description: `File contains too many functions (${functionCount})`
    });
  }

  return issues;
}

/**
 * Analyzes naming convention issues
 * 
 * @param {Array} filePaths - Array of file paths
 * @returns {Array} Naming issues
 */
async function analyzeNamingIssues(filePaths) {
  const issues = [];
  const conventionMap = detectPrimaryConventions(filePaths);

  for (const filePath of filePaths) {
    try {
      const symbols = await parseFileSymbols(filePath);
      const fileName = basename(filePath, extname(filePath));
      
      // Check file naming consistency
      const fileNamingIssues = analyzeFileName(fileName, filePath, conventionMap.file);
      issues.push(...fileNamingIssues);

      // Check symbol naming consistency
      symbols.forEach(symbol => {
        const symbolNamingIssues = analyzeSymbolNaming(symbol, filePath, conventionMap.symbol);
        issues.push(...symbolNamingIssues);
      });

    } catch (error) {
      // Skip files that can't be analyzed
      continue;
    }
  }

  return issues;
}

/**
 * Detects the primary naming conventions used in the project
 * 
 * @param {Array} filePaths - Array of file paths
 * @returns {Object} Detected conventions
 */
function detectPrimaryConventions(filePaths) {
  const conventions = {
    file: { camelCase: 0, kebabCase: 0, snakeCase: 0, PascalCase: 0 },
    symbol: { camelCase: 0, kebabCase: 0, snakeCase: 0, PascalCase: 0 }
  };

  filePaths.forEach(filePath => {
    const fileName = basename(filePath, extname(filePath));
    
    // Analyze file naming
    if (fileName.match(/^[a-z]+([A-Z][a-z]*)*$/)) conventions.file.camelCase++;
    if (fileName.includes('-')) conventions.file.kebabCase++;
    if (fileName.includes('_')) conventions.file.snakeCase++;
    if (fileName.match(/^[A-Z][a-z]*([A-Z][a-z]*)*$/)) conventions.file.PascalCase++;
  });

  // Find dominant conventions
  const dominantFile = Object.entries(conventions.file)
    .reduce((a, b) => conventions.file[a[0]] > conventions.file[b[0]] ? a : b)[0];
    
  return {
    file: dominantFile,
    symbol: 'camelCase' // Default for most languages
  };
}

/**
 * Analyzes file name for convention compliance
 * 
 * @param {string} fileName - File name
 * @param {string} filePath - Full file path
 * @param {string} expectedConvention - Expected naming convention
 * @returns {Array} Naming issues
 */
function analyzeFileName(fileName, filePath, expectedConvention) {
  const issues = [];

  let followsConvention = false;
  switch (expectedConvention) {
    case 'camelCase':
      followsConvention = fileName.match(/^[a-z]+([A-Z][a-z]*)*$/);
      break;
    case 'kebabCase':
      followsConvention = fileName.match(/^[a-z]+(-[a-z]+)*$/);
      break;
    case 'snakeCase':
      followsConvention = fileName.match(/^[a-z]+(_[a-z]+)*$/);
      break;
    case 'PascalCase':
      followsConvention = fileName.match(/^[A-Z][a-z]*([A-Z][a-z]*)*$/);
      break;
  }

  if (!followsConvention && expectedConvention !== 'mixed') {
    issues.push({
      type: 'file_naming',
      severity: 'low',
      file: filePath,
      current: fileName,
      expected: expectedConvention,
      suggestion: `Rename file to follow ${expectedConvention} convention`,
      description: `File name doesn't follow project's ${expectedConvention} naming convention`
    });
  }

  return issues;
}

/**
 * Analyzes symbol naming for convention compliance
 * 
 * @param {Object} symbol - Symbol information
 * @param {string} filePath - File path
 * @param {string} expectedConvention - Expected naming convention
 * @returns {Array} Naming issues
 */
function analyzeSymbolNaming(symbol, filePath, expectedConvention) {
  const issues = [];

  // Check for common problematic patterns
  if (symbol.name.length === 1 && !['i', 'j', 'k', 'x', 'y', 'z'].includes(symbol.name)) {
    issues.push({
      type: 'short_name',
      severity: 'low',
      file: filePath,
      symbol: symbol.name,
      type: symbol.type,
      line: symbol.line,
      suggestion: 'Use more descriptive names for better code readability',
      description: `Symbol '${symbol.name}' has a very short name`
    });
  }

  // Check for excessively long names
  if (symbol.name.length > 50) {
    issues.push({
      type: 'long_name',
      severity: 'low',
      file: filePath,
      symbol: symbol.name,
      type: symbol.type,
      line: symbol.line,
      suggestion: 'Consider shorter, more concise names while maintaining clarity',
      description: `Symbol '${symbol.name}' has an excessively long name`
    });
  }

  // Check for non-descriptive names
  if (['temp', 'tmp', 'data', 'obj', 'item', 'thing'].includes(symbol.name.toLowerCase())) {
    issues.push({
      type: 'non_descriptive',
      severity: 'medium',
      file: filePath,
      symbol: symbol.name,
      type: symbol.type,
      line: symbol.line,
      suggestion: 'Use more specific, descriptive names that indicate the purpose',
      description: `Symbol '${symbol.name}' has a non-descriptive name`
    });
  }

  return issues;
}

/**
 * Analyzes potential code duplication
 * 
 * @param {Array} filePaths - Array of file paths
 * @returns {Array} Duplication issues
 */
async function analyzeDuplicationIssues(filePaths) {
  const issues = [];
  const functionSignatures = new Map();
  const similarFunctions = [];

  // Simple duplication detection based on function signatures and names
  for (const filePath of filePaths) {
    try {
      const symbols = await parseFileSymbols(filePath);
      
      symbols.filter(s => s.type === 'function').forEach(func => {
        const signature = func.signature || func.name;
        const key = `${func.name}_${signature.length}`;
        
        if (!functionSignatures.has(key)) {
          functionSignatures.set(key, []);
        }
        functionSignatures.get(key).push({
          ...func,
          file: filePath
        });
      });

    } catch (error) {
      // Skip files that can't be analyzed
      continue;
    }
  }

  // Find potential duplicates
  functionSignatures.forEach((functions, key) => {
    if (functions.length > 1) {
      // Group by similar names
      const nameGroups = new Map();
      functions.forEach(func => {
        const baseName = func.name.toLowerCase();
        if (!nameGroups.has(baseName)) {
          nameGroups.set(baseName, []);
        }
        nameGroups.get(baseName).push(func);
      });

      nameGroups.forEach((group, name) => {
        if (group.length > 1) {
          issues.push({
            type: 'duplicate_functions',
            severity: 'medium',
            functions: group.map(f => ({
              name: f.name,
              file: f.file,
              line: f.line,
              signature: f.signature
            })),
            suggestion: 'Consider consolidating these similar functions or ensuring they serve different purposes',
            description: `Multiple functions with similar signatures found: ${name}`
          });
        }
      });
    }
  });

  return issues;
}

/**
 * Analyzes organization opportunities
 * 
 * @param {Array} filePaths - Array of file paths
 * @returns {Array} Organization suggestions
 */
function analyzeOrganizationOpportunities(filePaths) {
  const suggestions = [];
  const filesByDirectory = new Map();
  const filesByExtension = new Map();

  // Group files by directory and extension
  filePaths.forEach(filePath => {
    const dir = dirname(filePath);
    const ext = extname(filePath);

    if (!filesByDirectory.has(dir)) {
      filesByDirectory.set(dir, []);
    }
    filesByDirectory.get(dir).push(filePath);

    if (!filesByExtension.has(ext)) {
      filesByExtension.set(ext, []);
    }
    filesByExtension.get(ext).push(filePath);
  });

  // Check for directories with too many files
  filesByDirectory.forEach((files, dir) => {
    if (files.length > 20) {
      suggestions.push({
        type: 'directory_organization',
        severity: files.length > 50 ? 'high' : 'medium',
        directory: dir,
        fileCount: files.length,
        suggestion: 'Consider creating subdirectories to better organize files',
        description: `Directory '${dir}' contains too many files (${files.length})`
      });
    }
  });

  // Check for mixed file types in directories
  filesByDirectory.forEach((files, dir) => {
    const extensions = new Set(files.map(f => extname(f)));
    if (extensions.size > 5 && files.length > 10) {
      suggestions.push({
        type: 'mixed_file_types',
        severity: 'low',
        directory: dir,
        extensions: Array.from(extensions),
        fileCount: files.length,
        suggestion: 'Consider organizing files by type or purpose',
        description: `Directory '${dir}' contains mixed file types`
      });
    }
  });

  return suggestions;
}

/**
 * Generates specific complexity reduction suggestions
 * 
 * @param {Object} issue - Complexity issue
 * @returns {string} Specific suggestion
 */
function generateComplexitySuggestion(issue) {
  const suggestions = [
    'Break this function into smaller, single-purpose functions',
    'Consider using early returns to reduce nesting',
    'Extract complex conditions into well-named boolean variables',
    'Use guard clauses to reduce nested if-else statements',
    'Consider using strategy pattern for complex conditional logic'
  ];

  // Return random suggestion (in real implementation, could be more sophisticated)
  return suggestions[Math.floor(Math.random() * suggestions.length)];
}

/**
 * Calculates summary statistics for refactoring suggestions
 * 
 * @param {Object} suggestions - All suggestions
 * @param {string} minSeverity - Minimum severity to include
 * @returns {Object} Summary statistics
 */
function calculateSummary(suggestions, minSeverity) {
  const severityOrder = { low: 0, medium: 1, high: 2 };
  const minSeverityLevel = severityOrder[minSeverity] || 0;
  
  const summary = {
    totalSuggestions: 0,
    highPriority: 0,
    mediumPriority: 0,
    lowPriority: 0,
    categories: {
      complexity: 0,
      structural: 0,
      naming: 0,
      duplication: 0,
      organization: 0
    }
  };

  // Count suggestions by category and severity
  Object.entries(suggestions).forEach(([category, items]) => {
    if (Array.isArray(items)) {
      items.forEach(item => {
        const severityLevel = severityOrder[item.severity] || 0;
        if (severityLevel >= minSeverityLevel) {
          summary.totalSuggestions++;
          summary.categories[category]++;
          
          switch (item.severity) {
            case 'high': summary.highPriority++; break;
            case 'medium': summary.mediumPriority++; break;
            case 'low': summary.lowPriority++; break;
          }
        }
      });
    }
  });

  return summary;
}

/**
 * Validates project structure against common conventions
 * 
 * @param {Array} filePaths - Array of file paths
 * @param {string} projectRoot - Project root directory
 * @param {Object} rules - Validation rules
 * @returns {Object} Validation results
 */
export async function validateProjectStructure(filePaths, projectRoot, rules = {}) {
  const defaultRules = {
    requireReadme: true,
    requireLicense: true,
    requireTests: true,
    requireConfig: false,
    maxFileSize: 1000, // lines
    maxDirectoryFiles: 30,
    requireNamingConsistency: true,
    ...rules
  };

  const validationResults = {
    passed: [],
    failed: [],
    warnings: [],
    score: 0,
    maxScore: 0
  };

  // Validate README existence
  if (defaultRules.requireReadme) {
    validationResults.maxScore += 10;
    const hasReadme = filePaths.some(file => 
      basename(file).toLowerCase().startsWith('readme')
    );
    
    if (hasReadme) {
      validationResults.passed.push({
        rule: 'README exists',
        description: 'Project has a README file',
        points: 10
      });
      validationResults.score += 10;
    } else {
      validationResults.failed.push({
        rule: 'README missing',
        description: 'Project should have a README file',
        points: -10
      });
    }
  }

  // Validate LICENSE existence
  if (defaultRules.requireLicense) {
    validationResults.maxScore += 5;
    const hasLicense = filePaths.some(file => 
      basename(file).toLowerCase().includes('license')
    );
    
    if (hasLicense) {
      validationResults.passed.push({
        rule: 'LICENSE exists',
        description: 'Project has a license file',
        points: 5
      });
      validationResults.score += 5;
    } else {
      validationResults.warnings.push({
        rule: 'LICENSE missing',
        description: 'Consider adding a license file',
        points: 0
      });
    }
  }

  // Validate test existence
  if (defaultRules.requireTests) {
    validationResults.maxScore += 15;
    const hasTests = filePaths.some(file => 
      file.includes('test') || file.includes('spec')
    );
    
    if (hasTests) {
      validationResults.passed.push({
        rule: 'Tests exist',
        description: 'Project has test files',
        points: 15
      });
      validationResults.score += 15;
    } else {
      validationResults.failed.push({
        rule: 'Tests missing',
        description: 'Project should have test files',
        points: -15
      });
    }
  }

  return validationResults;
}