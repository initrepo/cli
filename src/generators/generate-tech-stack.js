/**
 * Tech Stack Generator
 * 
 * This module generates a markdown file summarizing the project's
 * dependencies and scripts from package.json and other manifest files.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * Generates a tech stack summary from package.json and other manifest files
 * 
 * @param {string} projectRoot - Root directory of the project
 * @param {string} outputDir - Directory to write the output file
 */
export async function generateTechStack(projectRoot, outputDir) {
  const outputPath = join(outputDir, 'tech-stack.md');
  let content = '# Tech Stack Summary\n\n';
  content += `Generated on: ${new Date().toISOString()}\n\n`;
  
  // Check for package.json (Node.js)
  const packageJsonPath = join(projectRoot, 'package.json');
  if (existsSync(packageJsonPath)) {
    content += await generateNodeJsSection(packageJsonPath);
  }
  
  // Check for requirements.txt (Python)
  const requirementsPath = join(projectRoot, 'requirements.txt');
  if (existsSync(requirementsPath)) {
    content += await generatePythonSection(requirementsPath);
  }
  
  // Check for Cargo.toml (Rust)
  const cargoTomlPath = join(projectRoot, 'Cargo.toml');
  if (existsSync(cargoTomlPath)) {
    content += await generateRustSection(cargoTomlPath);
  }
  
  // Check for composer.json (PHP)
  const composerJsonPath = join(projectRoot, 'composer.json');
  if (existsSync(composerJsonPath)) {
    content += await generatePhpSection(composerJsonPath);
  }
  
  // Check for pom.xml (Java Maven)
  const pomXmlPath = join(projectRoot, 'pom.xml');
  if (existsSync(pomXmlPath)) {
    content += await generateMavenSection(pomXmlPath);
  }
  
  // Check for build.gradle (Java Gradle)
  const buildGradlePath = join(projectRoot, 'build.gradle');
  if (existsSync(buildGradlePath)) {
    content += await generateGradleSection(buildGradlePath);
  }
  
  // If no manifest files found
  if (!existsSync(packageJsonPath) && !existsSync(requirementsPath) && 
      !existsSync(cargoTomlPath) && !existsSync(composerJsonPath) &&
      !existsSync(pomXmlPath) && !existsSync(buildGradlePath)) {
    content += '## No recognized manifest files found\n\n';
    content += 'This project does not contain common dependency manifest files like:\n';
    content += '- package.json (Node.js/npm)\n';
    content += '- requirements.txt (Python)\n';
    content += '- Cargo.toml (Rust)\n';
    content += '- composer.json (PHP)\n';
    content += '- pom.xml (Java Maven)\n';
    content += '- build.gradle (Java Gradle)\n\n';
  }
  
  writeFileSync(outputPath, content, 'utf-8');
}

/**
 * Generates Node.js section from package.json
 */
async function generateNodeJsSection(packageJsonPath) {
  try {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    let section = '## Node.js (package.json)\n\n';
    
    // Basic project info
    if (packageJson.name) {
      section += `**Project Name:** ${packageJson.name}\n`;
    }
    if (packageJson.version) {
      section += `**Version:** ${packageJson.version}\n`;
    }
    if (packageJson.description) {
      section += `**Description:** ${packageJson.description}\n`;
    }
    section += '\n';
    
    // Dependencies
    if (packageJson.dependencies && Object.keys(packageJson.dependencies).length > 0) {
      section += '### Dependencies\n\n';
      Object.entries(packageJson.dependencies).forEach(([name, version]) => {
        section += `- **${name}**: ${version}\n`;
      });
      section += '\n';
    }
    
    // Dev Dependencies
    if (packageJson.devDependencies && Object.keys(packageJson.devDependencies).length > 0) {
      section += '### Development Dependencies\n\n';
      Object.entries(packageJson.devDependencies).forEach(([name, version]) => {
        section += `- **${name}**: ${version}\n`;
      });
      section += '\n';
    }
    
    // Scripts
    if (packageJson.scripts && Object.keys(packageJson.scripts).length > 0) {
      section += '### Available Scripts\n\n';
      section += '| Script | Command |\n';
      section += '|--------|----------|\n';
      Object.entries(packageJson.scripts).forEach(([name, command]) => {
        section += `| ${name} | \`${command}\` |\n`;
      });
      section += '\n';
    }
    
    // Engines
    if (packageJson.engines) {
      section += '### Engine Requirements\n\n';
      Object.entries(packageJson.engines).forEach(([engine, version]) => {
        section += `- **${engine}**: ${version}\n`;
      });
      section += '\n';
    }
    
    return section;
  } catch (error) {
    return `## Node.js (package.json)\n\nError reading package.json: ${error.message}\n\n`;
  }
}

/**
 * Generates Python section from requirements.txt
 */
