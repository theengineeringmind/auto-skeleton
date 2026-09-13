/**
 * Component fixtures shared by the component and responsive suites. Plain
 * HTML with a small stylesheet that includes media queries, a container
 * query, fluid type, and the usual layout primitives (flex, grid, aspect
 * ratio) so measurement is exercised against realistic markup.
 */

export const FIXTURE_CSS = `
  body { margin: 0; font: 16px/1.5 system-ui, -apple-system, sans-serif; }
  .f-nav { display: flex; align-items: center; gap: 16px; padding: 12px 16px; border-bottom: 1px solid #ddd; }
  .f-nav .logo { width: 32px; height: 32px; border-radius: 8px; background: #333; flex: none; }
  .f-nav .brand { font-weight: 700; }
  .f-nav .links { display: flex; gap: 20px; margin-left: auto; }
  .f-nav .burger { display: none; width: 40px; height: 40px; border-radius: 8px; background: #eee; margin-left: auto; }
  .f-nav .cta { padding: 8px 14px; border-radius: 6px; }
  @media (max-width: 767px) {
    .f-nav .links, .f-nav .cta { display: none; }
    .f-nav .burger { display: block; }
  }

  .f-grid { display: grid; grid-template-columns: 1fr; gap: 16px; padding: 16px; }
  @media (min-width: 640px) { .f-grid { grid-template-columns: repeat(2, 1fr); } }
  @media (min-width: 1024px) { .f-grid { grid-template-columns: repeat(3, 1fr); } }
  .f-product { border: 1px solid #e5e5e5; border-radius: 12px; padding: 12px; }
  .f-product .img { aspect-ratio: 4 / 3; border-radius: 8px; background: #ddd; }
  .f-product .name { margin-top: 10px; font-weight: 600; }
  .f-product .price { color: #555; }
  .f-product .buy { margin-top: 10px; padding: 8px 14px; border-radius: 6px; }

  .f-form { display: grid; gap: 12px; max-width: 480px; padding: 16px; }
  .f-form label { display: grid; gap: 4px; font-size: 14px; }
  .f-form input, .f-form select, .f-form textarea { padding: 8px; border: 1px solid #ccc; border-radius: 6px; font: inherit; }
  .f-form .row { display: flex; gap: 8px; align-items: center; }
  .f-form .submit { padding: 10px 16px; border-radius: 6px; }

  .f-pricing { max-width: 320px; border: 1px solid #e5e5e5; border-radius: 16px; padding: 24px; }
  .f-pricing .tier { font-size: 14px; text-transform: uppercase; letter-spacing: .06em; color: #666; }
  .f-pricing .price { font-size: 40px; font-weight: 700; margin: 8px 0; }
  .f-pricing ul { list-style: none; padding: 0; margin: 16px 0; display: grid; gap: 8px; }
  .f-pricing li { display: flex; gap: 8px; align-items: center; }
  .f-pricing svg { width: 16px; height: 16px; flex: none; }
  .f-pricing .cta { width: 100%; padding: 10px; border-radius: 8px; }

  .f-comments { max-width: 560px; padding: 16px; display: grid; gap: 16px; }
  .f-comment { display: flex; gap: 12px; }
  .f-comment .avatar { width: 36px; height: 36px; border-radius: 50%; background: #bbb; flex: none; }
  .f-comment .meta { font-size: 13px; color: #666; }

  .f-chat { max-width: 420px; padding: 16px; display: grid; gap: 8px; }
  .f-bubble { max-width: 75%; padding: 8px 12px; border-radius: 16px; background: #eee; width: fit-content; }
  .f-bubble.me { background: #2563eb; color: white; justify-self: end; }

  .f-stats-host { container-type: inline-size; }
  .f-stats { display: grid; grid-template-columns: 1fr; gap: 12px; padding: 12px; }
  @container (min-width: 500px) { .f-stats { grid-template-columns: repeat(4, 1fr); } }
  .f-stat { border: 1px solid #e5e5e5; border-radius: 10px; padding: 12px; }
  .f-stat .value { font-size: 28px; font-weight: 700; }
  .f-stat .label { font-size: 13px; color: #666; }

  .f-crumbs { display: flex; gap: 8px; padding: 12px 16px; font-size: 14px; }
  .f-pager { display: flex; gap: 6px; padding: 12px 16px; }
  .f-pager button { width: 36px; height: 36px; border-radius: 6px; }

  .f-article { max-width: 720px; padding: 16px; }
  .f-article h1 { font-size: clamp(22px, 4vw, 40px); line-height: 1.2; margin: 0 0 8px; }
  .f-article p { margin: 0 0 12px; }
`;

const LOREM =
  'Every loading state we shipped was a small lie: a stack of grey rectangles drawn from memory of what the component used to look like. Fonts changed, paddings changed, and the skeletons quietly drifted out of sync.';

