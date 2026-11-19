const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { ROOT, listPages, read } = require('./_lib');
const { NAV, pageHref } = require(path.resolve(__dirname, '../../design/sehatra/shell.js'));

const rolesUrl = pathToFileURL(path.resolve(__dirname, '../../mcu-management/js/utils/roleAccess.mjs')).href;

test('all fourteen pages exist: login plus every key in PAGE_ROLES', async () => {
  const { PAGE_ROLES } = await import(rolesUrl);
  const expected = ['login', ...Object.keys(PAGE_ROLES)];
  assert.equal(expected.length, 14);
  for (const key of expected) {
    assert.ok(fs.existsSync(path.join(ROOT, `${key}.html`)), `missing design/sehatra/${key}.html`);
  }
});

test('every menu link produced by the shell points to an existing page', () => {
  for (const group of NAV) {
    for (const item of group.items) {
      assert.ok(fs.existsSync(path.join(ROOT, pageHref(item.key))), `menu target ${pageHref(item.key)} is missing`);
    }
  }
});

test('every internal page link in every template points to an existing file', () => {
  for (const file of listPages()) {
    for (const [, href] of read(file).matchAll(/href="([^"#?:]+\.html)(?:[?#][^"]*)?"/g)) {
      assert.ok(fs.existsSync(path.join(ROOT, href)), `${file} links to missing ${href}`);
    }
  }
});

test('index.html links to all fourteen pages', async () => {
  const { PAGE_ROLES } = await import(rolesUrl);
  const index = read('index.html');
  for (const key of ['login', ...Object.keys(PAGE_ROLES)]) {
    assert.match(index, new RegExp(`href="${key}\\.html"`), `index.html does not link ${key}.html`);
  }
});
