<script>
  import { sortLabResults, labStatus, labRange, labName } from '../../../lib/lab.js';

  let { part } = $props();
  const rows = $derived(part.ok ? sortLabResults(part.data) : []);
</script>

<section>
  <h3>Hasil pemeriksaan lab</h3>
  {#if !part.ok}
    <p class="muted">Gagal memuat hasil lab.</p>
  {:else if rows.length === 0}
    <p class="muted">Tidak ada hasil lab.</p>
  {:else}
    <div class="tbl-wrap">
      <table>
        <thead><tr><th>Pemeriksaan</th><th>Nilai</th><th>Satuan</th><th>Rentang normal</th><th>Status</th></tr></thead>
        <tbody>
          {#each rows as result (result.id)}
            {@const status = labStatus(result)}
            <tr>
              <td>{labName(result)}</td>
              <td class="num"><b>{result.value || '-'}</b></td>
              <td>{result.unit || '-'}</td>
              <td class="num">{labRange(result)}</td>
              <td><span class="pill {status.cls}">{status.label}</span></td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</section>