export const NAVBAR = `
<nav class="f-nav">
  <div class="logo"></div>
  <span class="brand">Acme</span>
  <div class="links"><a href="#">Docs</a><a href="#">Pricing</a><a href="#">Blog</a><a href="#">Changelog</a></div>
  <button class="cta">Sign in</button>
  <div class="burger" role="button" aria-label="Menu"></div>
</nav>`;

export const PRODUCT_GRID = (count = 6) => `
<div class="f-grid">
  ${Array.from(
    { length: count },
    (_, i) => `
  <article class="f-product">
    <div class="img"></div>
    <div class="name">Product ${i + 1}</div>
    <div class="price">$${(i + 1) * 12}.00</div>
    <button class="buy">Add to cart</button>
  </article>`,
  ).join('')}
</div>`;

export const FORM = `
<form class="f-form">
  <label>Full name <input type="text" placeholder="Ada Lovelace"></label>
  <label>Email <input type="email" placeholder="ada@example.com"></label>
  <label>Team size <select><option>1-10</option><option>11-50</option></select></label>
  <label>Message <textarea rows="3"></textarea></label>
  <div class="row"><input type="checkbox" id="tos"><label for="tos">I agree to the terms</label></div>
  <button class="submit" type="submit">Create account</button>
</form>`;

export const PRICING = `
<div class="f-pricing">
  <div class="tier">Pro</div>
  <div class="price">$29<span style="font-size:16px;font-weight:400"> /mo</span></div>
  <p style="margin:0">Everything you need to ship faster.</p>
  <ul>
    ${['Unlimited projects', 'Priority support', 'Custom domains', 'Audit log']
      .map(
        (f) =>
          `<li><svg viewBox="0 0 16 16"><path d="M2 8l4 4 8-8" stroke="green" fill="none"/></svg><span>${f}</span></li>`,
      )
      .join('')}
  </ul>
  <button class="cta">Start free trial</button>
</div>`;

export const COMMENTS = (count = 3) => `
<section class="f-comments">
  ${Array.from(
    { length: count },
    (_, i) => `
  <div class="f-comment">
    <div class="avatar"></div>
    <div>
      <div><strong>User ${i + 1}</strong> <span class="meta">· ${i + 2}h ago</span></div>
      <p style="margin:4px 0 0">${LOREM.slice(0, 90 + i * 40)}</p>
    </div>
  </div>`,
  ).join('')}
</section>`;

export const CHAT = `
<div class="f-chat">
  <div class="f-bubble">Hey, did the deploy go out?</div>
  <div class="f-bubble me">Yes, ten minutes ago.</div>
  <div class="f-bubble">${LOREM.slice(0, 120)}</div>
  <div class="f-bubble me">👍</div>
</div>`;

export const STATS = `
<div class="f-stats-host">
  <div class="f-stats">
    ${[
      ['12,480', 'Active users'],
      ['$84k', 'MRR'],
      ['3.2%', 'Churn'],
      ['99.98%', 'Uptime'],
    ]
      .map(([v, l]) => `<div class="f-stat"><div class="value">${v}</div><div class="label">${l}</div></div>`)
      .join('')}
  </div>
</div>`;

export const CRUMBS_AND_PAGER = `
<div>
  <nav class="f-crumbs"><a href="#">Home</a><span>/</span><a href="#">Library</a><span>/</span><span>Data</span></nav>
  <div class="f-pager">${[1, 2, 3, 4, 5].map((n) => `<button>${n}</button>`).join('')}</div>
</div>`;

export const ARTICLE = `
<article class="f-article">
  <h1>Why we stopped hand-writing skeleton components</h1>
  <p>${LOREM}</p>
  <p>${LOREM}</p>
</article>`;

export const COMPONENTS: Record<string, string> = {
  navbar: NAVBAR,
  productGrid: PRODUCT_GRID(),
  form: FORM,
  pricing: PRICING,
  comments: COMMENTS(),
  chat: CHAT,
  stats: STATS,
  crumbsAndPager: CRUMBS_AND_PAGER,
  article: ARTICLE,
};

let styleTag: HTMLStyleElement | null = null;
export function installFixtureStyles(): void {
  if (styleTag?.isConnected) return;
  styleTag = document.createElement('style');
  styleTag.id = 'fixture-styles';
  styleTag.textContent = FIXTURE_CSS;
  document.head.appendChild(styleTag);
}

/** Mount markup in a full-width host so media queries respond to the viewport. */
export function mountFull(html: string, width = '100%'): HTMLElement {
  installFixtureStyles();
  const host = document.createElement('div');
  host.style.width = width;
  host.innerHTML = html;
  document.body.appendChild(host);
  return host.firstElementChild as HTMLElement;
}

export function cleanupAll(): void {
  document.body.innerHTML = '';
  document.getElementById('auto-skeleton-styles')?.remove();
}
