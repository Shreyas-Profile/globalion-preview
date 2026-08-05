// Cloudflare Pages Function: /api/chat
// POST { messages: [{role, content}, ...] } → { reply }
//
// - Loads the site-content snapshot (JSON built at repo root by build-content.mjs)
//   and injects it as the system prompt so the model can answer from real page copy.
// - Calls GPT-5 mini via OpenRouter.
//
// Env vars (set in Cloudflare Pages project settings):
//   OPENROUTER_API_KEY  – shared Globalion OpenRouter key
//   CHAT_MODEL          – (optional) overrides the default openai/gpt-5-mini

import siteContent from '../../assistant-content.json';

const DEFAULT_MODEL = 'openai/gpt-5-mini';
const MAX_TURNS = 16;

const SYSTEM_PROMPT = ({ pages, indexedAt }) => `
You are the assistant for Globalion Technology Solutions (globalion.in).
Answer visitors' questions using ONLY the site content provided below. If the
answer is not in the content, say something like:

  "I don't have that on hand — the best next step is to use the 'Talk to us'
  form so someone from Globalion can respond directly."

Rules:
- Be concise: 2-4 short sentences, max ~80 words. Never leave a sentence half-finished.
- Sound human, not corporate. No bullet lists, no headings — plain prose.
- Never invent facts, pricing, or people.
- Reply in the same language the user wrote in.

Linking — VERY important:
- ALWAYS end your reply with ONE relevant link in Markdown format:
    [Learn more →](/ai-products/medhavarse/)
    [Talk to us →](/contact/)
- Pick the link that best matches the user's intent. Use the exact URL paths
  from the site content above (they start with '/', e.g. '/ai-products/buildops/',
  '/services/cybersecurity/', '/insights/dpdp-act-secure-by-design/', '/contact/',
  '/careers/'). Do NOT invent URLs — only use paths that appear in the site content.
- If they ask for pricing, demo, contact, or 'how do I reach you', link to /contact/.
- If they ask about a specific product/service/insight, link to that page.
- If it's a very general question, link to /ai-products/ or /services/.

You are talking on the UAT preview of the site, not the live site.

--- SITE CONTENT (${pages} pages, snapshotted ${indexedAt}) ---
${siteContent.content}
--- END SITE CONTENT ---
`.trim();

export async function onRequestPost({ request, env }) {
  const key = env.OPENROUTER_API_KEY;
  if (!key) {
    return json({ error: 'OPENROUTER_API_KEY is not set on this Pages project.' }, 500);
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON.' }, 400);
  }
  const userMessages = Array.isArray(body?.messages) ? body.messages : [];
  if (userMessages.length === 0) {
    return json({ error: 'No messages provided.' }, 400);
  }
  const trimmed = userMessages
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-MAX_TURNS);
  if (trimmed.length === 0) {
    return json({ error: 'No valid user/assistant messages.' }, 400);
  }

  const model = env.CHAT_MODEL || DEFAULT_MODEL;
  const system = SYSTEM_PROMPT({
    pages: siteContent.pageCount,
    indexedAt: siteContent.indexedAt,
  });

  const upstream = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
      'HTTP-Referer': 'https://globalion-preview.regiq.in',
      'X-Title': 'Globalion UAT chatbot',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'system', content: system }, ...trimmed],
      temperature: 0.3,
      max_tokens: 800,
    }),
  });

  if (!upstream.ok) {
    const text = await upstream.text().catch(() => '');
    return json(
      {
        error: `OpenRouter returned HTTP ${upstream.status}. ${text.slice(0, 300)}`,
      },
      502,
    );
  }
  const data = await upstream.json();
  const reply = data?.choices?.[0]?.message?.content?.trim();
  if (!reply) {
    return json({ error: 'Model returned an empty response.' }, 502);
  }
  return json({ reply, model });
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
