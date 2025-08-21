/**
 * Architecture Parser
 * 
 * This module parses technical_architecture.md files to extract project structure
 * and configuration information for scaffolding projects.
 */

import { readFileSync } from 'fs';
import { basename } from 'path';

/**
 * Parses a technical architecture markdown file
 * 
 * @param {string} filePath - Path to the technical_architecture.md file
 * @returns {Promise<Object>} Parsed architecture data
 */
export async function parseArchitectureFile(filePath) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    
    const architecture = {
      projectName: extractProjectName(content, filePath),
      projectType: detectProjectType(content),
      structure: parseDirectoryStructure(content),
      dependencies: extractDependencies(content),
      features: extractFeatures(content),
      configuration: extractConfiguration(content),
      metadata: {
        sourceFile: filePath,
        parsedAt: new Date().toISOString()
      }
    };
    
    return architecture;
  } catch (error) {
    throw new Error(`Failed to parse architecture file: ${error.message}`);
  }
}

/**
 * Extracts project name from the content or filename
 * 
 * @param {string} content - File content
 * @param {string} filePath - File path
 * @returns {string} Project name
 */
function extractProjectName(content, filePath) {
  // Look for project name in various formats
  const patterns = [
    /^#\s+(.+)$/m,                          // Main heading
    /project[:\s]+(.+)$/im,                 // "Project: Name"
    /name[:\s]+(.+)$/im,                    // "Name: Project"
    /^##?\s*(.+?)\s*(?:project|app)/im      // "Name Project" or "Name App"
  ];
  
  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match) {
      return match[1].trim().replace(/[^\w\s-]/g, '');
    }
  }
  
  // Fallback to directory structure if found
  const structureMatch = content.match(/^(.+?)\//m);
  if (structureMatch) {
    return structureMatch[1].trim();
  }
  
  // Final fallback to filename
  return basename(filePath, '.md').replace(/[_-]/g, ' ');
}

/**
 * Detects the project type based on content analysis
 * 
 * @param {string} content - File content
 * @returns {string} Detected project type
 */
function detectProjectType(content) {
  const lowerContent = content.toLowerCase();
  
  // Check for specific technologies and patterns
  const typeIndicators = {
    'nextjs': [
      'next.js', 'nextjs', 'app/', 'next.config.js', 
      'app router', 'pages/', '_app.tsx', 'layout.tsx'
    ],
    'react': [
      'react', 'create-react-app', 'src/components', 
      'jsx', 'tsx', 'react-dom'
    ],
    'react-native': [
      'react native', 'react-native', 'expo', 'metro',
      'ios/', 'android/', 'app.tsx', 'app.js'
    ],
    'python-mcp': [
      'mcp', 'model context protocol', 'server.py',
      'tools/', 'handlers/', '__init__.py'
    ],
    'python-automation': [
      'automation', 'script', 'tasks/', 'workflows/',
      'main.py', 'requirements.txt', 'config/'
    ]
  };
  
  let maxScore = 0;
  let detectedType = 'nextjs'; // default
  
  for (const [type, indicators] of Object.entries(typeIndicators)) {
    let score = 0;
    for (const indicator of indicators) {
      if (lowerContent.includes(indicator)) {
        score += 1;
      }
    }
    
    if (score > maxScore) {
      maxScore = score;
      detectedType = type;
    }
  }
  
  return detectedType;
}

/**
 * Parses directory structure from code blocks or tree representations
 * 
 * @param {string} content - File content
 * @returns {Object} Parsed directory structure
 */
function parseDirectoryStructure(content) {
  // Look for code blocks or tree structures
  const codeBlockRegex = /```[\s\S]*?```/g;
  const codeBlocks = content.match(codeBlockRegex) || [];
  
  const structure = {
    directories: [],
    files: [],
    tree: null
  };
  
  for (const block of codeBlocks) {
    const blockContent = block.replace(/```[\w]*\n?/, '').replace(/```$/, '');
    
    // Check if this looks like a directory structure
    if (isDirectoryStructure(blockContent)) {
      const parsed = parseTreeStructure(blockContent);
      if (parsed.directories.length > 0 || parsed.files.length > 0) {
        structure.directories.push(...parsed.directories);
        structure.files.push(...parsed.files);
        if (!structure.tree) {
          structure.tree = blockContent;
        }
      }
    }
  }
  
  return structure;
}

/**
 * Determines if content represents a directory structure
 * 
 * @param {string} content - Content to check
 * @returns {boolean} True if it looks like a directory structure
 */
