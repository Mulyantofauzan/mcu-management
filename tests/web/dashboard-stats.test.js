'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const load = rel => import(pathToFileURL(path.resolve(__dirname, '../../web/src', rel)).href);

const emp = (id, extra = {}) => ({ employeeId: id, name: id, isActive: true, deletedAt: null, department: 'Produksi', employeeType: 'Karyawan PST', gender: 'Laki-laki', birthDate: '1990-01-01', bloodType: 'O+', ...extra });
const mcu = (id, extra = {}) => ({ mcuId: id, employeeId: id, mcuDate: '2026-03-10', mcuType: 'Annual', initialResult: 'Fit', finalResult: null, bmi: '22', ...extra });
const model = (id, e = {}, m = {}) => ({ employee: emp(id, e), mcu: mcu(id, m) });

test('filterModels: drops inactive/deleted employees and applies every filter', async () => {
  const { filterModels } = await load('pages/dashboard/stats/filter.js');
  const models = [
    model('A'),
    model('B', { isActive: false }),
    model('C', { deletedAt: '2026-01-01' }),
    model('D', { department: 'IT' }),
    model('E', { employeeType: 'Vendor' }),
    model('F', {}, { mcuDate: '2025-12-31' }),
    model('G', {}, { initialResult: 'Follow-Up', finalResult: 'Fit' })
  ];
  assert.deepEqual(filterModels(models, {}).map(m => m.employee.employeeId), ['A', 'D', 'E', 'F', 'G']);
  assert.deepEqual(filterModels(models, { from: '2026-01-01', to: '2026-12-31' }).map(m => m.employee.employeeId), ['A', 'D', 'E', 'G']);
  assert.deepEqual(filterModels(models, { department: 'IT' }).map(m => m.employee.employeeId), ['D']);
  assert.deepEqual(filterModels(models, { employeeType: 'Vendor' }).map(m => m.employee.employeeId), ['E']);
  assert.deepEqual(filterModels(models, { mcuStatus: 'Fit' }).map(m => m.employee.employeeId), ['A', 'D', 'E', 'F', 'G']);
  assert.deepEqual(filterModels(models, { to: '2026-03-10' }).map(m => m.employee.employeeId), ['A', 'D', 'E', 'F', 'G']);
});

test('follow-up rules match the old dashboard', async () => {
  const { isFollowUp, needsFollowUp, resultOf } = await load('pages/dashboard/stats/filter.js');
  assert.equal(resultOf({ initialResult: 'Follow-Up', finalResult: 'Fit' }), 'Fit');
  assert.equal(isFollowUp({ initialResult: 'Follow-Up', finalResult: null }), true);
  assert.equal(isFollowUp({ initialResult: 'Follow-Up', finalResult: 'Fit' }), false);
  assert.equal(needsFollowUp({ initialResult: 'Follow-Up', finalResult: null }), true);
  assert.equal(needsFollowUp({ initialResult: 'Follow-Up', finalResult: 'Follow-Up' }), true);
  assert.equal(needsFollowUp({ initialResult: 'Follow-Up', finalResult: 'Unfit' }), false);
  assert.equal(needsFollowUp({ initialResult: 'Fit' }), false);
});

test('distributions count, bucket and share correctly', async () => {
  const d = await load('pages/dashboard/stats/distributions.js');
  const today = new Date('2026-11-20');
  const models = [
    model('A', { birthDate: '2005-01-01', bloodType: 'A+' }, { bmi: '17', mcuType: 'Annual' }),
    model('B', { birthDate: '1990-06-01', bloodType: 'O+' }, { bmi: '24.9', initialResult: 'Unfit', mcuType: 'Final' }),
    model('C', { birthDate: '1980-06-01', department: 'IT' }, { bmi: '27', mcuType: 'Khusus' }),
    model('D', { birthDate: '1965-06-01' }, { bmi: '31' }),
    model('E', { birthDate: null }, { bmi: null })
  ];
  assert.deepEqual(d.statusCounts(models).map(x => x.value), [4, 0, 0, 0, 1]);
  assert.deepEqual(d.typeCounts(models).map(x => x.value), [0, 3, 1, 1]);
  assert.equal(d.bloodTypeCounts(models).find(x => x.label === 'O+').value, 4);
  assert.deepEqual(d.ageCounts(models, today).map(x => x.value), [1, 0, 1, 1, 1]);
  assert.deepEqual(d.bmiCounts(models).map(x => x.value), [1, 1, 1, 1, 1]);
  assert.deepEqual(d.departmentCounts(models, [{ name: 'Produksi' }, { name: 'IT' }, { name: 'K3' }]), [{ label: 'Produksi', value: 4 }, { label: 'IT', value: 1 }]);
  assert.deepEqual(d.withShare([{ label: 'a', value: 1 }, { label: 'b', value: 3 }]).map(x => x.share), [25, 75]);
  assert.deepEqual(d.withShare([{ label: 'a', value: 0 }]).map(x => x.share), [0]);
});

