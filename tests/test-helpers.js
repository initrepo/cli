/**
 * Test Helper Functions
 * 
 * Common utilities and mocks for testing the InitRepo CLI tool.
 */

import { vol } from 'memfs';

/**
 * Creates a mock project structure in the virtual file system
 * 
 * @param {Object} structure - Object representing file structure
 * @param {string} basePath - Base path for the project (default: '/test-project')
 */
export function createMockProject(structure, basePath = '/test-project') {
  const fullStructure = {};
  
  Object.entries(structure).forEach(([path, content]) => {
    const fullPath = path.startsWith('/') ? path : `${basePath}/${path}`;
    fullStructure[fullPath] = content;
  });
  
  vol.fromJSON(fullStructure);
  return basePath;
}

/**
 * Common project structures for testing
 */
export const MOCK_PROJECTS = {
  // Simple Node.js project
  nodejs: {
    'package.json': JSON.stringify({
      name: 'test-project',
      version: '1.0.0',
      main: 'index.js',
      scripts: {
        start: 'node index.js',
        test: 'jest'
      },
      dependencies: {
        express: '^4.18.0'
      },
      devDependencies: {
        jest: '^29.0.0'
      }
    }),
    'index.js': 'const express = require("express");\nconst app = express();\napp.listen(3000);',
    'src/routes.js': 'module.exports = {};',
    'src/utils.js': 'exports.helper = () => {};',
    'README.md': '# Test Project\n\nA simple test project.',
    '.gitignore': 'node_modules/\n.env\nlog/*.log',
    'node_modules/express/package.json': '{"name": "express"}',
    '.env': 'SECRET_KEY=test'
  },

  // Python project
  python: {
    'requirements.txt': 'flask==2.0.0\nrequests>=2.25.0',
    'main.py': 'from flask import Flask\napp = Flask(__name__)',
    'src/__init__.py': '',
    'src/models.py': 'class User:\n    pass',
    'tests/test_main.py': 'import unittest',
    '.gitignore': '__pycache__/\n*.pyc\nvenv/',
    'README.md': '# Python Project'
  },

  // React project
  react: {
    'package.json': JSON.stringify({
      name: 'react-app',
      version: '0.1.0',
      dependencies: {
        react: '^18.0.0',
        'react-dom': '^18.0.0'
      },
      scripts: {
        start: 'react-scripts start',
        build: 'react-scripts build'
      }
    }),
    'src/App.js': 'import React from "react";\nexport default function App() { return <div>Hello</div>; }',
    'src/index.js': 'import React from "react";\nimport ReactDOM from "react-dom";',
    'public/index.html': '<!DOCTYPE html><html><body><div id="root"></div></body></html>',
    'build/static/js/main.js': '// built code',
    '.gitignore': 'node_modules/\nbuild/'
  }
};

/**
 * Mock console methods for testing CLI output
 */
export function mockConsole() {
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;
  
  const logs = [];
  const errors = [];
  const warnings = [];
  
  console.log = (...args) => logs.push(args.join(' '));
  console.error = (...args) => errors.push(args.join(' '));
  console.warn = (...args) => warnings.push(args.join(' '));
  
  return {
    logs,
    errors,
    warnings,
    restore: () => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
    }
  };
}

/**
 * Creates a temporary directory mock for testing
 */
export function createTempDir(name = 'temp') {
  const tempPath = `/tmp/${name}-${Date.now()}`;
  vol.mkdirSync(tempPath, { recursive: true });
  return tempPath;
}