/**
 * Dependencies Command
 * 
 * This module handles the deps command for structured dependency analysis
 * with JSON output support for AI consumption.
 */

import { join } from 'path';
import * as ui from '../ui-handler.js';
import { generateTechStackJson } from '../generators/generate-tech-stack-json.js';
import { formatSuccess, formatError, safeStringify } from '../utils/json-formatter.js';

/**
 * Configures the deps command
 * 
 * @param {Command} program - Commander.js program instance
 */
export function configureDepsCommand(program) {
  program
    .command('deps')
    .alias('d')
    .description('Analyze and output project dependencies')
    .option('-f, --format <format>', 'Output format: json or markdown', 'markdown')
    .option('-t, --type <type>', 'Dependency type filter: runtime, dev, peer, optional', null)
    .option('-o, --output <file>', 'Output to file instead of stdout', null)
    .action(async (options) => {
      try {
        await handleDepsCommand(options);
      } catch (error) {
        if (options.format === 'json') {
          console.error(safeStringify(formatError(error.message, 'DEPS_ERROR')));
        } else {
          ui.displayError(`Error: ${error.message}`);
        }
        process.exit(1);
      }
    });
}

/**
 * Handles the deps command execution
 * 
 * @param {Object} options - Command options
 */
async function handleDepsCommand(options) {
  const workingDir = process.cwd();
  
  if (options.format !== 'json') {
    ui.displayInfo('Analyzing project dependencies...');
  }

  try {
    // Generate dependency data
    const depsData = await generateTechStackJson(workingDir, options.type);
    
    if (options.format === 'json') {
      const result = formatSuccess(depsData, 'Dependencies analyzed successfully');
      const output = safeStringify(result, true);
      
      if (options.output) {
        // Write to file
        const { writeFileSync } = await import('fs');
        writeFileSync(options.output, output, 'utf-8');
        if (options.format !== 'json') {
          ui.displaySuccess(`Dependencies written to ${options.output}`);
        }
      } else {
        // Output to stdout
        console.log(output);
      }
    } else {
      // Markdown format
      await outputMarkdownFormat(depsData, options);
    }
    
  } catch (error) {
    throw new Error(`Failed to analyze dependencies: ${error.message}`);
  }
}

/**
 * Outputs dependencies in markdown format
 * 
 * @param {Object} depsData - Dependencies data
 * @param {Object} options - Command options
 */
async function outputMarkdownFormat(depsData, options) {
  let output = '# Project Dependencies\n\n';
  output += `Generated on: ${new Date().toISOString()}\n\n`;
  
  if (depsData.summary) {
    const { summary } = depsData;
    output += '## Summary\n\n';
    output += `- **Total Dependencies**: ${summary.total}\n`;
    output += `- **Runtime**: ${summary.runtime}\n`;
    output += `- **Development**: ${summary.dev}\n`;
    output += `- **Peer**: ${summary.peer}\n`;
    output += `- **Optional**: ${summary.optional}\n\n`;
  }

  // Group dependencies by ecosystem
  Object.entries(depsData.byEcosystem).forEach(([ecosystem, data]) => {
    if (data.dependencies.length > 0) {
      output += `## ${ecosystem.charAt(0).toUpperCase() + ecosystem.slice(1)}\n\n`;
      
      // Group by type
      const byType = {};
      data.dependencies.forEach(dep => {
        if (!byType[dep.type]) byType[dep.type] = [];
        byType[dep.type].push(dep);
      });

      Object.entries(byType).forEach(([type, deps]) => {
        if (deps.length > 0) {
          output += `### ${type.charAt(0).toUpperCase() + type.slice(1)} Dependencies\n\n`;
          deps.forEach(dep => {
            output += `- **${dep.name}**: ${dep.version}\n`;
            if (dep.description) {
              output += `  - ${dep.description}\n`;
            }
          });
          output += '\n';
        }
      });
    }
  });

  if (options.output) {
    const { writeFileSync } = await import('fs');
    writeFileSync(options.output, output, 'utf-8');
    ui.displaySuccess(`Dependencies written to ${options.output}`);
  } else {
    console.log(output);
  }
}