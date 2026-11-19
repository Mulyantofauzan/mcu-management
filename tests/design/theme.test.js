const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { STORAGE_KEY, readStored, resolveTheme } = require(path.resolve(__dirname, '../../design/sehatra/theme-init.js'));

test('storage key is sehatra-theme', () => {
  assert.equal(STORAGE_KEY, 'sehatra-theme');
});

test('a stored theme wins over the system preference', () => {
  assert.equal(resolveTheme('dark', false), 'dark');
  assert.equal(resolveTheme('light', true), 'light');
});

test('without a stored theme the system preference decides', () => {
  assert.equal(resolveTheme(null, true), 'dark');
  assert.equal(resolveTheme(null, false), 'light');
});

test('an unknown stored value falls back to the system preference', () => {
  assert.equal(resolveTheme('rusak', true), 'dark');
  assert.equal(resolveTheme('rusak', false), 'light');
});

test('blocked localStorage never throws and reads as null', () => {
  assert.equal(readStored({ getItem() { throw new Error('blocked'); } }), null);
  assert.equal(readStored(undefined), null);
});

test('readStored accepts only light or dark', () => {
  assert.equal(readStored({ getItem: () => 'dark' }), 'dark');
  assert.equal(readStored({ getItem: () => 'neon' }), null);
});
