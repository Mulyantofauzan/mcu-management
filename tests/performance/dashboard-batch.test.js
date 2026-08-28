const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const root = path.resolve(__dirname, '../..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

async function loadBatchRunner() {
  const url = pathToFileURL(path.join(
    root,
    'mcu-management/js/utils/batchRunner.mjs'
  )).href;
  return import(`${url}?test=${Date.now()}`);
}

test('767 MCU IDs are processed as eight batches of at most 100', async () => {
  const { chunkUnique, runBatches } = await loadBatchRunner();
  const ids = Array.from({ length: 767 }, (_, index) => `mcu-${index + 1}`);
  const batches = chunkUnique([...ids, ids[0], '', null], 100);

  assert.equal(batches.length, 8);
  assert.equal(batches.flat().length, 767);
  assert.ok(batches.every(batch => batch.length <= 100));

  let active = 0;
  let peak = 0;
  const output = await runBatches(batches, async batch => {
    active += 1;
    peak = Math.max(peak, active);
    await new Promise(resolve => setTimeout(resolve, 2));
    active -= 1;
    return batch;
  }, 3);

  assert.equal(peak, 3);
  assert.deepEqual(output.flat(), ids);
});

test('a failed batch rejects the whole result instead of returning partial data', async () => {
  const { runBatches } = await loadBatchRunner();
  await assert.rejects(
    runBatches([[1], [2], [3]], async batch => {
      if (batch[0] === 2) throw new Error('batch failed');
      return batch;
    }, 2),
    /batch failed/
  );
});

test('dashboard abnormalities use one batched laboratory read', () => {
  const lab = read('mcu-management/js/services/labService.js');
  const abnormalities = read('mcu-management/js/services/abnormalitiesService.js');
  const chart = read('mcu-management/js/components/topAbnormalitiesChart.js');
  const collector = abnormalities.match(/async collectLabAbnormalities[\s\S]*?\n  },/)?.[0] || '';

  assert.match(lab, /getPemeriksaanLabByMcuIds\(mcuIds\)/);
  assert.match(collector, /getPemeriksaanLabByMcuIds/);
  assert.doesNotMatch(collector, /getPemeriksaanLabByMcuId\(/);
  assert.match(chart, /getAbnormalitiesReport/);
  assert.doesNotMatch(chart, /getAbnormalitiesSummary\(filteredMCUs\)/);
});
