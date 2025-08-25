/**
 * Tech Stack JSON Generator
 * 
 * Enhanced version of the tech stack generator that outputs structured JSON
 * data for AI consumption and MCP server integration.
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { formatDependencies } from '../utils/json-formatter.js';

/**
 * Generates structured dependency data as JSON
 * 
 * @param {string} projectRoot - Root directory of the project
 * @param {string} typeFilter - Optional type filter
 * @returns {Object} Structured dependency data
 */
export async function generateTechStackJson(projectRoot, typeFilter = null) {
  const ecosystems = {
    nodejs: await analyzeNodeJS(projectRoot),
    python: await analyzePython(projectRoot),
    rust: await analyzeRust(projectRoot),
    php: await analyzePHP(projectRoot),
    java: await analyzeJava(projectRoot)
  };

  // Filter out empty ecosystems
  const filteredEcosystems = {};
  Object.entries(ecosystems).forEach(([key, value]) => {
    if (value && value.dependencies.length > 0) {
      filteredEcosystems[key] = value;
    }
  });

  // Calculate summary statistics
  const summary = calculateSummary(filteredEcosystems);

  // Apply type filter if specified
  if (typeFilter) {
    Object.keys(filteredEcosystems).forEach(eco => {
      filteredEcosystems[eco].dependencies = filteredEcosystems[eco].dependencies
        .filter(dep => dep.type === typeFilter);
    });
  }

  return {
    summary,
    byEcosystem: filteredEcosystems,
    generatedAt: new Date().toISOString(),
    projectRoot
  };
}

/**
 * Analyzes Node.js dependencies from package.json
 * 
 * @param {string} projectRoot - Project root directory
 * @returns {Object|null} Node.js dependency analysis
 */
async function analyzeNodeJS(projectRoot) {
  const packageJsonPath = join(projectRoot, 'package.json');
  if (!existsSync(packageJsonPath)) {
    return null;
  }

  try {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    const dependencies = [];

    // Process different dependency types
    if (packageJson.dependencies) {
      dependencies.push(...formatDependencies(packageJson.dependencies, 'runtime'));
    }
    
    if (packageJson.devDependencies) {
      dependencies.push(...formatDependencies(packageJson.devDependencies, 'dev'));
    }
    
    if (packageJson.peerDependencies) {
      dependencies.push(...formatDependencies(packageJson.peerDependencies, 'peer'));
    }
    
    if (packageJson.optionalDependencies) {
      dependencies.push(...formatDependencies(packageJson.optionalDependencies, 'optional'));
    }

    return {
      ecosystem: 'nodejs',
      manifest: 'package.json',
      projectInfo: {
        name: packageJson.name || null,
        version: packageJson.version || null,
        description: packageJson.description || null
      },
      engines: packageJson.engines || {},
      scripts: packageJson.scripts || {},
      dependencies
    };
  } catch (error) {
    console.warn(`Failed to parse package.json: ${error.message}`);
    return null;
  }
}

/**
 * Analyzes Python dependencies from requirements.txt and setup.py
 * 
 * @param {string} projectRoot - Project root directory
 * @returns {Object|null} Python dependency analysis
 */
