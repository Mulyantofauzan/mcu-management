<script>
  import { onMount } from 'svelte';
  import PageHeader from '../../ui/PageHeader.svelte';
  import Card from '../../ui/Card.svelte';
  import DataState from '../../ui/DataState.svelte';
  import ConfirmDialog from '../../ui/ConfirmDialog.svelte';
  import Icon from '../../ui/Icon.svelte';
  import MasterTable from './MasterTable.svelte';
  import MasterFormDialog from './MasterFormDialog.svelte';
  import { MASTER_TYPES, typeByKey } from '../../lib/masterConfig.js';
  import { listMaster, createMaster, updateMaster, deleteMaster } from '../../data/masterData.js';
  import { showToast } from '../../lib/toast.svelte.js';

  let { user } = $props();
  let tab = $state('jobTitles');
  let status = $state('loading');
  let error = $state('');
  let rows = $state([]);
  let editing = $state(undefined);
  let deleting = $state(null);
  let busy = $state(false);

  const type = $derived(typeByKey(tab));
  const pageState = $derived(status !== 'ready' ? status : rows.length ? 'ready' : 'empty');

  async function load() {
    status = 'loading';
    try { rows = await listMaster(tab); status = 'ready'; } catch (failure) { error = failure.message; status = 'error'; }
  }

  const switchTab = key => { tab = key; load(); };

  async function save(form) {
    busy = true;
    try {
      if (editing) { await updateMaster(tab, editing.id, form, user); showToast('Data berhasil diupdate'); }
      else { await createMaster(tab, form, user); showToast('Data berhasil ditambahkan'); }
      editing = undefined;
      await load();
    } catch (failure) {
      showToast(`Gagal menyimpan: ${failure.message}`);
    } finally {
      busy = false;
    }
  }

  async function remove() {
    busy = true;
    try {
      await deleteMaster(tab, deleting, user);
      showToast('Data berhasil dihapus');
      deleting = null;
      await load();
    } catch (failure) {
      showToast(`Gagal menghapus: ${failure.message}`);
      deleting = null;
    } finally {
      busy = false;
    }
  }

  onMount(load);
</script>

<PageHeader title="Data Master" subtitle="Kelola jabatan, departemen, vendor, dokter, item lab, dan penyakit.">
  <button class="btn pri" type="button" onclick={() => (editing = null)}><Icon name="plus" />Tambah {type.title}</button>
</PageHeader>

<div class="seg" role="group" aria-label="Jenis data master">
  {#each MASTER_TYPES as item (item.key)}<button type="button" aria-pressed={tab === item.key} onclick={() => switchTab(item.key)}>{item.title}</button>{/each}
</div>

<Card title={type.title} note={status === 'ready' ? `${rows.length} data` : ''}>
  <DataState state={pageState} {error} onretry={load} emptyTitle="Belum ada data" emptyText={`Tambahkan ${type.title.toLowerCase()} pertama.`}>
    <MasterTable {type} {rows} onedit={row => (editing = row)} ondelete={row => (deleting = row)} />
  </DataState>
</Card>

<MasterFormDialog open={editing !== undefined} {type} row={editing} saving={busy} onsave={save} onclose={() => (editing = undefined)} />
<ConfirmDialog open={Boolean(deleting)} title="Hapus data?" {busy} onconfirm={remove} onclose={() => (deleting = null)}>
  {#if deleting}<p><b>{deleting.name}</b> akan dihapus. Data yang sedang digunakan tidak dapat dihapus.</p>{/if}
</ConfirmDialog>
