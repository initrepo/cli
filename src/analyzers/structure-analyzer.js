/**
 * Structure Analyzer
 * 
 * This module provides functionality to analyze and document project structure:
 * - Generate project structure documentation
 * - Identify architectural patterns
 * - Analyze directory organization
 * - Detect project conventions
 */

import { readFileSync, statSync, existsSync } from 'fs';
import { join, relative, dirname, basename, extname } from 'path';
import { minimatch } from 'minimatch';
import { getRelevantFiles } from '../file-handler.js';
import { parseFileSymbols } from '../parsers/symbol-parser.js';

/**
 * Analyzes the complete project structure
 * 
 * @param {string} projectRoot - Root directory of the project
 * @param {Object} options - Analysis options
 * @returns {Object} Comprehensive structure analysis
 */
export async function analyzeProjectStructure(projectRoot, options = {}) {
  const {
    includeFiles = true,
    includeSymbols = true,
    includeDependencies = true,
    includePatterns = true,
    maxDepth = 10,
    excludePatterns = []
  } = options;

  try {
    // Get all relevant files
    const allFiles = await getRelevantFiles(projectRoot);
    
    // Build directory tree
    const directoryTree = buildDirectoryTree(allFiles, projectRoot, maxDepth);
    
    // Analyze project patterns
    const patterns = analyzeProjectPatterns(allFiles, projectRoot);
    
    // Get project metadata
    const metadata = await getProjectMetadata(projectRoot);
    
    // Analyze file organization
    const organization = analyzeFileOrganization(allFiles, projectRoot);
    
    // Get symbols if requested
    let symbols = {};
    if (includeSymbols) {
      symbols = await analyzeProjectSymbols(allFiles);
    }
    
    // Analyze dependencies if requested
    let dependencies = {};
    if (includeDependencies) {
      dependencies = await analyzeDependencyStructure(projectRoot);
    }

    return {
      metadata,
      structure: {
        tree: directoryTree,
        organization,
        patterns,
        statistics: calculateStructureStatistics(allFiles, directoryTree)
      },
      symbols: includeSymbols ? symbols : undefined,
      dependencies: includeDependencies ? dependencies : undefined,
      analysis: {
        timestamp: new Date().toISOString(),
        filesAnalyzed: allFiles.length,
        projectRoot: projectRoot
      }
    };

  } catch (error) {
    throw new Error(`Failed to analyze project structure: ${error.message}`);
  }
}

/**
 * Builds a hierarchical directory tree structure
 * 
 * @param {Array} files - Array of file paths
 * @param {string} projectRoot - Project root directory
 * @param {number} maxDepth - Maximum depth to analyze
 * @returns {Object} Directory tree structure
 */
function buildDirectoryTree(files, projectRoot, maxDepth) {
  const tree = {
    name: basename(projectRoot),
    type: 'directory',
    path: '.',
    children: {},
    files: [],
    size: 0,
    depth: 0
  };

  files.forEach(filePath => {
    const relativePath = relative(projectRoot, filePath);
    const pathParts = relativePath.split(/[/\\]/);
    
    // Skip if exceeds max depth
    if (pathParts.length > maxDepth) return;
    
    let currentNode = tree;
    let currentPath = '';
    
    // Navigate/create directory structure
    for (let i = 0; i < pathParts.length - 1; i++) {
      const dirName = pathParts[i];
      currentPath = currentPath ? join(currentPath, dirName) : dirName;
      
      if (!currentNode.children[dirName]) {
        currentNode.children[dirName] = {
          name: dirName,
          type: 'directory',
          path: currentPath,
          children: {},
          files: [],
          size: 0,
          depth: i + 1
        };
      }
      currentNode = currentNode.children[dirName];
    }
    
    // Add file to current directory
    const fileName = pathParts[pathParts.length - 1];
    const fileStats = getFileStats(filePath);
    
    currentNode.files.push({
      name: fileName,
      path: relativePath,
      type: 'file',
      extension: extname(fileName),
      size: fileStats.size,
      ...fileStats
    });
    
    // Update size up the tree
    let node = currentNode;
    while (node) {
      node.size += fileStats.size;
      node = findParentNode(tree, node);
    }
  });

  return tree;
}

