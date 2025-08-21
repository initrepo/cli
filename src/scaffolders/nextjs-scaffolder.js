/**
 * Next.js Scaffolder
 * 
 * Creates a complete Next.js project structure with App Router,
 * TypeScript, Tailwind CSS, and best practices setup.
 */

import { BaseScaffolder } from './base-scaffolder.js';
import { execSync } from 'child_process';

export class NextJSScaffolder extends BaseScaffolder {
  constructor(options) {
    super(options);
    this.useTypeScript = options.typescript !== false;
    this.useTailwind = options.tailwind !== false;
    this.useAuth = options.auth || (this.architecture?.configuration?.authentication);
    this.useDatabase = options.database || (this.architecture?.configuration?.database);
  }

  async scaffold() {
    // Create package.json
    this.createPackageJson();
    
    // Create Next.js configuration
    this.createNextConfig();
    
    // Create TypeScript configuration if needed
    if (this.useTypeScript) {
      this.createTypeScriptConfig();
    }
    
    // Create Tailwind configuration if needed
    if (this.useTailwind) {
      this.createTailwindConfig();
    }
    
    // Create project structure
    if (this.architecture?.structure) {
      this.createStructureFromArchitecture();
    } else {
      this.createDefaultStructure();
    }
    
    // Create essential files
    this.createEssentialFiles();
  }

  createDefaultStructure() {
    const dirs = [
      'app',
      'app/components',
      'app/utils',
      'app/lib',
      'app/api',
      'app/dashboard',
      'app/login',
      'app/signup',
      'public',
      'components/ui',
      'lib',
      'utils'
    ];

    dirs.forEach(dir => this.createDirectory(dir));

    // Create essential app files
    this.createAppFiles();
  }

  createPackageJson() {
    const packageJson = {
      name: this.getProjectNames().kebab,
      version: "0.1.0",
      private: true,
      scripts: {
        dev: "next dev",
        build: "next build",
        start: "next start",
        lint: "next lint",
        ...(this.useTypeScript && { "type-check": "tsc --noEmit" })
      },
      dependencies: {
        next: "^14.0.0",
        react: "^18.0.0",
        "react-dom": "^18.0.0",
        ...(this.useTailwind && {
          "tailwindcss": "^3.3.0",
          "autoprefixer": "^10.4.16",
          "postcss": "^8.4.31"
        }),
        ...(this.useAuth === 'clerk' && {
          "@clerk/nextjs": "^4.27.0"
        }),
        ...(this.useDatabase === 'prisma' && {
          "@prisma/client": "^5.6.0",
          "prisma": "^5.6.0"
        })
      },
      devDependencies: {
        ...(this.useTypeScript && {
          typescript: "^5.0.0",
          "@types/node": "^20.0.0",
          "@types/react": "^18.0.0",
          "@types/react-dom": "^18.0.0"
        }),
        eslint: "^8.0.0",
        "eslint-config-next": "^14.0.0"
      }
    };

    this.writeFile('package.json', JSON.stringify(packageJson, null, 2));
  }

  createNextConfig() {
    const config = `/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  images: {
    domains: [],
  },
}

module.exports = nextConfig
`;
    this.writeFile('next.config.js', config);
  }

  createTypeScriptConfig() {
    const tsConfig = {
      compilerOptions: {
        target: "es5",
        lib: ["dom", "dom.iterable", "es6"],
        allowJs: true,
        skipLibCheck: true,
        strict: true,
        noEmit: true,
        esModuleInterop: true,
        module: "esnext",
        moduleResolution: "bundler",
        resolveJsonModule: true,
        isolatedModules: true,
        jsx: "preserve",
        incremental: true,
        plugins: [
          {
            name: "next"
          }
        ],
        baseUrl: ".",
        paths: {
          "@/*": ["./*"]
        }
      },
      include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
      exclude: ["node_modules"]
    };

    this.writeFile('tsconfig.json', JSON.stringify(tsConfig, null, 2));
  }

  createTailwindConfig() {
    const tailwindConfig = `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
}
`;

    this.writeFile('tailwind.config.js', tailwindConfig);

    const postcssConfig = `module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
`;

    this.writeFile('postcss.config.js', postcssConfig);
  }

