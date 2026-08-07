// Two jobs, run at repo-prep time (not at Cloudflare Pages build time):
//   1. Walk all HTML files under the repo root, extract clean text with cheerio,
//      write a single assistant-content.json the chat function imports.
//   2. Inject the chat widget <script> tag before </body> in every HTML file
//      that doesn't already have it.
//
// Idempotent — safe to re-run after adding new pages.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { load } from 'cheerio';

const REPO = process.cwd();
const CONTENT_PATH = path.join(REPO, 'assistant-content.json');

// Version each injected asset by the hash of its source so browsers
// don't serve stale copies from the 4h Cloudflare cache after edits.
function hashOf(relPath) {
  const src = fs.readFileSync(path.join(REPO, relPath), 'utf8');
  return crypto.createHash('sha1').update(src).digest('hex').slice(0, 8);
}
const widgetVer = hashOf('_assistant/widget.js');
const enhanceCssVer = hashOf('_assistant/enhance.css');
const enhanceJsVer = hashOf('_assistant/enhance.js');
const WIDGET_TAG = `<script src="/_assistant/widget.js?v=${widgetVer}" defer></script>`;
const ENHANCE_CSS_TAG = `<link rel="stylesheet" href="/_assistant/enhance.css?v=${enhanceCssVer}">`;
const ENHANCE_JS_TAG = `<script src="/_assistant/enhance.js?v=${enhanceJsVer}" defer></script>`;
console.log(`Versions — widget: ${widgetVer} · enhance.css: ${enhanceCssVer} · enhance.js: ${enhanceJsVer}`);

function walkHtml(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    if (name.startsWith('.') || name === 'node_modules' || name === '_assistant' || name === 'functions') continue;
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) walkHtml(full, out);
    else if (name.endsWith('.html')) out.push(full);
  }
  return out;
}

const htmlFiles = walkHtml(REPO);
console.log(`Found ${htmlFiles.length} HTML files.`);

// -- 1. Extract text content for the chat context ------------------------
const pages = [];
for (const file of htmlFiles) {
  const html = fs.readFileSync(file, 'utf8');
  const $ = load(html);
  // Strip nav/footer/script/style — they add noise, not answers
  $('script, style, noscript, header nav, footer').remove();
  const title = $('title').text().trim() || $('h1').first().text().trim() || 'Untitled';
  const text = $('body').text().replace(/\s+/g, ' ').trim();
  const relPath = path.relative(REPO, file).replace(/\\/g, '/').replace(/index\.html$/, '');
  const url = `/${relPath}`.replace(/\/\/+/g, '/');
  pages.push({ url, title, text });
}

// Assemble a COMPRESSED page index for the chat system prompt. Full 91KB
// site text was slowing every request to 10+s (22K input tokens) and
// causing responses to cut off before the link. New format per page:
// URL, title, and ~500 chars of the most information-dense text (skips
// nav boilerplate). Total ~15KB, ~4K tokens.
const summarise = (text) => {
  // Take first non-nav paragraph-ish chunk. Drop everything up to the
  // first "real sentence" (contains a lowercase letter and a period).
  const trimmed = text.replace(/^([A-Z][^.]{0,30}\s+){2,}/g, '').trim();
  return trimmed.slice(0, 520).replace(/\s+\S+$/, '') + (trimmed.length > 520 ? '…' : '');
};
const content = pages
  .map((p) => `## ${p.title}\n${p.url}\n${summarise(p.text)}`)
  .join('\n\n---\n\n');

const snapshot = {
  indexedAt: new Date().toISOString().slice(0, 10),
  pageCount: pages.length,
  totalChars: content.length,
  content,
};
fs.writeFileSync(CONTENT_PATH, JSON.stringify(snapshot, null, 0));
console.log(`Wrote ${CONTENT_PATH} — ${pages.length} pages, ${(content.length / 1024).toFixed(1)} KB text (compressed).`);

// -- 2. Strip Next.js hydration scripts + inject widget ------------------
// The mirror was pulled from a live Next.js site. Its client-side scripts
// try to hydrate and fetch server data (RSC endpoints, _next/data JSON) that
// don't exist on our static Pages deploy, and blow up with a "This page
// couldn't load" error boundary. We keep the CSS (it references classes
// baked into the mirrored HTML) but drop every JS chunk.

let injected = 0;
for (const file of htmlFiles) {
  let html = fs.readFileSync(file, 'utf8');
  const $ = load(html);

  // Remove Next.js JS chunks and preload hints for JS.
  // Note: src is relative ("_next/..."), so match without the leading slash.
  $('script[src*="_next/"]').remove();
  $('link[rel="preload"][as="script"]').remove();
  $('link[rel="modulepreload"]').remove();
  // Remove the __NEXT_DATA__ JSON blob and the runtime bootstrap script
  $('script#__NEXT_DATA__').remove();
  $('script').each((_, el) => {
    const text = $(el).html() || '';
    if (text.includes('self.__next_f') || text.includes('__NEXT_DATA__')) {
      $(el).remove();
    }
  });

  html = $.html();

  // Remove any older widget/enhance tags (previous hashes) before
  // injecting the current ones — otherwise we'd stack stale copies.
  html = html.replace(/<script[^>]*_assistant\/(widget|enhance)\.js[^>]*><\/script>\s*/g, '');
  html = html.replace(/<link[^>]*_assistant\/enhance\.css[^>]*>\s*/g, '');

  // enhance.css goes in <head> right before </head> so it cascades over
  // the site's own CSS (still deferred by being late in <head>).
  if (html.includes('</head>')) {
    html = html.replace('</head>', `${ENHANCE_CSS_TAG}\n</head>`);
  }
  // enhance.js + widget.js at end of <body>
  if (html.includes('</body>')) {
    html = html.replace(
      '</body>',
      `${ENHANCE_JS_TAG}\n${WIDGET_TAG}\n</body>`,
    );
    injected++;
  }

  fs.writeFileSync(file, html);
}
console.log(`Stripped Next.js JS and injected widget into ${injected} HTML files.`);
