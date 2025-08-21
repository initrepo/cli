/**
 * File Handler Module
 * 
 * This module handles file discovery, filtering based on ignore patterns,
 * and reading file contents for the InitRepo CLI tool.
 */

import { readFileSync, existsSync } from 'fs';
import { join, relative } from 'path';
import { globby } from 'globby';

/**
 * Default patterns to ignore, regardless of .gitignore or .initrepoignore
 */
const DEFAULT_IGNORE_PATTERNS = [
  'node_modules/**',
  '.git/**',
  '.svn/**',
  '.hg/**',
  'dist/**',
  'build/**',
  'out/**',
  'target/**',
  '.next/**',
  '.nuxt/**',
  '.vuepress/dist/**',
  'coverage/**',
  '.nyc_output/**',
  '.cache/**',
  '.parcel-cache/**',
  '.DS_Store',
  'Thumbs.db',
  '*.log',
  '.env',
  '.env.local',
  '.env.*.local',
  '*.tmp',
  '*.temp',
  '*.swp',
  '*.swo',
  '*~',
  '.initrepo/**'
];

/**
 * File extensions that are considered source code files
 */
const SOURCE_FILE_EXTENSIONS = [
  'js', 'jsx', 'ts', 'tsx', 'vue', 'svelte',
  'py', 'rb', 'php', 'java', 'kt', 'scala',
  'go', 'rs', 'cpp', 'c', 'h', 'hpp',
  'cs', 'fs', 'vb', 'swift', 'dart',
  'html', 'htm', 'css', 'scss', 'sass', 'less',
  'json', 'xml', 'yaml', 'yml', 'toml',
  'md', 'txt', 'sql', 'sh', 'bash', 'zsh',
  'ps1', 'bat', 'cmd', 'dockerfile',
  'makefile', 'cmake', 'gradle'
];

/**
 * Reads and parses ignore patterns from .gitignore and .initrepoignore files
 * 
 * @param {string} projectRoot - Root directory of the project
 * @returns {string[]} Array of ignore patterns
 */
function getIgnorePatterns(projectRoot) {
  const patterns = [...DEFAULT_IGNORE_PATTERNS];
  
  // Read .gitignore
  const gitignorePath = join(projectRoot, '.gitignore');
  if (existsSync(gitignorePath)) {
    try {
      const gitignoreContent = readFileSync(gitignorePath, 'utf-8');
      const gitignorePatterns = parseIgnoreFile(gitignoreContent);
      patterns.push(...gitignorePatterns);
    } catch (error) {
      console.warn(`Warning: Could not read .gitignore: ${error.message}`);
    }
  }
  
  // Read .initrepoignore
  const initrepoignorePath = join(projectRoot, '.initrepoignore');
  if (existsSync(initrepoignorePath)) {
    try {
      const initrepoignoreContent = readFileSync(initrepoignorePath, 'utf-8');
      const initrepoignorePatterns = parseIgnoreFile(initrepoignoreContent);
      patterns.push(...initrepoignorePatterns);
    } catch (error) {
      console.warn(`Warning: Could not read .initrepoignore: ${error.message}`);
    }
  }
  
  return patterns;
}

/**
 * Parses ignore file content and extracts patterns
 * 
 * @param {string} content - Raw content of ignore file
 * @returns {string[]} Array of ignore patterns
 */
function parseIgnoreFile(content) {
  return content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'))
    .map(line => {
      // Convert gitignore patterns to globby patterns
      if (line.endsWith('/')) {
        return line + '**';
      }
      return line;
    });
}

/**
 * Checks if a file should be included based on its extension
 * 
 * @param {string} filePath - Path to the file
 * @returns {boolean} True if file should be included
 */
function isSourceFile(filePath) {
  const extension = filePath.split('.').pop()?.toLowerCase();
  if (!extension) return false;
  
  return SOURCE_FILE_EXTENSIONS.includes(extension) ||
         filePath.toLowerCase().includes('makefile') ||
         filePath.toLowerCase().includes('dockerfile') ||
         filePath.toLowerCase().includes('package.json') ||
         filePath.toLowerCase().includes('composer.json') ||
         filePath.toLowerCase().includes('cargo.toml') ||
         filePath.toLowerCase().includes('pyproject.toml') ||
         filePath.toLowerCase().includes('pom.xml') ||
         filePath.toLowerCase().includes('build.gradle');
}

/**
 * Gets all relevant files in the project directory
 * 
 * @param {string} projectRoot - Root directory of the project
 * @returns {Promise<string[]>} Array of file paths relative to project root
 */
export async function getRelevantFiles(projectRoot) {
  try {
    const ignorePatterns = getIgnorePatterns(projectRoot);
    
    // Use globby to find all files, excluding ignore patterns
    const allFiles = await globby(['**/*'], {
      cwd: projectRoot,
      ignore: ignorePatterns,
      dot: false,
      onlyFiles: true,
      followSymbolicLinks: false
    });
    
    // Filter to only include source files
    const sourceFiles = allFiles.filter(isSourceFile);
    
    // Convert to absolute paths for consistency
    return sourceFiles.map(file => join(projectRoot, file));
    
  } catch (error) {
    throw new Error(`Failed to scan files: ${error.message}`);
  }
}

/**
 * Reads the content of multiple files
 * 
 * @param {string[]} filePaths - Array of absolute file paths
 * @returns {Promise<Array<{path: string, content: string, relativePath: string}>>} Array of file objects
 */
export async function readFiles(filePaths) {
  const fileContents = [];
  const projectRoot = process.cwd();
  
  for (const filePath of filePaths) {
    try {
      const content = readFileSync(filePath, 'utf-8');
      const relativePath = relative(projectRoot, filePath);
      
      fileContents.push({
        path: filePath,
        relativePath: relativePath,
        content: content
      });
    } catch (error) {
      console.warn(`Warning: Could not read file ${filePath}: ${error.message}`);
    }
  }
  
  return fileContents;
}

/**
 * Utility function to check if a file exists and is readable
 * 
 * @param {string} filePath - Path to check
 * @returns {boolean} True if file exists and is readable
 */
export function isFileReadable(filePath) {
  try {
    readFileSync(filePath, 'utf-8');
    return true;
  } catch {
    return false;
  }
}