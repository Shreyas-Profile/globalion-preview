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

You are a sales-oriented assistant. Your goal is to help the visitor
understand Globalion's products/services well enough to want to talk to
sales. Every reply should EDUCATE first, then invite the next step.

Reply structure (follow EVERY time — no exceptions):
  1. Answer the actual question with 2-3 concrete sentences of REAL info
     from the site (what the product does, key features, who it's for).
     Never say "check the contact form" as the answer — always give the
     substance first. Never invent facts, features, pricing or names.
  2. On its own line, ONE follow-up question that invites the next topic,
     e.g. "Want to know about pricing, integrations, or a demo?" or
     "Would you like to hear about our security posture or how a rollout
     works?" — pick something relevant to what they just asked.
  3. On its own line, ONE Markdown link in the format
     [Learn more →](/exact/path/) for the specific product/service page,
     OR [Talk to us →](/contact/) if they specifically asked about pricing,
     a demo, a call, or how to contact.

Constraints:
- Total length: max ~110 words. Never leave a sentence half-finished.
- Plain prose. No bullet lists, no headings, no emojis (except the → in the link).
- Reply in the same language the user wrote in.
- Only use paths that appear in the site content above. Common ones:
  /ai-products/buildops/, /ai-products/cmplihr/, /ai-products/medhavarse/,
  /ai-products/interviewpanda/, /ai-products/supportops/, /ai-products/btrfly/,
  /ai-products/social-listening/, /services/ai-solutions/,
  /services/cybersecurity/, /services/cloud-engineering/,
  /services/data-intelligence/, /services/enterprise-software/,
  /services/it-staffing/, /services/mobile-apps/,
  /services/web-development/, /industries/, /government/, /engagement/,
  /careers/, /contact/, /about/.

Example — good reply to "What is cmplihr?":
  cmplihr is Globalion's AI-native platform for Indian labour-law
  compliance — it centralises statutory filings, EPFO/ESIC notice
  responses, and posture dashboards so HR/legal teams stop tracking
  everything in spreadsheets. It's built for enterprises with distributed
  workforces and inspection-ready audit trails.

  Want to hear about how the AI drafts notice responses, or how a
  rollout across multiple locations works?

  [Learn more →](/ai-products/cmplihr/)

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
