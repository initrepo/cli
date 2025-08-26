/**
 * Analyze Complexity Command
 * 
 * This module handles the analyze-complexity command for code complexity analysis
 * including cyclomatic complexity, cognitive complexity, and maintainability metrics.
 */

import * as ui from '../ui-handler.js';
import { getRelevantFiles } from '../file-handler.js';
import { analyzeComplexity } from '../analyzers/complexity-analyzer.js';
import { formatSuccess, formatError, safeStringify } from '../utils/json-formatter.js';

/**
 * Configures the analyze-complexity command
 * 
 * @param {Command} program - Commander.js program instance
 */
export function configureAnalyzeComplexityCommand(program) {
  program
    .command('analyze-complexity')
    .alias('complexity')
    .description('Analyze code complexity metrics including cyclomatic and cognitive complexity')
    .option('-f, --format <format>', 'Output format: json or text', 'text')
    .option('-t, --threshold <number>', 'Complexity threshold for flagging functions', '10')
    .option('--top <number>', 'Show top N most complex functions', '10')
    .option('--files', 'Include per-file analysis in output', false)
    .option('--recommendations', 'Include improvement recommendations', false)
    .option('-o, --output <file>', 'Output to file instead of stdout', null)
    .action(async (options) => {
      try {
        await handleAnalyzeComplexityCommand(options);
      } catch (error) {
        if (options.format === 'json') {
          console.error(safeStringify(formatError(error.message, 'ANALYZE_COMPLEXITY_ERROR')));
        } else {
          ui.displayError(`Error: ${error.message}`);
        }
        process.exit(1);
      }
    });
}

/**
 * Handles the analyze-complexity command execution
 * 
 * @param {Object} options - Command options
 */
async function handleAnalyzeComplexityCommand(options) {
  const workingDir = process.cwd();
  const threshold = parseInt(options.threshold, 10);
  const topCount = parseInt(options.top, 10);
  
  if (isNaN(threshold) || threshold < 1) {
    throw new Error('Threshold must be a positive number');
  }

  if (options.format !== 'json') {
    ui.displayInfo(`Analyzing code complexity (threshold: ${threshold})...`);
  }

  try {
    // Get relevant files to analyze
    const spinner = options.format !== 'json' ? ui.createSpinner('Scanning files...') : null;
    if (spinner) spinner.start();
    
    const filePaths = await getRelevantFiles(workingDir);
    
    // Filter for files that can be analyzed for complexity
    const analyzableFiles = filePaths.filter(file => {
      const ext = file.split('.').pop()?.toLowerCase();
      return ['js', 'jsx', 'ts', 'tsx', 'py', 'rs', 'go'].includes(ext);
    });

    if (spinner) spinner.succeed(`Analyzing complexity in ${analyzableFiles.length} files...`);

    // Analyze complexity
    const analysisSpinner = options.format !== 'json' ? ui.createSpinner('Computing complexity metrics...') : null;
    if (analysisSpinner) analysisSpinner.start();

    const analysis = await analyzeComplexity(analyzableFiles, {
      threshold,
      includeFiles: options.files
    });

    if (analysisSpinner) {
      analysisSpinner.succeed(`Analysis complete: ${analysis.summary.totalFunctions} functions analyzed`);
    }

    // Output results
    if (options.format === 'json') {
      await outputJsonFormat(analysis, options, threshold, topCount);
    } else {
      await outputTextFormat(analysis, options, threshold, topCount);
    }

  } catch (error) {
    throw new Error(`Failed to analyze complexity: ${error.message}`);
  }
}

/**
 * Outputs analysis results in JSON format
 * 
 * @param {Object} analysis - Complexity analysis results
 * @param {Object} options - Command options
 * @param {number} threshold - Complexity threshold
 * @param {number} topCount - Number of top results to show
 */
async function outputJsonFormat(analysis, options, threshold, topCount) {
  const result = formatSuccess({
    summary: analysis.summary,
    complexityDistribution: analysis.summary.complexityDistribution,
    topComplexFunctions: analysis.mostComplexFunctions.slice(0, topCount),
    ...(options.recommendations && { recommendations: analysis.recommendations }),
    ...(options.files && { fileAnalysis: analysis.files })
  }, 'Complexity analysis completed successfully');

  const output = safeStringify(result, true);

  if (options.output) {
    const { writeFileSync } = await import('fs');
    writeFileSync(options.output, output, 'utf-8');
  } else {
    console.log(output);
  }
}

/**
 * Outputs analysis results in text format
 * 
 * @param {Object} analysis - Complexity analysis results
 * @param {Object} options - Command options
 * @param {number} threshold - Complexity threshold
 * @param {number} topCount - Number of top results to show
 */
