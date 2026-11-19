const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const { NAV, ICONS, pageHref, renderShell } = require(path.resolve(__dirname, '../../design/sehatra/shell.js'));
const rolesUrl = pathToFileURL(path.resolve(__dirname, '../../mcu-management/js/utils/roleAccess.mjs')).href;

const user = { name: 'dr. Anindya Larasati', title: 'Dokter perusahaan' };
const keys = group => group.items.map(item => item.key);

test('every page key in PAGE_ROLES appears exactly once in NAV and nothing else does', async () => {
  const { PAGE_ROLES } = await import(rolesUrl);
  const navKeys = NAV.flatMap(keys).sort();
  assert.deepEqual(navKeys, Object.keys(PAGE_ROLES).sort());
});

test('adminOnly groups hold exactly the Admin-only pages', async () => {
  const { PAGE_ROLES } = await import(rolesUrl);
  for (const group of NAV) {
    for (const key of keys(group)) {
      const adminOnly = PAGE_ROLES[key].length === 1 && PAGE_ROLES[key][0] === 'Admin';
      assert.equal(Boolean(group.adminOnly), adminOnly, `${key} in group ${group.label}`);
    }
  }
});

test('pageHref maps a key to its html file', () => {
  assert.equal(pageHref('follow-up'), 'follow-up.html');
  assert.equal(pageHref('dashboard'), 'dashboard.html');
});

test('Petugas sees no Admin-only link, Admin sees it', () => {
  const petugas = renderShell({ page: 'follow-up', role: 'Petugas', user }).sidebar;
  const admin = renderShell({ page: 'follow-up', role: 'Admin', user }).sidebar;
  assert.doesNotMatch(petugas, /kelola-user\.html/);
  assert.match(admin, /kelola-user\.html/);
});

test('the active page is marked with aria-current exactly once', () => {
  const html = renderShell({ page: 'follow-up', role: 'Admin', user }).sidebar;
  assert.equal((html.match(/aria-current="page"/g) || []).length, 1);
  assert.match(html, /<a [^>]*href="follow-up\.html"[^>]*aria-current="page"|<a [^>]*aria-current="page"[^>]*href="follow-up\.html"/);
});

test('sprite defines a symbol for every icon', () => {
  const { sprite } = renderShell({ page: 'dashboard', role: 'Admin', user });
  for (const name of Object.keys(ICONS)) {
    assert.match(sprite, new RegExp(`id="i-${name}"`), `icon ${name}`);
  }
});

test('shell shows the cycle widget labelled as sample and names the product', () => {
  const { sidebar } = renderShell({ page: 'dashboard', role: 'Admin', user });
  assert.match(sidebar, /Cakupan MCU 2026/);
  assert.match(sidebar, /sample-note/);
  assert.match(sidebar, /Sehatra/);
});

test('topbar shows the user and shell output has no em dash', () => {
  const out = renderShell({ page: 'dashboard', role: 'Admin', user });
  assert.match(out.topbar, /dr\. Anindya Larasati/);
  assert.match(out.topbar, />AL</);
  assert.doesNotMatch(out.sidebar + out.topbar + out.sprite, /—/);
});
