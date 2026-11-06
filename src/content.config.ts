import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const writing = defineCollection({
  // One Markdown file per article in content/writing/. Files starting with _ are ignored.
  loader: glob({ pattern: '**/[^_]*.md', base: './content/writing' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    summary: z.string(),
    // Path under public/ (e.g. /images/writing/my-cover.jpg) or a full URL.
    cover: z.string().optional(),
    // Link to the original post, e.g. the X or LinkedIn post.
    originally_posted: z.string().url().optional(),
    // Drafts are never published, listed, or added to the feed.
    draft: z.boolean().default(false),
  }),
});

export const collections = { writing };
