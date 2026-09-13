// Renders docs/hero.png and docs/social-preview.png: a real card next to the
// skeleton auto-skeleton measures from it. Run after `pnpm build`.
import { execSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright';

// Self-contained bundle of the core, exposed as a global for the inline page.
const out = mkdtempSync(join(tmpdir(), 'auto-skeleton-hero-'));
execSync(`pnpm exec tsup src/index.ts --format iife --global-name AutoSkeleton --out-dir "${out}" --silent`, {
  stdio: 'inherit',
});
const lib = readFileSync(join(out, 'index.global.js'), 'utf8');

const card = (id) => `
<div class="card" id="${id}">
  <div class="row">
    <div class="avatar"></div>
    <div>
      <div class="name">Ada Lovelace</div>
      <div class="handle">@ada · Engineering</div>
    </div>
    <span class="badge">Pro</span>
  </div>
  <p class="bio">Mathematician and writer, chiefly known for her work on Charles Babbage's Analytical Engine, the first general-purpose computer.</p>
  <div class="cover"></div>
  <div class="chips"><span>mathematics</span><span>poetry</span><span>engines</span></div>
  <div class="row actions"><button class="primary">Follow</button><button>Message</button></div>
</div>`;

const page_html = (title, subtitle, wide) => `<!doctype html><html><head><meta charset="utf-8"><style>
  body { margin: 0; font-family: -apple-system, "Inter", "Segoe UI", system-ui, sans-serif; background: #0b0d12; color: #e7e9ee; }
  .stage { width: ${wide ? 1280 : 960}px; height: ${wide ? 640 : 500}px; box-sizing: border-box; padding: ${wide ? '40px 72px' : '32px 40px'}; display: grid; grid-template-rows: auto 1fr; gap: ${wide ? 24 : 20}px; }
  h1 { margin: 0; font-size: ${wide ? 40 : 26}px; letter-spacing: -0.02em; }
  h1 span { color: #7c9cff; }
  .sub { margin: 6px 0 0; color: #9aa3b2; font-size: ${wide ? 20 : 15}px; }
  .pair { display: grid; grid-template-columns: 1fr 1fr; gap: ${wide ? 48 : 32}px; align-items: start; }
  .label { font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; color: #7f8797; margin-bottom: 10px; }
  .card { width: 100%; box-sizing: border-box; padding: 18px; border-radius: 14px; background: #151924; border: 1px solid #242a38; font-size: 15px; line-height: 1.5; }
  .row { display: flex; gap: 12px; align-items: center; }
  .avatar { width: 44px; height: 44px; border-radius: 50%; background: linear-gradient(135deg, #f59e0b, #ef4444); flex: none; }
  .name { font-weight: 600; }
  .handle { color: #9aa3b2; font-size: 13px; }
  .badge { margin-left: auto; padding: 2px 10px; border-radius: 999px; background: #1f3b2b; color: #7ee2a8; font-size: 12px; }
  .bio { margin: 12px 0 0; }
  .cover { height: 72px; border-radius: 10px; margin-top: 12px; background: linear-gradient(135deg, #60a5fa, #a78bfa); }
  .chips { margin-top: 12px; display: flex; gap: 6px; }
  .chips span { padding: 4px 10px; border-radius: 6px; background: #222836; font-size: 13px; }
  .actions { margin-top: 12px; gap: 8px; }
  button { font: inherit; padding: 8px 16px; border-radius: 8px; border: 1px solid #2e3546; background: transparent; color: inherit; }
  button.primary { background: #3b82f6; border-color: #3b82f6; color: white; }
  .slot { position: relative; }
  .slot .card { visibility: hidden; }
  .slot .auto-skeleton { position: absolute; inset: 0; --auto-skeleton-color: #232a3a; --auto-skeleton-highlight: #37405a; }
  .arrow { align-self: center; text-align: center; color: #7f8797; font-size: 13px; }
</style></head><body><div class="stage">
  <div><h1>${title}</h1><p class="sub">${subtitle}</p></div>
  <div class="pair">
    <div><div class="label">Your component</div>${card('src')}</div>
    <div><div class="label">Its skeleton, measured automatically</div><div class="slot">${card('copy')}</div></div>
  </div>
</div>
<script>${lib}</script>
<script>
const { measure, renderSkeleton } = AutoSkeleton;
const src = document.getElementById('src');
const layout = measure(src);
const el = renderSkeleton(layout, { animate: true, duration: 2400 });
document.querySelector('.slot').appendChild(el);
// Freeze the sweep at a pleasing spot for a still image.
for (const a of document.getAnimations()) { a.pause(); a.currentTime = 1100; }
document.body.dataset.ready = '1';
</script></body></html>`;

const browser = await chromium.launch();
for (const [file, title, subtitle, wide] of [
  [
    'docs/hero.png',
    'auto-<span>skeleton</span>',
    'Loading skeletons measured from your real UI. No hand-written skeleton components.',
    false,
  ],
  [
    'docs/social-preview.png',
    'auto-<span>skeleton</span>',
    'Measured, not drawn. Skeleton loaders for React and vanilla JS.',
    true,
  ],
]) {
  const page = await browser.newPage({
    viewport: { width: wide ? 1280 : 960, height: wide ? 640 : 500 },
    deviceScaleFactor: 2,
  });
  page.on('pageerror', (e) => console.error('page error:', e.message));
  await page.setContent(page_html(title, subtitle, wide));
  await page.waitForSelector('body[data-ready]');
  await page.screenshot({ path: file });
  console.log('wrote', file);
  await page.close();
}
await browser.close();
