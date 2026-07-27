# Publish ReviewPilot to GitHub

This project is ready to be initialized and pushed as a new GitHub repository.

## 1. Verify the project

From the project directory:

```powershell
npm install
npm run check
npm test
npm run build
```

Do not commit `.env`, `.env.local`, API keys, build output, or `node_modules`. The included `.gitignore` already excludes them.

## 2. Create the local repository

```powershell
git init
git add .
git commit -m "feat: launch ReviewPilot code review agent"
git branch -M main
```

## 3. Create and connect the GitHub repository

Create an empty repository on GitHub without generating a README or `.gitignore`, then run:

```powershell
git remote add origin https://github.com/YOUR_USERNAME/reviewpilot.git
git push -u origin main
```

Alternatively, with GitHub CLI:

```powershell
gh repo create reviewpilot --source . --public --push
```

Use `--private` instead of `--public` when the source should not be public.

## 4. Recommended repository settings

- Protect the `main` branch.
- Require pull requests and passing checks before merge.
- Enable secret scanning and push protection.
- Enable Dependabot security updates.
- Use squash merging to keep the history concise.
- Add the topics `code-review`, `developer-tools`, `typescript`, `react`, `openai`, and `security`.

## 5. Suggested repository description

> Local-first AI code review with deterministic security checks, line-accurate findings, configurable policies, and bring-your-own OpenAI keys.

## Credential model

ReviewPilot does not require a repository-level OpenAI secret. Developers add their own key in the application. It is kept in browser `sessionStorage`, sent only with a review request, and never persisted by the server.

For a hosted multi-user deployment, replace the current bring-your-own-key header with authenticated, encrypted credential handling or server-managed project credentials before accepting public traffic.

## Before announcing the repository

- Add an open-source license or keep the repository private.
- Replace the sample profile values in `src/preferences.ts` if desired.
- Configure `APP_ORIGIN` for the deployed frontend origin.
- Add screenshots or a short demo recording to the main README.
- Add GitHub App authentication before enabling automatic PR comments.
