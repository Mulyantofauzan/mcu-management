'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const app = path.join(root, 'mcu-management');
const read = rel => fs.readFileSync(path.join(app, rel), 'utf8');
const pages = ['index.html', ...fs.readdirSync(path.join(app, 'pages')).filter(n => n.endsWith('.html') && !n.startsWith('test-')).map(n => `pages/${n}`)];

test('every page loads sehatra.css after output.css', () => {
  pages.forEach(page => {
    const html = read(page);
    const prefix = page === 'index.html' ? '' : '../';
    const out = html.indexOf(`${prefix}css/output.css`);
    const skin = html.indexOf(`${prefix}css/sehatra.css`);
    assert.ok(out >= 0 && skin > out, `${page}: sehatra.css must come after output.css`);
  });
});

test('Plus Jakarta Sans is self-hosted and Tailwind uses the teal palette', () => {
  assert.ok(fs.existsSync(path.join(app, 'assets/fonts/plus-jakarta-sans-latin-wght-normal.woff2')));
  assert.ok(fs.existsSync(path.join(app, 'assets/fonts/PlusJakartaSans-OFL.txt')));
  const skin = read('css/sehatra.css');
  assert.match(skin, /@font-face[\s\S]*Plus Jakarta Sans[\s\S]*plus-jakarta-sans-latin-wght-normal\.woff2/);
  assert.doesNotMatch(skin, /https?:\/\//);
  const config = read('tailwind.config.js');
  assert.match(config, /600: '#0e8576'/);
  assert.match(config, /'Plus Jakarta Sans'/);
  const built = read('css/output.css');
  assert.match(built, /#0e8576/i);
  assert.match(built, /\.bg-primary-600\{[^}]*rgb\(14 133 118/i, 'primary-600 must be the teal accent');
  assert.doesNotMatch(built, /\.bg-primary-600\{[^}]*rgb\(37 99 235/i);
});

test('menu can be hidden and shown and the choice is remembered', () => {
  const js = read('js/sidebar-manager.js');
  assert.match(js, /sidebar-collapse-toggle/);
  assert.match(js, /sehatra-side/);
  assert.match(js, /try \{[\s\S]*localStorage\.setItem\(SIDE_KEY/);
  const css = read('css/sehatra.css');
  assert.match(css, /html\[data-side="collapsed"\] \.sidebar/);
  assert.match(css, /html\[data-side="collapsed"\] body > \.ml-64\s*{\s*margin-left:\s*0/);
});

test('menu groups follow Sehatra and role pages are unchanged', () => {
  const js = read('js/sidebar-manager.js');
  ['Utama', 'Data', 'Analisis', 'Pengaturan'].forEach(label => assert.match(js, new RegExp(`section: '${label}'`)));
  const petugas = js.slice(js.indexOf('Petugas: ['));
  ['kelola-user', 'activity-log', 'data-terhapus'].forEach(key => assert.doesNotMatch(petugas, new RegExp(`page: '${key}'`)));
  const admin = js.slice(js.indexOf('Admin: ['), js.indexOf('Petugas: ['));
  ['dashboard', 'kelola-karyawan', 'tambah-karyawan', 'follow-up', 'mcu-expiry-management', 'data-master', 'kelola-user', 'activity-log', 'data-terhapus'].forEach(key =>
    assert.match(admin, new RegExp(`page: '${key}'`), `Admin menu lost ${key}`));
  assert.match(admin, /group: 'reports'/);
});

test('dark theme remaps the neutrals pages already use', () => {
  const css = read('css/sehatra.css');
  ['.bg-white', '.bg-gray-50', '.text-gray-900', '.text-gray-500', '.border-gray-200', 'input'].forEach(sel =>
    assert.ok(css.includes(`html.dark ${sel}`), `missing dark rule for ${sel}`));
});