function isDirectoryStructure(content) {
  const indicators = [
    /├──/,           // Tree characters
    /└──/,
    /│/,
    /\/$/m,          // Directories ending with /
    /\.(js|ts|tsx|jsx|py|md|json|txt)$/m,  // File extensions
    /^[\s]*[\w-]+\/[\s]*$/m  // Directory patterns
  ];
  
  return indicators.some(pattern => pattern.test(content));
}

/**
 * Parses a tree structure into directories and files
 * 
 * @param {string} treeContent - Tree structure content
 * @returns {Object} Parsed structure with directories and files
 */
function parseTreeStructure(treeContent) {
  const lines = treeContent.split('\n').filter(line => line.trim());
  const directories = [];
  const files = [];
  
  for (const line of lines) {
    // Remove tree characters and whitespace
    const cleaned = line
      .replace(/[├└│]/g, '')
      .replace(/──/g, '')
      .replace(/^\s+/, '')
      .trim();
    
    if (!cleaned) continue;
    
    // Check if it's a directory (ends with /) or has directory indicators
    if (cleaned.endsWith('/') || cleaned.includes('//')) {
      const dirPath = cleaned.replace(/\/$/, '').replace(/\s*\/\/.*$/, '');
      if (dirPath && !directories.includes(dirPath)) {
        directories.push(dirPath);
      }
    } else if (cleaned.includes('.')) {
      // It's likely a file
      const filePath = cleaned.replace(/\s*\/\/.*$/, '');
      if (filePath && !files.includes(filePath)) {
        files.push(filePath);
      }
    }
  }
  
  return { directories, files };
}

/**
 * Extracts dependencies from the content
 * 
 * @param {string} content - File content
 * @returns {Object} Dependencies object
 */
function extractDependencies(content) {
  const dependencies = {
    npm: [],
    python: [],
    system: []
  };
  
  // Look for package names and dependencies
  const npmPackageRegex = /@[\w-]+\/[\w-]+|[\w-]+(?=\s*[:\s]*\d+\.\d+|\s*npm|\s*yarn)/gi;
  const pythonPackageRegex = /(?:pip install|import|from)\s+([\w-]+)/gi;
  
  const npmMatches = content.match(npmPackageRegex) || [];
  const pythonMatches = content.match(pythonPackageRegex) || [];
  
  dependencies.npm = [...new Set(npmMatches)];
  dependencies.python = [...new Set(pythonMatches.map(m => m.split(' ').pop()))];
  
  return dependencies;
}

/**
 * Extracts features and components from the content
 * 
 * @param {string} content - File content
 * @returns {Array} Array of features
 */
function extractFeatures(content) {
  const features = [];
  
  // Look for feature descriptions in headers and lists
  const featurePatterns = [
    /##\s*(.+?)(?=\n|$)/g,      // H2 headers
    /###\s*(.+?)(?=\n|$)/g,     // H3 headers
    /[-*]\s*(.+?)(?=\n|$)/g     // List items
  ];
  
  for (const pattern of featurePatterns) {
    const matches = [...content.matchAll(pattern)];
    for (const match of matches) {
      const feature = match[1].trim();
      if (feature.length > 3 && feature.length < 100) {
        features.push(feature);
      }
    }
  }
  
  return [...new Set(features)];
}

/**
 * Extracts configuration information
 * 
 * @param {string} content - File content
 * @returns {Object} Configuration object
 */
function extractConfiguration(content) {
  const config = {
    typescript: content.toLowerCase().includes('typescript') || content.includes('.ts'),
    tailwind: content.toLowerCase().includes('tailwind'),
    eslint: content.toLowerCase().includes('eslint'),
    prettier: content.toLowerCase().includes('prettier'),
    testing: content.toLowerCase().includes('test') || content.toLowerCase().includes('jest'),
    database: extractDatabaseInfo(content),
    authentication: extractAuthInfo(content)
  };
  
  return config;
}

/**
 * Extracts database information from content
 * 
 * @param {string} content - File content
 * @returns {string|null} Database type or null
 */
function extractDatabaseInfo(content) {
  const dbTypes = ['postgresql', 'mysql', 'sqlite', 'mongodb', 'redis', 'prisma', 'supabase'];
  const lowerContent = content.toLowerCase();
  
  for (const dbType of dbTypes) {
    if (lowerContent.includes(dbType)) {
      return dbType;
    }
  }
  
  return null;
}

/**
 * Extracts authentication information from content
 * 
 * @param {string} content - File content
 * @returns {string|null} Auth type or null
 */
function extractAuthInfo(content) {
  const authTypes = ['clerk', 'auth0', 'firebase', 'nextauth', 'supabase auth'];
  const lowerContent = content.toLowerCase();
  
  for (const authType of authTypes) {
    if (lowerContent.includes(authType)) {
      return authType;
    }
  }
  
  return null;
}