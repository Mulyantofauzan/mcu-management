<script>
  import Card from '../../ui/Card.svelte';
  import { FIELD_LABELS } from '../../lib/changes.js';

  let { result, employee } = $props();
</script>

<Card title={result.changed || result.fileCount ? 'Perubahan MCU disimpan' : 'Tidak ada perubahan'} note={employee?.name}>
  {#if result.changes.length}
    <div class="tbl-wrap">
      <table>
        <thead><tr><th>Item</th><th>Sebelum</th><th>Sesudah</th></tr></thead>
        <tbody>{#each result.changes as change, index (index)}<tr><td>{FIELD_LABELS[change.label] || change.label}</td><td class="num">{change.before}</td><td class="num">{change.after}</td></tr>{/each}</tbody>
      </table>
    </div>
  {:else}<p class="muted">Tidak ada isian yang berbeda dari data tersimpan.</p>{/if}
  {#if result.fileCount}<p class="gap-top">{result.fileCount} dokumen baru diunggah.</p>{/if}
  {#if result.warnings.length}<div class="alert info gap-top" role="status">{result.warnings.join(' ')}</div>{/if}
  <p class="gap-top inline"><a class="btn pri" href="/kelola-karyawan">Ke Kelola Karyawan</a></p>
</Card>
