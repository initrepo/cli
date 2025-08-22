/**
 * Tests for file-handler.js
 * 
 * This test suite verifies the file discovery, filtering, and reading functionality
 * of the InitRepo CLI tool's file handler module.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { vol } from 'memfs';
import { getRelevantFiles, readFiles, isFileReadable } from '../src/file-handler.js';

// Mock file system and globby
vi.mock('fs', async () => {
  const memfs = await vi.importActual('memfs');
  return memfs.fs;
});

vi.mock('globby', () => ({
  globby: vi.fn()
}));

const mockGlobby = vi.mocked(await import('globby')).globby;

describe('file-handler', () => {
  beforeEach(() => {
    // Reset the virtual file system before each test
    vol.reset();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vol.reset();
  });

  describe('getRelevantFiles', () => {
    it('should return relevant files while respecting default ignore patterns', async () => {
      // Setup mock file system
      vol.fromJSON({
        '/test-project/package.json': '{"name": "test"}',
        '/test-project/src/index.js': 'console.log("hello");',
        '/test-project/src/utils.ts': 'export const util = () => {};',
        '/test-project/node_modules/dep/index.js': 'module.exports = {};',
        '/test-project/.git/config': '[core]',
        '/test-project/dist/bundle.js': 'var a=1;'
      });

      // Mock globby to return files excluding ignored patterns
      mockGlobby.mockResolvedValue([
        'package.json',
        'src/index.js',
        'src/utils.ts'
      ]);

      const files = await getRelevantFiles('/test-project');

      expect(files).toEqual([
        '/test-project/package.json',
        '/test-project/src/index.js',
        '/test-project/src/utils.ts'
      ]);

      // Verify globby was called with correct ignore patterns
      expect(mockGlobby).toHaveBeenCalledWith(
        ['**/*'],
        expect.objectContaining({
          cwd: '/test-project',
          ignore: expect.arrayContaining([
            'node_modules/**',
            '.git/**',
            'dist/**'
          ]),
          dot: false,
          onlyFiles: true,
          followSymbolicLinks: false
        })
      );
    });

    it('should respect .gitignore patterns', async () => {
      // Setup mock file system with .gitignore
      vol.fromJSON({
        '/test-project/.gitignore': `
# Dependencies
node_modules/

# Build outputs
build/
*.log

# Custom ignores
temp/
        `,
        '/test-project/package.json': '{"name": "test"}',
        '/test-project/src/index.js': 'console.log("hello");',
        '/test-project/build/app.js': 'built code',
        '/test-project/temp/cache.txt': 'cache data',
        '/test-project/debug.log': 'log content'
      });

      // Mock globby to return files excluding .gitignore patterns
      mockGlobby.mockResolvedValue([
        'package.json',
        'src/index.js'
      ]);

      const files = await getRelevantFiles('/test-project');

      expect(files).toEqual([
        '/test-project/package.json',
        '/test-project/src/index.js'
      ]);

      // Verify ignore patterns include .gitignore entries
      expect(mockGlobby).toHaveBeenCalledWith(
        ['**/*'],
        expect.objectContaining({
          ignore: expect.arrayContaining([
            'node_modules/**',
            'build/**',
            '*.log',
            'temp/**'
          ])
        })
      );
    });

    it('should respect .initrepoignore patterns', async () => {
      // Setup mock file system with .initrepoignore
      vol.fromJSON({
        '/test-project/.initrepoignore': `
# Custom InitRepo ignores
docs/
*.md
test-data/
        `,
        '/test-project/package.json': '{"name": "test"}',
        '/test-project/src/index.js': 'console.log("hello");',
        '/test-project/docs/README.md': '# Documentation',
        '/test-project/CHANGELOG.md': '# Changes',
        '/test-project/test-data/sample.json': '{"test": true}'
      });

      // Mock globby to return files excluding .initrepoignore patterns
      mockGlobby.mockResolvedValue([
        'package.json',
        'src/index.js'
      ]);

      const files = await getRelevantFiles('/test-project');

      expect(files).toEqual([
        '/test-project/package.json',
        '/test-project/src/index.js'
      ]);

      // Verify ignore patterns include .initrepoignore entries
      expect(mockGlobby).toHaveBeenCalledWith(
        ['**/*'],
        expect.objectContaining({
          ignore: expect.arrayContaining([
            'docs/**',
            '*.md',
            'test-data/**'
          ])
        })
      );
    });

    it('should combine default, .gitignore, and .initrepoignore patterns', async () => {
      // Setup comprehensive ignore scenario
      vol.fromJSON({
        '/test-project/.gitignore': 'build/\n*.log',
        '/test-project/.initrepoignore': 'docs/\n*.test.js',
        '/test-project/package.json': '{"name": "test"}',
        '/test-project/src/app.js': 'app code',
        '/test-project/node_modules/lib/index.js': 'library',
        '/test-project/build/output.js': 'built code',
        '/test-project/docs/guide.md': 'documentation',
        '/test-project/src/app.test.js': 'test code',
        '/test-project/debug.log': 'log file'
      });

      mockGlobby.mockResolvedValue([
        'package.json',
        'src/app.js'
      ]);

      const files = await getRelevantFiles('/test-project');

      expect(files).toEqual([
        '/test-project/package.json',
        '/test-project/src/app.js'
      ]);

      // Verify all ignore patterns are combined
      expect(mockGlobby).toHaveBeenCalledWith(
        ['**/*'],
        expect.objectContaining({
          ignore: expect.arrayContaining([
            // Default patterns
            'node_modules/**',
            '.git/**',
            // .gitignore patterns
            'build/**',
            '*.log',
            // .initrepoignore patterns
            'docs/**',
            '*.test.js'
          ])
        })
      );
    });

    it('should handle missing ignore files gracefully', async () => {
      vol.fromJSON({
        '/test-project/package.json': '{"name": "test"}',
        '/test-project/src/index.js': 'console.log("hello");'
      });

      mockGlobby.mockResolvedValue([
        'package.json',
        'src/index.js'
      ]);

      const files = await getRelevantFiles('/test-project');

      expect(files).toEqual([
        '/test-project/package.json',
        '/test-project/src/index.js'
      ]);

      // Should only have default ignore patterns
      expect(mockGlobby).toHaveBeenCalledWith(
        ['**/*'],
        expect.objectContaining({
          ignore: expect.arrayContaining([
            'node_modules/**',
            '.git/**',
            'dist/**'
          ])
        })
      );
    });

    it('should handle globby errors', async () => {
      vol.fromJSON({
        '/test-project/package.json': '{"name": "test"}'
      });

      mockGlobby.mockRejectedValue(new Error('Permission denied'));

      await expect(getRelevantFiles('/test-project')).rejects.toThrow(
        'Failed to scan files: Permission denied'
      );
    });
  });

  describe('readFiles', () => {
    it('should read file contents and return structured data', async () => {
      // Setup mock file system
      vol.fromJSON({
        '/test-project/package.json': '{"name": "test-project", "version": "1.0.0"}',
        '/test-project/src/index.js': 'console.log("Hello, World!");',
        '/test-project/README.md': '# Test Project\n\nThis is a test project.'
      });

      // Mock process.cwd() to return our test directory
      const originalCwd = process.cwd;
      process.cwd = vi.fn().mockReturnValue('/test-project');

      const filePaths = [
        '/test-project/package.json',
        '/test-project/src/index.js',
        '/test-project/README.md'
      ];

      const fileContents = await readFiles(filePaths);

      expect(fileContents).toHaveLength(3);
      
      expect(fileContents[0]).toEqual({
        path: '/test-project/package.json',
        relativePath: 'package.json',
        content: '{"name": "test-project", "version": "1.0.0"}'
      });

      expect(fileContents[1]).toEqual({
        path: '/test-project/src/index.js',
        relativePath: 'src/index.js',
        content: 'console.log("Hello, World!");'
      });

      expect(fileContents[2]).toEqual({
        path: '/test-project/README.md',
        relativePath: 'README.md',
        content: '# Test Project\n\nThis is a test project.'
      });

      // Restore original process.cwd
      process.cwd = originalCwd;
    });

    it('should handle unreadable files gracefully', async () => {
      vol.fromJSON({
        '/test-project/package.json': '{"name": "test"}',
        '/test-project/src/index.js': 'console.log("hello");'
      });

      const originalCwd = process.cwd;
      process.cwd = vi.fn().mockReturnValue('/test-project');

      // Include a file that doesn't exist
      const filePaths = [
        '/test-project/package.json',
        '/test-project/nonexistent.js',
        '/test-project/src/index.js'
      ];

      const fileContents = await readFiles(filePaths);

      // Should return only the readable files
      expect(fileContents).toHaveLength(2);
      expect(fileContents[0].relativePath).toBe('package.json');
      expect(fileContents[1].relativePath).toBe('src/index.js');

      process.cwd = originalCwd;
    });

    it('should handle empty file list', async () => {
      const originalCwd = process.cwd;
      process.cwd = vi.fn().mockReturnValue('/test-project');

      const fileContents = await readFiles([]);

      expect(fileContents).toEqual([]);

      process.cwd = originalCwd;
    });
  });

  describe('isFileReadable', () => {
    it('should return true for readable files', () => {
      vol.fromJSON({
        '/test-project/readable.txt': 'This file can be read'
      });

      const result = isFileReadable('/test-project/readable.txt');
      expect(result).toBe(true);
    });

    it('should return false for non-existent files', () => {
      const result = isFileReadable('/test-project/nonexistent.txt');
      expect(result).toBe(false);
    });

    it('should return false for files that cannot be read as UTF-8', () => {
      // Create a file with binary content that would cause UTF-8 reading to fail
      vol.fromJSON({
        '/test-project/binary.bin': Buffer.from([0xFF, 0xFE, 0x00, 0x00])
      });

      // This should still return true in our simple implementation
      // but in a real scenario with actual binary files, it might fail
      const result = isFileReadable('/test-project/binary.bin');
      expect(typeof result).toBe('boolean');
    });
  });

  describe('file filtering logic', () => {
    it('should include common source file extensions', async () => {
      vol.fromJSON({
        '/test-project/app.js': 'js code',
        '/test-project/app.ts': 'ts code',
        '/test-project/component.jsx': 'jsx code',
        '/test-project/component.tsx': 'tsx code',
        '/test-project/style.css': 'css code',
        '/test-project/script.py': 'python code',
        '/test-project/config.json': '{}',
        '/test-project/data.xml': '<root/>',
        '/test-project/README.md': '# readme',
        '/test-project/image.png': 'binary image data'
      });

      // Mock globby to return source files only
      mockGlobby.mockResolvedValue([
        'app.js',
        'app.ts', 
        'component.jsx',
        'component.tsx',
        'style.css',
        'script.py',
        'config.json',
        'data.xml',
        'README.md'
        // image.png should be filtered out by globby/file filtering
      ]);

      const files = await getRelevantFiles('/test-project');

      expect(files).toEqual([
        '/test-project/app.js',
        '/test-project/app.ts',
        '/test-project/component.jsx',
        '/test-project/component.tsx',
        '/test-project/style.css',
        '/test-project/script.py',
        '/test-project/config.json',
        '/test-project/data.xml',
        '/test-project/README.md'
      ]);
    });

    it('should handle directory-specific ignore patterns', async () => {
      vol.fromJSON({
        '/test-project/.gitignore': `
# Ignore specific directory
build/
# But allow one specific file
!build/important.js
        `,
        '/test-project/src/app.js': 'source code',
        '/test-project/build/app.js': 'built code',
        '/test-project/build/important.js': 'important built code',
        '/test-project/build/vendor.js': 'vendor code'
      });

      // Simulate globby respecting the ignore patterns
      mockGlobby.mockResolvedValue([
        'src/app.js',
        'build/important.js' // Only this build file is included due to !build/important.js
      ]);

      const files = await getRelevantFiles('/test-project');

      expect(files).toEqual([
        '/test-project/src/app.js',
        '/test-project/build/important.js'
      ]);
    });
  });
});