/**
 * Analyzes project patterns and conventions
 * 
 * @param {Array} files - Array of file paths
 * @param {string} projectRoot - Project root directory
 * @returns {Object} Detected patterns
 */
function analyzeProjectPatterns(files, projectRoot) {
  const patterns = {
    framework: detectFramework(files, projectRoot),
    architecture: detectArchitecture(files),
    conventions: detectNamingConventions(files),
    structure: detectStructuralPatterns(files)
  };

  return patterns;
}

/**
 * Detects the primary framework/technology stack
 * 
 * @param {Array} files - Array of file paths
 * @param {string} projectRoot - Project root directory
 * @returns {Object} Framework detection results
 */
function detectFramework(files, projectRoot) {
  const frameworks = {
    react: {
      score: 0,
      indicators: ['package.json', 'jsx', 'tsx', 'components', 'hooks']
    },
    vue: {
      score: 0,
      indicators: ['package.json', '.vue', 'components', 'views']
    },
    angular: {
      score: 0,
      indicators: ['angular.json', '.component.ts', '.service.ts', '.module.ts']
    },
    svelte: {
      score: 0,
      indicators: ['.svelte', 'svelte.config.js']
    },
    nextjs: {
      score: 0,
      indicators: ['next.config.js', 'pages/', 'app/', '_app.js']
    },
    nuxt: {
      score: 0,
      indicators: ['nuxt.config.js', 'pages/', 'layouts/', 'middleware/']
    },
    express: {
      score: 0,
      indicators: ['package.json', 'routes/', 'middleware/', 'app.js']
    },
    nestjs: {
      score: 0,
      indicators: ['nest-cli.json', '.controller.ts', '.service.ts', '.module.ts']
    }
  };

  // Check package.json dependencies
  const packagePath = join(projectRoot, 'package.json');
  if (existsSync(packagePath)) {
    try {
      const packageContent = JSON.parse(readFileSync(packagePath, 'utf-8'));
      const allDeps = {
        ...packageContent.dependencies,
        ...packageContent.devDependencies
      };

      Object.keys(allDeps).forEach(dep => {
        if (dep.includes('react')) frameworks.react.score += 10;
        if (dep.includes('vue')) frameworks.vue.score += 10;
        if (dep.includes('angular')) frameworks.angular.score += 10;
        if (dep.includes('svelte')) frameworks.svelte.score += 10;
        if (dep.includes('next')) frameworks.nextjs.score += 10;
        if (dep.includes('nuxt')) frameworks.nuxt.score += 10;
        if (dep.includes('express')) frameworks.express.score += 10;
        if (dep.includes('nest')) frameworks.nestjs.score += 10;
      });
    } catch (error) {
      // Ignore package.json parsing errors
    }
  }

  // Check file patterns
  files.forEach(file => {
    const fileName = basename(file);
    const filePath = relative(projectRoot, file);

    // React indicators
    if (fileName.endsWith('.jsx') || fileName.endsWith('.tsx')) frameworks.react.score += 5;
    if (filePath.includes('components')) frameworks.react.score += 2;
    if (filePath.includes('hooks')) frameworks.react.score += 3;

    // Vue indicators
    if (fileName.endsWith('.vue')) frameworks.vue.score += 10;
    if (filePath.includes('components') && frameworks.vue.score > 0) frameworks.vue.score += 2;

    // Angular indicators
    if (fileName.includes('.component.')) frameworks.angular.score += 5;
    if (fileName.includes('.service.')) frameworks.angular.score += 5;
    if (fileName.includes('.module.')) frameworks.angular.score += 5;

    // Next.js indicators
    if (filePath.startsWith('pages/')) frameworks.nextjs.score += 5;
    if (filePath.startsWith('app/')) frameworks.nextjs.score += 3;
    if (fileName === '_app.js' || fileName === '_app.tsx') frameworks.nextjs.score += 10;
  });

  // Find highest scoring framework
  const detected = Object.entries(frameworks)
    .filter(([_, data]) => data.score > 0)
    .sort(([, a], [, b]) => b.score - a.score)
    .map(([name, data]) => ({ name, score: data.score }));

  return {
    primary: detected[0] || { name: 'unknown', score: 0 },
    all: detected,
    confidence: detected[0]?.score > 20 ? 'high' : detected[0]?.score > 5 ? 'medium' : 'low'
  };
}

