/**
 * Validate Structure Command
 * 
 * Validates project structure against common conventions and best practices:
 * - Checks for required files (README, LICENSE, tests)
 * - Validates naming conventions consistency
 * - Ensures proper file organization
 * - Provides compliance scoring
 */

import { Command } from 'commander';
import { validateProjectStructure } from '../analyzers/refactor-analyzer.js';
import { getRelevantFiles } from '../file-handler.js';
import { formatSuccess, formatError, safeStringify } from '../utils/json-formatter.js';
import picocolors from 'picocolors';
import * as ui from '../ui-handler.js';

/**
 * Configures the validate-structure command
 * 
 * @param {Command} program - Commander program instance
 */
export function configureValidateStructureCommand(program) {
  const validateCommand = new Command('validate-structure')
    .description('Validate project structure against best practices and conventions')
    .option('--no-readme', 'Skip README requirement check')
    .option('--no-license', 'Skip LICENSE requirement check')
    .option('--no-tests', 'Skip test files requirement check')
    .option('--require-config', 'Require configuration files')
    .option('--max-file-size <lines>', 'Maximum file size in lines', '1000')
    .option('--max-dir-files <count>', 'Maximum files per directory', '30')
    .option('--no-naming-consistency', 'Skip naming convention consistency check')
    .option('--strict', 'Use strict validation rules')
    .option('--format <format>', 'Output format (json, text)', 'text')
    .action(async (options) => {
      await handleValidateStructureCommand(options);
    });

  program.addCommand(validateCommand);
}

/**
 * Handles the validate-structure command execution
 * 
 * @param {Object} options - Command options
 */
async function handleValidateStructureCommand(options) {
  try {
    const projectRoot = process.cwd();
    
    // Show validation progress
    if (options.format !== 'json') {
      ui.displayInfo('✅ Validating project structure...');
    }

    // Get relevant files
    const filePaths = await getRelevantFiles(projectRoot);

    // Prepare validation rules
    const validationRules = {
      requireReadme: options.readme !== false,
      requireLicense: options.license !== false,
      requireTests: options.tests !== false,
      requireConfig: options.requireConfig || false,
      maxFileSize: parseInt(options.maxFileSize, 10),
      maxDirectoryFiles: parseInt(options.maxDirFiles, 10),
      requireNamingConsistency: options.namingConsistency !== false,
      strict: options.strict || false
    };

    // Perform validation
    const validationResults = await validateProjectStructure(filePaths, projectRoot, validationRules);

    // Add additional validations
    const additionalChecks = await performAdditionalValidations(filePaths, projectRoot, validationRules);
    mergeValidationResults(validationResults, additionalChecks);

    // Format and output results
    if (options.format === 'json') {
      const jsonOutput = formatSuccess({
        validation: validationResults,
        command: 'validate-structure',
        rules: validationRules
      });
      console.log(safeStringify(jsonOutput));
    } else {
      await displayValidationResults(validationResults, validationRules);
    }

    // Exit with appropriate code
    const overallPass = validationResults.failed.length === 0;
    process.exit(overallPass ? 0 : 1);

  } catch (error) {
    if (options.format === 'json') {
      console.log(safeStringify(formatError(error.message, 'validate-structure')));
    } else {
      ui.displayError(`Error validating structure: ${error.message}`);
    }
    process.exit(1);
  }
}

/**
 * Performs additional custom validations
 * 
 * @param {Array} filePaths - Array of file paths
 * @param {string} projectRoot - Project root directory
 * @param {Object} rules - Validation rules
 * @returns {Object} Additional validation results
 */
async function performAdditionalValidations(filePaths, projectRoot, rules) {
  const results = {
    passed: [],
    failed: [],
    warnings: [],
    score: 0,
    maxScore: 0
  };

  // Validate file size limits
  await validateFileSizes(filePaths, rules.maxFileSize, results);

  // Validate directory organization
  await validateDirectoryOrganization(filePaths, rules.maxDirectoryFiles, results);

  // Validate naming consistency
  if (rules.requireNamingConsistency) {
    await validateNamingConsistency(filePaths, results);
  }

  // Validate configuration files
  if (rules.requireConfig) {
    await validateConfigurationFiles(filePaths, results);
  }

  // Validate git setup
  await validateGitSetup(projectRoot, results);

  // Validate package.json completeness
  await validatePackageJson(projectRoot, results);

  return results;
}

