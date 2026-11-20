'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const load = rel => import(pathToFileURL(path.resolve(__dirname, '../../web/src', rel)).href);

test('password rules match the old page and the API limits', async () => {
  const { validatePassword } = await load('lib/userValidation.js');
  assert.equal(validatePassword('abcdef', 'abcdef'), '');
  assert.equal(validatePassword('abcdef', 'abcdeg'), 'Password dan konfirmasi password tidak sama');
  assert.equal(validatePassword('abc', 'abc'), 'Password minimal 6 karakter');
  assert.equal(validatePassword('x'.repeat(73), 'x'.repeat(73)), 'Password maksimal 72 karakter');
  assert.equal(validatePassword('x'.repeat(72), 'x'.repeat(72)), '');
});

test('new and edit user validation', async () => {
  const { validateNewUser, validateEditUser } = await load('lib/userValidation.js');
  const ok = { username: 'ani', displayName: 'Ani', role: 'Petugas', password: 'rahasia1', confirm: 'rahasia1' };
  assert.equal(validateNewUser(ok).isValid, true);
  assert.deepEqual(validateNewUser({ ...ok, username: ' ' }).errors, ['Username wajib diisi']);
  assert.deepEqual(validateNewUser({ ...ok, role: 'Dokter' }).errors, ['Role harus dipilih']);
  assert.equal(validateNewUser({}).errors.length, 4);
  assert.equal(validateEditUser({ username: 'a', displayName: 'A', role: 'Admin' }).isValid, true);
  assert.deepEqual(validateEditUser({ username: 'a', displayName: '', role: 'Admin' }).errors, ['Nama lengkap wajib diisi']);
});