async function outputTextFormat(analysis, options, threshold, topCount) {
  let output = `\n📊 Code Complexity Analysis\n\n`;

  const summary = analysis.summary;

  // Summary
  output += `📈 Summary:\n`;
  output += `   Files Analyzed: ${summary.totalFiles}\n`;
  output += `   Functions Analyzed: ${summary.totalFunctions}\n`;
  output += `   Average Complexity: ${summary.averageComplexity}\n`;
  output += `   High Complexity Functions: ${summary.highComplexityFunctions} (threshold: ${threshold})\n\n`;

  // Complexity Distribution
  const dist = summary.complexityDistribution;
  const total = dist.low + dist.medium + dist.high + dist.veryHigh;
  
  if (total > 0) {
    output += `📊 Complexity Distribution:\n`;
    output += `   🟢 Low (1-5):       ${dist.low} (${Math.round(dist.low/total*100)}%)\n`;
    output += `   🟡 Medium (6-10):   ${dist.medium} (${Math.round(dist.medium/total*100)}%)\n`;
    output += `   🟠 High (11-20):    ${dist.high} (${Math.round(dist.high/total*100)}%)\n`;
    output += `   🔴 Very High (21+): ${dist.veryHigh} (${Math.round(dist.veryHigh/total*100)}%)\n\n`;
  }

  // Top Complex Functions
  if (analysis.mostComplexFunctions.length > 0) {
    output += `🔴 Most Complex Functions (Top ${Math.min(topCount, analysis.mostComplexFunctions.length)}):\n`;
    analysis.mostComplexFunctions.slice(0, topCount).forEach((func, index) => {
      const complexityIcon = getComplexityIcon(func.cyclomaticComplexity);
      output += `   ${index + 1}. ${complexityIcon} ${func.name} (${func.file}:${func.line})\n`;
      output += `      Cyclomatic: ${func.cyclomaticComplexity}`;
      
      if (func.cognitiveComplexity !== undefined) {
        output += ` | Cognitive: ${func.cognitiveComplexity}`;
      }
      
      if (func.maintainabilityIndex !== undefined) {
        output += ` | Maintainability: ${func.maintainabilityIndex}`;
      }
      
      output += `\n`;
      
      if (func.linesOfCode) {
        output += `      Lines of Code: ${func.linesOfCode}`;
        if (func.parameters !== undefined) {
          output += ` | Parameters: ${func.parameters}`;
        }
        output += `\n`;
      }

      // Show suggestions if available
      if (func.suggestions && func.suggestions.length > 0) {
        output += `      💡 ${func.suggestions[0]}\n`;
      }
      
      output += `\n`;
    });
  }

  // Recommendations
  if (options.recommendations && analysis.recommendations.length > 0) {
    output += `💡 Recommendations:\n`;
    analysis.recommendations.forEach((rec, index) => {
      const priorityIcon = getPriorityIcon(rec.priority);
      output += `   ${priorityIcon} ${rec.message}\n`;
      output += `      Action: ${rec.action}\n\n`;
    });
  }

  // File Analysis (if requested)
  if (options.files && analysis.files) {
    output += `📁 Per-File Analysis:\n`;
    analysis.files.forEach(file => {
      const avgComplexity = file.summary.averageComplexity;
      const complexityIcon = getComplexityIcon(avgComplexity);
      
      output += `   ${complexityIcon} ${file.file}\n`;
      output += `      Functions: ${file.summary.totalFunctions} | `;
      output += `Average Complexity: ${avgComplexity} | `;
      output += `High Complexity: ${file.summary.highComplexityFunctions}\n`;

      // Show most complex function in this file
      if (file.functions.length > 0) {
        const mostComplex = file.functions.reduce((max, func) => 
          func.cyclomaticComplexity > max.cyclomaticComplexity ? func : max
        );
        if (mostComplex.cyclomaticComplexity > threshold) {
          output += `      🔴 Most Complex: ${mostComplex.name} (${mostComplex.cyclomaticComplexity})\n`;
        }
      }
      output += `\n`;
    });
  }

  // Overall Health Assessment
  output += `🏥 Code Health Assessment:\n`;
  if (summary.averageComplexity <= 5) {
    output += `   ✅ Excellent - Very maintainable codebase\n`;
  } else if (summary.averageComplexity <= 8) {
    output += `   ✅ Good - Complexity within acceptable ranges\n`;
  } else if (summary.averageComplexity <= 12) {
    output += `   ⚠️  Warning - Consider refactoring high complexity functions\n`;
  } else {
    output += `   🚨 Critical - Immediate refactoring recommended\n`;
  }

  const highComplexityRatio = summary.totalFunctions > 0 ? 
    (summary.highComplexityFunctions / summary.totalFunctions) * 100 : 0;
  
  if (highComplexityRatio === 0) {
    output += `   ✅ No functions exceed the complexity threshold\n`;
  } else if (highComplexityRatio <= 10) {
    output += `   ✅ Only ${Math.round(highComplexityRatio)}% of functions exceed threshold\n`;
  } else if (highComplexityRatio <= 25) {
    output += `   ⚠️  ${Math.round(highComplexityRatio)}% of functions exceed threshold - review needed\n`;
  } else {
    output += `   🚨 ${Math.round(highComplexityRatio)}% of functions exceed threshold - major refactoring needed\n`;
  }

  if (options.output) {
    const { writeFileSync } = await import('fs');
    writeFileSync(options.output, output, 'utf-8');
    ui.displaySuccess(`Complexity analysis written to ${options.output}`);
  } else {
    console.log(output);
  }
}

/**
 * Gets an icon based on complexity level
 * 
 * @param {number} complexity - Complexity value
 * @returns {string} Icon representing complexity level
 */
function getComplexityIcon(complexity) {
  if (complexity <= 5) return '🟢';
  if (complexity <= 10) return '🟡';
  if (complexity <= 20) return '🟠';
  return '🔴';
}

/**
 * Gets an icon based on priority level
 * 
 * @param {string} priority - Priority level
 * @returns {string} Icon representing priority
 */
function getPriorityIcon(priority) {
  const icons = {
    'high': '🔴',
    'medium': '🟡',
    'low': '🟢',
    'info': 'ℹ️'
  };
  return icons[priority] || 'ℹ️';
}