/**
 * Detects architectural patterns
 * 
 * @param {Array} files - Array of file paths
 * @returns {Object} Architecture patterns
 */
function detectArchitecture(files) {
  const patterns = {
    mvc: 0,
    mvvm: 0,
    layered: 0,
    microservices: 0,
    monolithic: 0,
    modular: 0
  };

  const directoryNames = new Set();
  files.forEach(file => {
    const parts = file.split(/[/\\]/);
    parts.forEach(part => directoryNames.add(part.toLowerCase()));
  });

  // Check for MVC pattern
  if (directoryNames.has('models') && directoryNames.has('views') && directoryNames.has('controllers')) {
    patterns.mvc = 10;
  }

  // Check for layered architecture
  if (directoryNames.has('services') && directoryNames.has('repositories')) {
    patterns.layered += 5;
  }
  if (directoryNames.has('utils') || directoryNames.has('helpers')) {
    patterns.layered += 2;
  }

  // Check for modular structure
  const moduleCount = Array.from(directoryNames).filter(dir => 
    dir.includes('module') || dir.includes('feature') || dir.includes('component')
  ).length;
  patterns.modular = Math.min(moduleCount * 2, 10);

  return patterns;
}

/**
 * Detects naming conventions
 * 
 * @param {Array} files - Array of file paths
 * @returns {Object} Naming convention analysis
 */
function detectNamingConventions(files) {
  const conventions = {
    fileNaming: {
      camelCase: 0,
      kebabCase: 0,
      snakeCase: 0,
      PascalCase: 0
    },
    directoryNaming: {
      camelCase: 0,
      kebabCase: 0,
      snakeCase: 0,
      lowercase: 0
    }
  };

  const directories = new Set();
  
  files.forEach(file => {
    const fileName = basename(file, extname(file));
    const pathParts = file.split(/[/\\]/);
    
    // Analyze file naming
    if (fileName.match(/^[a-z]+([A-Z][a-z]*)*$/)) conventions.fileNaming.camelCase++;
    if (fileName.includes('-')) conventions.fileNaming.kebabCase++;
    if (fileName.includes('_')) conventions.fileNaming.snakeCase++;
    if (fileName.match(/^[A-Z][a-z]*([A-Z][a-z]*)*$/)) conventions.fileNaming.PascalCase++;
    
    // Collect directories
    pathParts.slice(0, -1).forEach(dir => directories.add(dir));
  });

  // Analyze directory naming
  directories.forEach(dir => {
    if (dir.match(/^[a-z]+([A-Z][a-z]*)*$/)) conventions.directoryNaming.camelCase++;
    if (dir.includes('-')) conventions.directoryNaming.kebabCase++;
    if (dir.includes('_')) conventions.directoryNaming.snakeCase++;
    if (dir.match(/^[a-z]+$/)) conventions.directoryNaming.lowercase++;
  });

  return conventions;
}

/**
 * Detects structural patterns
 * 
 * @param {Array} files - Array of file paths
 * @returns {Object} Structural pattern analysis
 */
