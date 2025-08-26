/**
 * Generate Structure Command
 * 
 * Generates comprehensive project structure documentation including:
 * - Directory tree visualization
 * - File organization analysis
 * - Architectural pattern detection
 * - Technology stack identification
 */

import { Command } from 'commander';
import { analyzeProjectStructure } from '../analyzers/structure-analyzer.js';
import { formatSuccess, formatError, safeStringify } from '../utils/json-formatter.js';
import picocolors from 'picocolors';
import * as ui from '../ui-handler.js';

/**
 * Configures the generate-structure command
 * 
 * @param {Command} program - Commander program instance
 */
export function configureGenerateStructureCommand(program) {
  const structureCommand = new Command('generate-structure')
    .description('Generate comprehensive project structure documentation')
    .option('--no-symbols', 'Exclude symbol analysis')
    .option('--no-dependencies', 'Exclude dependency analysis')
    .option('--no-patterns', 'Exclude pattern detection')
    .option('--max-depth <depth>', 'Maximum directory depth to analyze', '10')
    .option('--include-files', 'Include detailed file information')
    .option('--format <format>', 'Output format (json, text, tree)', 'text')
    .option('-o, --output <file>', 'Output to file instead of stdout')
    .action(async (options) => {
      await handleGenerateStructureCommand(options);
    });

  program.addCommand(structureCommand);
}

/**
 * Handles the generate-structure command execution
 * 
 * @param {Object} options - Command options
 */
async function handleGenerateStructureCommand(options) {
  try {
    const projectRoot = process.cwd();
    
    // Show analysis progress
    if (options.format !== 'json') {
      ui.displayInfo('🏗️  Analyzing project structure...');
    }

    // Perform structure analysis
    const analysisOptions = {
      includeFiles: options.includeFiles || false,
      includeSymbols: options.symbols !== false,
      includeDependencies: options.dependencies !== false,
      includePatterns: options.patterns !== false,
      maxDepth: parseInt(options.maxDepth, 10)
    };

    const structureAnalysis = await analyzeProjectStructure(projectRoot, analysisOptions);

    // Format and output results
    if (options.format === 'json') {
      const jsonOutput = formatSuccess({
        project: structureAnalysis,
        command: 'generate-structure',
        options: analysisOptions
      });
      console.log(safeStringify(jsonOutput));
    } else {
      await displayStructureAnalysis(structureAnalysis, options);
    }

  } catch (error) {
    if (options.format === 'json') {
      console.log(safeStringify(formatError(error.message, 'generate-structure')));
    } else {
      ui.displayError(`Error generating structure: ${error.message}`);
    }
    process.exit(1);
  }
}

/**
 * Displays structure analysis in text format
 * 
 * @param {Object} analysis - Structure analysis results
 * @param {Object} options - Command options
 */
async function displayStructureAnalysis(analysis, options) {
  console.log(picocolors.bold(picocolors.blue('📋 Project Structure Analysis')));
  console.log();

  // Display project metadata
  displayProjectMetadata(analysis.metadata);
  
  // Display structure information
  displayStructureInfo(analysis.structure);

  // Display patterns if included
  if (options.patterns !== false && analysis.structure.patterns) {
    displayPatternAnalysis(analysis.structure.patterns);
  }

  // Display symbols if included
  if (options.symbols !== false && analysis.symbols) {
    displaySymbolAnalysis(analysis.symbols);
  }

  // Display dependencies if included
  if (options.dependencies !== false && analysis.dependencies) {
    displayDependencyAnalysis(analysis.dependencies);
  }

  // Display directory tree based on format
  if (options.format === 'tree' || options.format === 'text') {
    console.log();
    console.log(picocolors.bold('📁 Directory Structure:'));
    console.log();
    displayDirectoryTree(analysis.structure.tree, '', true);
  }
}

/**
 * Displays project metadata
 * 
 * @param {Object} metadata - Project metadata
 */
function displayProjectMetadata(metadata) {
  console.log(picocolors.bold('📊 Project Overview:'));
  console.log(`  Name: ${picocolors.cyan(metadata.name)}`);
  console.log(`  Package.json: ${metadata.hasPackageJson ? picocolors.green('✓') : picocolors.red('✗')}`);
  console.log(`  Git Repository: ${metadata.hasGitRepo ? picocolors.green('✓') : picocolors.red('✗')}`);
  console.log(`  README: ${metadata.hasReadme ? picocolors.green('✓') : picocolors.red('✗')}`);
  console.log(`  License: ${metadata.hasLicense ? picocolors.green('✓') : picocolors.red('✗')}`);
  console.log(`  Tests: ${metadata.hasTests ? picocolors.green('✓') : picocolors.red('✗')}`);
  console.log();
}

