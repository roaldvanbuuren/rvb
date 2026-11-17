import crypto from 'node:crypto';
import { route, HttpError, requireSlug, putFile } from './_lib.js';

// Vercel functions accept request bodies up to 4.5 MB; base64 adds a third, so ~3.2 MB of image.
const MAX_BYTES = 3.2 * 1024 * 1024;

function sniff(buf) {
  if (buf.length > 12 && buf.slice(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return 'jpg';
  if (buf.length > 8 && buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buf.length > 12 && buf.slice(0, 4).toString() === 'RIFF' && buf.slice(8, 12).toString() === 'WEBP') return 'webp';
  if (buf.length > 6 && buf.slice(0, 3).toString() === 'GIF') return 'gif';
  return null;
}

export default route({ methods: ['POST'] }, async (req) => {
  const slug = requireSlug(req.body?.slug);
  const data = req.body?.data;
  if (typeof data !== 'string' || !data) throw new HttpError(400, 'No image data.');
  const buf = Buffer.from(data, 'base64');
  if (buf.length > MAX_BYTES) throw new HttpError(413, 'Image too large (max about 3 MB after resizing).');
  const ext = sniff(buf);
  if (!ext) throw new HttpError(400, 'Only JPEG, PNG, WebP or GIF images are allowed.');

  const base =
    String(req.body?.name ?? 'image')
      .replace(/\.[^.]*$/, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'image';
  const file = `${base}-${crypto.randomBytes(3).toString('hex')}.${ext}`;
  const repoPath = `public/images/writing/posts/${slug}/${file}`;
  await putFile(repoPath, buf, `Add image for post: ${slug}`);
  return { ok: true, url: `/images/writing/posts/${slug}/${file}` };
});
