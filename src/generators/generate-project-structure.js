/**
 * Project Structure Generator
 * 
 * This module generates a markdown file with a tree-like visualization
 * of the project's file structure.
 */

import { writeFileSync } from 'fs';
import { join, dirname, basename, relative, sep } from 'path';

/**
 * Generates a project structure tree from a list of file paths
 * 
 * @param {string[]} filePaths - Array of absolute file paths
 * @param {string} outputDir - Directory to write the output file
 */
export async function generateProjectStructure(filePaths, outputDir) {
  const outputPath = join(outputDir, 'project-structure.md');
  const projectRoot = process.cwd();
  
  // Convert absolute paths to relative paths
  const relativePaths = filePaths.map(path => relative(projectRoot, path));
  
  // Build the tree structure
  const tree = buildFileTree(relativePaths);
  
  // Generate markdown content
  let content = '# Project Structure\n\n';
  content += `Generated on: ${new Date().toISOString()}\n\n`;
  content += `Total files: ${filePaths.length}\n\n`;
  content += '```\n';
  content += generateTreeString(tree, basename(projectRoot));
  content += '```\n\n';
  
  // Add file count by extension
  content += '## File Statistics\n\n';
  content += generateFileStatistics(relativePaths);
  
  writeFileSync(outputPath, content, 'utf-8');
}

/**
 * Builds a tree data structure from file paths
 * 
 * @param {string[]} paths - Array of relative file paths
 * @returns {Object} Tree structure
 */
function buildFileTree(paths) {
  const tree = {
    name: '',
    type: 'directory',
    children: new Map(),
    size: 0
  };
  
  for (const path of paths) {
    const parts = path.split(sep).filter(part => part !== '');
    let current = tree;
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1;
      
      if (!current.children.has(part)) {
        current.children.set(part, {
          name: part,
          type: isFile ? 'file' : 'directory',
          children: isFile ? null : new Map(),
          size: 0
        });
      }
      
      if (!isFile) {
        current = current.children.get(part);
      }
    }
  }
  
  // Sort children: directories first, then files, both alphabetically
  sortTreeChildren(tree);
  
  return tree;
}

/**
 * Recursively sorts tree children
 * 
 * @param {Object} node - Tree node to sort
 */
function sortTreeChildren(node) {
  if (!node.children) return;
  
  const entries = Array.from(node.children.entries());
  entries.sort(([, a], [, b]) => {
    // Directories first
    if (a.type !== b.type) {
      return a.type === 'directory' ? -1 : 1;
    }
    // Then alphabetically
    return a.name.localeCompare(b.name);
  });
  
  node.children = new Map(entries);
  
  // Recursively sort children
  for (const child of node.children.values()) {
    sortTreeChildren(child);
  }
}

/**
 * Generates a string representation of the tree using box-drawing characters
 * 
 * @param {Object} tree - Tree structure
 * @param {string} rootName - Name of the root directory
 * @returns {string} Tree string representation
 */
function generateTreeString(tree, rootName = 'project') {
  let result = `${rootName}/\n`;
  
  if (tree.children && tree.children.size > 0) {
    const entries = Array.from(tree.children.entries());
    entries.forEach(([name, child], index) => {
      const isLast = index === entries.length - 1;
      result += generateNodeString(child, '', isLast);
    });
  }
  
  return result;
}

/**
 * Generates string representation for a single node
 * 
 * @param {Object} node - Tree node
 * @param {string} prefix - Current prefix for the line
 * @param {boolean} isLast - Whether this is the last child
 * @returns {string} Node string representation
 */
function generateNodeString(node, prefix, isLast) {
  const connector = isLast ? '└── ' : '├── ';
  const nodeSymbol = node.type === 'directory' ? '📁 ' : '📄 ';
  let result = `${prefix}${connector}${nodeSymbol}${node.name}${node.type === 'directory' ? '/' : ''}\n`;
  
  if (node.children && node.children.size > 0) {
    const nextPrefix = prefix + (isLast ? '    ' : '│   ');
    const entries = Array.from(node.children.entries());
    
    entries.forEach(([name, child], index) => {
      const isChildLast = index === entries.length - 1;
      result += generateNodeString(child, nextPrefix, isChildLast);
    });
  }
  
  return result;
}

/**
 * Generates file statistics by extension
 * 
 * @param {string[]} paths - Array of relative file paths
 * @returns {string} Statistics markdown
 */
function generateFileStatistics(paths) {
  const stats = new Map();
  let totalFiles = 0;
  
  for (const path of paths) {
    const extension = getFileExtension(path);
    stats.set(extension, (stats.get(extension) || 0) + 1);
    totalFiles++;
  }
  
  // Sort by count (descending) then by extension name
  const sortedStats = Array.from(stats.entries()).sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    return a[0].localeCompare(b[0]);
  });
  
  let result = '| Extension | Count | Percentage |\n';
  result += '|-----------|--------|------------|\n';
  
  for (const [ext, count] of sortedStats) {
    const percentage = ((count / totalFiles) * 100).toFixed(1);
    const displayExt = ext || '(no extension)';
    result += `| ${displayExt} | ${count} | ${percentage}% |\n`;
  }
  
  result += `\n**Total files:** ${totalFiles}\n`;
  
  return result;
}

/**
 * Gets file extension from path
 * 
 * @param {string} path - File path
 * @returns {string} File extension (without dot)
 */
function getFileExtension(path) {
  const filename = basename(path);
  const lastDotIndex = filename.lastIndexOf('.');
  
  if (lastDotIndex === -1 || lastDotIndex === 0) {
    return ''; // No extension or hidden file
  }
  
  return filename.substring(lastDotIndex + 1).toLowerCase();
}