/**
 * Displays structure information and statistics
 * 
 * @param {Object} structure - Structure information
 */
function displayStructureInfo(structure) {
  const stats = structure.statistics;
  const org = structure.organization;

  console.log(picocolors.bold('📈 Structure Statistics:'));
  console.log(`  Total Files: ${picocolors.cyan(stats.totalFiles)}`);
  console.log(`  Total Directories: ${picocolors.cyan(stats.totalDirectories)}`);
  console.log(`  Average Files per Directory: ${picocolors.cyan(stats.averageFilesPerDirectory)}`);
  console.log(`  Maximum Directory Depth: ${picocolors.cyan(org.deepestNesting)}`);
  console.log(`  Average File Depth: ${picocolors.cyan(org.averageDepth)}`);
  console.log();

  // Display file type distribution
  if (org.fileTypeDistribution && Object.keys(org.fileTypeDistribution).length > 0) {
    console.log(picocolors.bold('📄 File Types:'));
    Object.entries(org.fileTypeDistribution)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 10)
      .forEach(([ext, info]) => {
        const extension = ext || '(no extension)';
        console.log(`  ${extension}: ${picocolors.cyan(info.count)} (${picocolors.gray(info.percentage + '%')})`);
      });
    console.log();
  }

  // Display largest files
  if (org.largestFiles && org.largestFiles.length > 0) {
    console.log(picocolors.bold('📦 Largest Files:'));
    org.largestFiles.slice(0, 5).forEach(file => {
      const sizeKB = Math.round(file.size / 1024 * 100) / 100;
      console.log(`  ${picocolors.blue(file.path)}: ${picocolors.yellow(sizeKB + ' KB')}`);
    });
    console.log();
  }
}

/**
 * Displays pattern analysis results
 * 
 * @param {Object} patterns - Detected patterns
 */
function displayPatternAnalysis(patterns) {
  console.log(picocolors.bold('🔍 Detected Patterns:'));
  
  // Framework detection
  if (patterns.framework) {
    const fw = patterns.framework;
    console.log(`  Primary Framework: ${picocolors.green(fw.primary.name)} (confidence: ${fw.confidence})`);
    
    if (fw.all && fw.all.length > 1) {
      console.log('  Other Frameworks:');
      fw.all.slice(1, 4).forEach(f => {
        console.log(`    ${picocolors.gray(f.name)}: ${f.score} points`);
      });
    }
  }

  // Architecture patterns
  if (patterns.architecture) {
    console.log('  Architecture Patterns:');
    Object.entries(patterns.architecture)
      .filter(([, score]) => score > 0)
      .sort(([, a], [, b]) => b - a)
      .forEach(([pattern, score]) => {
        console.log(`    ${picocolors.cyan(pattern)}: ${picocolors.yellow(score + ' points')}`);
      });
  }

  // Naming conventions
  if (patterns.conventions) {
    console.log('  Naming Conventions:');
    console.log('    Files:');
    Object.entries(patterns.conventions.fileNaming)
      .filter(([, count]) => count > 0)
      .sort(([, a], [, b]) => b - a)
      .forEach(([convention, count]) => {
        console.log(`      ${convention}: ${picocolors.cyan(count)} files`);
      });
    console.log('    Directories:');
    Object.entries(patterns.conventions.directoryNaming)
      .filter(([, count]) => count > 0)
      .sort(([, a], [, b]) => b - a)
      .forEach(([convention, count]) => {
        console.log(`      ${convention}: ${picocolors.cyan(count)} directories`);
      });
  }
  
  console.log();
}

/**
 * Displays symbol analysis results
 * 
 * @param {Object} symbols - Symbol analysis
 */
function displaySymbolAnalysis(symbols) {
  console.log(picocolors.bold('🔧 Symbol Analysis:'));
  console.log(`  Total Symbols: ${picocolors.cyan(symbols.total)}`);
  
  if (symbols.byType && Object.keys(symbols.byType).length > 0) {
    console.log('  By Type:');
    Object.entries(symbols.byType)
      .sort(([, a], [, b]) => b - a)
      .forEach(([type, count]) => {
        console.log(`    ${picocolors.green(type)}: ${picocolors.cyan(count)}`);
      });
  }

  if (symbols.exportedSymbols && symbols.exportedSymbols.length > 0) {
    console.log(`  Exported Symbols: ${picocolors.cyan(symbols.exportedSymbols.length)}`);
  }
  
  console.log();
}

