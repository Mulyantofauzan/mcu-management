<script>
  /* Dokumen yang sudah tersimpan pada MCU: unduh dan hapus (hapus lewat konfirmasi). */
  import { onMount } from 'svelte';
  import ConfirmDialog from '../../ui/ConfirmDialog.svelte';
  import { getMcuFiles, openMcuFile } from '../../data/mcuDetail.js';
  import { deleteFile } from '../../data/files.js';
  import { formatFileSize, formatDate } from '../../lib/format.js';
  import { showToast } from '../../lib/toast.svelte.js';

  let { mcuId, userId } = $props();
  let files = $state([]);
  let failed = $state('');
  let target = $state(null);
  let busy = $state(false);

  async function load() {
    try { files = await getMcuFiles(mcuId); failed = ''; } catch (error) { failed = error.message; }
  }

  async function remove() {
    busy = true;
    try {
      await deleteFile(target.fileid);
      showToast('Dokumen dihapus');
      target = null;
      await load();
    } catch (error) {
      showToast(`Gagal menghapus dokumen: ${error.message}`);
    } finally {
      busy = false;
    }
  }

  onMount(load);
</script>

{#if failed}<p class="muted">Gagal memuat dokumen tersimpan ({failed}).</p>{/if}
{#each files as file (file.fileid)}
  <div class="filerow">
    <span>{file.filename} · {formatFileSize(file.filesize)} · {formatDate(file.uploadedat)}</span>
    <span class="inline">
      <button class="btn sm" type="button" onclick={() => openMcuFile(file.fileid, userId).catch(error => showToast(error.message))}>Unduh</button>
      <button class="btn sm danger-text" type="button" onclick={() => (target = file)}>Hapus</button>
    </span>
  </div>
{/each}

<ConfirmDialog open={Boolean(target)} title="Hapus dokumen?" {busy} onconfirm={remove} onclose={() => (target = null)}>
  {#if target}<p>Dokumen <b>{target.filename}</b> akan dihapus dari penyimpanan.</p>{/if}
</ConfirmDialog>
