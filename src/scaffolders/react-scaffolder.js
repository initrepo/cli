/**
 * React Scaffolder
 * 
 * Creates a React project structure with Vite, TypeScript, and modern tooling.
 */

import { BaseScaffolder } from './base-scaffolder.js';
import { execSync } from 'child_process';

export class ReactScaffolder extends BaseScaffolder {
  constructor(options) {
    super(options);
    this.useTypeScript = options.typescript !== false;
    this.useTailwind = options.tailwind !== false;
    this.bundler = options.bundler || 'vite';
  }

  async scaffold() {
    this.createPackageJson();
    this.createViteConfig();
    
    if (this.useTypeScript) {
      this.createTypeScriptConfig();
    }
    
    if (this.useTailwind) {
      this.createTailwindConfig();
    }
    
    if (this.architecture?.structure) {
      this.createStructureFromArchitecture();
    } else {
      this.createDefaultStructure();
    }
    
    this.createEssentialFiles();
  }

  createDefaultStructure() {
    const dirs = [
      'src',
      'src/components',
      'src/components/ui',
      'src/hooks',
      'src/utils',
      'src/lib',
      'src/services',
      'src/types',
      'src/assets',
      'public'
    ];

    dirs.forEach(dir => this.createDirectory(dir));
    this.createSourceFiles();
  }

  createPackageJson() {
    const packageJson = {
      name: this.getProjectNames().kebab,
      private: true,
      version: "0.0.0",
      type: "module",
      scripts: {
        dev: "vite",
        build: this.useTypeScript ? "tsc && vite build" : "vite build",
        lint: "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
        preview: "vite preview",
        ...(this.useTypeScript && { "type-check": "tsc --noEmit" })
      },
      dependencies: {
        react: "^18.2.0",
        "react-dom": "^18.2.0",
        "react-router-dom": "^6.18.0"
      },
      devDependencies: {
        "@types/react": "^18.2.37",
        "@types/react-dom": "^18.2.15",
        "@vitejs/plugin-react": "^4.1.1",
        vite: "^5.0.0",
        ...(this.useTypeScript && {
          typescript: "^5.2.2"
        }),
        ...(this.useTailwind && {
          tailwindcss: "^3.3.5",
          autoprefixer: "^10.4.16",
          postcss: "^8.4.31"
        }),
        eslint: "^8.53.0",
        "eslint-plugin-react-hooks": "^4.6.0",
        "eslint-plugin-react-refresh": "^0.4.4",
        ...(this.useTypeScript && {
          "@typescript-eslint/eslint-plugin": "^6.10.0",
          "@typescript-eslint/parser": "^6.10.0"
        })
      }
    };

    this.writeFile('package.json', JSON.stringify(packageJson, null, 2));
  }

  createViteConfig() {
    const config = `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
})
`;
    this.writeFile('vite.config.js', config);
  }

  createTypeScriptConfig() {
    const tsConfig = {
      compilerOptions: {
        target: "ES2020",
        useDefineForClassFields: true,
        lib: ["ES2020", "DOM", "DOM.Iterable"],
        module: "ESNext",
        skipLibCheck: true,
        moduleResolution: "bundler",
        allowImportingTsExtensions: true,
        resolveJsonModule: true,
        isolatedModules: true,
        noEmit: true,
        jsx: "react-jsx",
        strict: true,
        noUnusedLocals: true,
        noUnusedParameters: true,
        noFallthroughCasesInSwitch: true,
        baseUrl: ".",
        paths: {
          "@/*": ["./src/*"]
        }
      },
      include: ["src"],
      references: [{ path: "./tsconfig.node.json" }]
    };

    this.writeFile('tsconfig.json', JSON.stringify(tsConfig, null, 2));

    const nodeConfig = {
      compilerOptions: {
        composite: true,
        skipLibCheck: true,
        module: "ESNext",
        moduleResolution: "bundler",
        allowSyntheticDefaultImports: true
      },
      include: ["vite.config.js"]
    };

    this.writeFile('tsconfig.node.json', JSON.stringify(nodeConfig, null, 2));
  }

  createTailwindConfig() {
    const tailwindConfig = `/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
`;

    this.writeFile('tailwind.config.js', tailwindConfig);

    const postcssConfig = `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
`;

    this.writeFile('postcss.config.js', postcssConfig);
  }

