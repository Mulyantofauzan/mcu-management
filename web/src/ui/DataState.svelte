<script>
  /* Satu tempat untuk kondisi memuat, kosong, galat, dan siap. */
  let { state, emptyTitle = 'Tidak ada data', emptyText = '', error = '', onretry, children } = $props();
</script>

{#if state === 'loading'}
  <div class="empty" role="status" aria-busy="true">Memuat data...</div>
{:else if state === 'error'}
  <div class="empty" role="alert">
    <b>Data gagal dimuat</b>
    <p>{error || 'Periksa koneksi, lalu coba lagi.'}</p>
    {#if onretry}<button class="btn sm" type="button" onclick={onretry}>Coba lagi</button>{/if}
  </div>
{:else if state === 'empty'}
  <div class="empty"><b>{emptyTitle}</b>{#if emptyText}<p>{emptyText}</p>{/if}</div>
{:else}
  {@render children()}
{/if}
