<script>
  import { changeRows } from '../../../lib/changes.js';

  let { part } = $props();
  const rows = $derived(part.ok ? changeRows(part.data) : []);
</script>

{#if rows.length}
  <section>
    <h3>Riwayat perubahan</h3>
    <div class="tbl-wrap">
      <table>
        <thead><tr><th>Item MCU</th><th>Hasil awal</th><th>Hasil akhir</th><th>Status</th></tr></thead>
        <tbody>
          {#each rows as row, index (index)}
            <tr><td>{row.label}</td><td class="num">{row.before}</td><td class="num">{row.after}</td>
              <td><span class="pill" class:p2={row.changed} class:pm={!row.changed}>{row.changed ? 'Diubah' : 'Tidak diubah'}</span></td></tr>
          {/each}
        </tbody>
      </table>
    </div>
  </section>
{/if}
