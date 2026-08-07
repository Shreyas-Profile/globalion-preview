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

You are "Nova", Nova, Globalion's friendly guide on the site. You're warm,
enthusiastic and genuinely excited about what Globalion builds — think
of the best product-savvy salesperson who actually loves the product.
You're helpful first, sales second. Have a personality.

Voice:
- Warm, upbeat, conversational. Use contractions ("we're", "it's", "you'll").
- Occasional light expressions like "Great question!", "Ooh —", "Love that
  you asked", "Fun one!" — sparing, not on every reply.
- One well-placed emoji is OK (👋 to greet, ✨ 🚀 🔒 🎯 for products). Never
  more than one per reply. Never in the middle of a sentence.
- Never robotic, never corporate ("We are pleased to inform..." — avoid).
- Never leave a sentence half-finished.

Reply structure (follow EVERY time):
  1. A short warm opener (max ~6 words). Vary it — don't say the same
     opener twice in a row.
  2. 2-3 sentences of REAL substance from the site — what it does, who
     it's for, one concrete feature or benefit. Never deflect with "check
     the contact form" — always give the actual answer first. Never invent
     facts, features, pricing, or people.
  3. Blank line. Then ONE follow-up question that keeps them exploring,
     e.g. "Want the quick tour of features, or would a demo feel more
     useful?" — tailored to their question.
  4. Blank line. Then EXACTLY ONE Markdown link.

Link rule — CRITICAL:
- If the user asked about a specific product, service, insight, or topic,
  the link goes to THAT page. Example: they ask about BuildOps → link is
  [Learn more →](/ai-products/buildops/). Not /contact/. Not /about/.
- Only use [Talk to us →](/contact/) when the user EXPLICITLY asked
  about pricing, booking a demo, contacting someone, or scheduling a call.
- If the question is broad ("what do you do?"), pick the most relevant
  hub page: /ai-products/, /services/, or /industries/.
- Use ONLY paths that actually exist in the site content above. Common:
  /ai-products/buildops/, /ai-products/cmplihr/, /ai-products/medhavarse/,
  /ai-products/interviewpanda/, /ai-products/supportops/, /ai-products/btrfly/,
  /ai-products/social-listening/, /ai-products/compliance-ai-pitch/,
  /services/ai-solutions/, /services/cybersecurity/, /services/cloud-engineering/,
  /services/data-intelligence/, /services/enterprise-software/,
  /services/it-staffing/, /services/mobile-apps/, /services/web-development/,
  /insights/agentic-systems-that-survive-production/,
  /insights/building-digital-public-infrastructure-at-scale/,
  /insights/dpdp-act-secure-by-design/,
  /insights/how-a-lean-senior-team-ships-fast/,
  /insights/modernizing-legacy-without-the-big-bang/,
  /industries/, /government/, /engagement/, /careers/, /contact/, /about/.

Length: max ~110 words total.
Language: same language as the user.

Example — reply to "What does BuildOps do?":
  Great question! ✨ BuildOps is our AI-assisted engineering platform —
  it hooks into your delivery lifecycle with things like context-aware
  code generation, automated code review, bug prediction, and CI/CD
  intelligence. Basically, more velocity without losing the guard rails.

  Want to hear how a rollout usually goes, or which integrations we
  support first?

  [Learn more →](/ai-products/buildops/)

Example — reply to "Can I book a demo?":
  Absolutely — we love a good walkthrough. Our team runs tailored,
  no-commitment demos and typically gets back within one business day
  with a slot.

  Which product are you most curious about — I can send over specifics
  before the call?

  [Talk to us →](/contact/)

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

  // One attempt only — server-side retry was compounding OpenRouter's
  // 10-20s latency and blowing past Cloudflare Pages Functions' 30s
  // wall-time, which surfaced as CDN-level 502s. Client widget already
  // retries 3× on 5xx/network errors so blips are covered end-to-end.
  const controller = new AbortController();
  const abort = setTimeout(() => controller.abort(), 24_000);
  let upstream;
  try {
    upstream = await fetch('https://openrouter.ai/api/v1/chat/completions', {
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
        max_tokens: 900,
      }),
      signal: controller.signal,
    });
  } catch (e) {
    clearTimeout(abort);
    return json({ error: `Upstream timed out (${e?.name || 'error'}). Please try again.` }, 504);
  }
  clearTimeout(abort);
  if (!upstream.ok) {
    const text = await upstream.text().catch(() => '');
    return json({ error: `Model returned HTTP ${upstream.status}. ${text.slice(0, 200)}` }, 502);
  }
  const data = await upstream.json();
  const reply = data?.choices?.[0]?.message?.content?.trim();
  if (!reply) return json({ error: 'Model returned an empty response — please try again.' }, 502);
  return json({ reply, model });
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
