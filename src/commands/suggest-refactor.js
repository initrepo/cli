/**
 * Suggest Refactor Command
 * 
 * Analyzes codebase and suggests refactoring opportunities:
 * - Identifies code smells and anti-patterns
 * - Suggests structural improvements
 * - Detects duplication and complexity issues
 * - Provides actionable refactoring recommendations
 */

import { Command } from 'commander';
import { suggestRefactoring } from '../analyzers/refactor-analyzer.js';
import { getRelevantFiles } from '../file-handler.js';
import { formatSuccess, formatError, safeStringify } from '../utils/json-formatter.js';
import picocolors from 'picocolors';
import * as ui from '../ui-handler.js';

/**
 * Configures the suggest-refactor command
 * 
 * @param {Command} program - Commander program instance
 */
export function configureSuggestRefactorCommand(program) {
  const refactorCommand = new Command('suggest-refactor')
    .description('Analyze codebase and suggest refactoring opportunities')
    .option('--no-complexity', 'Skip complexity analysis')
    .option('--no-structural', 'Skip structural analysis')  
    .option('--no-naming', 'Skip naming convention analysis')
    .option('--no-duplication', 'Skip duplication detection')
    .option('--complexity-threshold <threshold>', 'Complexity threshold for flagging', '10')
    .option('--file-size-threshold <lines>', 'File size threshold in lines', '500')
    .option('--min-severity <level>', 'Minimum severity level (low, medium, high)', 'low')
    .option('--category <category>', 'Focus on specific category (complexity, structural, naming, duplication, organization)')
    .option('--top <count>', 'Show only top N suggestions per category', '10')
    .option('--format <format>', 'Output format (json, text)', 'text')
    .action(async (options) => {
      await handleSuggestRefactorCommand(options);
    });

  program.addCommand(refactorCommand);
}

/**
 * Handles the suggest-refactor command execution
 * 
 * @param {Object} options - Command options
 */
async function handleSuggestRefactorCommand(options) {
  try {
    // Show analysis progress
    if (options.format !== 'json') {
      ui.displayInfo('🔍 Analyzing codebase for refactoring opportunities...');
    }

    // Get relevant files
    const filePaths = await getRelevantFiles(process.cwd());

    if (filePaths.length === 0) {
      if (options.format === 'json') {
        console.log(safeStringify(formatError('No files found to analyze', 'suggest-refactor')));
      } else {
        ui.displayWarning('No files found to analyze');
      }
      return;
    }

    // Prepare analysis options
    const analysisOptions = {
      includeComplexity: options.complexity !== false,
      includeStructural: options.structural !== false,
      includeNaming: options.naming !== false,
      includeDuplication: options.duplication !== false,
      complexityThreshold: parseInt(options.complexityThreshold, 10),
      fileSizeThreshold: parseInt(options.fileSizeThreshold, 10),
      minSeverity: options.minSeverity || 'low'
    };

    // Perform refactoring analysis
    const suggestions = await suggestRefactoring(filePaths, analysisOptions);

    // Filter by category if specified
    if (options.category) {
      filterSuggestionsByCategory(suggestions, options.category);
    }

    // Limit suggestions if specified
    if (options.top) {
      limitSuggestions(suggestions, parseInt(options.top, 10));
    }

    // Format and output results
    if (options.format === 'json') {
      const jsonOutput = formatSuccess({
        suggestions,
        command: 'suggest-refactor',
        options: analysisOptions,
        filesAnalyzed: filePaths.length
      });
      console.log(safeStringify(jsonOutput));
    } else {
      await displayRefactorSuggestions(suggestions, options);
    }

    // Exit with appropriate code based on high priority issues
    const hasHighPriority = suggestions.summary.highPriority > 0;
    process.exit(hasHighPriority ? 1 : 0);

  } catch (error) {
    if (options.format === 'json') {
      console.log(safeStringify(formatError(error.message, 'suggest-refactor')));
    } else {
      ui.displayError(`Error analyzing refactoring opportunities: ${error.message}`);
    }
    process.exit(1);
  }
}

/**
 * Filters suggestions by specific category
 * 
 * @param {Object} suggestions - Suggestions object
 * @param {string} category - Category to focus on
 */
function filterSuggestionsByCategory(suggestions, category) {
  const validCategories = ['complexity', 'structural', 'naming', 'duplication', 'organization'];
  
  if (!validCategories.includes(category)) {
    throw new Error(`Invalid category. Must be one of: ${validCategories.join(', ')}`);
  }

  // Keep only the specified category
  Object.keys(suggestions).forEach(key => {
    if (key !== category && key !== 'summary' && Array.isArray(suggestions[key])) {
      suggestions[key] = [];
    }
  });

  // Recalculate summary
  suggestions.summary = recalculateSummary(suggestions);
}

