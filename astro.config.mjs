import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Absolute URLs are needed for og:image, canonical links and the RSS feed.
// Set SITE_URL in Vercel (Project Settings > Environment Variables) once the
// custom domain is chosen. Until then the Vercel production URL is used.
const site =
  process.env.SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : 'http://localhost:4321');

export default defineConfig({
  site,
  output: 'static',
  trailingSlash: 'never',
  integrations: [sitemap({ filter: (page) => !/\/404$/.test(page) })],
});
