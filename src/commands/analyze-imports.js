/**
 * Analyze Imports Command
 * 
 * This module handles the analyze-imports command for comprehensive
 * import/export analysis, unused import detection, and circular dependency analysis.
 */

import * as ui from '../ui-handler.js';
import { getRelevantFiles } from '../file-handler.js';
import { analyzeImports } from '../analyzers/import-analyzer.js';
import { formatSuccess, formatError, safeStringify } from '../utils/json-formatter.js';

/**
 * Configures the analyze-imports command
 * 
 * @param {Command} program - Commander.js program instance
 */
export function configureAnalyzeImportsCommand(program) {
  program
    .command('analyze-imports')
    .alias('imports')
    .description('Analyze import/export relationships, unused imports, and circular dependencies')
    .option('-f, --format <format>', 'Output format: json or text', 'text')
    .option('--unused', 'Show only unused imports', false)
    .option('--circular', 'Show only circular dependencies', false)
    .option('--stats', 'Include dependency statistics', false)
    .option('--external', 'Include external dependency analysis', false)
    .option('-o, --output <file>', 'Output to file instead of stdout', null)
    .action(async (options) => {
      try {
        await handleAnalyzeImportsCommand(options);
      } catch (error) {
        if (options.format === 'json') {
          console.error(safeStringify(formatError(error.message, 'ANALYZE_IMPORTS_ERROR')));
        } else {
          ui.displayError(`Error: ${error.message}`);
        }
        process.exit(1);
      }
    });
}

/**
 * Handles the analyze-imports command execution
 * 
 * @param {Object} options - Command options
 */
async function handleAnalyzeImportsCommand(options) {
  const workingDir = process.cwd();
  
  if (options.format !== 'json') {
    ui.displayInfo('Analyzing import/export relationships...');
  }

  try {
    // Get relevant files to analyze
    const spinner = options.format !== 'json' ? ui.createSpinner('Scanning files...') : null;
    if (spinner) spinner.start();
    
    const filePaths = await getRelevantFiles(workingDir);
    
    // Filter for files that can have imports (mainly source code files)
    const importableFiles = filePaths.filter(file => {
      const ext = file.split('.').pop()?.toLowerCase();
      return ['js', 'jsx', 'ts', 'tsx', 'py', 'rs', 'go'].includes(ext);
    });

    if (spinner) spinner.succeed(`Analyzing imports in ${importableFiles.length} files...`);

    // Analyze imports
    const analysisSpinner = options.format !== 'json' ? ui.createSpinner('Analyzing import relationships...') : null;
    if (analysisSpinner) analysisSpinner.start();

    const analysis = await analyzeImports(importableFiles);

    if (analysisSpinner) {
      analysisSpinner.succeed(`Analysis complete: ${analysis.totalImports} imports, ${analysis.totalExports} exports`);
    }

    // Filter results based on options
    let filteredAnalysis = analysis;
    if (options.unused) {
      filteredAnalysis = {
        ...analysis,
        focus: 'unused-imports',
        results: analysis.unusedImports
      };
    } else if (options.circular) {
      filteredAnalysis = {
        ...analysis,
        focus: 'circular-dependencies',
        results: analysis.circularDependencies
      };
    }

    // Output results
    if (options.format === 'json') {
      await outputJsonFormat(filteredAnalysis, options);
    } else {
      await outputTextFormat(filteredAnalysis, options);
    }

  } catch (error) {
    throw new Error(`Failed to analyze imports: ${error.message}`);
  }
}

/**
 * Outputs analysis results in JSON format
 * 
 * @param {Object} analysis - Import analysis results
 * @param {Object} options - Command options
 */
