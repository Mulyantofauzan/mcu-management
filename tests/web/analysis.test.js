'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const load = rel => import(pathToFileURL(path.resolve(__dirname, '../../web/src', rel)).href);
const item = (id, mcu = {}, employee = {}) => ({ employee: { employeeId: id, isActive: true, department: 'Produksi', jobTitle: 'Staf', ...employee }, mcu: { mcuId: `M-${id}`, employeeId: id, mcuDate: '2026-05-01', status: 'Fit', ...mcu } });

test('vision grading: worst eye wins, spectacles and unaided are combined by worst, blanks are unmeasured', async () => {
  const { visionGrade, evaluateVision, gradeLabel } = await load('lib/vision.js');
  assert.equal(visionGrade('6/6'), 'normal');
  assert.equal(visionGrade(' 6/12 '), 'ringan');
  assert.equal(visionGrade('6/24'), 'sedang');
  assert.equal(visionGrade('6/60'), 'berat');
  assert.equal(visionGrade('-'), 'unmeasured');
  assert.equal(visionGrade(''), 'unmeasured');
  assert.equal(evaluateVision({}), 'unmeasured');
  assert.equal(evaluateVision({ visionDistantUnaidedLeft: '6/6', visionDistantUnaidedRight: '6/18' }), 'sedang');
  assert.equal(evaluateVision({ visionDistantUnaidedLeft: '6/6', visionDistantSpectaclesLeft: '6/36' }), 'berat');
  assert.equal(evaluateVision({ visionNearUnaidedLeft: '6/9' }), 'ringan');
  assert.equal(gradeLabel('berat'), 'Gangguan Berat');
  assert.equal(gradeLabel('unmeasured'), 'Tidak Terukur');
});

test('yearly entries keep the latest MCU per employee per year and drop inactive employees', async () => {
  const { yearlyEntries, yearsOf } = await load('pages/analysis/analysis.js');
  const history = [
    item('A', { mcuId: 'a1', mcuDate: '2026-01-10' }), item('A', { mcuId: 'a2', mcuDate: '2026-09-10' }), item('A', { mcuId: 'a0', mcuDate: '2025-03-10' }),
    item('B', { mcuId: 'b1', mcuDate: '2026-02-01' }, { isActive: false }), item('C', { mcuId: 'c1', mcuDate: null })
  ];
  const entries = yearlyEntries(history);
  assert.deepEqual(entries.map(e => e.mcu.mcuId), ['a2', 'a0']);
  assert.deepEqual(yearsOf(entries), [2026, 2025]);
});

test('filters and summary', async () => {
  const { applyFilters, summary } = await load('pages/analysis/analysis.js');
  const list = [item('A', { status: 'Fit' }), item('B', { status: 'Unfit' }, { department: 'IT' }), item('C', { status: 'Fit With Note', mcuDate: '2025-02-02' }, { jobTitle: 'Akuntan' })];
  assert.deepEqual(applyFilters(list, { department: 'IT' }).map(i => i.employee.employeeId), ['B']);
  assert.deepEqual(applyFilters(list, { jobTitle: 'Akuntan' }).map(i => i.employee.employeeId), ['C']);
  assert.deepEqual(applyFilters(list, { status: 'Fit' }).map(i => i.employee.employeeId), ['A']);
  assert.deepEqual(applyFilters(list, { year: '2025' }).map(i => i.employee.employeeId), ['C']);
  assert.deepEqual(summary(list), { total: 3, fit: 1, fitWithNote: 1, unfit: 1 });
});

test('trend by year groups statuses and defaults empty status to Unfit', async () => {
  const { trendByYear } = await load('pages/analysis/analysis.js');
  const trend = trendByYear([item('A', { status: 'Fit', mcuDate: '2025-01-01' }), item('B', { status: 'Fit', mcuDate: '2026-01-01' }), item('C', { status: '', mcuDate: '2026-02-01' }), item('D', { status: 'Follow-Up', mcuDate: '2026-03-01' })]);
  assert.deepEqual(trend.years, [2025, 2026]);
  const by = Object.fromEntries(trend.series.map(s => [s.label, s.values]));
  assert.deepEqual(by.Fit, [1, 1]);
  assert.deepEqual(by.Unfit, [0, 1]);
  assert.deepEqual(by['Follow-Up'], [0, 1]);
});

