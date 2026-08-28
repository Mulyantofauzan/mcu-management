export function chunkUnique(values, size = 100) {
  if (!Number.isInteger(size) || size < 1) {
    throw new TypeError('Batch size must be a positive integer');
  }

  const unique = [...new Set(
    (values || [])
      .filter(value => value !== null && value !== undefined && String(value).trim() !== '')
      .map(value => String(value).trim())
  )];

  const batches = [];
  for (let index = 0; index < unique.length; index += size) {
    batches.push(unique.slice(index, index + size));
  }
  return batches;
}
export async function runBatches(batches, task, concurrency = 3) {
  if (!Array.isArray(batches) || batches.length === 0) return [];
  if (typeof task !== 'function') throw new TypeError('Batch task must be a function');

  const workerCount = Math.max(1, Math.min(Number(concurrency) || 1, batches.length));
  const results = new Array(batches.length);
  let cursor = 0;

  async function worker() {
    while (cursor < batches.length) {
      const index = cursor++;
      results[index] = await task(batches[index], index);
    }
  }

  await Promise.all(Array.from({ length: workerCount }, worker));
  return results;
}
