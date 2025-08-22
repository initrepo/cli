/**
 * Tests for generators
 * 
 * This test suite verifies the generator modules that create the output files.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { vol } from 'memfs';
import { XMLParser } from 'fast-xml-parser';
import { generateTechStack } from '../src/generators/generate-tech-stack.js';
import { generateProjectStructure } from '../src/generators/generate-project-structure.js';
import { generateFullCodebase } from '../src/generators/generate-full-codebase.js';
import { createMockProject, MOCK_PROJECTS } from './test-helpers.js';

// Mock file system
vi.mock('fs', async () => {
  const memfs = await vi.importActual('memfs');
  return memfs.fs;
});

describe('generators', () => {
  beforeEach(() => {
    vol.reset();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vol.reset();
  });

  describe('generateTechStack', () => {
    it('should generate tech stack summary for Node.js project', async () => {
      const projectPath = createMockProject(MOCK_PROJECTS.nodejs);
      const outputDir = `${projectPath}/.initrepo`;
      
      // Create output directory
      vol.mkdirSync(outputDir, { recursive: true });
      
      await generateTechStack(projectPath, outputDir);
      
      const outputFile = `${outputDir}/tech-stack.md`;
      expect(vol.existsSync(outputFile)).toBe(true);
      
      const content = vol.readFileSync(outputFile, 'utf-8');
      
      // Verify content structure
      expect(content).toContain('# Tech Stack Summary');
      expect(content).toContain('## Node.js (package.json)');
      expect(content).toContain('**Project Name:** test-project');
      expect(content).toContain('**Version:** 1.0.0');
      
      // Verify dependencies section
      expect(content).toContain('### Dependencies');
      expect(content).toContain('- **express**: ^4.18.0');
      
      // Verify dev dependencies section
      expect(content).toContain('### Development Dependencies');
      expect(content).toContain('- **jest**: ^29.0.0');
      
      // Verify scripts section
      expect(content).toContain('### Available Scripts');
      expect(content).toContain('| start | `node index.js` |');
      expect(content).toContain('| test | `jest` |');
    });

    it('should generate tech stack summary for Python project', async () => {
      const projectPath = createMockProject(MOCK_PROJECTS.python);
      const outputDir = `${projectPath}/.initrepo`;
      
      vol.mkdirSync(outputDir, { recursive: true });
      
      await generateTechStack(projectPath, outputDir);
      
      const outputFile = `${outputDir}/tech-stack.md`;
      const content = vol.readFileSync(outputFile, 'utf-8');
      
      expect(content).toContain('# Tech Stack Summary');
      expect(content).toContain('## Python (requirements.txt)');
      expect(content).toContain('### Dependencies');
      expect(content).toContain('- flask==2.0.0');
      expect(content).toContain('- requests>=2.25.0');
    });

    it('should handle project with no manifest files', async () => {
      const projectPath = createMockProject({
        'src/index.js': 'console.log("hello");',
        'README.md': '# No package.json project'
      });
      const outputDir = `${projectPath}/.initrepo`;
      
      vol.mkdirSync(outputDir, { recursive: true });
      
      await generateTechStack(projectPath, outputDir);
      
      const outputFile = `${outputDir}/tech-stack.md`;
      const content = vol.readFileSync(outputFile, 'utf-8');
      
      expect(content).toContain('# Tech Stack Summary');
      expect(content).toContain('## No recognized manifest files found');
      expect(content).toContain('This project does not contain common dependency manifest files');
    });

    it('should handle invalid package.json gracefully', async () => {
      const projectPath = createMockProject({
        'package.json': 'invalid json content',
        'src/index.js': 'console.log("hello");'
      });
      const outputDir = `${projectPath}/.initrepo`;
      
      vol.mkdirSync(outputDir, { recursive: true });
      
      await generateTechStack(projectPath, outputDir);
      
      const outputFile = `${outputDir}/tech-stack.md`;
      const content = vol.readFileSync(outputFile, 'utf-8');
      
      expect(content).toContain('# Tech Stack Summary');
      expect(content).toContain('## Node.js (package.json)');
      expect(content).toContain('Error reading package.json');
    });

    it('should handle multiple manifest file types', async () => {
      const projectPath = createMockProject({
        'package.json': JSON.stringify({
          name: 'multi-lang-project',
          dependencies: { express: '^4.0.0' }
        }),
        'requirements.txt': 'flask==2.0.0\nrequests>=2.25.0',
        'Cargo.toml': `[package]
name = "my-rust-project"

[dependencies]
serde = "1.0"`,
        'composer.json': JSON.stringify({
          name: 'vendor/package',
          require: { 'php': '^8.0' }
        })
      });
      const outputDir = `${projectPath}/.initrepo`;
      
      vol.mkdirSync(outputDir, { recursive: true });
      
      await generateTechStack(projectPath, outputDir);
      
      const outputFile = `${outputDir}/tech-stack.md`;
      const content = vol.readFileSync(outputFile, 'utf-8');
      
      // Should contain sections for all detected languages
      expect(content).toContain('## Node.js (package.json)');
      expect(content).toContain('## Python (requirements.txt)');
      expect(content).toContain('## Rust (Cargo.toml)');
      expect(content).toContain('## PHP (composer.json)');
      
      // Verify specific dependencies are listed
      expect(content).toContain('- **express**: ^4.0.0');
      expect(content).toContain('- flask==2.0.0');
      expect(content).toContain('- **serde**: "1.0"');
      expect(content).toContain('- **php**: ^8.0');
    });
  });

  describe('generateProjectStructure', () => {
    it('should generate a tree structure for a simple project', async () => {
      const projectPath = '/test-project';
      const outputDir = `${projectPath}/.initrepo`;
      
      // Create output directory
      vol.mkdirSync(outputDir, { recursive: true });
      
      // Mock process.cwd() to return our test directory
      const originalCwd = process.cwd;
      process.cwd = vi.fn().mockReturnValue(projectPath);
      
      const filePaths = [
        `${projectPath}/package.json`,
        `${projectPath}/README.md`,
        `${projectPath}/src/index.js`,
        `${projectPath}/src/utils/helpers.js`,
        `${projectPath}/src/components/Button.jsx`,
        `${projectPath}/tests/index.test.js`,
        `${projectPath}/public/index.html`
      ];
      
      await generateProjectStructure(filePaths, outputDir);
      
      const outputFile = `${outputDir}/project-structure.md`;
      expect(vol.existsSync(outputFile)).toBe(true);
      
      const content = vol.readFileSync(outputFile, 'utf-8');
      
      // Verify header and metadata
      expect(content).toContain('# Project Structure');
      expect(content).toContain('Generated on:');
      expect(content).toContain('Total files: 7');
      
      // Verify tree structure is present
      expect(content).toContain('```');
      expect(content).toContain('project/');
      
      // Verify directory structure
      expect(content).toContain('📁 src/');
      expect(content).toContain('📁 utils/');
      expect(content).toContain('📁 components/');
      expect(content).toContain('📁 tests/');
      expect(content).toContain('📁 public/');
      
      // Verify file entries
      expect(content).toContain('📄 package.json');
      expect(content).toContain('📄 README.md');
      expect(content).toContain('📄 index.js');
      expect(content).toContain('📄 helpers.js');
      expect(content).toContain('📄 Button.jsx');
      expect(content).toContain('📄 index.test.js');
      expect(content).toContain('📄 index.html');
      
      // Verify statistics section
      expect(content).toContain('## File Statistics');
      expect(content).toContain('| Extension | Count | Percentage |');
      expect(content).toContain('**Total files:** 7');
      
      // Restore original process.cwd
      process.cwd = originalCwd;
    });

    it('should handle nested directory structures correctly', async () => {
      const projectPath = '/complex-project';
      const outputDir = `${projectPath}/.initrepo`;
      
      vol.mkdirSync(outputDir, { recursive: true });
      
      const originalCwd = process.cwd;
      process.cwd = vi.fn().mockReturnValue(projectPath);
      
      const filePaths = [
        `${projectPath}/package.json`,
        `${projectPath}/src/app/main.js`,
        `${projectPath}/src/app/controllers/userController.js`,
        `${projectPath}/src/app/models/User.js`,
        `${projectPath}/src/config/database.js`,
        `${projectPath}/src/utils/validators/emailValidator.js`,
        `${projectPath}/tests/unit/userController.test.js`,
        `${projectPath}/tests/integration/api.test.js`,
        `${projectPath}/docs/api/endpoints.md`
      ];
      
      await generateProjectStructure(filePaths, outputDir);
      
      const outputFile = `${outputDir}/project-structure.md`;
      const content = vol.readFileSync(outputFile, 'utf-8');
      
      // Verify deep nesting is represented
      expect(content).toContain('📁 app/');
      expect(content).toContain('📁 controllers/');
      expect(content).toContain('📁 models/');
      expect(content).toContain('📁 validators/');
      expect(content).toContain('📁 unit/');
      expect(content).toContain('📁 integration/');
      
      // Verify tree characters for proper indentation
      expect(content).toContain('├──');
      expect(content).toContain('└──');
      expect(content).toContain('│');
      
      process.cwd = originalCwd;
    });

    it('should generate file statistics by extension', async () => {
      const projectPath = '/stats-project';
      const outputDir = `${projectPath}/.initrepo`;
      
      vol.mkdirSync(outputDir, { recursive: true });
      
      const originalCwd = process.cwd;
      process.cwd = vi.fn().mockReturnValue(projectPath);
      
      const filePaths = [
        `${projectPath}/app.js`,
        `${projectPath}/server.js`,
        `${projectPath}/config.js`,
        `${projectPath}/style.css`,
        `${projectPath}/main.css`,
        `${projectPath}/component.tsx`,
        `${projectPath}/README.md`,
        `${projectPath}/package.json`
      ];
      
      await generateProjectStructure(filePaths, outputDir);
      
      const outputFile = `${outputDir}/project-structure.md`;
      const content = vol.readFileSync(outputFile, 'utf-8');
      
      // Verify statistics table
      expect(content).toContain('| js | 3 | 37.5% |');
      expect(content).toContain('| css | 2 | 25.0% |');
      expect(content).toContain('| tsx | 1 | 12.5% |');
      expect(content).toContain('| md | 1 | 12.5% |');
      expect(content).toContain('| json | 1 | 12.5% |');
      
      process.cwd = originalCwd;
    });

    it('should handle empty file list', async () => {
      const projectPath = '/empty-project';
      const outputDir = `${projectPath}/.initrepo`;
      
      vol.mkdirSync(outputDir, { recursive: true });
      
      const originalCwd = process.cwd;
      process.cwd = vi.fn().mockReturnValue(projectPath);
      
      await generateProjectStructure([], outputDir);
      
      const outputFile = `${outputDir}/project-structure.md`;
      const content = vol.readFileSync(outputFile, 'utf-8');
      
      expect(content).toContain('# Project Structure');
      expect(content).toContain('Total files: 0');
      expect(content).toContain('**Total files:** 0');
      
      process.cwd = originalCwd;
    });
  });

  describe('generateFullCodebase', () => {
    it('should generate valid XML with file contents', async () => {
      const outputDir = '/test-project/.initrepo';
      vol.mkdirSync(outputDir, { recursive: true });
      
      const fileContents = [
        {
          path: '/test-project/src/index.js',
          relativePath: 'src/index.js',
          content: 'console.log("Hello, World!");\nconst app = express();'
        },
        {
          path: '/test-project/styles/main.css',
          relativePath: 'styles/main.css',
          content: 'body {\n  margin: 0;\n  padding: 20px;\n}'
        },
        {
          path: '/test-project/package.json',
          relativePath: 'package.json',
          content: '{\n  "name": "test-app",\n  "version": "1.0.0"\n}'
        }
      ];
      
      await generateFullCodebase(fileContents, outputDir);
      
      const outputFile = `${outputDir}/full-codebase.xml`;
      expect(vol.existsSync(outputFile)).toBe(true);
      
      const xmlContent = vol.readFileSync(outputFile, 'utf-8');
      
      // Verify XML declaration
      expect(xmlContent).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      
      // Parse XML to verify structure
      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '@_',
        cdataPropName: '#cdata'
      });
      
      const parsedXml = parser.parse(xmlContent);
      
      // Verify root structure
      expect(parsedXml.codebase).toBeDefined();
      expect(parsedXml.codebase['@_totalFiles']).toBe('3');
      expect(parsedXml.codebase['@_generator']).toBe('initrepo-cli');
      expect(parsedXml.codebase['@_version']).toBe('1.0.0');
      expect(parsedXml.codebase['@_generated']).toBeDefined();
      
      // Verify files structure
      expect(parsedXml.codebase.files).toBeDefined();
      expect(parsedXml.codebase.files.file).toHaveLength(3);
      
      // Verify individual files
      const files = parsedXml.codebase.files.file;
      
      // First file (index.js)
      expect(files[0]['@_path']).toBe('src/index.js');
      expect(files[0]['@_extension']).toBe('js');
      expect(files[0]['@_lines']).toBe('2');
      expect(files[0].content['#cdata']).toBe('console.log("Hello, World!");\nconst app = express();');
      
      // Second file (main.css)
      expect(files[1]['@_path']).toBe('styles/main.css');
      expect(files[1]['@_extension']).toBe('css');
      expect(files[1]['@_lines']).toBe('4');
      expect(files[1].content['#cdata']).toBe('body {\n  margin: 0;\n  padding: 20px;\n}');
      
      // Third file (package.json)
      expect(files[2]['@_path']).toBe('package.json');
      expect(files[2]['@_extension']).toBe('json');
      expect(files[2]['@_lines']).toBe('4');
      expect(files[2].content['#cdata']).toBe('{\n  "name": "test-app",\n  "version": "1.0.0"\n}');
    });

    it('should generate statistics and extension summary', async () => {
      const outputDir = '/stats-project/.initrepo';
      vol.mkdirSync(outputDir, { recursive: true });
      
      const fileContents = [
        {
          path: '/stats-project/app.js',
          relativePath: 'app.js',
          content: 'const express = require("express");'
        },
        {
          path: '/stats-project/server.js',
          relativePath: 'server.js',
          content: 'const app = express();\napp.listen(3000);'
        },
        {
          path: '/stats-project/style.css',
          relativePath: 'style.css',
          content: 'body { margin: 0; }'
        }
      ];
      
      await generateFullCodebase(fileContents, outputDir);
      
      const outputFile = `${outputDir}/full-codebase.xml`;
      const xmlContent = vol.readFileSync(outputFile, 'utf-8');
      
      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '@_'
      });
      
      const parsedXml = parser.parse(xmlContent);
      
      // Verify summary statistics
      const stats = parsedXml.codebase.summary.statistics;
      expect(stats['@_totalFiles']).toBe('3');
      expect(stats['@_totalLines']).toBe('4'); // 1 + 2 + 1
      expect(stats['@_totalCharacters']).toBe('94'); // Actual character count: 32 + 43 + 19
      expect(stats['@_averageLinesPerFile']).toBe('1'); // Math.round(4/3)
      
      // Verify extension summary - handle both array and single object cases
      const extensionData = parsedXml.codebase.summary.extensions.extension;
      const extensions = Array.isArray(extensionData) ? extensionData : [extensionData];
      expect(extensions).toHaveLength(2);
      
      // Find JS and CSS extensions
      const jsExt = extensions.find(ext => ext['@_name'] === 'js');
      const cssExt = extensions.find(ext => ext['@_name'] === 'css');
      
      expect(jsExt['@_count']).toBe('2');
      expect(jsExt['@_totalLines']).toBe('3');
      
      expect(cssExt['@_count']).toBe('1');
      expect(cssExt['@_totalLines']).toBe('1');
    });

    it('should handle files with special characters and XML entities', async () => {
      const outputDir = '/special-project/.initrepo';
      vol.mkdirSync(outputDir, { recursive: true });
      
      const fileContents = [
        {
          path: '/special-project/template.html',
          relativePath: 'template.html',
          content: '<div class="container">\n  <p>Hello & welcome!</p>\n  <script>if (x < 5) { alert("Less than 5"); }</script>\n</div>'
        },
        {
          path: '/special-project/config.xml',
          relativePath: 'config.xml',
          content: '<?xml version="1.0"?>\n<config>\n  <setting name="debug">true</setting>\n</config>'
        }
      ];
      
      await generateFullCodebase(fileContents, outputDir);
      
      const outputFile = `${outputDir}/full-codebase.xml`;
      const xmlContent = vol.readFileSync(outputFile, 'utf-8');
      
      // Verify the XML is valid and parseable
      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '@_',
        cdataPropName: '#cdata'
      });
      
      const parsedXml = parser.parse(xmlContent);
      const files = parsedXml.codebase.files.file;
      
      // Verify HTML file content is preserved correctly with CDATA
      const htmlFile = files.find(f => f['@_path'] === 'template.html');
      expect(htmlFile.content['#cdata']).toContain('<div class="container">');
      expect(htmlFile.content['#cdata']).toContain('Hello & welcome!');
      expect(htmlFile.content['#cdata']).toContain('if (x < 5)');
      
      // Verify XML file content is preserved
      const xmlFile = files.find(f => f['@_path'] === 'config.xml');
      expect(xmlFile.content['#cdata']).toContain('<?xml version="1.0"?>');
      expect(xmlFile.content['#cdata']).toContain('<setting name="debug">');
    });

    it('should handle empty file list', async () => {
      const outputDir = '/empty-project/.initrepo';
      vol.mkdirSync(outputDir, { recursive: true });
      
      await generateFullCodebase([], outputDir);
      
      const outputFile = `${outputDir}/full-codebase.xml`;
      const xmlContent = vol.readFileSync(outputFile, 'utf-8');
      
      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '@_'
      });
      
      const parsedXml = parser.parse(xmlContent);
      
      expect(parsedXml.codebase['@_totalFiles']).toBe('0');
      expect(parsedXml.codebase.summary.statistics['@_totalFiles']).toBe('0');
      expect(parsedXml.codebase.summary.statistics['@_totalLines']).toBe('0');
    });

    it('should handle files without extensions', async () => {
      const outputDir = '/no-ext-project/.initrepo';
      vol.mkdirSync(outputDir, { recursive: true });
      
      const fileContents = [
        {
          path: '/no-ext-project/Dockerfile',
          relativePath: 'Dockerfile',
          content: 'FROM node:18\nWORKDIR /app'
        },
        {
          path: '/no-ext-project/Makefile',
          relativePath: 'Makefile',
          content: 'build:\n\tdocker build -t myapp .'
        }
      ];
      
      await generateFullCodebase(fileContents, outputDir);
      
      const outputFile = `${outputDir}/full-codebase.xml`;
      const xmlContent = vol.readFileSync(outputFile, 'utf-8');
      
      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '@_'
      });
      
      const parsedXml = parser.parse(xmlContent);
      const files = parsedXml.codebase.files.file;
      
      // Files without extensions should have empty extension
      const dockerfile = files.find(f => f['@_path'] === 'Dockerfile');
      const makefile = files.find(f => f['@_path'] === 'Makefile');
      
      expect(dockerfile['@_extension']).toBe('');
      expect(makefile['@_extension']).toBe('');
      
      // Should be grouped under "no-extension" in summary
      const extensionData = parsedXml.codebase.summary.extensions.extension;
      const extensions = Array.isArray(extensionData) ? extensionData : [extensionData];
      const noExtension = extensions.find(ext => ext['@_name'] === 'no-extension');
      expect(noExtension['@_count']).toBe('2');
    });
  });
});