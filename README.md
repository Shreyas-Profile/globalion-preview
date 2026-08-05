# Globalion UAT preview

Static mirror of [globalion.in](https://globalion.in) with a GPT-5 mini chatbot
bolted on. **Not the live site.** Meant as a UAT sandbox — Shreyas edits, Pawan
reviews at the preview URL, then Pawan applies the changes to the real repo.

## Layout

- `*.html`, `about/`, `ai-products/`, `insights/`, `services/`, … — the mirrored pages
- `_assistant/widget.js` — floating chatbot widget (bottom-right on every page)
- `functions/api/chat.js` — Cloudflare Pages Function that calls OpenRouter
- `assistant-content.json` — indexed site text, imported by the chat function
- `build-assistant.mjs` — regenerates `assistant-content.json` and re-injects the
  widget tag into every HTML file. Run whenever pages are edited/added.

## Editing

Change any HTML file → push → Cloudflare Pages redeploys → done.

If you edit copy in the pages, rerun the indexer so the chatbot has the fresh
content:

```bash
npm install
npm run build
git add . && git commit -m "content: <what changed>"
git push
```

## Cloudflare Pages env vars

- `OPENROUTER_API_KEY` — shared Globalion OpenRouter key (must be set for the
  chat function to work; without it the widget returns a 500)
- `CHAT_MODEL` — optional, defaults to `openai/gpt-5-mini`

## Deploy target

`globalion-preview.regiq.in` (Cloudflare Pages custom domain, DNS in Pawan's
Cloudflare account).