  createSourceFiles() {
    const fileExt = this.useTypeScript ? 'tsx' : 'jsx';
    
    // Main App component
    const appContent = `import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Home from './components/Home'
import About from './components/About'
import Navigation from './components/Navigation'
${this.useTailwind ? "import './App.css'" : "import './App.css'"}

function App() {
  return (
    <Router>
      <div className="${this.useTailwind ? 'min-h-screen bg-gray-50' : 'app'}">
        <Navigation />
        <main className="${this.useTailwind ? 'container mx-auto px-4 py-8' : 'main-content'}">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App
`;

    this.writeFile(`src/App.${fileExt}`, appContent);

    // Home component
    const homeContent = `function Home() {
  return (
    <div className="${this.useTailwind ? 'text-center' : 'home'}">
      <h1 className="${this.useTailwind ? 'text-4xl font-bold text-gray-900 mb-4' : 'title'}">
        Welcome to ${this.projectName}
      </h1>
      <p className="${this.useTailwind ? 'text-lg text-gray-600' : 'description'}">
        Generated with InitRepo CLI
      </p>
      <div className="${this.useTailwind ? 'mt-8' : 'actions'}">
        <button className="${this.useTailwind ? 'bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded' : 'button'}">
          Get Started
        </button>
      </div>
    </div>
  )
}

export default Home
`;

    this.writeFile(`src/components/Home.${fileExt}`, homeContent);

    // About component
    const aboutContent = `function About() {
  return (
    <div className="${this.useTailwind ? 'max-w-2xl mx-auto' : 'about'}">
      <h1 className="${this.useTailwind ? 'text-3xl font-bold text-gray-900 mb-6' : 'title'}">About</h1>
      <p className="${this.useTailwind ? 'text-gray-600 mb-4' : 'text'}">
        This is a React application scaffolded with InitRepo CLI.
      </p>
      <p className="${this.useTailwind ? 'text-gray-600' : 'text'}">
        It includes modern tooling and best practices for React development.
      </p>
    </div>
  )
}

export default About
`;

    this.writeFile(`src/components/About.${fileExt}`, aboutContent);

    // Navigation component
    const navContent = `import { Link, useLocation } from 'react-router-dom'

function Navigation() {
  const location = useLocation()

  const isActive = (path${this.useTypeScript ? ': string' : ''}) => location.pathname === path

  return (
    <nav className="${this.useTailwind ? 'bg-white shadow-sm' : 'nav'}">
      <div className="${this.useTailwind ? 'container mx-auto px-4' : 'nav-container'}">
        <div className="${this.useTailwind ? 'flex justify-between items-center h-16' : 'nav-content'}">
          <Link 
            to="/" 
            className="${this.useTailwind ? 'text-xl font-bold text-gray-900' : 'logo'}"
          >
            ${this.projectName}
          </Link>
          <div className="${this.useTailwind ? 'flex space-x-4' : 'nav-links'}">
            <Link 
              to="/" 
              className={\`${this.useTailwind ? 'px-3 py-2 rounded-md text-sm font-medium' : 'nav-link'} \${
                isActive('/') 
                  ? '${this.useTailwind ? 'bg-gray-900 text-white' : 'active'}' 
                  : '${this.useTailwind ? 'text-gray-600 hover:text-gray-900' : ''}'
              }\`}
            >
              Home
            </Link>
            <Link 
              to="/about" 
              className={\`${this.useTailwind ? 'px-3 py-2 rounded-md text-sm font-medium' : 'nav-link'} \${
                isActive('/about') 
                  ? '${this.useTailwind ? 'bg-gray-900 text-white' : 'active'}' 
                  : '${this.useTailwind ? 'text-gray-600 hover:text-gray-900' : ''}'
              }\`}
            >
              About
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navigation
`;

    this.writeFile(`src/components/Navigation.${fileExt}`, navContent);

    // Main entry point
    const mainContent = `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.${fileExt}'
${this.useTailwind ? "import './index.css'" : "import './index.css'"}

ReactDOM.createRoot(document.getElementById('root')${this.useTypeScript ? '!' : ''}).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
`;

    this.writeFile(`src/main.${fileExt}`, mainContent);
  }

