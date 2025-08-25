/**
 * Analyze Command
 * 
 * This module handles the codebase analysis functionality,
 * previously in main.js but now modularized for better organization.
 */

import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import * as ui from '../ui-handler.js';
import { getRelevantFiles, readFiles } from '../file-handler.js';
import { generateTechStack } from '../generators/generate-tech-stack.js';
import { generateProjectStructure } from '../generators/generate-project-structure.js';
import { generateFullCodebase } from '../generators/generate-full-codebase.js';

/**
 * Handles the main analyze command to analyze the codebase
 * 
 * @param {Object} options - Command options
 */
export async function handleAnalyzeCommand(options = {}) {
  const startTime = Date.now();
  const workingDir = process.cwd();
  const outputDir = join(workingDir, '.initrepo');
  
  ui.displayHeader();
  ui.displayInfo('Starting codebase analysis...');
  ui.displayWorkingDir(workingDir);
  
  // Create output directory
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
    ui.displaySuccess('Created output directory: .initrepo/');
  }
  
  // Step 1: Get relevant files
  const scanSpinner = ui.createSpinner('Scanning files...');
  scanSpinner.start();
  const filePaths = await getRelevantFiles(workingDir);
  scanSpinner.succeed(`Found ${filePaths.length} relevant files`);
  
  // Step 2: Read file contents
  const readSpinner = ui.createSpinner('Reading file contents...');
  readSpinner.start();
  const fileContents = await readFiles(filePaths);
  readSpinner.succeed(`Read ${fileContents.length} files successfully`);
  
  // Step 3: Generate tech stack summary
  const techStackSpinner = ui.createSpinner('Generating tech stack summary...');
  techStackSpinner.start();
  await generateTechStack(workingDir, outputDir);
  techStackSpinner.succeed('Generated tech-stack.md');
  
  // Step 4: Generate project structure
  const structureSpinner = ui.createSpinner('Generating project structure...');
  structureSpinner.start();
  await generateProjectStructure(filePaths, outputDir);
  structureSpinner.succeed('Generated project-structure.md');
  
  // Step 5: Generate full codebase XML
  const codebaseSpinner = ui.createSpinner('Generating codebase XML...');
  codebaseSpinner.start();
  await generateFullCodebase(fileContents, outputDir);
  codebaseSpinner.succeed('Generated full-codebase.xml');
  
  const duration = Date.now() - startTime;
  
  ui.displayCompletion('Analysis complete!');
  ui.displayTiming(duration);
  ui.displayOutputDir(outputDir);
  
  const generatedFiles = [
    'tech-stack.md - Dependencies and scripts summary',
    'project-structure.md - File tree visualization',
    'full-codebase.xml - Complete source code export'
  ];
  ui.displayGeneratedFiles(generatedFiles);
}