/**
 * Validates file sizes against the specified limit
 * 
 * @param {Array} filePaths - Array of file paths
 * @param {number} maxSize - Maximum file size in lines
 * @param {Object} results - Results object to update
 */
async function validateFileSizes(filePaths, maxSize, results) {
  results.maxScore += 10;
  
  const largeFiles = [];
  const codeExtensions = ['.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.go', '.rs', '.php', '.rb'];
  
  for (const filePath of filePaths) {
    try {
      const ext = filePath.split('.').pop()?.toLowerCase();
      if (!codeExtensions.some(e => e.includes(ext))) continue;

      const { readFileSync } = await import('fs');
      const content = readFileSync(filePath, 'utf-8');
      const lineCount = content.split('\n').length;
      
      if (lineCount > maxSize) {
        largeFiles.push({
          path: filePath,
          lines: lineCount,
          severity: lineCount > maxSize * 2 ? 'high' : 'medium'
        });
      }
    } catch (error) {
      // Skip files that can't be read
      continue;
    }
  }

  if (largeFiles.length === 0) {
    results.passed.push({
      rule: 'File size compliance',
      description: `All files are within the ${maxSize} line limit`,
      points: 10
    });
    results.score += 10;
  } else if (largeFiles.length <= 3) {
    results.warnings.push({
      rule: 'File size warnings',
      description: `${largeFiles.length} files exceed ${maxSize} lines`,
      details: largeFiles.slice(0, 3).map(f => `${f.path}: ${f.lines} lines`),
      points: 5
    });
    results.score += 5;
  } else {
    results.failed.push({
      rule: 'File size violations',
      description: `${largeFiles.length} files exceed ${maxSize} lines`,
      details: largeFiles.slice(0, 5).map(f => `${f.path}: ${f.lines} lines`),
      points: -10
    });
  }
}

/**
 * Validates directory organization
 * 
 * @param {Array} filePaths - Array of file paths
 * @param {number} maxFiles - Maximum files per directory
 * @param {Object} results - Results object to update
 */
async function validateDirectoryOrganization(filePaths, maxFiles, results) {
  results.maxScore += 5;
  
  const { dirname } = await import('path');
  const directoryCounts = new Map();
  
  filePaths.forEach(filePath => {
    const dir = dirname(filePath);
    directoryCounts.set(dir, (directoryCounts.get(dir) || 0) + 1);
  });

  const overcrowdedDirs = Array.from(directoryCounts.entries())
    .filter(([, count]) => count > maxFiles)
    .map(([dir, count]) => ({ dir, count }));

  if (overcrowdedDirs.length === 0) {
    results.passed.push({
      rule: 'Directory organization',
      description: `All directories have ${maxFiles} or fewer files`,
      points: 5
    });
    results.score += 5;
  } else {
    results.warnings.push({
      rule: 'Directory organization',
      description: `${overcrowdedDirs.length} directories have more than ${maxFiles} files`,
      details: overcrowdedDirs.slice(0, 3).map(d => `${d.dir}: ${d.count} files`),
      points: 0
    });
  }
}

/**
 * Validates naming consistency across the project
 * 
 * @param {Array} filePaths - Array of file paths
 * @param {Object} results - Results object to update
 */
async function validateNamingConsistency(filePaths, results) {
  results.maxScore += 8;
  
  const { basename, extname } = await import('path');
  const conventions = {
    camelCase: 0,
    kebabCase: 0,
    snakeCase: 0,
    PascalCase: 0
  };

  filePaths.forEach(filePath => {
    const fileName = basename(filePath, extname(filePath));
    
    if (fileName.match(/^[a-z]+([A-Z][a-z]*)*$/)) conventions.camelCase++;
    if (fileName.includes('-')) conventions.kebabCase++;
    if (fileName.includes('_')) conventions.snakeCase++;
    if (fileName.match(/^[A-Z][a-z]*([A-Z][a-z]*)*$/)) conventions.PascalCase++;
  });

  const totalFiles = filePaths.length;
  const dominantConvention = Object.entries(conventions)
    .reduce((a, b) => conventions[a[0]] > conventions[b[0]] ? a : b);

  const consistencyPercentage = Math.round((dominantConvention[1] / totalFiles) * 100);

  if (consistencyPercentage >= 80) {
    results.passed.push({
      rule: 'Naming consistency',
      description: `${consistencyPercentage}% of files follow ${dominantConvention[0]} convention`,
      points: 8
    });
    results.score += 8;
  } else if (consistencyPercentage >= 60) {
    results.warnings.push({
      rule: 'Naming consistency',
      description: `Only ${consistencyPercentage}% of files follow consistent naming`,
      details: [`Dominant: ${dominantConvention[0]} (${dominantConvention[1]} files)`],
      points: 4
    });
    results.score += 4;
  } else {
    results.failed.push({
      rule: 'Naming consistency',
      description: `Poor naming consistency (${consistencyPercentage}%)`,
      details: Object.entries(conventions).map(([conv, count]) => `${conv}: ${count} files`),
      points: -5
    });
  }
}

