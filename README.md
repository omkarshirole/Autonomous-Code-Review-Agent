# ReviewPilot

ReviewPilot is a bring-your-own-key, AI-assisted pull-request reviewer. It combines deterministic security and quality checks with line-accurate semantic review through OpenAI's Responses API.

The application includes a professional review console, configurable rule policy, workspace settings, and a persistent local developer profile.

## What is included

- Unified-diff parser with new-file line mapping
- Built-in checks for exposed secrets, injection, unsafe evaluation, XSS, weak tokens, swallowed errors, and TypeScript safety bypasses
- Optional structured AI review using the user's API key
- Severity, category, confidence, fingerprint, risk, and merge-verdict scoring
- Finding deduplication and validation against real added-line locations
- Responsive review dashboard and a built-in vulnerable demo pull request
- Rules management with per-check enable/disable controls
- Workspace defaults for model, strictness, repository instructions, and finding display
- Editable developer profile and review activity overview
- Direct imports from ZIP archives and GitHub repository, PR, commit, or compare URLs
- Request validation, payload limits, rate limiting, key redaction, and no server-side key persistence

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

You do not need an API key to try the deterministic reviewer. Use **Load demo PR**, then **Review this PR**. For deeper semantic review, choose **Add API key** in the application. The key is stored only in the browser tab's `sessionStorage`, sent in the review request, and discarded by the server after that request.

### Supported review sources

- **Unified diff:** Paste a standard Git patch and provide the review title and context.
- **GitHub URL:** Enter a repository, pull request, commit, or compare URL. A plain repository URL reviews the latest commit on its default branch. Public repositories work without authentication; private repositories accept a session-only GitHub token.
- **ZIP archive:** Upload a project archive up to 12 MB. ReviewPilot scans up to 120 supported source files and excludes dependencies, build output, lockfiles, binary files, and repository metadata.

ZIP imports are snapshot reviews: supported files are treated as newly added code because an archive does not contain base-branch history.

## Verify

```bash
npm run check
npm test
npm run build
```

## API

`POST /api/reviews`

```json
{
  "title": "Add password reset",
  "description": "Optional review context",
  "diff": "diff --git ...",
  "settings": {
    "strictness": "balanced",
    "model": "gpt-5.6-sol",
    "instructions": "Optional repository-specific review policy"
  }
}
```

Pass a user-provided key in `x-openai-key` to enable AI review. Omit it to run built-in checks only.

Additional import endpoints:

- `POST /api/sources/github` with JSON `{ "url": "...", "settings": {} }`
- `POST /api/sources/zip` with multipart field `archive` and optional JSON field `settings`

Private GitHub imports accept `x-github-token`. The token is used only for the outbound GitHub request and is not persisted or logged.

## Production hardening

Before accepting public traffic, put the API behind authentication, use a distributed rate limiter, configure `APP_ORIGIN`, add encrypted persistence for review metadata (not API keys), and integrate GitHub App webhooks for automatic pull-request reviews.

See [GITHUB_SETUP.md](./GITHUB_SETUP.md) for repository initialization, push commands, and recommended GitHub settings.
