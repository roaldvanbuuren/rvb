// Shared helpers for the admin API (Vercel serverless functions).
// Files starting with _ are not exposed as routes.
import crypto from 'node:crypto';

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

class ConfigError extends Error {}

function env(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing environment variable ${name}`);
    throw new ConfigError(name);
  }
  return v;
}

// ---------- auth: one password, signed httpOnly session cookie ----------

const COOKIE = 'rvb_admin';
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function sign(payload) {
  return crypto.createHmac('sha256', env('SESSION_SECRET')).update(payload).digest('base64url');
}

function safeEqual(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

export function checkPassword(pw) {
  return safeEqual(pw ?? '', env('ADMIN_PASSWORD'));
}

function parseCookies(header = '') {
  const out = {};
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = part.slice(i + 1).trim();
  }
  return out;
}

export function isAuthed(req) {
  const raw = parseCookies(req.headers.cookie)[COOKIE];
  if (!raw) return false;
  const [exp, sig] = raw.split('.');
  if (!exp || !sig) return false;
  if (!safeEqual(sig, sign(exp))) return false;
  return Number(exp) > Date.now();
}

export function setSession(res) {
  const exp = String(Date.now() + MAX_AGE * 1000);
  res.setHeader(
    'Set-Cookie',
    `${COOKIE}=${exp}.${sign(exp)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${MAX_AGE}`,
  );
}

export function clearSession(res) {
  res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`);
}

// Mutating requests must come from this site (defence in depth on top of SameSite=Strict).
function checkOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) throw new HttpError(403, 'Missing Origin header');
  let host;
  try {
    host = new URL(origin).host;
  } catch {
    throw new HttpError(403, 'Bad Origin header');
  }
  if (host !== req.headers.host) throw new HttpError(403, 'Cross-origin request blocked');
}

/** Wraps a handler with method check, origin check, auth, JSON output and error handling. */
export function route({ methods, auth = true }, handler) {
  return async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Robots-Tag', 'noindex');
    try {
      if (!methods.includes(req.method)) throw new HttpError(405, 'Method not allowed');
      if (req.method !== 'GET') checkOrigin(req);
      if (auth && !isAuthed(req)) throw new HttpError(401, 'Not logged in');
      const out = await handler(req, res);
      res.status(200).json(out ?? { ok: true });
    } catch (e) {
      if (e instanceof HttpError) return res.status(e.status).json({ error: e.message });
      if (e instanceof ConfigError) {
        return res.status(500).json({ error: 'Server is not configured: check the environment variables in Vercel.' });
      }
      console.error(e);
      res.status(500).json({ error: 'Server error' });
    }
  };
}

// ---------- validation ----------

export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function requireSlug(slug) {
  if (typeof slug !== 'string' || slug.length > 120 || !SLUG_RE.test(slug)) {
    throw new HttpError(400, 'Slug must be lowercase letters, numbers and hyphens.');
  }
  return slug;
}

// ---------- GitHub (Contents API, commits straight to the branch) ----------

function repo() {
  return {
    owner: process.env.GITHUB_OWNER || 'roaldvanbuuren',
    name: process.env.GITHUB_REPO || 'rvb',
    branch: process.env.GITHUB_BRANCH || 'main',
  };
}

const encodePath = (p) => p.split('/').map(encodeURIComponent).join('/');

async function gh(path, { method = 'GET', body, raw = false } = {}) {
  const r = await fetch(`https://api.github.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${env('GITHUB_TOKEN')}`,
      Accept: raw ? 'application/vnd.github.raw+json' : 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'rvb-admin',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return r;
}

async function ghError(r) {
  let msg = '';
  try {
    msg = (await r.json()).message || '';
  } catch {}
  console.error('GitHub API error', r.status, msg);
  if (r.status === 401 || r.status === 403) return new HttpError(502, 'GitHub rejected the token (check GITHUB_TOKEN permissions).');
  if (r.status === 404) return new HttpError(502, 'GitHub repo or branch not found (check GITHUB_* env vars).');
  return new HttpError(502, `GitHub error (${r.status}).`);
}

/** Lists markdown files in a directory: [{ name, path }]. */
export async function listDir(dir) {
  const { owner, name, branch } = repo();
  const r = await gh(`/repos/${owner}/${name}/contents/${encodePath(dir)}?ref=${encodeURIComponent(branch)}`);
  if (!r.ok) throw await ghError(r);
  const items = await r.json();
  return items.filter((i) => i.type === 'file').map((i) => ({ name: i.name, path: i.path, sha: i.sha }));
}

/** Reads a text file. Returns { sha, text } or null if it does not exist. */
export async function getTextFile(path) {
  const { owner, name, branch } = repo();
  const meta = await gh(`/repos/${owner}/${name}/contents/${encodePath(path)}?ref=${encodeURIComponent(branch)}`);
  if (meta.status === 404) return null;
  if (!meta.ok) throw await ghError(meta);
  const j = await meta.json();
  return { sha: j.sha, text: Buffer.from(j.content, 'base64').toString('utf8') };
}

/**
 * Creates or updates a file with one commit. Without `sha` it only creates:
 * if the file already exists the call fails with a 409.
 */
export async function putFile(path, buffer, message, sha) {
  const { owner, name, branch } = repo();
  const r = await gh(`/repos/${owner}/${name}/contents/${encodePath(path)}`, {
    method: 'PUT',
    body: {
      message,
      content: buffer.toString('base64'),
      branch,
      ...(sha ? { sha } : {}),
    },
  });
  if (r.status === 422 || r.status === 409) {
    throw new HttpError(409, sha ? 'The post changed on GitHub since you opened it. Reload it and try again.' : 'A file with that name already exists.');
  }
  if (!r.ok) throw await ghError(r);
  const j = await r.json();
  return { sha: j.content.sha, commit: j.commit.html_url };
}
