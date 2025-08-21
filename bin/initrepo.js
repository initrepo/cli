#!/usr/bin/env node

/**
 * InitRepo CLI Entry Point
 * 
 * This is the main executable for the initrepo command-line tool.
 * It simply imports and executes the main function from the src directory.
 */

import { main } from '../src/main.js';

// Execute the main function and handle any uncaught errors
main().catch((error) => {
  console.error('Fatal error:', error.message);
  process.exit(1);
});