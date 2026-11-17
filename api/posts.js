import { route, HttpError, requireSlug, listDir, getTextFile, putFile } from './_lib.js';
import { parsePost, serialisePost } from './_post.js';

const DIR = 'content/writing';
const pathFor = (slug) => `${DIR}/${slug}.md`;

function validate(b) {
  const slug = requireSlug(b.slug);
  const title = String(b.title ?? '').trim();
  const summary = String(b.summary ?? '').trim();
  const date = String(b.date ?? '').trim();
  const body = String(b.body ?? '');
  const cover = String(b.cover ?? '').trim();
  const originally_posted = String(b.originally_posted ?? '').trim();
  if (!title || title.length > 200) throw new HttpError(400, 'Title is required (max 200 characters).');
  if (!summary || summary.length > 400) throw new HttpError(400, 'Summary is required (max 400 characters).');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) throw new HttpError(400, 'Date must be YYYY-MM-DD.');
  if (!body.trim()) throw new HttpError(400, 'The post body is empty.');
  if (body.length > 200_000) throw new HttpError(400, 'The post body is too long.');
  if (cover && !(/^\/images\/[\w\-./]+$/.test(cover) && !cover.includes('..')) && !/^https:\/\/\S+$/.test(cover)) {
    throw new HttpError(400, 'Cover must be a /images/... path or an https URL.');
  }
  if (originally_posted) {
    try {
      const u = new URL(originally_posted);
      if (u.protocol !== 'https:' && u.protocol !== 'http:') throw new Error();
    } catch {
      throw new HttpError(400, 'Originally posted must be a full URL.');
    }
  }
  return { slug, title, summary, date, body, cover, originally_posted, draft: b.draft === true };
}

export default route({ methods: ['GET', 'POST'] }, async (req) => {
  if (req.method === 'GET') {
    const slug = req.query?.slug;
    if (slug) {
      requireSlug(slug);
      const f = await getTextFile(pathFor(slug));
      if (!f) throw new HttpError(404, 'Post not found.');
      return { slug, sha: f.sha, ...parsePost(f.text) };
    }
    // List all posts (title, date, draft), newest first.
    const files = (await listDir(DIR)).filter((f) => f.name.endsWith('.md') && !f.name.startsWith('_'));
    const posts = await Promise.all(
      files.map(async (f) => {
        const t = await getTextFile(f.path);
        const p = parsePost(t?.text ?? '');
        return { slug: f.name.replace(/\.md$/, ''), title: p.title, date: p.date, draft: p.draft };
      }),
    );
    posts.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    return { posts };
  }

  // POST: create (no sha) or update (sha from the GET) a post. One commit to the branch.
  const input = validate(req.body ?? {});
  const sha = typeof req.body.sha === 'string' && req.body.sha ? req.body.sha : undefined;
  const message = `${sha ? 'Update' : 'Add'} post: ${input.title}`;
  const out = await putFile(pathFor(input.slug), Buffer.from(serialisePost(input), 'utf8'), message, sha);
  return { ok: true, slug: input.slug, ...out, url: `/writing/${input.slug}` };
});