test('monthlyTrend spans the filter range and counts per month', async () => {
  const { monthlyTrend } = await load('pages/dashboard/stats/trend.js');
  const models = [model('A', {}, { mcuDate: '2026-01-15' }), model('B', {}, { mcuDate: '2026-01-20' }), model('C', {}, { mcuDate: '2026-03-02' })];
  const trend = monthlyTrend(models, '2026-01-01', '2026-03-31');
  assert.deepEqual(trend, [{ label: 'Jan', value: 2 }, { label: 'Feb', value: 0 }, { label: 'Mar', value: 1 }]);
});

test('Jakarta score: points per parameter and risk levels', async () => {
  const { jakartaScore, jakartaLevel, hasDiabetesHistory } = await load('lib/jakarta.js');
  const today = new Date('2026-11-20');
  const e = { gender: 'Laki-laki', birthDate: '1989-01-01' };
  const m = { bloodPressure: '138/88', bmi: '26.4', smokingStatus: 'Mantan perokok', exerciseFrequency: '>2x seminggu' };
  const { score, scores } = jakartaScore(e, m, false, today);
  assert.deepEqual(scores, { jk: 1, umur: -3, td: 1, imt: 1, merokok: 3, diabetes: 0, aktivitasFisik: -3 });
  assert.equal(score, 0);
  assert.equal(jakartaScore({ gender: 'Perempuan', birthDate: '1950-01-01' }, { bloodPressure: '190/120', bmi: '36', smokingStatus: 'Perokok aktif', exerciseFrequency: 'Tidak pernah' }, true, today).score, 3 + 4 + 2 + 4 + 2 + 2);
  assert.equal(jakartaLevel(-7), 1);
  assert.equal(jakartaLevel(1), 1);
  assert.equal(jakartaLevel(2), 2);
  assert.equal(jakartaLevel(4), 2);
  assert.equal(jakartaLevel(5), 3);
  assert.equal(jakartaLevel(-8), 0);
  assert.equal(hasDiabetesHistory([{ diseaseName: 'Diabetes Mellitus' }]), true);
  assert.equal(hasDiabetesHistory([{ diseaseName: 'Asma' }]), false);
  assert.equal(hasDiabetesHistory(), false);
});

test('activity text follows the allowed targets and actions', async () => {
  const { recentActivities } = await load('pages/dashboard/stats/activity.js');
  const lookups = { employeeName: id => ({ 'EMP-1': 'Budi' })[id], mcuOwnerName: id => ({ 'MCU-1': 'Siti' })[id] };
  const rows = recentActivities([
    { target: 'Employee', action: 'create', targetId: 'EMP-1', userName: 'Admin', timestamp: 't1' },
    { target: 'Employee', action: 'update', targetId: 'EMP-1', userName: 'Admin', timestamp: 't2' },
    { target: 'MCU', action: 'update', targetId: 'MCU-1', details: 'Follow-up selesai', userName: 'Petugas', timestamp: 't3' },
    { target: 'MCU', action: 'delete', targetId: 'MCU-9', userName: 'Admin', timestamp: 't4' },
    { target: 'User', action: 'create', timestamp: 't5' }
  ], lookups);
  assert.deepEqual(rows.map(r => r.text), ['Menambah karyawan Budi', 'Melakukan Follow-Up Siti', 'Menghapus MCU MCU-9']);
  assert.deepEqual(rows.map(r => r.tag), ['Tambah', 'Follow-Up', 'Hapus']);
});
