<script>
  import { openMcuFile } from '../../../data/mcuDetail.js';
  import { formatFileSize, formatDate } from '../../../lib/format.js';
  import { showToast } from '../../../lib/toast.svelte.js';

  let { part, userId } = $props();
  let opening = $state('');

  async function open(file) {
    opening = file.fileid;
    try {
      await openMcuFile(file.fileid, userId);
    } catch (failure) {
      showToast(`Gagal membuka dokumen: ${failure.message}`);
    } finally {
      opening = '';
    }
  }
</script>

<section>
  <h3>Dokumen MCU</h3>
  {#if !part.ok}
    <p class="muted">Gagal memuat dokumen ({part.error}).</p>
  {:else if part.data.length === 0}
    <p class="muted">Belum ada dokumen.</p>
  {:else}
    {#each part.data as file (file.fileid)}
      <div class="filerow">
        <span>{file.filename} · {formatFileSize(file.filesize)} · {formatDate(file.uploadedat)}</span>
        <button class="btn sm" type="button" disabled={opening === file.fileid} onclick={() => open(file)}>{opening === file.fileid ? 'Membuka...' : 'Unduh'}</button>
      </div>
    {/each}
  {/if}
</section>
