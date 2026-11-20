'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const load = rel => import(pathToFileURL(path.resolve(__dirname, '../../web/src', rel)).href);

test('a positive count never prints as 0%', async () => {
  const { formatPercent } = await load('lib/percent.js');
  assert.equal(formatPercent(1, 72), '1,4%');
  assert.equal(formatPercent(1, 500), '0,2%');
  assert.equal(formatPercent(2, 1000), '0,2%');
  assert.equal(formatPercent(1, 5000), '0,02%');
  assert.equal(formatPercent(1, 100000), '<0,01%');
  for (const total of [3, 50, 999, 1000, 12345, 99999, 1e6]) {
    for (const count of [1, 2]) assert.notEqual(formatPercent(count, total), '0%', `${count}/${total}`);
  }
});

test('exact values, zero and full', async () => {
  const { formatPercent, percentOf, countWithPercent } = await load('lib/percent.js');
  assert.equal(formatPercent(0, 72), '0%');
  assert.equal(formatPercent(5, 0), '0%');
  assert.equal(formatPercent(1, 2), '50%');
  assert.equal(formatPercent(24, 100), '24%');
  assert.equal(formatPercent(10, 100), '10%');
  assert.equal(formatPercent(1, 3), '33,3%');
  assert.equal(formatPercent(72, 72), '100%');
  assert.equal(formatPercent(9996, 10000), '99,9%');
  assert.equal(formatPercent(9999, 10000), '99,9%');
  assert.equal(percentOf(1, 4), 25);
  assert.equal(percentOf(1, 0), 0);
  assert.equal(countWithPercent(12, 50), '12 (24%)');
});

test('distribution bars carry both count and percent text', async () => {
  const { withShare } = await load('pages/dashboard/stats/distributions.js');
  const rows = withShare([{ label: 'a', value: 1 }, { label: 'b', value: 999 }]);
  assert.equal(rows[0].percent, '0,1%');
  assert.equal(rows[1].percent, '99,9%');
  assert.ok(rows[0].share > 0);
});

test('risk and expiry cards expose count-aware percent text', async () => {
  const { riskCounts } = await load('pages/rahma/assessment.js');
  const rows = Array.from({ length: 400 }, (_, i) => ({ riskLevel: i === 0 ? 4 : 1 }));
  const counts = riskCounts(rows);
  assert.equal(counts[3].count, 1);
  assert.equal(counts[3].percentText, '0,25%');
  assert.equal(counts[0].percentText, '99,8%');
  const { kpiStats } = await load('pages/mcu-expiry/expiry.js');
  const overview = [{ expiryStatus: 'EXPIRED' }, ...Array.from({ length: 2000 }, () => ({ expiryStatus: 'OK' })), { expiryStatus: 'WARNING' }];
  const stats = kpiStats(overview);
  assert.equal(stats.expiredText, '1 dari 2 · 50%');
  assert.equal(stats.totalText, '2 dari 2002 karyawan · 0,1%');
});

test('no view prints a bare percent: every percent in the UI goes through formatPercent or sits beside its count', () => {
  const read = rel => fs.readFileSync(path.resolve(__dirname, '../../web/src', rel), 'utf8');
  assert.doesNotMatch(read('ui/charts/HBarsCard.svelte'), /\{item\.share\}%/);
  assert.doesNotMatch(read('ui/charts/DonutCard.svelte'), /Math\.round\(\(value \/ total\)/);
  assert.match(read('ui/charts/HBarsCard.svelte'), /item\.value\}<span class="muted share"> · \{item\.percent\}/);
  assert.match(read('pages/rahma/RiskCards.svelte'), /item\.count\}<small>\{item\.percentText\}/);
});