  createAppFiles() {
    const fileExt = this.useTypeScript ? 'tsx' : 'jsx';
    
    // Root layout
    const layoutContent = `${this.useTypeScript ? "import type { Metadata } from 'next'\n" : ""}import { Inter } from 'next/font/google'
${this.useTailwind ? "import './globals.css'" : ""}

const inter = Inter({ subsets: ['latin'] })

${this.useTypeScript ? `export const metadata: Metadata = {
  title: '${this.projectName}',
  description: 'Generated by initrepo scaffold',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {` : `export default function RootLayout({ children }) {`}
  return (
    <html lang="en">
      <body className={${this.useTailwind ? 'inter.className' : '"font-sans"'}}>{children}</body>
    </html>
  )
}
`;

    this.writeFile(`app/layout.${fileExt}`, layoutContent);

    // Home page
    const pageContent = `export default function Home() {
  return (
    <main className="${this.useTailwind ? 'flex min-h-screen flex-col items-center justify-between p-24' : 'padding: 2rem'}">
      <div className="${this.useTailwind ? 'z-10 max-w-5xl w-full items-center justify-between font-mono text-sm' : ''}">
        <h1 className="${this.useTailwind ? 'text-4xl font-bold text-center' : 'text-center'}">
          Welcome to ${this.projectName}
        </h1>
        <p className="${this.useTailwind ? 'text-center mt-4 text-gray-600' : 'text-center margin-top: 1rem'}">
          Generated with InitRepo CLI
        </p>
      </div>
    </main>
  )
}
`;

    this.writeFile(`app/page.${fileExt}`, pageContent);

    // Global styles
    if (this.useTailwind) {
      const globalCss = `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --foreground-rgb: 0, 0, 0;
  --background-start-rgb: 214, 219, 220;
  --background-end-rgb: 255, 255, 255;
}

@media (prefers-color-scheme: dark) {
  :root {
    --foreground-rgb: 255, 255, 255;
    --background-start-rgb: 0, 0, 0;
    --background-end-rgb: 0, 0, 0;
  }
}

body {
  color: rgb(var(--foreground-rgb));
  background: linear-gradient(
      to bottom,
      transparent,
      rgb(var(--background-end-rgb))
    )
    rgb(var(--background-start-rgb));
}
`;
      this.writeFile('app/globals.css', globalCss);
    }
  }

  createEssentialFiles() {
    // README.md
    const readme = `# ${this.projectName}

Generated with InitRepo CLI

## Getting Started

First, run the development server:

\`\`\`bash
npm run dev
# or
yarn dev
# or
pnpm dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

- \`app/\` - Next.js App Router pages and layouts
- \`components/\` - Reusable React components
- \`lib/\` - Utility functions and configurations
- \`public/\` - Static assets

## Tech Stack

- [Next.js](https://nextjs.org/) - React framework
- [React](https://reactjs.org/) - UI library
${this.useTypeScript ? '- [TypeScript](https://www.typescriptlang.org/) - Type safety\n' : ''}${this.useTailwind ? '- [Tailwind CSS](https://tailwindcss.com/) - Styling\n' : ''}
## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.
`;

    this.writeFile('README.md', readme);

    // Environment example
    const envExample = `# Copy this to .env.local and fill in your values

# Next.js
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-here

${this.useAuth === 'clerk' ? `# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
` : ''}

${this.useDatabase ? `# Database
DATABASE_URL="your-database-url"
` : ''}
`;

    this.writeFile('.env.example', envExample);
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
    const steps = [
      'npm run dev',
      'Open http://localhost:3000 in your browser'
    ];

    if (this.useAuth) {
      steps.push('Configure authentication in .env.local');
    }

    if (this.useDatabase) {
      steps.push('Set up your database connection');
    }

    return steps;
  }

  getDefaultGitignore() {
    return `# See https://help.github.com/articles/ignoring-files/ for more about ignoring files.

# dependencies
/node_modules
/.pnp
.pnp.js

# testing
/coverage

# next.js
/.next/
/out/

# production
/build

# misc
.DS_Store
*.pem

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# local env files
.env*.local

# vercel
.vercel

# typescript
*.tsbuildinfo
next-env.d.ts
`;
  }
}