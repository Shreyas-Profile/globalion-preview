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
    }
    .glbl-chat-btn:hover { transform: translateY(-2px) scale(1.04); }
    .glbl-chat-btn svg { width: 26px; height: 26px; stroke: white; stroke-width: 2; fill: none; }
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
    }
    .glbl-chat-panel.open { display: flex; }
    .glbl-chat-head {
      padding: 14px 16px; border-bottom: 1px solid rgba(255,255,255,.08);
      display: flex; justify-content: space-between; align-items: center;
      background: linear-gradient(180deg, rgba(37,99,235,.15), transparent);
    }
    .glbl-chat-head h4 { margin: 0; font-size: 14px; font-weight: 600; letter-spacing: .2px; }
    .glbl-chat-head p { margin: 2px 0 0 0; font-size: 11px; color: #94a3b8; }
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
    }
    .glbl-msg.user { align-self: flex-end; background: #2563eb; color: white; border-bottom-right-radius: 4px; }
    .glbl-msg.assistant { align-self: flex-start; background: rgba(255,255,255,.06); color: #e5e7eb; border-bottom-left-radius: 4px; }
    .glbl-msg.error { align-self: flex-start; background: rgba(239,68,68,.15); color: #fca5a5; border: 1px solid rgba(239,68,68,.3); }
    .glbl-msg.loading {
      align-self: flex-start; background: rgba(255,255,255,.06); color: #94a3b8;
      display: inline-flex; gap: 4px;
    }
    .glbl-msg.loading span { width: 6px; height: 6px; border-radius: 50%; background: #94a3b8; animation: glbl-blink 1.2s infinite; }
    .glbl-msg.loading span:nth-child(2) { animation-delay: .2s; }
    .glbl-msg.loading span:nth-child(3) { animation-delay: .4s; }
    @keyframes glbl-blink { 0%,80%,100% { opacity: .3; } 40% { opacity: 1; } }
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
    }
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
      <div>
        <h4>Ask Globalion</h4>
        <p>Answers based on this site · GPT-5 mini</p>
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

  function openPanel(open) {
    panel.classList.toggle('open', open);
    if (open && messages.length === 0) {
      addMsg('assistant', "Hi! I can answer questions about Globalion — our services, products (BuildOps, cmplihr, Medhavarse, InterviewPanda…), industries, careers, and more. What would you like to know?");
    }
    if (open) setTimeout(() => input.focus(), 120);
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

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages }),
      });
      const data = await res.json();
      loading.remove();
      if (!res.ok || data.error) {
        addMsg('assistant', data.error || `Sorry — I hit an error (HTTP ${res.status}). Try again in a moment.`, 'error');
      } else {
        addMsg('assistant', data.reply);
        messages.push({ role: 'assistant', content: data.reply });
      }
    } catch (err) {
      loading.remove();
      addMsg('assistant', 'Network error — please try again.', 'error');
    } finally {
      sendBtn.disabled = false;
      input.focus();
    }
  });
})();