/**
 * Validates configuration files
 * 
 * @param {Array} filePaths - Array of file paths
 * @param {Object} results - Results object to update
 */
async function validateConfigurationFiles(filePaths, results) {
  results.maxScore += 5;
  
  const { basename } = await import('path');
  const configFiles = filePaths.filter(file => {
    const name = basename(file).toLowerCase();
    return name.includes('config') || name.includes('.env') || 
           name.includes('settings') || name.includes('.yml') ||
           name.includes('.yaml') || name.includes('.toml');
  });

  if (configFiles.length > 0) {
    results.passed.push({
      rule: 'Configuration files',
      description: `Found ${configFiles.length} configuration files`,
      points: 5
    });
    results.score += 5;
  } else {
    results.warnings.push({
      rule: 'Configuration files',
      description: 'No configuration files found',
      points: 0
    });
  }
}

/**
 * Validates git repository setup
 * 
 * @param {string} projectRoot - Project root directory
 * @param {Object} results - Results object to update
 */
async function validateGitSetup(projectRoot, results) {
  results.maxScore += 8;
  
  const { existsSync } = await import('fs');
  const { join } = await import('path');
  
  const hasGit = existsSync(join(projectRoot, '.git'));
  const hasGitignore = existsSync(join(projectRoot, '.gitignore'));

  let score = 0;
  const details = [];

  if (hasGit) {
    score += 5;
    details.push('Git repository initialized');
  } else {
    details.push('No git repository found');
  }

  if (hasGitignore) {
    score += 3;
    details.push('.gitignore file present');
  } else {
    details.push('No .gitignore file found');
  }

  if (score === 8) {
    results.passed.push({
      rule: 'Git setup',
      description: 'Complete git setup',
      points: 8
    });
    results.score += 8;
  } else if (score > 0) {
    results.warnings.push({
      rule: 'Git setup',
      description: 'Partial git setup',
      details,
      points: score
    });
    results.score += score;
  } else {
    results.failed.push({
      rule: 'Git setup',
      description: 'No git setup found',
      details,
      points: -5
    });
  }
}

/**
 * Validates package.json completeness
 * 
 * @param {string} projectRoot - Project root directory
 * @param {Object} results - Results object to update
 */
async function validatePackageJson(projectRoot, results) {
  results.maxScore += 10;
  
  const { existsSync, readFileSync } = await import('fs');
  const { join } = await import('path');
  
  const packagePath = join(projectRoot, 'package.json');
  
  if (!existsSync(packagePath)) {
    results.warnings.push({
      rule: 'Package.json',
      description: 'No package.json found (may not be a Node.js project)',
      points: 0
    });
    return;
  }

  try {
    const packageContent = JSON.parse(readFileSync(packagePath, 'utf-8'));
    const requiredFields = ['name', 'version', 'description'];
    const recommendedFields = ['author', 'license', 'repository', 'keywords'];
    
    const missingRequired = requiredFields.filter(field => !packageContent[field]);
    const missingRecommended = recommendedFields.filter(field => !packageContent[field]);

    let score = 0;
    const details = [];

    if (missingRequired.length === 0) {
      score += 6;
      details.push('All required fields present');
    } else {
      details.push(`Missing required: ${missingRequired.join(', ')}`);
    }

    if (missingRecommended.length <= 1) {
      score += 4;
      details.push('Most recommended fields present');
    } else {
      details.push(`Missing recommended: ${missingRecommended.join(', ')}`);
    }

    if (score >= 8) {
      results.passed.push({
        rule: 'Package.json completeness',
        description: 'Well-structured package.json',
        points: score
      });
      results.score += score;
    } else if (score >= 4) {
      results.warnings.push({
        rule: 'Package.json completeness',
        description: 'Package.json needs improvement',
        details,
        points: score
      });
      results.score += score;
    } else {
      results.failed.push({
        rule: 'Package.json completeness',
        description: 'Incomplete package.json',
        details,
        points: -5
      });
    }

  } catch (error) {
    results.failed.push({
      rule: 'Package.json validity',
      description: 'Invalid JSON in package.json',
      points: -10
    });
  }
}

