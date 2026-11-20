<script>
  import { formatDate } from '../../lib/format.js';
  import { pillClass } from '../../lib/status.js';
  import { resultOfInitial, shortNote, noteOf, newestFirst } from './healthHistory.js';

  let { mcus } = $props();
</script>

<div class="grid g-3">
  {#each newestFirst(mcus) as mcu (mcu.mcuId)}
    {@const result = resultOfInitial(mcu)}
    <div class="card mcu-card">
      <div class="head"><span class="pill {pillClass(result)}">{result || 'N/A'}</span><span class="tag num">{formatDate(mcu.mcuDate)}</span></div>
      <p class="muted">Tipe: {mcu.mcuType || 'N/A'}</p>
      {#if mcu.initialResult}<p><b>Hasil awal:</b> {mcu.initialResult}</p>{/if}
      {#if mcu.finalResult}<p><b>Hasil akhir:</b> {mcu.finalResult}</p>{/if}
      {#if noteOf(mcu)}<p class="muted note">{shortNote(mcu)}</p>{/if}
    </div>
  {/each}
</div>
