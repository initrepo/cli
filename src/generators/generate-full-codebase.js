/**
 * Full Codebase Generator
 * 
 * This module generates an XML file containing the complete source code
 * of all relevant files in the project for AI consumption.
 */

import { writeFileSync } from 'fs';
import { join } from 'path';
import { XMLBuilder } from 'fast-xml-parser';

/**
 * Generates a complete codebase XML from file contents
 * 
 * @param {Array<{path: string, content: string, relativePath: string}>} fileContents - Array of file objects
 * @param {string} outputDir - Directory to write the output file
 */
export async function generateFullCodebase(fileContents, outputDir) {
  const outputPath = join(outputDir, 'full-codebase.xml');
  
  // Build XML structure
  const xmlData = {
    codebase: {
      '@_generated': new Date().toISOString(),
      '@_totalFiles': fileContents.length,
      '@_generator': 'initrepo-cli',
      '@_version': '1.0.0',
      files: {
        file: fileContents.map(fileData => ({
          '@_path': fileData.relativePath,
          '@_size': fileData.content.length,
          '@_lines': fileData.content.split('\n').length,
          '@_extension': getFileExtension(fileData.relativePath),
          content: {
            '#cdata': fileData.content
          }
        }))
      },
      summary: {
        statistics: generateStatistics(fileContents),
        extensions: generateExtensionSummary(fileContents)
      }
    }
  };
  
  // Configure XML builder
  const builder = new XMLBuilder({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    cdataPropName: '#cdata',
    format: true,
    indentBy: '  ',
    suppressEmptyNode: true,
    suppressBooleanAttributes: false
  });
  
  // Generate XML string
  const xmlHeader = '<?xml version="1.0" encoding="UTF-8"?>\n';
  const xmlString = builder.build(xmlData);
  const fullXml = xmlHeader + xmlString;
  
  writeFileSync(outputPath, fullXml, 'utf-8');
}

/**
 * Generates general statistics about the codebase
 * 
 * @param {Array} fileContents - Array of file objects
 * @returns {Object} Statistics object
 */
function generateStatistics(fileContents) {
  let totalLines = 0;
  let totalCharacters = 0;
  let totalSize = 0;
  
  for (const file of fileContents) {
    const lines = file.content.split('\n').length;
    totalLines += lines;
    totalCharacters += file.content.length;
    totalSize += Buffer.byteLength(file.content, 'utf8');
  }
  
  return {
    '@_totalFiles': fileContents.length,
    '@_totalLines': totalLines,
    '@_totalCharacters': totalCharacters,
    '@_totalSizeBytes': totalSize,
    '@_averageLinesPerFile': Math.round(totalLines / fileContents.length),
    '@_averageCharactersPerFile': Math.round(totalCharacters / fileContents.length)
  };
}

/**
 * Generates summary by file extension
 * 
 * @param {Array} fileContents - Array of file objects
 * @returns {Object} Extension summary object
 */
function generateExtensionSummary(fileContents) {
  const extensionStats = new Map();
  
  for (const file of fileContents) {
    const ext = getFileExtension(file.relativePath);
    const lines = file.content.split('\n').length;
    const characters = file.content.length;
    
    if (!extensionStats.has(ext)) {
      extensionStats.set(ext, {
        count: 0,
        totalLines: 0,
        totalCharacters: 0
      });
    }
    
    const stats = extensionStats.get(ext);
    stats.count++;
    stats.totalLines += lines;
    stats.totalCharacters += characters;
  }
  
  // Convert to array format for XML
  const extensions = Array.from(extensionStats.entries()).map(([ext, stats]) => ({
    '@_name': ext || 'no-extension',
    '@_count': stats.count,
    '@_totalLines': stats.totalLines,
    '@_totalCharacters': stats.totalCharacters,
    '@_averageLinesPerFile': Math.round(stats.totalLines / stats.count),
    '@_averageCharactersPerFile': Math.round(stats.totalCharacters / stats.count)
  }));
  
  // Sort by count (descending)
  extensions.sort((a, b) => b['@_count'] - a['@_count']);
  
  return {
    extension: extensions
  };
}

/**
 * Gets file extension from path
 * 
 * @param {string} path - File path
 * @returns {string} File extension (without dot)
 */
function getFileExtension(path) {
  const filename = path.split('/').pop() || path.split('\\').pop() || '';
  const lastDotIndex = filename.lastIndexOf('.');
  
  if (lastDotIndex === -1 || lastDotIndex === 0) {
    return ''; // No extension or hidden file
  }
  
  return filename.substring(lastDotIndex + 1).toLowerCase();
}

/**
 * Escapes special characters for XML content
 * Note: fast-xml-parser handles this automatically with CDATA sections
 * 
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeXml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Determines if content should be wrapped in CDATA
 * 
 * @param {string} content - File content
 * @returns {boolean} True if CDATA should be used
 */
function shouldUseCDATA(content) {
  // Use CDATA for any content that contains XML special characters
  return content.includes('<') || content.includes('>') || content.includes('&');
}