/**
 * Merges additional validation results into main results
 * 
 * @param {Object} main - Main validation results
 * @param {Object} additional - Additional validation results
 */
function mergeValidationResults(main, additional) {
  main.passed.push(...additional.passed);
  main.failed.push(...additional.failed);
  main.warnings.push(...additional.warnings);
  main.score += additional.score;
  main.maxScore += additional.maxScore;
}

/**
 * Displays validation results in text format
 * 
 * @param {Object} results - Validation results
 * @param {Object} rules - Validation rules used
 */
async function displayValidationResults(results, rules) {
  console.log(picocolors.bold(picocolors.blue('✅ Project Structure Validation')));
  console.log();

  // Display overall score
  const percentage = results.maxScore > 0 ? Math.round((results.score / results.maxScore) * 100) : 0;
  const scoreColor = percentage >= 80 ? 'green' : percentage >= 60 ? 'yellow' : 'red';
  
  console.log(picocolors.bold('📊 Overall Score:'));
  console.log(`  ${picocolors[scoreColor](`${results.score}/${results.maxScore} (${percentage}%)`)} `);
  console.log();

  // Display passed validations
  if (results.passed.length > 0) {
    console.log(picocolors.bold(picocolors.green('✅ Passed Validations:')));
    results.passed.forEach(item => {
      console.log(`  ${picocolors.green('✓')} ${item.rule}: ${item.description}`);
      if (item.details) {
        item.details.forEach(detail => {
          console.log(`    ${picocolors.gray('• ' + detail)}`);
        });
      }
    });
    console.log();
  }

  // Display warnings
  if (results.warnings.length > 0) {
    console.log(picocolors.bold(picocolors.yellow('⚠️  Warnings:')));
    results.warnings.forEach(item => {
      console.log(`  ${picocolors.yellow('⚠')} ${item.rule}: ${item.description}`);
      if (item.details) {
        item.details.forEach(detail => {
          console.log(`    ${picocolors.gray('• ' + detail)}`);
        });
      }
    });
    console.log();
  }

  // Display failed validations
  if (results.failed.length > 0) {
    console.log(picocolors.bold(picocolors.red('❌ Failed Validations:')));
    results.failed.forEach(item => {
      console.log(`  ${picocolors.red('✗')} ${item.rule}: ${item.description}`);
      if (item.details) {
        item.details.forEach(detail => {
          console.log(`    ${picocolors.gray('• ' + detail)}`);
        });
      }
    });
    console.log();
  }

  // Display recommendations
  displayRecommendations(results, percentage);
}

/**
 * Displays recommendations based on validation results
 * 
 * @param {Object} results - Validation results
 * @param {number} percentage - Overall score percentage
 */
function displayRecommendations(results, percentage) {
  console.log(picocolors.bold('💡 Recommendations:'));
  
  if (percentage >= 90) {
    console.log('  🎉 Excellent! Your project structure follows best practices.');
    console.log('  Consider sharing your structure as a template for other projects.');
  } else if (percentage >= 70) {
    console.log('  👍 Good structure! Consider addressing the warnings above.');
    console.log('  Focus on the highest impact improvements first.');
  } else if (percentage >= 50) {
    console.log('  📈 Room for improvement. Address failed validations first.');
    console.log('  Consider refactoring for better maintainability.');
  } else {
    console.log('  🔧 Significant improvements needed.');
    console.log('  Start with basic requirements (README, tests, proper organization).');
  }
  
  console.log();
  
  // Specific recommendations based on failed items
  const failedRules = results.failed.map(f => f.rule);
  if (failedRules.includes('README missing')) {
    console.log('  • Add a comprehensive README.md with project description and setup instructions');
  }
  if (failedRules.includes('Tests missing')) {
    console.log('  • Implement unit tests to improve code reliability');
  }
  if (failedRules.includes('File size violations')) {
    console.log('  • Break down large files into smaller, focused modules');
  }
  if (failedRules.includes('Naming consistency')) {
    console.log('  • Establish and follow consistent naming conventions');
  }
}

export default configureValidateStructureCommand;