function detectStructuralPatterns(files) {
  const patterns = {
    separationOfConcerns: 0,
    testCoLocation: 0,
    configurationSeparation: 0,
    assetOrganization: 0
  };

  const hasTests = files.some(f => f.includes('test') || f.includes('spec'));
  const hasConfigs = files.some(f => f.includes('config') || f.includes('settings'));
  const hasAssets = files.some(f => f.includes('assets') || f.includes('public') || f.includes('static'));
  
  if (hasTests) patterns.testCoLocation = 5;
  if (hasConfigs) patterns.configurationSeparation = 5;
  if (hasAssets) patterns.assetOrganization = 5;

  // Check separation of concerns
  const directories = new Set();
  files.forEach(file => {
    const parts = file.split(/[/\\]/);
    parts.forEach(part => directories.add(part.toLowerCase()));
  });

  const concernDirs = ['components', 'services', 'utils', 'hooks', 'pages', 'views', 'models'];
  const foundConcerns = concernDirs.filter(concern => directories.has(concern));
  patterns.separationOfConcerns = foundConcerns.length * 2;

  return patterns;
}

/**
 * Analyzes file organization patterns
 * 
 * @param {Array} files - Array of file paths
 * @param {string} projectRoot - Project root directory
 * @returns {Object} File organization analysis
 */
function analyzeFileOrganization(files, projectRoot) {
  const organization = {
    byExtension: {},
    byDirectory: {},
    deepestNesting: 0,
    averageDepth: 0,
    emptyDirectories: [],
    largestFiles: [],
    fileTypeDistribution: {}
  };

  let totalDepth = 0;

  files.forEach(file => {
    const relativePath = relative(projectRoot, file);
    const ext = extname(file);
    const dir = dirname(relativePath);
    const depth = relativePath.split(/[/\\]/).length;
    
    // Track by extension
    organization.byExtension[ext] = (organization.byExtension[ext] || 0) + 1;
    
    // Track by directory
    organization.byDirectory[dir] = (organization.byDirectory[dir] || 0) + 1;
    
    // Track depth
    organization.deepestNesting = Math.max(organization.deepestNesting, depth);
    totalDepth += depth;
    
    // Track file size
    try {
      const stats = statSync(file);
      organization.largestFiles.push({
        path: relativePath,
        size: stats.size
      });
    } catch (error) {
      // Skip files we can't stat
    }
  });

  organization.averageDepth = Math.round(totalDepth / files.length * 100) / 100;
  
  // Sort largest files
  organization.largestFiles = organization.largestFiles
    .sort((a, b) => b.size - a.size)
    .slice(0, 10);

  // Calculate file type distribution
  const totalFiles = files.length;
  Object.entries(organization.byExtension).forEach(([ext, count]) => {
    organization.fileTypeDistribution[ext] = {
      count,
      percentage: Math.round((count / totalFiles) * 100 * 100) / 100
    };
  });

  return organization;
}

/**
 * Analyzes project symbols across all files
 * 
 * @param {Array} files - Array of file paths
 * @returns {Object} Symbol analysis
 */
async function analyzeProjectSymbols(files) {
  const symbols = {
    byType: {},
    byFile: {},
    total: 0,
    exportedSymbols: [],
    publicAPI: []
  };

  for (const file of files) {
    try {
      const fileSymbols = await parseFileSymbols(file);
      
      symbols.byFile[file] = fileSymbols;
      symbols.total += fileSymbols.length;
      
      fileSymbols.forEach(symbol => {
        // Count by type
        symbols.byType[symbol.type] = (symbols.byType[symbol.type] || 0) + 1;
        
        // Track exported symbols
        if (symbol.export) {
          symbols.exportedSymbols.push({
            name: symbol.name,
            type: symbol.type,
            file: symbol.file,
            signature: symbol.signature
          });
        }
      });
    } catch (error) {
      // Skip files that can't be parsed
    }
  }

  return symbols;
}

/**
 * Analyzes dependency structure
 * 
 * @param {string} projectRoot - Project root directory
 * @returns {Object} Dependency analysis
 */
