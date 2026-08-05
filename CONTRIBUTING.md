# Contributing to ReviewPilot

Thank you for your interest in contributing to ReviewPilot! This document provides guidelines for contributing to the project.

## Ways to Contribute

- **Bug Reports** - Found an issue? Open a bug report with details
- **Feature Requests** - Have an idea? Share it in a feature request
- **Code Contributions** - Submit pull requests with improvements
- **Documentation** - Improve docs, fix typos, add examples
- **Testing** - Add test cases, improve coverage
- **Rule Contributions** - Add new deterministic review rules

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR-USERNAME/Autonomous-Code-Review-Agent.git
   cd Autonomous-Code-Review-Agent
   ```
3. **Create a branch** for your changes:
   ```bash
   git checkout -b feat/your-feature-name
   # or
   git checkout -b fix/your-fix-name
   ```
4. **Make your changes** following the guidelines below
5. **Test your changes** locally
6. **Submit a pull request**

## Development Setup

```bash
# Install dependencies
npm install

# Start development servers (frontend + backend)
npm run dev

# Run tests
npm test

# Type check
npm run check

# Build for production
npm run build
```

## Code Style Guidelines

### TypeScript
- Use strict TypeScript configuration
- Prefer `type` over `interface` for simple types
- Use JSDoc comments for public functions and types
- Avoid `any` - use proper types or `unknown`
- Run `npm run check` before committing

### Server Code (Node.js/Express)
- Use ES modules (`import`/`export`)
- Add JSDoc comments for all exported functions
- Follow existing patterns for error handling
- Sanitize all user inputs
- Use Zod for request validation

### Frontend Code (React)
- Use functional components with hooks
- Follow the existing component patterns in `src/`
- Use proper TypeScript types for props
- Keep components focused and small
- Use the existing CSS variable system

### Adding New Review Rules
To add a new deterministic rule in `server/rules.ts`:

```typescript
{
  id: "unique-rule-id",
  pattern: /your-regex-pattern/,
  severity: "critical" | "high" | "medium" | "low" | "info",
  category: "security" | "bug" | "performance" | "reliability" | "maintainability" | "style",
  title: "Human-readable title",
  message: "Detailed explanation of the issue",
  suggestion: "Actionable fix suggestion",
  confidence: 0.9, // 0-1 confidence score
  files?: /\.(ts|tsx)$/, // Optional file filter
}
```

## Commit Message Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): short description

Longer explanation if needed. Wrap at 72 characters.
```

Types:
- `feat` - New feature
- `fix` - Bug fix
- `refactor` - Code restructuring
- `docs` - Documentation changes
- `test` - Adding/updating tests
- `ci` - CI/CD changes
- `config` - Configuration changes
- `chore` - Maintenance tasks

Examples:
```
feat(rules): add detection for prototype pollution
fix(diff): handle edge case in hunk parsing
refactor(ai-reviewer): improve prompt structure
docs: add CONTRIBUTING.md
test: add diff parser tests
ci: add Dependabot configuration
```

## Pull Request Process

1. **Fill out the PR template** completely
2. **Link related issues** using "Closes #123" or "Relates to #123"
3. **Ensure all checks pass**:
   - Type checking (`npm run check`)
   - Tests (`npm test`)
   - Build (`npm run build`)
4. **Request review** from maintainers
5. **Address feedback** promptly
6. **Squash and merge** when approved

## Branch Naming

- `feat/description` - New features
- `fix/description` - Bug fixes
- `refactor/description` - Code improvements
- `docs/description` - Documentation updates
- `test/description` - Test additions
- `ci/description` - CI/CD changes

## Code Review Checklist

When reviewing PRs, check for:

- [ ] Code follows style guidelines
- [ ] Tests added/updated for changes
- [ ] Documentation updated if needed
- [ ] No breaking changes without discussion
- [ ] Commits follow conventional format
- [ ] CI checks pass
- [ ] Changes are minimal and focused

## Reporting Issues

When opening an issue, please include:

- **Clear title** describing the problem
- **Steps to reproduce** the issue
- **Expected behavior** vs actual behavior
- **Environment** (OS, Node version, browser)
- **Screenshots** if applicable
- **Possible solution** if you have one

## Questions?

Feel free to open a discussion or reach out to the maintainers if you have questions about contributing.

Thank you for helping make ReviewPilot better! 🚀