/**
 * Limits the number of suggestions per category
 * 
 * @param {Object} suggestions - Suggestions object
 * @param {number} limit - Maximum suggestions per category
 */
function limitSuggestions(suggestions, limit) {
  Object.keys(suggestions).forEach(key => {
    if (Array.isArray(suggestions[key])) {
      // Sort by severity (high > medium > low) and limit
      suggestions[key] = suggestions[key]
        .sort((a, b) => {
          const severityOrder = { high: 3, medium: 2, low: 1 };
          return (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0);
        })
        .slice(0, limit);
    }
  });

  // Recalculate summary
  suggestions.summary = recalculateSummary(suggestions);
}

/**
 * Recalculates summary after filtering
 * 
 * @param {Object} suggestions - Suggestions object
 * @returns {Object} Recalculated summary
 */
function recalculateSummary(suggestions) {
  const summary = {
    totalSuggestions: 0,
    highPriority: 0,
    mediumPriority: 0,
    lowPriority: 0,
    categories: {}
  };

  Object.entries(suggestions).forEach(([category, items]) => {
    if (Array.isArray(items)) {
      summary.categories[category] = items.length;
      summary.totalSuggestions += items.length;
      
      items.forEach(item => {
        switch (item.severity) {
          case 'high': summary.highPriority++; break;
          case 'medium': summary.mediumPriority++; break;
          case 'low': summary.lowPriority++; break;
        }
      });
    }
  });

  return summary;
}

/**
 * Displays refactoring suggestions in text format
 * 
 * @param {Object} suggestions - Refactoring suggestions
 * @param {Object} options - Command options
 */
async function displayRefactorSuggestions(suggestions, options) {
  console.log(picocolors.bold(picocolors.blue('🔧 Refactoring Suggestions')));
  console.log();

  // Display summary
  displaySummary(suggestions.summary);

  // Display suggestions by category
  if (suggestions.complexity.length > 0) {
    displayCategorySuggestions('🔥 Complexity Issues', suggestions.complexity, 'complexity');
  }

  if (suggestions.structural.length > 0) {
    displayCategorySuggestions('🏗️ Structural Issues', suggestions.structural, 'structural');
  }

  if (suggestions.naming.length > 0) {
    displayCategorySuggestions('📝 Naming Issues', suggestions.naming, 'naming');
  }

  if (suggestions.duplication.length > 0) {
    displayCategorySuggestions('📋 Duplication Issues', suggestions.duplication, 'duplication');
  }

  if (suggestions.organization.length > 0) {
    displayCategorySuggestions('📁 Organization Issues', suggestions.organization, 'organization');
  }

  // Display overall recommendations
  displayOverallRecommendations(suggestions.summary);
}

/**
 * Displays the summary section
 * 
 * @param {Object} summary - Summary statistics
 */
function displaySummary(summary) {
  console.log(picocolors.bold('📊 Summary:'));
  console.log(`  Total Suggestions: ${picocolors.cyan(summary.totalSuggestions)}`);
  console.log(`  High Priority: ${picocolors.red(summary.highPriority)}`);
  console.log(`  Medium Priority: ${picocolors.yellow(summary.mediumPriority)}`);
  console.log(`  Low Priority: ${picocolors.gray(summary.lowPriority)}`);
  console.log();

  if (Object.keys(summary.categories).length > 0) {
    console.log('  By Category:');
    Object.entries(summary.categories)
      .filter(([, count]) => count > 0)
      .sort(([, a], [, b]) => b - a)
      .forEach(([category, count]) => {
        console.log(`    ${category}: ${picocolors.cyan(count)}`);
      });
    console.log();
  }
}

/**
 * Displays suggestions for a specific category
 * 
 * @param {string} title - Category title
 * @param {Array} suggestions - Array of suggestions
 * @param {string} category - Category name
 */
