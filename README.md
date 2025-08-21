# InitRepo CLI

[](https://www.google.com/search?q=https://www.npmjs.com/package/initrepo)
[](https://www.google.com/search?q=https://www.npmjs.com/package/initrepo)
[](https://www.google.com/search?q=https://github.com/initrepo/cli/actions)
[](https://opensource.org/licenses/MIT)

This is the official open-source command-line tool for the [InitRepo](https://www.initrepo.com) ecosystem. It allows you to extract context from your local codebases for analysis and documentation by the InitRepo SaaS platform.

## Prerequisites

  * Node.js (v18.x or higher)
  * An `initrepo.com` account (for future features)

## Installation

You can install the InitRepo CLI globally using npm:

```bash
npm install -g initrepo
```

## Usage

The primary function of the CLI is to extract and package your codebase.

### `extract`

This command scans your current repository, respects the `.gitignore` file, and consolidates all relevant code into a single context package (e.g., `initrepo.json`).

```bash
# Navigate to your project's root directory
cd /path/to/your-project

# Run the extract command
initrepo extract
```

This will create a context file in your directory, which you can then upload to `initrepo.com` to generate documentation and project blueprints.

### `plan` (Upcoming)

The `plan` command will be a shortcut to run the extraction process and send the context directly to the "Feature Planner" API at `initrepo.com`.

## Contributing

We welcome contributions from the community\! If you'd like to contribute, please see our `CONTRIBUTING.md` file for details on how to get started, run tests, and submit pull requests.

If you have a bug report or a feature request, please [open an issue](https://www.google.com/search?q=https://github.com/initrepo/cli/issues).

## License

This project is licensed under the **MIT License**.