async function analyzePython(projectRoot) {
  const requirementsPath = join(projectRoot, 'requirements.txt');
  const setupPyPath = join(projectRoot, 'setup.py');
  const pyprojectPath = join(projectRoot, 'pyproject.toml');
  
  let dependencies = [];
  let manifest = null;

  // Check requirements.txt
  if (existsSync(requirementsPath)) {
    try {
      const content = readFileSync(requirementsPath, 'utf-8');
      const lines = content.split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#') && !line.startsWith('-'));

      dependencies.push(...lines.map(line => {
        const match = line.match(/^([a-zA-Z0-9_-]+)([>=<~!]+.*)?$/);
        if (match) {
          return {
            name: match[1],
            version: match[2] || 'latest',
            type: 'runtime',
            versionClean: match[2] ? match[2].replace(/[>=<~!]/g, '').trim() : 'latest'
          };
        }
        return {
          name: line,
          version: 'latest',
          type: 'runtime',
          versionClean: 'latest'
        };
      }));
      manifest = 'requirements.txt';
    } catch (error) {
      console.warn(`Failed to parse requirements.txt: ${error.message}`);
    }
  }

  // Check pyproject.toml
  if (existsSync(pyprojectPath) && dependencies.length === 0) {
    try {
      const content = readFileSync(pyprojectPath, 'utf-8');
      // Basic TOML parsing for dependencies
      const dependenciesMatch = content.match(/\[tool\.poetry\.dependencies\](.*?)(?=\[|$)/s);
      if (dependenciesMatch) {
        const lines = dependenciesMatch[1].split('\n').filter(line => line.trim() && !line.trim().startsWith('#'));
        dependencies.push(...parsePyprojectDependencies(lines, 'runtime'));
      }
      
      const devDepsMatch = content.match(/\[tool\.poetry\.group\.dev\.dependencies\](.*?)(?=\[|$)/s);
      if (devDepsMatch) {
        const lines = devDepsMatch[1].split('\n').filter(line => line.trim() && !line.trim().startsWith('#'));
        dependencies.push(...parsePyprojectDependencies(lines, 'dev'));
      }
      
      manifest = 'pyproject.toml';
    } catch (error) {
      console.warn(`Failed to parse pyproject.toml: ${error.message}`);
    }
  }

  if (dependencies.length === 0) {
    return null;
  }

  return {
    ecosystem: 'python',
    manifest,
    dependencies
  };
}

/**
 * Analyzes Rust dependencies from Cargo.toml
 * 
 * @param {string} projectRoot - Project root directory
 * @returns {Object|null} Rust dependency analysis
 */
async function analyzeRust(projectRoot) {
  const cargoTomlPath = join(projectRoot, 'Cargo.toml');
  if (!existsSync(cargoTomlPath)) {
    return null;
  }

  try {
    const content = readFileSync(cargoTomlPath, 'utf-8');
    const dependencies = [];

    // Parse [dependencies] section
    const depsMatch = content.match(/\[dependencies\](.*?)(?=\[|$)/s);
    if (depsMatch) {
      const lines = depsMatch[1].split('\n').filter(line => line.trim() && !line.trim().startsWith('#'));
      dependencies.push(...parseCargoTOMLDependencies(lines, 'runtime'));
    }

    // Parse [dev-dependencies] section
    const devDepsMatch = content.match(/\[dev-dependencies\](.*?)(?=\[|$)/s);
    if (devDepsMatch) {
      const lines = devDepsMatch[1].split('\n').filter(line => line.trim() && !line.trim().startsWith('#'));
      dependencies.push(...parseCargoTOMLDependencies(lines, 'dev'));
    }

    return {
      ecosystem: 'rust',
      manifest: 'Cargo.toml',
      dependencies
    };
  } catch (error) {
    console.warn(`Failed to parse Cargo.toml: ${error.message}`);
    return null;
  }
}

/**
 * Analyzes PHP dependencies from composer.json
 * 
 * @param {string} projectRoot - Project root directory
 * @returns {Object|null} PHP dependency analysis
 */
async function analyzePHP(projectRoot) {
  const composerJsonPath = join(projectRoot, 'composer.json');
  if (!existsSync(composerJsonPath)) {
    return null;
  }

  try {
    const composerJson = JSON.parse(readFileSync(composerJsonPath, 'utf-8'));
    const dependencies = [];

    if (composerJson.require) {
      dependencies.push(...formatDependencies(composerJson.require, 'runtime'));
    }
    
    if (composerJson['require-dev']) {
      dependencies.push(...formatDependencies(composerJson['require-dev'], 'dev'));
    }

    return {
      ecosystem: 'php',
      manifest: 'composer.json',
      projectInfo: {
        name: composerJson.name || null,
        description: composerJson.description || null
      },
      dependencies
    };
  } catch (error) {
    console.warn(`Failed to parse composer.json: ${error.message}`);
    return null;
  }
}

/**
 * Analyzes Java dependencies (basic support)
 * 
 * @param {string} projectRoot - Project root directory
 * @returns {Object|null} Java dependency analysis
 */
async function analyzeJava(projectRoot) {
  const pomXmlPath = join(projectRoot, 'pom.xml');
  const buildGradlePath = join(projectRoot, 'build.gradle');
  
  if (existsSync(pomXmlPath)) {
    return {
      ecosystem: 'java',
      manifest: 'pom.xml',
      note: 'Maven dependency analysis requires Maven commands for full details',
      dependencies: []
    };
  }
  
  if (existsSync(buildGradlePath)) {
    return {
      ecosystem: 'java',
      manifest: 'build.gradle',
      note: 'Gradle dependency analysis requires Gradle commands for full details',
      dependencies: []
    };
  }

  return null;
}

/**
 * Helper function to parse pyproject.toml dependencies
 */
function parsePyprojectDependencies(lines, type) {
  return lines
    .map(line => {
      const match = line.match(/^([a-zA-Z0-9_-]+)\s*=\s*"([^"]+)"/);
      if (match && match[1] !== 'python') {
        return {
          name: match[1],
          version: match[2],
          type,
          versionClean: match[2].replace(/[\^~>=<]/g, '').trim()
        };
      }
      return null;
    })
    .filter(Boolean);
}

/**
 * Helper function to parse Cargo.toml dependencies
 */
function parseCargoTOMLDependencies(lines, type) {
  return lines
    .map(line => {
      const match = line.match(/^([a-zA-Z0-9_-]+)\s*=\s*"([^"]+)"/);
      if (match) {
        return {
          name: match[1],
          version: match[2],
          type,
          versionClean: match[2].replace(/[\^~>=<]/g, '').trim()
        };
      }
      return null;
    })
    .filter(Boolean);
}

/**
 * Calculates summary statistics across all ecosystems
 */
function calculateSummary(ecosystems) {
  let total = 0;
  let runtime = 0;
  let dev = 0;
  let peer = 0;
  let optional = 0;

  Object.values(ecosystems).forEach(eco => {
    if (eco && eco.dependencies) {
      eco.dependencies.forEach(dep => {
        total++;
        switch (dep.type) {
          case 'runtime': runtime++; break;
          case 'dev': dev++; break;
          case 'peer': peer++; break;
          case 'optional': optional++; break;
        }
      });
    }
  });

  return { total, runtime, dev, peer, optional };
}