async function outputJsonFormat(analysis, options) {
  const result = formatSuccess({
    summary: {
      totalFiles: analysis.fileCount,
      totalImports: analysis.totalImports,
      totalExports: analysis.totalExports,
      unusedImports: analysis.unusedImports.length,
      circularDependencies: analysis.circularDependencies.length
    },
    unusedImports: analysis.unusedImports,
    circularDependencies: analysis.circularDependencies,
    ...(options.stats && { stats: analysis.dependencyStats }),
    ...(options.external && {
      externalDependencies: analysis.dependencyStats.externalDependencies,
      internalDependencies: analysis.dependencyStats.internalDependencies
    })
  }, 'Import analysis completed successfully');

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
 * @param {Object} analysis - Import analysis results
 * @param {Object} options - Command options
 */
async function outputTextFormat(analysis, options) {
  let output = `\n📊 Import/Export Analysis Results\n\n`;

  // Summary
  output += `📈 Summary:\n`;
  output += `   Files Analyzed: ${analysis.fileCount}\n`;
  output += `   Total Imports: ${analysis.totalImports}\n`;
  output += `   Total Exports: ${analysis.totalExports}\n`;
  output += `   Unused Imports: ${analysis.unusedImports.length}\n`;
  output += `   Circular Dependencies: ${analysis.circularDependencies.length}\n\n`;

  // Unused Imports
  if (!options.circular && analysis.unusedImports.length > 0) {
    output += `🚨 Unused Imports (${analysis.unusedImports.length}):\n`;
    analysis.unusedImports.forEach((unused, index) => {
      output += `   ${index + 1}. ${unused.file}:${unused.line}\n`;
      output += `      Unused: ${unused.unusedIdentifier} from '${unused.importSource}'\n`;
      output += `      💡 ${unused.suggestion}\n\n`;
    });
  }

  // Circular Dependencies
  if (!options.unused && analysis.circularDependencies.length > 0) {
    output += `🔄 Circular Dependencies (${analysis.circularDependencies.length}):\n`;
    analysis.circularDependencies.forEach((circ, index) => {
      const severityIcon = circ.severity === 'high' ? '🔴' : '🟡';
      output += `   ${index + 1}. ${severityIcon} Cycle Length: ${circ.length} (${circ.severity} severity)\n`;
      output += `      Path: ${circ.cycle.join(' → ')}\n\n`;
    });
  }

  // Statistics
  if (options.stats) {
    const stats = analysis.dependencyStats;
    output += `📊 Dependency Statistics:\n`;
    output += `   Files with Imports: ${stats.filesWithImports}/${stats.totalFiles} (${Math.round(stats.filesWithImports/stats.totalFiles*100)}%)\n`;
    output += `   Files with Exports: ${stats.filesWithExports}/${stats.totalFiles} (${Math.round(stats.filesWithExports/stats.totalFiles*100)}%)\n`;
    output += `   Average Imports per File: ${stats.averageImportsPerFile.toFixed(1)}\n`;
    output += `   Average Exports per File: ${stats.averageExportsPerFile.toFixed(1)}\n`;
    output += `   External Dependencies: ${stats.externalDependencies.length}\n`;
    output += `   Internal Dependencies: ${stats.internalDependencies.length}\n\n`;

    // Top importing files
    if (stats.mostImportingFiles.length > 0) {
      output += `🔗 Most Importing Files:\n`;
      stats.mostImportingFiles.slice(0, 5).forEach((file, index) => {
        output += `   ${index + 1}. ${file.file} (${file.importCount} imports)\n`;
      });
      output += '\n';
    }

    // Top exporting files
    if (stats.mostExportingFiles.length > 0) {
      output += `📤 Most Exporting Files:\n`;
      stats.mostExportingFiles.slice(0, 5).forEach((file, index) => {
        output += `   ${index + 1}. ${file.file} (${file.exportCount} exports)\n`;
      });
      output += '\n';
    }
  }

  // External dependencies
  if (options.external) {
    const stats = analysis.dependencyStats;
    output += `📦 External Dependencies (${stats.externalDependencies.length}):\n`;
    stats.externalDependencies.slice(0, 20).forEach((dep, index) => {
      output += `   ${index + 1}. ${dep}\n`;
    });
    if (stats.externalDependencies.length > 20) {
      output += `   ... and ${stats.externalDependencies.length - 20} more\n`;
    }
    output += '\n';
  }

  // Recommendations
  if (!options.unused && !options.circular) {
    output += `💡 Recommendations:\n`;
    
    if (analysis.unusedImports.length > 0) {
      output += `   • Remove ${analysis.unusedImports.length} unused imports to reduce bundle size\n`;
    }
    
    if (analysis.circularDependencies.length > 0) {
      const highSeverity = analysis.circularDependencies.filter(c => c.severity === 'high').length;
      output += `   • Resolve ${analysis.circularDependencies.length} circular dependencies`;
      if (highSeverity > 0) output += ` (${highSeverity} high severity)`;
      output += '\n';
    }
    
    const stats = analysis.dependencyStats;
    if (stats.averageImportsPerFile > 10) {
      output += `   • Consider breaking down files with many imports (avg: ${stats.averageImportsPerFile.toFixed(1)})\n`;
    }
    
    if (analysis.unusedImports.length === 0 && analysis.circularDependencies.length === 0) {
      output += `   ✅ No issues found! Your import structure looks good.\n`;
    }
  }

  if (options.output) {
    const { writeFileSync } = await import('fs');
    writeFileSync(options.output, output, 'utf-8');
    ui.displaySuccess(`Analysis results written to ${options.output}`);
  } else {
    console.log(output);
  }
}