function displayCategorySuggestions(title, suggestions, category) {
  console.log(picocolors.bold(title));
  console.log();

  suggestions.forEach((suggestion, index) => {
    const severityColor = getSeverityColor(suggestion.severity);
    const severityIcon = getSeverityIcon(suggestion.severity);
    
    console.log(`${index + 1}. ${severityIcon} ${picocolors[severityColor](suggestion.severity.toUpperCase())}: ${suggestion.description}`);
    
    // Display file and location info
    if (suggestion.file) {
      const locationStr = suggestion.line ? `:${suggestion.line}` : '';
      console.log(`   📄 ${picocolors.blue(suggestion.file)}${locationStr}`);
    }

    // Display function/symbol info
    if (suggestion.function) {
      console.log(`   🔧 Function: ${picocolors.yellow(suggestion.function)}`);
    }

    if (suggestion.symbol) {
      console.log(`   🏷️  Symbol: ${picocolors.yellow(suggestion.symbol)}`);
    }

    // Display complexity info
    if (suggestion.complexity) {
      console.log(`   📈 Complexity: ${picocolors.red(suggestion.complexity)}`);
    }

    // Display count info
    if (suggestion.count) {
      console.log(`   🔢 Count: ${picocolors.cyan(suggestion.count)}`);
    }

    // Display suggestion
    if (suggestion.suggestion) {
      console.log(`   💡 ${picocolors.green('Suggestion:')} ${suggestion.suggestion}`);
    }

    // Display functions for duplication issues
    if (suggestion.functions && Array.isArray(suggestion.functions)) {
      console.log('   📋 Affected Functions:');
      suggestion.functions.slice(0, 3).forEach(func => {
        console.log(`      • ${func.name} in ${picocolors.blue(func.file)}:${func.line}`);
      });
      if (suggestion.functions.length > 3) {
        console.log(`      ${picocolors.gray(`... and ${suggestion.functions.length - 3} more`)}`);
      }
    }

    // Display extensions for organization issues
    if (suggestion.extensions && Array.isArray(suggestion.extensions)) {
      console.log(`   📂 File Types: ${suggestion.extensions.join(', ')}`);
    }

    console.log();
  });
}

/**
 * Gets color for severity level
 * 
 * @param {string} severity - Severity level
 * @returns {string} Color name
 */
function getSeverityColor(severity) {
  switch (severity) {
    case 'high': return 'red';
    case 'medium': return 'yellow';
    case 'low': return 'gray';
    default: return 'white';
  }
}

/**
 * Gets icon for severity level
 * 
 * @param {string} severity - Severity level
 * @returns {string} Icon
 */
function getSeverityIcon(severity) {
  switch (severity) {
    case 'high': return '🚨';
    case 'medium': return '⚠️';
    case 'low': return 'ℹ️';
    default: return '•';
  }
}

/**
 * Displays overall recommendations
 * 
 * @param {Object} summary - Summary statistics
 */
function displayOverallRecommendations(summary) {
  console.log(picocolors.bold('💡 Overall Recommendations:'));
  console.log();

  if (summary.totalSuggestions === 0) {
    console.log('🎉 Excellent! No significant refactoring opportunities detected.');
    console.log('Your codebase appears to follow good practices.');
    return;
  }

  // Priority-based recommendations
  if (summary.highPriority > 0) {
    console.log('🚨 Focus on high priority issues first:');
    console.log('   • These represent significant code quality concerns');
    console.log('   • Address complexity and structural problems immediately');
    console.log('   • Consider breaking down large functions and files');
    console.log();
  }

  if (summary.mediumPriority > 0) {
    console.log('⚠️  Medium priority improvements:');
    console.log('   • Address these when refactoring related code');
    console.log('   • Good candidates for gradual improvement');
    console.log('   • Focus on naming and organization consistency');
    console.log();
  }

  if (summary.lowPriority > 0) {
    console.log('ℹ️  Low priority suggestions:');
    console.log('   • Nice-to-have improvements for code polish');
    console.log('   • Address during regular maintenance cycles');
    console.log('   • Good for junior developer learning exercises');
    console.log();
  }

  // Category-specific recommendations
  const categories = summary.categories || {};
  
  if (categories.complexity > 0) {
    console.log('🔥 Complexity Management:');
    console.log('   • Use early returns to reduce nesting');
    console.log('   • Extract helper functions for complex logic');
    console.log('   • Consider using design patterns for complex conditionals');
    console.log();
  }

  if (categories.structural > 0) {
    console.log('🏗️ Structural Improvements:');
    console.log('   • Break large files into focused modules');
    console.log('   • Follow single responsibility principle');
    console.log('   • Consider architectural patterns for organization');
    console.log();
  }

  if (categories.naming > 0) {
    console.log('📝 Naming Consistency:');
    console.log('   • Establish and document naming conventions');
    console.log('   • Use descriptive names that explain purpose');
    console.log('   • Consider automated linting for consistency');
    console.log();
  }

  if (categories.duplication > 0) {
    console.log('📋 Code Duplication:');
    console.log('   • Extract common functionality into reusable functions');
    console.log('   • Consider utility modules for shared code');
    console.log('   • Look for opportunities to generalize similar functions');
    console.log();
  }

  if (categories.organization > 0) {
    console.log('📁 File Organization:');
    console.log('   • Group related files into directories');
    console.log('   • Separate concerns into different modules');
    console.log('   • Consider feature-based directory structure');
    console.log();
  }

  // General advice
  console.log(picocolors.bold('🎯 General Refactoring Tips:'));
  console.log('   • Make small, incremental changes');
  console.log('   • Test thoroughly after each refactoring');
  console.log('   • Focus on one category at a time');
  console.log('   • Document architectural decisions');
  console.log('   • Consider code reviews for complex refactoring');
}

export default configureSuggestRefactorCommand;