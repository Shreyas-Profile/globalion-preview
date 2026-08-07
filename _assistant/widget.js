// Globalion site chatbot widget — vanilla JS, no build step.
// Injected into every page via a script tag added by build-assistant.mjs.
// UI is bottom-right: a floating orb; click to expand into a chat panel.
//
// Backend: POST /api/chat with { messages: [{role,content},...] }.
// Response: { reply: string }.

(() => {
  if (window.__GLBL_CHAT__) return;
  window.__GLBL_CHAT__ = true;

  const style = document.createElement('style');
  style.textContent = `
    .glbl-chat-btn {
      position: fixed; right: 24px; bottom: 24px; z-index: 2147483000;
      width: 60px; height: 60px; border-radius: 50%;
      background: linear-gradient(135deg,#3b82f6,#2563eb);
      color: white; border: none; cursor: pointer;
      box-shadow: 0 12px 30px rgba(37,99,235,.35), 0 4px 10px rgba(0,0,0,.15);
      display: flex; align-items: center; justify-content: center;
      transition: transform .18s ease, box-shadow .18s ease;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      animation: glbl-idle 3.6s ease-in-out infinite;
    }
    .glbl-chat-btn::before {
      content: ""; position: absolute; inset: -4px; border-radius: 50%;
      background: radial-gradient(circle, rgba(37,99,235,.5) 0%, transparent 70%);
      animation: glbl-pulse 2.2s ease-out infinite;
      z-index: -1; pointer-events: none;
    }
    .glbl-chat-btn:hover { transform: translateY(-3px) scale(1.08); animation-play-state: paused; }
    .glbl-chat-btn svg { width: 26px; height: 26px; stroke: white; stroke-width: 2; fill: none; }
    @keyframes glbl-idle {
      0%, 100% { transform: translateY(0); }
      50%      { transform: translateY(-4px); }
    }
    @keyframes glbl-pulse {
      0%   { transform: scale(1);   opacity: .7; }
      70%  { transform: scale(1.4); opacity: 0; }
      100% { transform: scale(1.4); opacity: 0; }
    }
    .glbl-chat-btn.open-state { animation: none; }
    .glbl-chat-btn.open-state::before { display: none; }

    .glbl-chat-panel {
      position: fixed; right: 24px; bottom: 96px; z-index: 2147483000;
      width: min(400px, calc(100vw - 32px));
      height: min(560px, calc(100vh - 128px));
      background: #0b0d12; color: #e5e7eb;
      border: 1px solid rgba(255,255,255,.08);
      border-radius: 16px;
      box-shadow: 0 24px 60px rgba(0,0,0,.5), 0 8px 20px rgba(0,0,0,.25);
      display: none; flex-direction: column; overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      transform-origin: bottom right;
    }
    .glbl-chat-panel.open {
      display: flex;
      animation: glbl-panel-in .32s cubic-bezier(.22,1.2,.36,1) both;
    }
    @keyframes glbl-panel-in {
      0%   { transform: translateY(12px) scale(.92); opacity: 0; }
      100% { transform: translateY(0) scale(1); opacity: 1; }
    }
    .glbl-chat-head {
      padding: 14px 16px; border-bottom: 1px solid rgba(255,255,255,.08);
      display: flex; justify-content: space-between; align-items: center;
      background: linear-gradient(180deg, rgba(37,99,235,.15), transparent);
    }
    .glbl-chat-head h4 { margin: 0; font-size: 14px; font-weight: 600; letter-spacing: .2px; }
    .glbl-chat-head p { margin: 2px 0 0 0; font-size: 11px; color: #94a3b8; }
    .glbl-chat-head-left { display: flex; align-items: center; gap: 10px; }
    .glbl-avatar {
      width: 34px; height: 34px; border-radius: 50%;
      background: linear-gradient(135deg,#3b82f6,#2563eb);
      display: flex; align-items: center; justify-content: center;
      font-size: 18px; flex-shrink: 0;
      box-shadow: 0 4px 12px rgba(37,99,235,.4);
      animation: glbl-avatar-bob 4s ease-in-out infinite;
    }
    @keyframes glbl-avatar-bob {
      0%, 100% { transform: translateY(0) rotate(0deg); }
      25%      { transform: translateY(-2px) rotate(-4deg); }
      75%      { transform: translateY(-2px) rotate(4deg); }
    }
    .glbl-live-dot {
      display: inline-block; width: 7px; height: 7px; border-radius: 50%;
      background: #10b981; margin-right: 5px; vertical-align: middle;
      animation: glbl-live 2s ease-in-out infinite;
    }
    @keyframes glbl-live {
      0%, 100% { box-shadow: 0 0 0 0 rgba(16,185,129,.7); }
      50%      { box-shadow: 0 0 0 6px rgba(16,185,129,0); }
    }
    .glbl-chat-close {
      background: transparent; border: none; color: #94a3b8; cursor: pointer;
      width: 28px; height: 28px; border-radius: 6px; font-size: 18px; line-height: 1;
    }
    .glbl-chat-close:hover { background: rgba(255,255,255,.06); color: white; }
    .glbl-chat-log {
      flex: 1; overflow-y: auto; padding: 16px;
      display: flex; flex-direction: column; gap: 12px;
    }
    .glbl-msg {
      max-width: 85%; padding: 10px 14px; border-radius: 14px;
      font-size: 14px; line-height: 1.45; white-space: pre-wrap; word-wrap: break-word;
      animation: glbl-msg-in .3s cubic-bezier(.22,1.2,.36,1) both;
    }
    @keyframes glbl-msg-in {
      0%   { transform: translateY(8px); opacity: 0; }
      100% { transform: translateY(0); opacity: 1; }
    }
    .glbl-msg.user { align-self: flex-end; background: #2563eb; color: white; border-bottom-right-radius: 4px; }
    .glbl-msg.assistant { align-self: flex-start; background: rgba(255,255,255,.06); color: #e5e7eb; border-bottom-left-radius: 4px; }
    .glbl-msg.error { align-self: flex-start; background: rgba(239,68,68,.15); color: #fca5a5; border: 1px solid rgba(239,68,68,.3); }
    .glbl-msg a { transition: opacity .15s ease; }
    .glbl-msg a:hover { opacity: .75; }
    .glbl-msg.loading {
      align-self: flex-start; background: rgba(255,255,255,.06); color: #94a3b8;
      display: inline-flex; gap: 5px; padding: 12px 14px;
    }
    .glbl-msg.loading span {
      width: 7px; height: 7px; border-radius: 50%;
      background: linear-gradient(135deg,#93c5fd,#3b82f6);
      animation: glbl-bounce 1s ease-in-out infinite;
    }
    .glbl-msg.loading span:nth-child(2) { animation-delay: .15s; }
    .glbl-msg.loading span:nth-child(3) { animation-delay: .3s; }
    @keyframes glbl-bounce {
      0%, 60%, 100% { transform: translateY(0); opacity: .5; }
      30%           { transform: translateY(-6px); opacity: 1; }
    }
    .glbl-suggestions {
      display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px;
      animation: glbl-msg-in .35s cubic-bezier(.22,1.2,.36,1) both .1s;
    }
    .glbl-suggest {
      background: rgba(37,99,235,.12); color: #93c5fd;
      border: 1px solid rgba(37,99,235,.3);
      padding: 6px 12px; border-radius: 999px;
      font-size: 12px; cursor: pointer; font-family: inherit;
      transition: all .18s ease;
    }
    .glbl-suggest:hover {
      background: rgba(37,99,235,.25); color: white; transform: translateY(-1px);
    }
    .glbl-chat-input-wrap {
      padding: 12px; border-top: 1px solid rgba(255,255,255,.08);
      display: flex; gap: 8px; background: rgba(0,0,0,.2);
    }
    .glbl-chat-input {
      flex: 1; background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.08);
      color: white; padding: 10px 12px; border-radius: 10px; font-size: 14px;
      outline: none; font-family: inherit;
    }
    .glbl-chat-input:focus { border-color: rgba(37,99,235,.7); }
    .glbl-chat-send {
      background: #2563eb; color: white; border: none; padding: 0 16px; border-radius: 10px;
      font-size: 14px; font-weight: 600; cursor: pointer; font-family: inherit;
      transition: transform .12s ease, background .18s ease, box-shadow .18s ease;
    }
    .glbl-chat-send:hover:not(:disabled) {
      background: #1d4ed8; transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(37,99,235,.3);
    }
    .glbl-chat-send:active:not(:disabled) { transform: translateY(0) scale(.97); }
    .glbl-chat-send:disabled { opacity: .5; cursor: not-allowed; }
    .glbl-chat-footer {
      padding: 6px 12px 10px 12px; text-align: center;
      font-size: 10px; color: #64748b; letter-spacing: .3px;
    }
  `;
  document.head.appendChild(style);

  const btn = document.createElement('button');
  btn.className = 'glbl-chat-btn';
  btn.setAttribute('aria-label', 'Chat with Globalion');
  btn.innerHTML =
    '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  const panel = document.createElement('div');
  panel.className = 'glbl-chat-panel';
  panel.innerHTML = `
    <div class="glbl-chat-head">
      <div class="glbl-chat-head-left">
        <div class="glbl-avatar" aria-hidden="true">✨</div>
        <div>
          <h4>Chat with Nova</h4>
          <p><span class="glbl-live-dot"></span>Your friendly guide to Globalion</p>
        </div>
      </div>
      <button class="glbl-chat-close" aria-label="Close chat">×</button>
    </div>
    <div class="glbl-chat-log"></div>
    <form class="glbl-chat-input-wrap">
      <input class="glbl-chat-input" type="text" placeholder="Ask about our services, products, or team…" autocomplete="off" />
      <button class="glbl-chat-send" type="submit">Send</button>
    </form>
    <div class="glbl-chat-footer">UAT preview · not the live site</div>
  `;

  document.body.appendChild(btn);
  document.body.appendChild(panel);

  const log = panel.querySelector('.glbl-chat-log');
  const input = panel.querySelector('.glbl-chat-input');
  const sendBtn = panel.querySelector('.glbl-chat-send');
  const form = panel.querySelector('form');
  const closeBtn = panel.querySelector('.glbl-chat-close');
  const messages = [];

  // Very small Markdown-link renderer: turns [label](url) into <a> elements.
  // Everything else is inserted as plain text so injected HTML can't escape.
  function renderRichText(el, text) {
    const linkRe = /\[([^\]]+)\]\(([^)\s]+)\)/g;
    let last = 0, m;
    while ((m = linkRe.exec(text)) !== null) {
      if (m.index > last) el.appendChild(document.createTextNode(text.slice(last, m.index)));
      const a = document.createElement('a');
      a.textContent = m[1];
      // Only allow relative paths (start with /) or http(s) links from same host
      const href = m[2];
      if (href.startsWith('/') || /^https?:\/\//i.test(href)) a.href = href;
      else a.href = '/' + href;
      a.style.color = '#93c5fd';
      a.style.textDecoration = 'underline';
      a.target = '_self';
      el.appendChild(a);
      last = m.index + m[0].length;
    }
    if (last < text.length) el.appendChild(document.createTextNode(text.slice(last)));
  }

  function addMsg(role, text, cls) {
    const el = document.createElement('div');
    el.className = 'glbl-msg ' + (cls || role);
    if (role === 'assistant') renderRichText(el, text);
    else el.textContent = text;
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
    return el;
  }

  const SUGGESTIONS = [
    'What does BuildOps do?',
    'Which industries do you serve?',
    'How can I get a demo?',
    "What's Medhavarse?",
  ];

  function addSuggestions() {
    const wrap = document.createElement('div');
    wrap.className = 'glbl-suggestions';
    for (const s of SUGGESTIONS) {
      const b = document.createElement('button');
      b.className = 'glbl-suggest';
      b.type = 'button';
      b.textContent = s;
      b.addEventListener('click', () => {
        wrap.remove();
        input.value = s;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        form.requestSubmit();
      });
      wrap.appendChild(b);
    }
    log.appendChild(wrap);
    log.scrollTop = log.scrollHeight;
  }

  function openPanel(open) {
    panel.classList.toggle('open', open);
    btn.classList.toggle('open-state', open);
    if (open && messages.length === 0) {
      addMsg('assistant', "Hey! 👋 I'm Nova — your guide to everything Globalion. Ask me about our AI products, services, or anything else on the site. What's on your mind?");
      addSuggestions();
    }
    if (open) setTimeout(() => input.focus(), 220);
  }

  btn.addEventListener('click', () => openPanel(!panel.classList.contains('open')));
  closeBtn.addEventListener('click', () => openPanel(false));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    sendBtn.disabled = true;
    addMsg('user', text);
    messages.push({ role: 'user', content: text });

    const loading = document.createElement('div');
    loading.className = 'glbl-msg loading';
    loading.innerHTML = '<span></span><span></span><span></span>';
    log.appendChild(loading);
    log.scrollTop = log.scrollHeight;

    // Client-side retry — 502s often come from the Cloudflare edge before
    // my function even runs, so server-side retry doesn't cover them.
    // Two extra tries with short backoff before showing an error.
    let data, lastStatus = 0, lastErr = '';
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages }),
        });
        lastStatus = res.status;
        // 502/503/504/429 from CDN or my function → retry
        if (res.status >= 500 || res.status === 429) {
          lastErr = 'HTTP ' + res.status;
          if (attempt < 3) { await new Promise((r) => setTimeout(r, 500 * attempt)); continue; }
        }
        try {
          data = await res.json();
        } catch {
          data = { error: 'The model is having a moment — please try again.' };
        }
        break;
      } catch (err) {
        lastErr = err?.message || 'network';
        if (attempt < 3) { await new Promise((r) => setTimeout(r, 500 * attempt)); continue; }
        data = { error: 'Network error — please try again.' };
      }
    }
    loading.remove();
    if (!data || data.error) {
      addMsg('assistant', (data && data.error) || `Sorry — ${lastErr}. Try again in a moment.`, 'error');
    } else {
      addMsg('assistant', data.reply);
      messages.push({ role: 'assistant', content: data.reply });
    }
    sendBtn.disabled = false;
    input.focus();
  });
})();