  createEssentialFiles() {
    // index.html
    const indexHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${this.projectName}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.${this.useTypeScript ? 'tsx' : 'jsx'}"></script>
  </body>
</html>
`;

    this.writeFile('index.html', indexHtml);

    // Styles
    if (this.useTailwind) {
      const indexCss = `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  font-family: Inter, system-ui, Avenir, Helvetica, Arial, sans-serif;
  line-height: 1.5;
  font-weight: 400;

  color-scheme: light dark;
  color: rgba(255, 255, 255, 0.87);
  background-color: #242424;

  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  -webkit-text-size-adjust: 100%;
}

@media (prefers-color-scheme: light) {
  :root {
    color: #213547;
    background-color: #ffffff;
  }
}
`;
      this.writeFile('src/index.css', indexCss);

      const appCss = `/* Custom styles for the app */
`;
      this.writeFile('src/App.css', appCss);
    } else {
      const indexCss = `/* CSS Reset and Base Styles */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  line-height: 1.6;
  color: #333;
  background-color: #f5f5f5;
}

#root {
  min-height: 100vh;
}
`;
      this.writeFile('src/index.css', indexCss);

      const appCss = `.app {
  min-height: 100vh;
  background-color: #f5f5f5;
}

.main-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.nav {
  background-color: white;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.nav-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
}

.nav-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 64px;
}

.logo {
  font-size: 1.25rem;
  font-weight: bold;
  color: #333;
  text-decoration: none;
}

.nav-links {
  display: flex;
  gap: 1rem;
}

.nav-link {
  padding: 0.5rem 1rem;
  color: #666;
  text-decoration: none;
  border-radius: 0.375rem;
  transition: background-color 0.2s;
}

.nav-link:hover {
  background-color: #f3f4f6;
}

.nav-link.active {
  background-color: #333;
  color: white;
}

.home, .about {
  text-align: center;
  max-width: 600px;
  margin: 0 auto;
}

.title {
  font-size: 2.5rem;
  font-weight: bold;
  margin-bottom: 1rem;
  color: #333;
}

.description, .text {
  font-size: 1.125rem;
  color: #666;
  margin-bottom: 1rem;
}

.actions {
  margin-top: 2rem;
}

.button {
  background-color: #3b82f6;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 0.375rem;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
}

.button:hover {
  background-color: #2563eb;
}
`;
      this.writeFile('src/App.css', appCss);
    }

    // README
    const readme = `# ${this.projectName}

A React application generated with InitRepo CLI.

## Tech Stack

- [React](https://reactjs.org/) - UI library
- [Vite](https://vitejs.dev/) - Build tool
- [React Router](https://reactrouter.com/) - Routing
${this.useTypeScript ? '- [TypeScript](https://www.typescriptlang.org/) - Type safety\n' : ''}${this.useTailwind ? '- [Tailwind CSS](https://tailwindcss.com/) - Styling\n' : ''}
## Getting Started

1. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

2. Start the development server:
   \`\`\`bash
   npm run dev
   \`\`\`

3. Open [http://localhost:5173](http://localhost:5173) to view it in the browser.

## Available Scripts

- \`npm run dev\` - Start development server
- \`npm run build\` - Build for production
- \`npm run preview\` - Preview production build
- \`npm run lint\` - Run ESLint

## Project Structure

- \`src/\` - Source code
- \`src/components/\` - React components
- \`src/hooks/\` - Custom React hooks
- \`src/utils/\` - Utility functions
- \`public/\` - Static assets
`;

    this.writeFile('README.md', readme);

    // ESLint config
    const eslintConfig = `module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
  },
}
`;

    this.writeFile('.eslintrc.cjs', eslintConfig);
  }

  supportsDependencyInstallation() {
    return true;
  }

  async installDependencies() {
    try {
      process.chdir(this.targetDirectory);
      execSync('npm install', { stdio: 'inherit' });
    } catch (error) {
      this.log('Failed to install dependencies: ' + error.message, 'warning');
    }
  }

  getNextSteps() {
    return [
      'npm run dev',
      'Open http://localhost:5173 in your browser'
    ];
  }
}