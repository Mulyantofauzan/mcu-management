<script>
  import { formatDate } from '../../lib/format.js';
  import { pillClass } from '../../lib/status.js';
  import { newestFirst, noteOf } from './healthHistory.js';

  let { mcus } = $props();
</script>

<div class="tbl-wrap">
  <table>
    <thead><tr><th>No</th><th>Tanggal MCU</th><th>Tipe MCU</th><th>Status</th><th>Hasil awal</th><th>Hasil akhir</th><th>Catatan</th></tr></thead>
    <tbody>
      {#each newestFirst(mcus) as mcu, index (mcu.mcuId)}
        <tr>
          <td class="num">{index + 1}</td><td class="num">{formatDate(mcu.mcuDate)}</td><td>{mcu.mcuType || 'N/A'}</td>
          <td><span class="pill {pillClass(mcu.status)}">{mcu.status || '-'}</span></td><td>{mcu.initialResult || '-'}</td><td>{mcu.finalResult || '-'}</td>
          <td class="notes" title={noteOf(mcu)}>{noteOf(mcu) || '-'}</td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>
