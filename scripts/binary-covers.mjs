// Binary cover generator.
//
// Turns every article cover image into a picture made of 0s and 1s: the image is sampled on a
// grid, and each cell becomes one digit drawn in that cell's original colour on the site's dark
// background. Brighter cells get a 0 (more ink), darker cells a 1 (less ink), and every pixel of a
// digit is coloured from the photo underneath it, so fine detail survives inside the digits.
//
// The digits are drawn from a built-in pixel font, not a system font, so the output is identical
// on every machine (including Vercel's build image, which has no fonts installed).
//
// Output: public/images/writing/binary/<same path as the cover>.webp       (article hero, 1200 wide)
//         public/images/writing/binary/<same path as the cover>-card.webp  (cards and tiles, 960 wide)
//
// Runs automatically before every build (npm "prebuild") and only generates covers whose output is
// missing. After replacing a cover image, run `npm run covers -- --force` to rebuild everything.
// If anything fails here the build carries on and the site falls back to the original photos.

import { readFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const contentDir = join(root, 'content', 'writing');
const publicDir = join(root, 'public');
const force = process.argv.includes('--force');

// Site background (#121211).
const BG = [0x12, 0x12, 0x11];

// 5x7 pixel glyphs. The zero is slashed, like a terminal font.
const GLYPHS = {
  '0': ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'],
  '1': ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
};

// width: output width in px. cell: grid cell size in px. dot: size of one glyph pixel in px.
const VARIANTS = [
  { suffix: '', width: 1200, cell: [8, 10], dot: 1 },
  { suffix: '-card', width: 960, cell: [8, 10], dot: 1 },
];

// Digits only cover part of each cell, so their colour is lifted (hue kept) to keep the picture
// about as bright as the photo it came from. Behind the digits sits a faint wash of the photo,
// which keeps large shapes readable without the photo itself showing through.
const LIFT = 1.6;
const WASH = 0.22;

/** Every distinct local cover path referenced by an article, e.g. /images/writing/generic/g-arena.jpg */
function coverPaths() {
  const out = new Set();
  for (const f of readdirSync(contentDir)) {
    if (!f.endsWith('.md') || f.startsWith('_')) continue;
    const fm = readFileSync(join(contentDir, f), 'utf8').match(/^---\n([\s\S]*?)\n---/);
    const m = fm && fm[1].match(/^cover:\s*["']?([^"'\n]+?)["']?\s*$/m);
    if (m && m[1].startsWith('/')) out.add(m[1]);
  }
  return [...out];
}

export function binaryPath(cover, suffix = '') {
  return cover.replace(/^\/images\/writing\//, '/images/writing/binary/').replace(/\.[a-z0-9]+$/i, `${suffix}.webp`);
}

async function render(sharp, src, dest, { width, cell: [cw, ch], dot }) {
  const meta = await sharp(src).metadata();
  const cols = Math.round(width / cw);
  const rows = Math.max(1, Math.round((width * (meta.height / meta.width)) / ch));
  const W = cols * cw, H = rows * ch;

  // Full-resolution photo: every lit pixel of a digit takes the photo's colour at that exact
  // spot, so detail finer than one character still comes through the strokes of the digits.
  const photo = (await sharp(src).removeAlpha().resize(W, H, { fit: 'fill', kernel: 'lanczos3' }).raw().toBuffer({ resolveWithObject: true })).data;
  // One brightness sample per cell decides whether that cell is a 0 or a 1.
  const cells = (await sharp(src).removeAlpha().resize(cols, rows, { fit: 'fill', kernel: 'lanczos3' }).raw().toBuffer({ resolveWithObject: true })).data;

  // Split 0s and 1s around the image's own median brightness, so every cover gets a healthy mix.
  const lums = [];
  for (let k = 0; k < cells.length; k += 3) lums.push((0.2126 * cells[k] + 0.7152 * cells[k + 1] + 0.0722 * cells[k + 2]) / 255);
  const median = [...lums].sort((a, b) => a - b)[lums.length >> 1];

  // Background: a faint wash of the photo, so large shapes stay readable between the digits.
  const px = Buffer.alloc(W * H * 3);
  for (let i = 0; i < W * H * 3; i++) px[i] = Math.round(BG[i % 3] + (photo[i] - BG[i % 3]) * WASH);

  const gw = 5 * dot, gh = 7 * dot;
  const ox = Math.floor((cw - gw) / 2), oy = Math.floor((ch - gh) / 2);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const glyph = GLYPHS[lums[r * cols + c] >= median ? '0' : '1'];
      for (let gy = 0; gy < 7; gy++) {
        for (let gx = 0; gx < 5; gx++) {
          if (glyph[gy][gx] !== '#') continue;
          for (let dy = 0; dy < dot; dy++) {
            const y = r * ch + oy + gy * dot + dy;
            let p = (y * W + c * cw + ox + gx * dot) * 3;
            for (let dx = 0; dx < dot; dx++, p += 3) {
              const a = photo[p], b = photo[p + 1], d = photo[p + 2];
              const lift = Math.min(LIFT, 255 / Math.max(1, a, b, d));
              px[p] = a * lift; px[p + 1] = b * lift; px[p + 2] = d * lift;
            }
          }
        }
      }
    }
  }

  mkdirSync(dirname(dest), { recursive: true });
  await sharp(px, { raw: { width: W, height: H, channels: 3 } }).webp({ quality: 66, effort: 6 }).toFile(dest);
}

async function main() {
  let sharp;
  try {
    sharp = (await import('sharp')).default;
  } catch {
    console.warn('[binary-covers] sharp is not available, skipping. Original covers will be used.');
    return;
  }
  let made = 0;
  for (const cover of coverPaths()) {
    const src = join(publicDir, cover);
    if (!existsSync(src)) { console.warn(`[binary-covers] missing source ${cover}`); continue; }
    for (const v of VARIANTS) {
      const dest = join(publicDir, binaryPath(cover, v.suffix));
      if (!force && existsSync(dest)) continue;
      try {
        await render(sharp, src, dest, v);
        made++;
      } catch (e) {
        console.warn(`[binary-covers] failed on ${cover}: ${e.message}`);
      }
    }
  }
  console.log(`[binary-covers] ${made} image(s) generated.`);
}

main().catch((e) => console.warn(`[binary-covers] skipped: ${e.message}`));
