# Contributing to InitRepo CLI

First off, thank you for considering contributing to InitRepo\! We welcome any and all contributions, from bug reports to new features. This project thrives on community involvement, and we're excited to have you on board.

This document provides a set of guidelines to make the contribution process as easy and transparent as possible.

## Code of Conduct

To ensure a welcoming and inclusive environment, we have adopted a Code of Conduct that we expect all contributors to adhere to. Please take a moment to read our [CODE\_OF\_CONDUCT.md](https://github.com/initrepo/cli/blob/main/CODE_OF_CONDUCT.md) before participating.

## How Can I Contribute?

There are many ways to contribute to the project:

  * **Reporting Bugs:** Help us improve by reporting any bugs you find.
  * **Suggesting Enhancements:** Propose new features or improvements to existing functionality.
  * **Submitting Pull Requests:** Contribute directly to the codebase by fixing bugs or adding new features.

### Reporting Bugs

Before submitting a bug report, please search the existing [issues](https://github.com/initrepo/cli/issues) to see if the bug has already been reported.

If you've found a new bug, please [open a new issue](https://github.com/initrepo/cli/issues/new) and provide the following information:

  * **A clear and descriptive title.**
  * **Your operating system and Node.js version.**
  * **Steps to reproduce the bug.**
  * **What you expected to happen.**
  * **What actually happened.** (Include any error messages or screenshots).

### Suggesting Enhancements

If you have an idea for a new feature or an improvement, we'd love to hear it. Please [open a new issue](https://github.com/initrepo/cli/issues/new) to start a discussion.

Please provide:

  * **A clear and descriptive title.**
  * **A detailed description of the proposed enhancement.**
  * **The problem this enhancement solves.** (Why is this feature needed?)
  * **Any potential implementation ideas you might have.**

## Pull Request Process

Ready to contribute code? Here's the process for submitting a pull request:

1.  **Fork the repository** to your own GitHub account.

2.  **Clone your fork** to your local machine:

    ```bash
    git clone https://github.com/YOUR_USERNAME/cli.git
    cd cli
    ```

3.  **Create a new branch** for your changes. Please use a descriptive name.

    ```bash
    # For a new feature
    git checkout -b feature/your-amazing-feature

    # For a bug fix
    git checkout -b fix/issue-description
    ```

4.  **Set up your development environment** by installing the necessary dependencies:

    ```bash
    npm install
    ```

5.  **Make your changes** to the codebase. Ensure your code adheres to the existing style.

6.  **Run tests** to ensure your changes haven't broken anything.

    ```bash
    npm test
    ```

    *(Note: Please add tests for any new functionality you introduce.)*

7.  **Commit your changes** using a conventional commit message. This helps us automate changelogs and versioning.

    ```bash
    # Example commit messages
    git commit -m "feat: Add new 'summarize' command"
    git commit -m "fix: Correctly handle empty context files"
    git commit -m "docs: Update installation instructions in README"
    ```

8.  **Push your branch** to your fork on GitHub:

    ```bash
    git push origin feature/your-amazing-feature
    ```

9.  **Open a Pull Request** from your forked repository to the `main` branch of `initrepo/cli`.

      * Provide a clear title and a detailed description of your changes.
      * If your PR addresses an existing issue, please link to it (e.g., `Closes #123`).

Once you've submitted your pull request, a project maintainer will review your changes. We may ask for modifications before merging. We appreciate your patience during this process.

Thank you again for your contribution\!
