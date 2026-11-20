'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const load = rel => import(pathToFileURL(path.resolve(__dirname, '../../web/src', rel)).href);

test('metabolic criteria thresholds by gender', async () => {
  const m = await load('lib/metabolic.js');
  assert.equal(m.waistScore(90, 'Laki-laki'), 1);
  assert.equal(m.waistScore(89.9, 'Laki-laki'), 0);
  assert.equal(m.waistScore(80, 'Perempuan'), 1);
  assert.equal(m.waistScore(79, 'Perempuan'), 0);
  assert.equal(m.waistScore(null, 'Perempuan'), undefined);
  assert.equal(m.triglycerideScore(150), 1);
  assert.equal(m.triglycerideScore(149), 0);
  assert.equal(m.hdlScore(39, 'male'), 1);
  assert.equal(m.hdlScore(40, 'male'), 0);
  assert.equal(m.hdlScore(49, 'Perempuan'), 1);
  assert.equal(m.pressureScore('130/80'), 1);
  assert.equal(m.pressureScore('120/85'), 1);
  assert.equal(m.pressureScore('120/80'), 0);
  assert.equal(m.pressureScore(''), undefined);
  assert.equal(m.glucoseScore(99, false), 0);
  assert.equal(m.glucoseScore(100, false), 1);
  assert.equal(m.glucoseScore(undefined, true), 1);
  assert.equal(m.glucoseScore(undefined, false), undefined);
  assert.equal(m.glucoseScore('0', false), 0);
});

test('metabolic risk rule: 3+ points is syndrome, otherwise waist decides 1 or 2', async () => {
  const m = await load('lib/metabolic.js');
  assert.equal(m.metabolicRisk(3, 0), 3);
  assert.equal(m.metabolicRisk(5, 1), 3);
  assert.equal(m.metabolicRisk(2, 1), 2);
  assert.equal(m.metabolicRisk(2, 0), 1);
  assert.equal(m.metabolicRisk(0, undefined), 1);
  const result = m.metabolicAssessment({ gender: 'Laki-laki' }, { chestCircumference: 95, bloodPressure: '135/80' },
    [{ lab_item_id: 9, value: 200 }, { lab_item_id: 10, value: 35 }, { lab_item_id: 7, value: 90 }], false);
  assert.deepEqual(result.scores, { lp: 1, tg: 1, hdl: 1, td: 1, gdp: 0 });
  assert.equal(result.totalScore, 4);
  assert.equal(result.countedCriteria, 5);
  assert.equal(result.risk, 3);
  assert.equal(m.metabolicAssessment({}, {}, [], false).risk, 1);
  assert.equal(m.metabolicAssessment({}, {}, [], false).countedCriteria, 0);
});

test('risk total matrix maps every product to a level', async () => {
  const a = await load('pages/rahma/assessment.js');
  const table = [[1, 1, 1, 1], [1, 2, 2, 1], [1, 3, 3, 2], [2, 1, 2, 1], [2, 2, 4, 2], [2, 3, 6, 3], [3, 1, 3, 2], [3, 2, 6, 3], [3, 3, 9, 4]];
  table.forEach(([cv, met, total, level]) => {
    assert.equal(a.riskTotalOf(cv, met), total, `${cv}x${met}`);
    assert.equal(a.riskLevelFromTotal(total), level, `total ${total}`);
  });
  assert.equal(a.riskTotalOf(2, 0), 2);
  assert.equal(a.riskTotalOf(0, 3), 0);
  assert.equal(a.riskLevelFromTotal(0), 0);
  assert.equal(a.riskLevelFromTotal(5), 0);
});

test('buildAssessments combines Jakarta score, diabetes history and metabolic labs; sorts by score', async () => {
  const a = await load('pages/rahma/assessment.js');
  const today = new Date('2026-11-20');
  const model = (id, mcu, employee = {}) => ({ employee: { employeeId: id, name: id, isActive: true, gender: 'Laki-laki', birthDate: '1989-01-01', department: 'Produksi', jobTitle: 'Staf', ...employee }, mcu: { mcuId: `M-${id}`, bloodPressure: '120/80', bmi: '22', smokingStatus: 'Tidak merokok', exerciseFrequency: '1-2x seminggu', ...mcu } });
  const models = [model('low', {}), model('high', { bloodPressure: '190/120', bmi: '32', smokingStatus: 'Perokok aktif', exerciseFrequency: 'Tidak pernah' }), model('inactive', {}, { isActive: false })];
  const labs = new Map([['M-high', [{ lab_item_id: 9, value: 300 }]]]);
  const rows = a.buildAssessments(models, new Map([['M-high', [{ diseaseName: 'Diabetes Mellitus' }]]]), labs, today);
  assert.deepEqual(rows.map(r => r.employeeId), ['high', 'low']);
  assert.equal(rows[0].diabetes, true);
  assert.equal(rows[0].score, 1 - 3 + 4 + 2 + 4 + 2 + 2);
  assert.equal(rows[0].cvLevel, 3);
  assert.equal(rows[0].metabolic.scores.tg, 1);
  assert.ok(rows[0].riskTotal >= 3);
  assert.equal(rows[1].cvLevel, 1);
  assert.equal(rows[1].age, 37);
});

test('filters and counts', async () => {
  const a = await load('pages/rahma/assessment.js');
  const rows = [{ name: 'Ani', department: 'IT', jobTitle: 'A', riskLevel: 1 }, { name: 'Budi', department: 'IT', jobTitle: 'B', riskLevel: 3 }, { name: 'Citra', department: 'HRD', jobTitle: 'A', riskLevel: 3 }, { name: 'Dedi', department: 'HRD', jobTitle: 'A', riskLevel: 0 }];
  assert.deepEqual(a.filterAssessments(rows, { department: 'IT' }).map(r => r.name), ['Ani', 'Budi']);
  assert.deepEqual(a.filterAssessments(rows, { riskLevel: '3', jobTitle: 'A' }).map(r => r.name), ['Citra']);
  assert.deepEqual(a.filterAssessments(rows, { search: ' bud' }).map(r => r.name), ['Budi']);
  const counts = a.riskCounts(rows);
  assert.deepEqual(counts.map(c => c.count), [1, 0, 2, 0]);
  assert.equal(counts[2].percent, 50);
  assert.deepEqual(a.optionsOf(rows, 'department'), ['HRD', 'IT']);
});