async function generatePythonSection(requirementsPath) {
  try {
    const requirements = readFileSync(requirementsPath, 'utf-8');
    let section = '## Python (requirements.txt)\n\n';
    
    const lines = requirements.split('\n').filter(line => line.trim() && !line.trim().startsWith('#'));
    
    if (lines.length > 0) {
      section += '### Dependencies\n\n';
      lines.forEach(line => {
        const trimmed = line.trim();
        if (trimmed) {
          section += `- ${trimmed}\n`;
        }
      });
      section += '\n';
    }
    
    return section;
  } catch (error) {
    return `## Python (requirements.txt)\n\nError reading requirements.txt: ${error.message}\n\n`;
  }
}

/**
 * Generates Rust section from Cargo.toml
 */
async function generateRustSection(cargoTomlPath) {
  try {
    const cargoToml = readFileSync(cargoTomlPath, 'utf-8');
    let section = '## Rust (Cargo.toml)\n\n';
    
    // Basic parsing for TOML (simple approach)
    const lines = cargoToml.split('\n');
    let inDependencies = false;
    let inDevDependencies = false;
    const dependencies = [];
    const devDependencies = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed === '[dependencies]') {
        inDependencies = true;
        inDevDependencies = false;
        continue;
      } else if (trimmed === '[dev-dependencies]') {
        inDependencies = false;
        inDevDependencies = true;
        continue;
      } else if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        inDependencies = false;
        inDevDependencies = false;
        continue;
      }
      
      if ((inDependencies || inDevDependencies) && trimmed && !trimmed.startsWith('#')) {
        const match = trimmed.match(/^([^=]+)\s*=\s*(.+)$/);
        if (match) {
          const [, name, version] = match;
          if (inDependencies) {
            dependencies.push({ name: name.trim(), version: version.trim() });
          } else if (inDevDependencies) {
            devDependencies.push({ name: name.trim(), version: version.trim() });
          }
        }
      }
    }
    
    if (dependencies.length > 0) {
      section += '### Dependencies\n\n';
      dependencies.forEach(({ name, version }) => {
        section += `- **${name}**: ${version}\n`;
      });
      section += '\n';
    }
    
    if (devDependencies.length > 0) {
      section += '### Development Dependencies\n\n';
      devDependencies.forEach(({ name, version }) => {
        section += `- **${name}**: ${version}\n`;
      });
      section += '\n';
    }
    
    return section;
  } catch (error) {
    return `## Rust (Cargo.toml)\n\nError reading Cargo.toml: ${error.message}\n\n`;
  }
}

/**
 * Generates PHP section from composer.json
 */
async function generatePhpSection(composerJsonPath) {
  try {
    const composerJson = JSON.parse(readFileSync(composerJsonPath, 'utf-8'));
    let section = '## PHP (composer.json)\n\n';
    
    // Basic project info
    if (composerJson.name) {
      section += `**Project Name:** ${composerJson.name}\n`;
    }
    if (composerJson.description) {
      section += `**Description:** ${composerJson.description}\n`;
    }
    section += '\n';
    
    // Dependencies
    if (composerJson.require && Object.keys(composerJson.require).length > 0) {
      section += '### Dependencies\n\n';
      Object.entries(composerJson.require).forEach(([name, version]) => {
        section += `- **${name}**: ${version}\n`;
      });
      section += '\n';
    }
    
    // Dev Dependencies
    if (composerJson['require-dev'] && Object.keys(composerJson['require-dev']).length > 0) {
      section += '### Development Dependencies\n\n';
      Object.entries(composerJson['require-dev']).forEach(([name, version]) => {
        section += `- **${name}**: ${version}\n`;
      });
      section += '\n';
    }
    
    return section;
  } catch (error) {
    return `## PHP (composer.json)\n\nError reading composer.json: ${error.message}\n\n`;
  }
}

/**
 * Generates Maven section from pom.xml (basic parsing)
 */
async function generateMavenSection(pomXmlPath) {
  try {
    const pomXml = readFileSync(pomXmlPath, 'utf-8');
    let section = '## Java Maven (pom.xml)\n\n';
    section += 'Maven project detected. For detailed dependency analysis, consider using Maven dependency tree commands.\n\n';
    return section;
  } catch (error) {
    return `## Java Maven (pom.xml)\n\nError reading pom.xml: ${error.message}\n\n`;
  }
}

/**
 * Generates Gradle section from build.gradle (basic parsing)
 */
async function generateGradleSection(buildGradlePath) {
  try {
    const buildGradle = readFileSync(buildGradlePath, 'utf-8');
    let section = '## Java Gradle (build.gradle)\n\n';
    section += 'Gradle project detected. For detailed dependency analysis, consider using Gradle dependency tasks.\n\n';
    return section;
  } catch (error) {
    return `## Java Gradle (build.gradle)\n\nError reading build.gradle: ${error.message}\n\n`;
  }
}