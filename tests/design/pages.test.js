const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { listPages, read } = require('./_lib');
const { NAV } = require(path.resolve(__dirname, '../../design/sehatra/shell.js'));

const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
const STATUSES = ['Fit', 'Fit With Note', 'Temporary Unfit', 'Follow-Up', 'Unfit', 'Belum ada MCU'];
const PAGE_KEYS = new Set([...NAV.flatMap(g => g.items.map(i => i.key)), 'login', 'index']);
const NO_SHELL = new Set(['login.html', 'index.html']);
const NO_DATA_PAGE = new Set(['login.html', 'index.html', '_template.html']);
const NO_SAMPLE = new Set(['login.html', '_template.html']);
const BUTTON_ATTRS = ['data-open', 'data-close', 'data-toggle', 'data-tab', 'data-state-set', 'data-demo', 'data-theme-toggle', 'data-menu-toggle'];

function blank(match) { return ' '.repeat(match.length); }

function parse(html) {
  const clean = html
    .replace(/<!--[\s\S]*?-->/g, blank)
    .replace(/<script\b[\s\S]*?<\/script>/gi, blank)
    .replace(/<style\b[\s\S]*?<\/style>/gi, blank);
  const re = /<(\/?)([a-zA-Z][\w-]*)((?:"[^"]*"|'[^']*'|[^'">])*)>/g;
  const stack = [];
  const elements = [];
  let m;
  while ((m = re.exec(clean))) {
    const [full, closing, rawTag, attrs] = m;
    const tag = rawTag.toLowerCase();
    if (closing) {
      for (let i = stack.length - 1; i >= 0; i--) {
        if (stack[i].tag === tag) {
          stack[i].end = m.index + full.length;
          stack.length = i;
          break;
        }
      }
      continue;
    }
    const el = { tag, attrs, start: m.index, openEnd: m.index + full.length, end: m.index + full.length, ancestors: stack.map(s => s.attrs) };
    elements.push(el);
    if (!VOID.has(tag) && !/\/\s*$/.test(attrs)) stack.push(el);
  }
  return { clean, elements };
}

const attr = (el, name) => (el.attrs.match(new RegExp(`(?:^|\\s)${name}="([^"]*)"`)) || [])[1];
const has = (el, name) => new RegExp(`(?:^|\\s)${name}(?:\\s|=|$)`).test(el.attrs);
const hasClass = (attrs, cls) => new RegExp(`class="[^"]*\\b${cls}\\b[^"]*"`).test(attrs);
const inner = (parsed, el) => parsed.clean.slice(el.openEnd, el.end);
const text = (parsed, el) => inner(parsed, el).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

const pages = listPages();

test('the page template exists', () => {
  assert.ok(pages.includes('_template.html'), 'design/sehatra/_template.html is missing');
});

