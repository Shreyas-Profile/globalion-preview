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

// -- 2. Inject widget script into every HTML file -----------------------
let injected = 0;
for (const file of htmlFiles) {
  const html = fs.readFileSync(file, 'utf8');
  if (html.includes(WIDGET_TAG)) continue;
  if (!html.includes('</body>')) continue;
  const patched = html.replace('</body>', `${WIDGET_TAG}\n</body>`);
  fs.writeFileSync(file, patched);
  injected++;
}
console.log(`Injected widget into ${injected} HTML files.`);
