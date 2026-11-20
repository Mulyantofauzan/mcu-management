'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const load = rel => import(pathToFileURL(path.resolve(__dirname, '../../web/src', rel)).href);
const emp = (id, extra = {}) => ({ employeeId: id, name: `Nama ${id}`, jobTitle: 'Staf', department: 'Produksi', employeeType: 'Karyawan PST', isActive: true, ...extra });

test('list: search matches name, ID and job title; filters combine', async () => {
  const { filterEmployees, paginate } = await load('pages/kelola-karyawan/list.js');
  const all = [emp('KRY-1', { name: 'Budi Santoso' }), emp('KRY-2', { jobTitle: 'Akuntan', department: 'Keuangan' }), emp('KRY-3', { isActive: false, employeeType: 'Vendor' })];
  assert.deepEqual(filterEmployees(all, { q: 'budi' }).map(e => e.employeeId), ['KRY-1']);
  assert.deepEqual(filterEmployees(all, { q: 'kry-2' }).map(e => e.employeeId), ['KRY-2']);
  assert.deepEqual(filterEmployees(all, { q: 'akunt' }).map(e => e.employeeId), ['KRY-2']);
  assert.deepEqual(filterEmployees(all, { department: 'Keuangan' }).map(e => e.employeeId), ['KRY-2']);
  assert.deepEqual(filterEmployees(all, { active: 'Inactive' }).map(e => e.employeeId), ['KRY-3']);
  assert.deepEqual(filterEmployees(all, { active: 'Active' }).map(e => e.employeeId), ['KRY-1', 'KRY-2']);
  assert.deepEqual(filterEmployees(all, { type: 'Vendor' }).map(e => e.employeeId), ['KRY-3']);
  assert.equal(filterEmployees(all, {}).length, 3);
  const many = Array.from({ length: 25 }, (_, i) => emp(`K${i}`));
  assert.equal(paginate(many, 1).items.length, 10);
  assert.equal(paginate(many, 3).items.length, 5);
  assert.equal(paginate(many, 99).page, 3);
  assert.equal(paginate([], 1).pages, 1);
});

test('validateEmployeeForm keeps the old rules and messages', async () => {
  const { validateEmployeeForm } = await load('lib/validation.js');
  const today = new Date('2026-11-20');
  const ok = { name: 'Budi Santoso', jobTitle: 'Staf', department: 'IT', birthDate: '1990-01-01', bloodType: 'O+', gender: 'Laki-laki', employeeType: 'Karyawan PST', isActive: true };
  assert.equal(validateEmployeeForm(ok, today).isValid, true);
  assert.deepEqual(validateEmployeeForm({ ...ok, name: 'ab' }, today).errors, ['Nama lengkap minimal 3 karakter']);
  assert.deepEqual(validateEmployeeForm({ ...ok, name: '  ' }, today).errors, ['Nama lengkap harus diisi']);
  assert.ok(validateEmployeeForm({ ...ok, birthDate: '2027-01-01' }, today).errors.includes('Tanggal lahir tidak boleh di masa depan'));
  assert.ok(validateEmployeeForm({ ...ok, birthDate: '2015-01-01' }, today).errors.includes('Karyawan minimal berusia 16 tahun'));
  assert.deepEqual(validateEmployeeForm({ ...ok, employeeType: 'Vendor', vendorName: ' ' }, today).errors, ['Nama vendor harus diisi untuk status Vendor']);
  assert.deepEqual(validateEmployeeForm({ ...ok, isActive: false, inactiveReason: '' }, today).errors, ['Alasan tidak aktif harus diisi untuk status Inactive']);
  assert.equal(validateEmployeeForm({ ...ok, isActive: false, inactiveReason: 'Pensiun' }, today).isValid, true);
  assert.equal(validateEmployeeForm({}, today).errors.length, 8);
});

test('toEmployeeRow maps the form to database columns', async () => {
  const { toEmployeeRow } = await load('data/employees.js');
  const row = toEmployeeRow({ name: 'A', gender: 'Perempuan', jobTitle: 'Staf', department: 'IT', birthDate: '1990-01-01', bloodType: 'O+', employeeType: 'Vendor', vendorName: 'PT X', isActive: false, inactiveReason: 'Pensiun' });
  assert.equal(row.jenis_kelamin, 'Perempuan');
  assert.equal(row.job_title, 'Staf');
  assert.equal(row.vendor_name, 'PT X');
  assert.equal(row.is_active, false);
  assert.equal(row.inactive_reason, 'Pensiun');
  assert.ok(row.updated_at);
  assert.equal(toEmployeeRow({ isActive: true, inactiveReason: 'sisa' }).inactive_reason, null);
});

test('csv: quotes commas, quotes and newlines and starts with a BOM', async () => {
  const { toCsv } = await load('lib/csv.js');
  const text = toCsv([{ A: 'x,y', B: 'say "hi"', C: 'a\nb', D: null }]);
  assert.equal(text.charCodeAt(0), 0xfeff);
  assert.equal(text.slice(1), 'A,B,C,D\n"x,y","say ""hi""","a\nb",');
  assert.equal(toCsv([]), '');
});

test('status: final result wins, unknown results get the neutral pill', async () => {
  const { resultOf, pillClass } = await load('lib/status.js');
  assert.equal(resultOf({ initialResult: 'Follow-Up', finalResult: 'Fit' }), 'Fit');
  assert.equal(resultOf({ initialResult: 'Unfit' }), 'Unfit');
  assert.equal(resultOf(null), '');
  assert.equal(pillClass('Fit With Note'), 's-note');
  assert.equal(pillClass('???'), 's-none');
});

test('calculateAge handles birthdays and bad input', async () => {
  const { calculateAge } = await load('lib/people.js');
  assert.equal(calculateAge('2000-11-21', new Date('2026-11-20')), 25);
  assert.equal(calculateAge('2000-11-20', new Date('2026-11-20')), 26);
  assert.equal(calculateAge(null), null);
  assert.equal(calculateAge('bukan tanggal'), null);
});