/**
 * Displays dependency analysis results
 * 
 * @param {Object} dependencies - Dependency analysis
 */
function displayDependencyAnalysis(dependencies) {
  console.log(picocolors.bold('📦 Dependencies:'));
  console.log(`  Production: ${picocolors.cyan(Object.keys(dependencies.production).length)}`);
  console.log(`  Development: ${picocolors.cyan(Object.keys(dependencies.development).length)}`);
  console.log(`  Peer: ${picocolors.cyan(Object.keys(dependencies.peer).length)}`);
  console.log(`  Total: ${picocolors.cyan(dependencies.analysis.totalCount)}`);
  
  // Show top production dependencies
  if (Object.keys(dependencies.production).length > 0) {
    console.log('  Key Production Dependencies:');
    Object.keys(dependencies.production)
      .slice(0, 8)
      .forEach(dep => {
        console.log(`    ${picocolors.blue(dep)}: ${picocolors.gray(dependencies.production[dep])}`);
      });
  }
  
  console.log();
}

/**
 * Displays directory tree structure recursively
 * 
 * @param {Object} node - Tree node
 * @param {string} prefix - Current line prefix
 * @param {boolean} isLast - Whether this is the last child
 * @param {number} maxFiles - Maximum files to show per directory
 */
function displayDirectoryTree(node, prefix = '', isLast = true, maxFiles = 10) {
  // Display current node
  const connector = isLast ? '└── ' : '├── ';
  const icon = node.type === 'directory' ? '📁' : '📄';
  
  if (node.type === 'directory') {
    console.log(`${prefix}${connector}${icon} ${picocolors.blue(node.name)}/`);
  }

  // Display files in current directory (limited)
  if (node.files && node.files.length > 0) {
    const filesToShow = node.files.slice(0, maxFiles);
    const hasMore = node.files.length > maxFiles;
    
    filesToShow.forEach((file, index) => {
      const isLastFile = !hasMore && index === filesToShow.length - 1 && Object.keys(node.children || {}).length === 0;
      const filePrefix = prefix + (isLast ? '    ' : '│   ');
      const fileConnector = isLastFile ? '└── ' : '├── ';
      
      const ext = file.extension || '';
      const icon = getFileIcon(ext);
      const sizeStr = file.size ? ` ${picocolors.gray('(' + Math.round(file.size/1024*100)/100 + 'KB)')}` : '';
      
      console.log(`${filePrefix}${fileConnector}${icon} ${file.name}${sizeStr}`);
    });

    if (hasMore) {
      const remainingCount = node.files.length - maxFiles;
      const morePrefix = prefix + (isLast ? '    ' : '│   ');
      const hasChildren = Object.keys(node.children || {}).length > 0;
      const moreConnector = hasChildren ? '├── ' : '└── ';
      console.log(`${morePrefix}${moreConnector}${picocolors.gray(`... and ${remainingCount} more files`)}`);
    }
  }

  // Display child directories
  const children = Object.values(node.children || {});
  children.forEach((child, index) => {
    const isLastChild = index === children.length - 1;
    const childPrefix = prefix + (isLast ? '    ' : '│   ');
    displayDirectoryTree(child, childPrefix, isLastChild, maxFiles);
  });
}

/**
 * Gets appropriate icon for file extension
 * 
 * @param {string} ext - File extension
 * @returns {string} File icon
 */
function getFileIcon(ext) {
  const icons = {
    '.js': '📜',
    '.jsx': '⚛️',
    '.ts': '📘',
    '.tsx': '⚛️',
    '.vue': '💚',
    '.py': '🐍',
    '.java': '☕',
    '.go': '🔵',
    '.rs': '🦀',
    '.php': '🐘',
    '.rb': '💎',
    '.css': '🎨',
    '.scss': '🎨',
    '.html': '🌐',
    '.md': '📝',
    '.json': '📋',
    '.xml': '📄',
    '.yml': '⚙️',
    '.yaml': '⚙️',
    '.config': '⚙️',
    '.env': '🔐',
    '.lock': '🔒'
  };

  return icons[ext.toLowerCase()] || '📄';
}

export default configureGenerateStructureCommand;