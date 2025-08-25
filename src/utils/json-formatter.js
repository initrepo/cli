/**
 * JSON Formatter Utilities
 * 
 * This module provides utilities for formatting various data structures
 * into JSON for AI consumption and MCP server integration.
 */

/**
 * Formats dependency data into structured JSON
 * 
 * @param {Object} dependencies - Dependencies object from package manifest
 * @param {string} type - Type of dependencies (dependencies, devDependencies, etc.)
 * @returns {Array} Array of formatted dependency objects
 */
export function formatDependencies(dependencies, type = 'runtime') {
  if (!dependencies || typeof dependencies !== 'object') {
    return [];
  }

  return Object.entries(dependencies).map(([name, version]) => ({
    name,
    version,
    type,
    // Clean version string for better AI parsing
    versionClean: version.replace(/[\^~>=<]/g, '').trim()
  }));
}

/**
 * Formats symbol search results into structured JSON
 * 
 * @param {Array} symbols - Array of found symbols
 * @returns {Object} Formatted search results
 */
export function formatSymbolResults(symbols) {
  return {
    count: symbols.length,
    symbols: symbols.map(symbol => ({
      name: symbol.name,
      type: symbol.type,
      file: symbol.file,
      line: symbol.line,
      column: symbol.column || null,
      signature: symbol.signature || null,
      description: symbol.description || null
    }))
  };
}

/**
 * Formats code extraction results
 * 
 * @param {Object} codeResult - Code extraction result
 * @returns {Object} Formatted code result
 */
export function formatCodeResult(codeResult) {
  return {
    symbol: codeResult.symbol,
    file: codeResult.file,
    startLine: codeResult.startLine,
    endLine: codeResult.endLine,
    code: codeResult.code,
    context: codeResult.context || null,
    imports: codeResult.imports || [],
    dependencies: codeResult.dependencies || []
  };
}

/**
 * Formats task list data into structured JSON
 * 
 * @param {Array} tasks - Array of task objects
 * @returns {Object} Formatted task list
 */
export function formatTaskList(tasks) {
  return {
    count: tasks.length,
    completed: tasks.filter(t => t.completed).length,
    pending: tasks.filter(t => !t.completed).length,
    tasks: tasks.map(task => ({
      id: task.id,
      text: task.text,
      completed: task.completed,
      line: task.line || null,
      priority: task.priority || 'normal'
    }))
  };
}

/**
 * Creates a standardized error response
 * 
 * @param {string} message - Error message
 * @param {string} code - Error code
 * @param {Object} details - Additional error details
 * @returns {Object} Formatted error response
 */
export function formatError(message, code = 'UNKNOWN_ERROR', details = {}) {
  return {
    success: false,
    error: {
      message,
      code,
      details,
      timestamp: new Date().toISOString()
    }
  };
}

/**
 * Creates a standardized success response
 * 
 * @param {any} data - Response data
 * @param {string} message - Success message
 * @returns {Object} Formatted success response
 */
export function formatSuccess(data, message = 'Operation completed successfully') {
  return {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  };
}

/**
 * Safely stringify JSON with pretty printing option
 * 
 * @param {any} data - Data to stringify
 * @param {boolean} pretty - Whether to pretty print
 * @returns {string} JSON string
 */
export function safeStringify(data, pretty = false) {
  try {
    return JSON.stringify(data, null, pretty ? 2 : 0);
  } catch (error) {
    return JSON.stringify({
      error: 'Failed to serialize data',
      message: error.message
    }, null, pretty ? 2 : 0);
  }
}