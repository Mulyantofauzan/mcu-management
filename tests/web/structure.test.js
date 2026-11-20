'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const src = path.resolve(__dirname, '../../web/src');
const MAX_LINES = 250;

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry =>
    entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);
}

test(`no web source file exceeds ${MAX_LINES} lines`, () => {
  const tooLong = walk(src)
    .filter(file => /\.(js|svelte|css)$/.test(file) && !file.endsWith('icons.js'))
    .map(file => ({ file: path.relative(src, file), lines: fs.readFileSync(file, 'utf8').split('\n').length }))
    .filter(entry => entry.lines > MAX_LINES);
  assert.deepEqual(tooLong, []);
});

test('web sources use no external hosts (CSP allows self only)', () => {
  walk(src).filter(file => /\.(js|svelte|css)$/.test(file)).forEach(file => {
    assert.doesNotMatch(fs.readFileSync(file, 'utf8'), /fonts\.googleapis|fonts\.gstatic|cdn\.jsdelivr|unpkg\.com|cdnjs/, file);
  });
});

test('every route key is known to roleAccess or is public', async () => {
  const { pathToFileURL } = require('node:url');
  const { PAGE_ROLES } = await import(pathToFileURL(path.join(src, 'lib/roleAccess.js')).href);
  const routesSource = fs.readFileSync(path.join(src, 'routes.js'), 'utf8');
  const keys = [...routesSource.matchAll(/key: '([^']+)'(?:, public: true)?/g)].map(m => m[1]);
  keys.filter(key => !['login', 'not-found'].includes(key)).forEach(key => assert.ok(PAGE_ROLES[key], `unknown page key ${key}`));
});