for (const file of pages) {
  const html = read(file);
  const parsed = parse(html);
  const els = parsed.elements;
  const head = (html.match(/<head>[\s\S]*?<\/head>/i) || [''])[0];

  test(`${file}: head has lang, viewport, Sehatra title, stylesheet and blocking theme script`, () => {
    assert.match(html, /<html lang="id">/);
    assert.match(head, /<meta name="viewport"/);
    assert.match(head, /<title>[^<]+ - Sehatra<\/title>/);
    assert.match(head, /<link rel="stylesheet" href="sehatra\.css">/);
    assert.match(head, /<script src="theme-init\.js"><\/script>/);
  });

  test(`${file}: has skip link, main landmark and shell mounts`, () => {
    assert.ok(els.some(e => e.tag === 'a' && hasClass(e.attrs, 'skip') && attr(e, 'href') === '#main'), 'skip link');
    assert.ok(els.some(e => e.tag === 'main' && attr(e, 'id') === 'main'), 'main#main');
    if (!NO_SHELL.has(file)) {
      assert.ok(els.some(e => attr(e, 'id') === 'shell-side'), '#shell-side');
      assert.ok(els.some(e => attr(e, 'id') === 'shell-top'), '#shell-top');
    }
    if (!NO_DATA_PAGE.has(file)) {
      const body = els.find(e => e.tag === 'body');
      assert.equal(attr(body, 'data-page'), file.replace(/\.html$/, ''));
    }
  });

  test(`${file}: every table is inside .tbl-wrap and every clickable row is focusable`, () => {
    for (const t of els.filter(e => e.tag === 'table')) {
      assert.ok(t.ancestors.some(a => hasClass(a, 'tbl-wrap')), 'table outside .tbl-wrap');
    }
    for (const tr of els.filter(e => e.tag === 'tr' && hasClass(e.attrs, 'row'))) {
      assert.equal(attr(tr, 'tabindex'), '0', 'tr.row without tabindex="0"');
    }
  });

  test(`${file}: no dead controls (buttons, forms, empty links)`, () => {
    for (const b of els.filter(e => e.tag === 'button')) {
      const ok = attr(b, 'type') === 'submit' || BUTTON_ATTRS.some(a => has(b, a));
      assert.ok(ok, `dead button: <button${b.attrs}>`);
    }
    for (const f of els.filter(e => e.tag === 'form')) assert.ok(has(f, 'data-demo-submit'), 'form without data-demo-submit');
    for (const s of els.filter(e => e.tag === 'select')) {
      const inDemoForm = s.ancestors.some(a => /(?:^|\s)data-demo-submit(?:\s|=|$)/.test(a));
      assert.ok(inDemoForm || has(s, 'data-demo'), `select without behaviour: <select${s.attrs}>`);
    }
    assert.doesNotMatch(parsed.clean, /href="#"/);
  });

  test(`${file}: dialogs are wired (targets exist, labelled, closable)`, () => {
    const ids = new Set(els.map(e => attr(e, 'id')).filter(Boolean));
    for (const e of els.filter(x => has(x, 'data-open'))) {
      const target = attr(e, 'data-open');
      assert.ok(target.startsWith('#') && ids.has(target.slice(1)), `data-open target ${target}`);
    }
    for (const e of els.filter(x => has(x, 'data-toggle'))) {
      const target = attr(e, 'data-toggle');
      assert.ok(target.startsWith('#') && ids.has(target.slice(1)), `data-toggle target ${target}`);
    }
    for (const s of els.filter(x => has(x, 'data-reveal'))) {
      const target = attr(s, 'data-reveal');
      assert.ok(target.startsWith('#') && ids.has(target.slice(1)), `data-reveal target ${target}`);
      assert.ok(attr(s, 'data-reveal-when'), 'data-reveal without data-reveal-when');
    }
    for (const a of els.filter(x => x.tag === 'a' && /^#.+/.test(attr(x, 'href') || ''))) {
      assert.ok(ids.has(attr(a, 'href').slice(1)), `anchor ${attr(a, 'href')} has no target`);
    }
    for (const d of els.filter(x => attr(x, 'role') === 'dialog')) {
      assert.ok(ids.has(attr(d, 'aria-labelledby')), 'dialog aria-labelledby');
      assert.ok(els.some(x => has(x, 'data-close') && x.start > d.start && x.start < d.end), 'dialog without [data-close]');
    }
  });

  test(`${file}: data containers have loading, empty and error states`, () => {
    for (const s of els.filter(e => has(e, 'data-states'))) {
      const body = inner(parsed, s);
      for (const state of ['loading', 'empty', 'error']) {
        assert.match(body, new RegExp(`data-state="${state}"`), `missing ${state} state`);
      }
    }
  });

  test(`${file}: status pills use only the app vocabulary`, () => {
    for (const p of els.filter(e => has(e, 'data-status'))) {
      const value = attr(p, 'data-status');
      assert.ok(STATUSES.includes(value), `status "${value}" is not an app status`);
      assert.equal(text(parsed, p), value);
    }
    assert.doesNotMatch(html, /Fit dengan pembatasan/);
  });

  test(`${file}: no em dash, one leading Sumber comment, sample data is labelled`, () => {
    assert.doesNotMatch(html, /—/);
    assert.match(html, /^\s*<!doctype html>\s*<!--[\s\S]*?Sumber:[\s\S]*?-->/i);
    assert.equal((html.match(/<!--[\s\S]*?-->/g) || []).filter(c => c.includes('Sumber:')).length, 1);
    if (!NO_SAMPLE.has(file)) assert.ok(els.some(e => hasClass(e.attrs, 'sample-note')), 'no .sample-note');
  });

  test(`${file}: internal page links point to known pages`, () => {
    for (const [, href] of html.matchAll(/href="([^"#?:]+)\.html(?:[?#][^"]*)?"/g)) {
      assert.ok(PAGE_KEYS.has(href), `unknown page link ${href}.html`);
    }
  });
}

test('sehatra.css keeps focus indicators and responsive/motion rules', () => {
  const css = read('sehatra.css');
  assert.doesNotMatch(css, /outline\s*:\s*none/);
  const allowed = new Set(['.search input', '.field:focus']);
  for (const [, selector] of css.matchAll(/([^{}]+)\{[^{}]*outline\s*:\s*0\b[^{}]*\}/g)) {
    assert.ok(allowed.has(selector.trim()), `outline:0 on ${selector.trim()}`);
  }
  assert.match(css, /max-width:900px/);
  assert.match(css, /max-width:520px/);
  assert.match(css, /prefers-reduced-motion/);
});
