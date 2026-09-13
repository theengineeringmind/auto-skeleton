export const CARD_HTML = `
<div class="card" style="width: 320px; padding: 16px; font: 16px/1.5 system-ui, sans-serif; box-sizing: border-box;">
  <div style="display: flex; gap: 12px; align-items: center;">
    <div class="avatar" style="width: 40px; height: 40px; border-radius: 50%; background: #ccc; flex: none;"></div>
    <div>
      <div class="name" style="font-weight: 600;">Ada Lovelace</div>
      <div class="handle" style="color: #666; font-size: 14px;">@ada</div>
    </div>
    <span class="badge" style="margin-left: auto; padding: 2px 8px; border-radius: 999px; background: #dfe; font-size: 12px;">Pro</span>
  </div>
  <p class="bio" style="margin: 12px 0 0;">Mathematician and writer, chiefly known for her work on Charles Babbage's proposed mechanical general-purpose computer, the Analytical Engine.</p>
  <img class="cover" alt="" width="288" height="120" style="display: block; margin-top: 12px; border-radius: 8px; background: #eee;">
  <div style="display: flex; gap: 8px; margin-top: 12px;">
    <button class="follow" style="padding: 8px 16px; border-radius: 6px;">Follow</button>
    <button class="message" style="padding: 8px 16px; border-radius: 6px;">Message</button>
  </div>
</div>
`;

export function mount(html: string, wrapperStyle = ''): HTMLElement {
  const host = document.createElement('div');
  host.setAttribute('style', wrapperStyle);
  host.innerHTML = html;
  document.body.appendChild(host);
  return host.firstElementChild as HTMLElement;
}

export function cleanup(): void {
  document.body.innerHTML = '';
  document.getElementById('auto-skeleton-styles')?.remove();
}
