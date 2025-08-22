/**
 * UI Handler for InitRepo CLI
 * 
 * This module provides a consistent and professional terminal interface
 * for the InitRepo CLI tool, handling all console output with proper
 * styling and formatting.
 */

import colors from 'picocolors';

/**
 * Displays a stylized header for the tool
 */
export function displayHeader() {
  console.log();
  console.log(colors.white('  _       _ _                        '));
  console.log(colors.white(' (_)     (_) |                       '));
  console.log(colors.white('  _ _ __  _| |_ _ __ ___ _ __   ___     '));
  console.log(colors.white(' | | \'_ \\| | __| \'__/ _ \\ \'_ \\ / _ \\    '));
  console.log(colors.white(' | | | | | | |_| | |  __/ |_) | (_) |   '));
  console.log(colors.white(' |_|_| |_|_|\\__|_|  \\___|  __/ \\___/    '));
  console.log(colors.white('                          |_|         '));
  console.log(colors.dim('v1.0.0'));
  console.log();
}

/**
 * Prints a success message in green with checkmark
 * @param {string} message - The success message to display
 */
export function displaySuccess(message) {
  console.log(colors.green('✔'), message);
}

/**
 * Prints an error message in red with X symbol
 * @param {string} message - The error message to display
 */
export function displayError(message) {
  console.log(colors.red('✖'), colors.red(message));
}

/**
 * Prints a general informational message in bright white
 * @param {string} message - The informational message to display
 */
export function displayInfo(message) {
  console.log(colors.white('›'), message);
}

/**
 * Displays a formatted list of generated files
 * @param {string[]} fileList - Array of file paths to display
 */
export function displayGeneratedFiles(fileList) {
  console.log();
  console.log(colors.white('Generated Files:'));
  fileList.forEach(file => {
    console.log(colors.white('└─ ') + colors.white(file));
  });
  console.log();
}

/**
 * Creates a simple spinner for showing progress
 * @param {string} text - The text to display alongside the spinner
 * @returns {Object} Spinner object with start(), stop(), and succeed() methods
 */
export function createSpinner(text) {
  const spinnerChars = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  let currentFrame = 0;
  let intervalId = null;
  let isSpinning = false;

  return {
    /**
     * Starts the spinner animation
     */
    start() {
      if (isSpinning) return;
      
      isSpinning = true;
      process.stdout.write(colors.white(spinnerChars[0]) + ' ' + text);
      
      intervalId = setInterval(() => {
        currentFrame = (currentFrame + 1) % spinnerChars.length;
        process.stdout.write('\r' + colors.white(spinnerChars[currentFrame]) + ' ' + text);
      }, 100);
    },

    /**
     * Stops the spinner animation
     */
    stop() {
      if (!isSpinning) return;
      
      isSpinning = false;
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
      process.stdout.write('\r' + ' '.repeat(text.length + 2) + '\r');
    },

    /**
     * Stops the spinner and shows a success message
     * @param {string} successText - Optional success message (defaults to original text)
     */
    succeed(successText = text) {
      this.stop();
      displaySuccess(successText);
    }
  };
}

/**
 * Displays working directory information
 * @param {string} workingDir - The current working directory path
 */
export function displayWorkingDir(workingDir) {
  console.log(colors.dim(`Working directory: ${workingDir}`));
  console.log();
}

/**
 * Displays timing information
 * @param {number} duration - Duration in milliseconds
 */
export function displayTiming(duration) {
  console.log(colors.dim(`Total time: ${duration}ms`));
}

/**
 * Displays output directory information
 * @param {string} outputDir - The output directory path
 */
export function displayOutputDir(outputDir) {
  console.log(colors.dim(`Output saved to: ${outputDir}`));
}

/**
 * Displays a warning message in yellow
 * @param {string} message - The warning message to display
 */
export function displayWarning(message) {
  console.log(colors.yellow('⚠'), colors.yellow(message));
}

/**
 * Displays a completion message with celebration
 * @param {string} message - The completion message to display
 */
export function displayCompletion(message) {
  console.log();
  console.log(colors.green('🎉'), colors.bold(colors.green(message)));
}