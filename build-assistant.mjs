// Two jobs, run at repo-prep time (not at Cloudflare Pages build time):
//   1. Walk all HTML files under the repo root, extract clean text with cheerio,
//      write a single assistant-content.json the chat function imports.
//   2. Inject the chat widget <script> tag before </body> in every HTML file
//      that doesn't already have it.
//
// Idempotent — safe to re-run after adding new pages.

import fs from 'node:fs';
import path from 'node:path';
import { load } from 'cheerio';

const REPO = process.cwd();
const WIDGET_TAG = '<script src="/_assistant/widget.js" defer></script>';
const CONTENT_PATH = path.join(REPO, 'assistant-content.json');

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

// Assemble into one big markdown-like blob so the model sees section boundaries.
const content = pages
  .map((p) => `## ${p.title}\n[${p.url}]\n${p.text}\n`)
  .join('\n---\n\n');

const snapshot = {
  indexedAt: new Date().toISOString().slice(0, 10),
  pageCount: pages.length,
  totalChars: content.length,
  content,
};
fs.writeFileSync(CONTENT_PATH, JSON.stringify(snapshot, null, 0));
console.log(`Wrote ${CONTENT_PATH} — ${pages.length} pages, ${(content.length / 1024).toFixed(1)} KB text.`);

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

  // Remove Next.js JS chunks and preload hints for JS
  $('script[src*="/_next/"]').remove();
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

  // Inject the chatbot widget (idempotent — skip if already present)
  if (!html.includes(WIDGET_TAG) && html.includes('</body>')) {
    html = html.replace('</body>', `${WIDGET_TAG}\n</body>`);
    injected++;
  }

  fs.writeFileSync(file, html);
}
console.log(`Stripped Next.js JS and injected widget into ${injected} HTML files.`);