test('BMI and blood pressure buckets', async () => {
  const { bmiDistribution, bloodPressureDistribution } = await load('pages/analysis/analysis.js');
  const bmi = bmiDistribution([item('a', { bmi: '17' }), item('b', { bmi: '18.5' }), item('c', { bmi: '24.95' }), item('d', { bmi: '29.95' }), item('e', { bmi: '35' }), item('f', { bmi: '' }), item('g', { bmi: 'x' })]);
  assert.deepEqual(bmi.map(r => r.value), [1, 2, 1, 1]);
  const bp = bloodPressureDistribution([item('a', { bloodPressure: '120/80' }), item('b', { bloodPressure: '135/87' }), item('c', { bloodPressure: '150/95' }), item('d', { bloodPressure: '170/105' }), item('e', { bloodPressure: '200/120' }), item('f', { bloodPressure: '135/80' }), item('g', { bloodPressure: 'abc' })]);
  assert.deepEqual(bp.map(r => r.value), [1, 1, 1, 1, 1]);
});

test('smoking, exercise and exam normalisation', async () => {
  const { smokingDistribution, exerciseDistribution, normalizeExamValue, examDistribution } = await load('pages/analysis/analysis.js');
  assert.deepEqual(smokingDistribution([item('a', { smokingStatus: 'Perokok Aktif' }), item('b', { smokingStatus: 'Tidak Merokok' }), item('c', { smokingStatus: 'Perokok Aktif' }), item('d', { smokingStatus: 'Lain' })]).map(r => r.value), [1, 0, 2]);
  assert.deepEqual(exerciseDistribution([item('a', { exerciseFrequency: '>2x Seminggu' }), item('b', { exerciseFrequency: 'Tidak Pernah' })]).map(r => r.value), [1, 0, 0, 1]);
  assert.equal(normalizeExamValue('nornal'), 'Normal');
  assert.equal(normalizeExamValue('NEGATIF'), 'Negative');
  assert.equal(normalizeExamValue('  gangguan ringan '), 'Gangguan Ringan');
  assert.equal(normalizeExamValue('visus 6/9 jauh'), '6/9 (Far)');
  assert.equal(normalizeExamValue(''), 'Not Recorded');
  const dist = examDistribution([item('a', { xray: 'normal' }), item('b', { xray: 'Normal' }), item('c', { xray: 'Infiltrat' }), item('d', { xray: '' })], 'xray');
  assert.deepEqual(dist, [{ label: 'Normal', value: 2 }, { label: 'Infiltrat', value: 1 }]);
});

test('lab stats read status from notes, count missing as Not Recorded, and hide empty items', async () => {
  const { labStats } = await load('pages/analysis/analysis.js');
  const items = [item('a'), item('b'), item('c')];
  const labs = new Map([['M-a', [{ lab_item_id: 3, value: '14', notes: 'Normal' }]], ['M-b', [{ lab_item_id: 3, value: '9', notes: 'Low' }, { lab_item_id: 7, value: '130', notes: 'High' }]], ['M-c', [{ lab_item_id: 3, value: '20', notes: '' }]]]);
  const stats = labStats(items, labs);
  const hb = stats.find(s => s.id === 3);
  assert.deepEqual(hb.counts, { Normal: 1, Low: 1, High: 0, 'Not Recorded': 1 });
  assert.equal(hb.average, (14 + 9 + 20) / 3);
  assert.equal(stats.find(s => s.id === 7).counts.High, 1);
  assert.equal(stats.length, 14);
  assert.equal(labStats([], new Map()).length, 0);
});

test('bar charts use a y-axis whose ticks are whole numbers', async () => {
  const fs = require('node:fs');
  const read = name => fs.readFileSync(path.resolve(__dirname, `../../web/src/ui/charts/${name}`), 'utf8');
  assert.match(read('BarChart.svelte'), /Math\.ceil\(peak \/ 4\) \* 4/);
  assert.match(read('StackedBars.svelte'), /Math\.ceil\(peak \/ 4\) \* 4/);
});
