import { getCollection, type CollectionEntry } from 'astro:content';

export type Post = CollectionEntry<'writing'>;

/** Published articles only (drafts excluded), newest first. */
export async function getPosts(): Promise<Post[]> {
  const all = await getCollection('writing', ({ data }) => !data.draft);
  return all.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

export function readingTime(body = ''): number {
  const words = body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#>*_`\[\]()!-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / 230));
}

export function formatDate(d: Date): string {
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * WebP twin of a cover image, if one exists. The generic cover images in
 * public/images/writing/generic/ ship as .jpg + .webp pairs; the older per-article covers are .jpg only.
 */
export function coverWebp(cover?: string): string | undefined {
  return cover && cover.startsWith('/images/writing/generic/') && cover.endsWith('.jpg')
    ? cover.replace(/\.jpg$/, '.webp')
    : undefined;
}

export function postUrl(p: Post): string {
  return `/writing/${p.id}`;
}

/** "Originally posted on X" / "LinkedIn", based on the link's host. */
export function originalPlatform(url: string): string {
  const host = new URL(url).hostname.replace(/^www\./, '');
  if (host === 'x.com' || host === 'twitter.com') return 'X';
  if (host.endsWith('linkedin.com')) return 'LinkedIn';
  return host;
}

export const links = {
  x: 'https://x.com/roaldvanbuuren',
  linkedin: 'https://www.linkedin.com/in/roaldvanbuuren/',
  email: 'mailto:roald@elocollective.com',
  lumen: 'https://trylumen.io',
  elo: 'https://elocollective.com',
  labs: 'https://labs.elocollective.com',
  data: 'https://data.elocollective.com',
};
