# Journal admin

A private editor at `/admin` for writing journal posts without touching the repo.

How it works: `/admin` calls the serverless functions in `api/`. Saving a post commits
`content/writing/<slug>.md` to `main` through the GitHub API; uploaded images are committed to
`public/images/writing/posts/<slug>/`. Vercel then rebuilds the site (about a minute). Drafts are
saved with `draft: true`, so they never publish.

## One-time setup (Vercel > Project Settings > Environment Variables)

| Name | Value |
| --- | --- |
| `ADMIN_PASSWORD` | A long random password (this is your login). |
| `GITHUB_TOKEN` | Fine-grained personal access token, repository `rvb` only, permission Contents: Read and write. |

Optional: `SESSION_SECRET` (overrides the derived cookie-signing key), `GITHUB_OWNER` (default `roaldvanbuuren`), `GITHUB_REPO` (default `rvb`), `GITHUB_BRANCH` (default `main`).

Redeploy after adding them.

## Local use

`astro dev` does not run `api/`. Use `npx vercel dev` with the same variables in `.env.local`.

## Limits

- Images are resized in the browser to 1800px on the longest side; the upload limit is about 3 MB.
- The editor writes the front matter fields in `src/content.config.ts`. Editing an existing post rewrites its front matter in that format.
- The login is one shared password with a signed session cookie (7 days).
