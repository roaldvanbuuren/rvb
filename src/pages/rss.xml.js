import rss from '@astrojs/rss';
import { getPosts, postUrl } from '../lib/posts';

export async function GET(context) {
  const posts = await getPosts();
  return rss({
    title: 'Roald van Buuren',
    description: 'Writing by Roald van Buuren on AI, community, Europe and games.',
    site: context.site,
    trailingSlash: false,
    items: posts.map((p) => ({
      title: p.data.title,
      pubDate: p.data.date,
      description: p.data.summary,
      link: postUrl(p),
    })),
    customData: '<language>en</language>',
  });
}