async function analyzeDependencyStructure(projectRoot) {
  const dependencies = {
    production: {},
    development: {},
    peer: {},
    optional: {},
    bundled: {},
    analysis: {
      totalCount: 0,
      outdatedRisk: 'unknown',
      licenseCompliance: 'unknown'
    }
  };

  const packagePath = join(projectRoot, 'package.json');
  if (existsSync(packagePath)) {
    try {
      const packageContent = JSON.parse(readFileSync(packagePath, 'utf-8'));
      
      dependencies.production = packageContent.dependencies || {};
      dependencies.development = packageContent.devDependencies || {};
      dependencies.peer = packageContent.peerDependencies || {};
      dependencies.optional = packageContent.optionalDependencies || {};
      dependencies.bundled = packageContent.bundledDependencies || {};
      
      dependencies.analysis.totalCount = 
        Object.keys(dependencies.production).length +
        Object.keys(dependencies.development).length +
        Object.keys(dependencies.peer).length;
        
    } catch (error) {
      // Ignore package.json parsing errors
    }
  }

  return dependencies;
}

/**
 * Gets project metadata
 * 
 * @param {string} projectRoot - Project root directory
 * @returns {Object} Project metadata
 */
async function getProjectMetadata(projectRoot) {
  const metadata = {
    name: basename(projectRoot),
    hasPackageJson: false,
    hasGitRepo: false,
    hasReadme: false,
    hasLicense: false,
    hasTests: false,
    hasCI: false,
    languages: []
  };

  // Check for common files
  const commonFiles = ['package.json', '.git', 'README.md', 'readme.md', 'LICENSE', 'license'];
  commonFiles.forEach(file => {
    const filePath = join(projectRoot, file);
    if (existsSync(filePath)) {
      switch (file) {
        case 'package.json': metadata.hasPackageJson = true; break;
        case '.git': metadata.hasGitRepo = true; break;
        case 'README.md':
        case 'readme.md': metadata.hasReadme = true; break;
        case 'LICENSE':
        case 'license': metadata.hasLicense = true; break;
      }
    }
  });

  return metadata;
}

/**
 * Gets basic file statistics
 * 
 * @param {string} filePath - Path to file
 * @returns {Object} File statistics
 */
function getFileStats(filePath) {
  try {
    const stats = statSync(filePath);
    return {
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime,
      lines: countLines(filePath)
    };
  } catch (error) {
    return {
      size: 0,
      created: null,
      modified: null,
      lines: 0
    };
  }
}

/**
 * Counts lines in a text file
 * 
 * @param {string} filePath - Path to file
 * @returns {number} Line count
 */
function countLines(filePath) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    return content.split('\n').length;
  } catch (error) {
    return 0;
  }
}

/**
 * Calculates structure statistics
 * 
 * @param {Array} files - Array of file paths
 * @param {Object} tree - Directory tree
 * @returns {Object} Structure statistics
 */
function calculateStructureStatistics(files, tree) {
  const stats = {
    totalFiles: files.length,
    totalDirectories: countDirectories(tree),
    averageFilesPerDirectory: 0,
    maxDirectoryDepth: tree.depth || 0,
    fileExtensions: new Set()
  };

  files.forEach(file => {
    const ext = extname(file);
    if (ext) stats.fileExtensions.add(ext);
  });

  stats.averageFilesPerDirectory = stats.totalDirectories > 0 
    ? Math.round((stats.totalFiles / stats.totalDirectories) * 100) / 100 
    : 0;

  stats.fileExtensions = Array.from(stats.fileExtensions);

  return stats;
}

/**
 * Counts directories in a tree structure
 * 
 * @param {Object} tree - Directory tree node
 * @returns {number} Directory count
 */
function countDirectories(tree) {
  let count = 1; // Count current directory
  
  Object.values(tree.children || {}).forEach(child => {
    if (child.type === 'directory') {
      count += countDirectories(child);
    }
  });

  return count;
}

/**
 * Finds parent node in directory tree
 * 
 * @param {Object} tree - Root tree node
 * @param {Object} targetNode - Node to find parent for
 * @returns {Object|null} Parent node or null
 */
function findParentNode(tree, targetNode) {
  if (tree === targetNode) return null;
  
  for (const child of Object.values(tree.children || {})) {
    if (child === targetNode) return tree;
    
    const found = findParentNode(child, targetNode);
    if (found) return found;
  }
  
  return null;
}