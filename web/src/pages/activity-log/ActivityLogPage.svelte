<script>
  import { onMount } from 'svelte';
  import PageHeader from '../../ui/PageHeader.svelte';
  import Card from '../../ui/Card.svelte';
  import DataState from '../../ui/DataState.svelte';
  import PageNumbers from '../../ui/PageNumbers.svelte';
  import Icon from '../../ui/Icon.svelte';
  import ActivityTable from './ActivityTable.svelte';
  import { getActivities, getAllActivities } from '../../data/activityLog.js';
  import { activityCsv, exportFileName, PAGE_SIZE } from './activityLog.js';
  import { showToast } from '../../lib/toast.svelte.js';

  const blank = () => ({ action: '', target: '', userName: '', fromDate: '', toDate: '' });
  let draft = $state(blank());
  let applied = $state(blank());
  let page = $state(1);
  let result = $state({ data: [], total: 0, totalPages: 0 });
  let status = $state('loading');
  let error = $state('');
  let exporting = $state(false);

  const pageState = $derived(status !== 'ready' ? status : result.data.length ? 'ready' : 'empty');

  async function load() {
    status = 'loading';
    try {
      result = await getActivities(applied, page, PAGE_SIZE);
      status = 'ready';
    } catch (failure) {
      error = failure.message;
      status = 'error';
    }
  }

  function apply(event) {
    event.preventDefault();
    applied = { ...draft };
    page = 1;
    load().then(() => showToast('Filter diterapkan'));
  }

  function go(next) {
    page = next;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    load();
  }

  async function exportCsv() {
    exporting = true;
    try {
      const all = await getAllActivities(applied);
      if (!all.length) throw new Error('Tidak ada data untuk diekspor dengan filter yang dipilih');
      const link = document.createElement('a');
      link.href = URL.createObjectURL(new Blob([activityCsv(all, applied)], { type: 'text/csv;charset=utf-8;' }));
      link.download = exportFileName(applied);
      link.click();
      showToast('Activity log berhasil diekspor');
    } catch (failure) {
      showToast(`Gagal mengekspor: ${failure.message}`);
    } finally {
      exporting = false;
    }
  }

  onMount(load);
</script>

<PageHeader title="Log Aktivitas" subtitle="Audit aktivitas pengguna: siapa mengubah apa dan kapan.">
  <button class="btn" type="button" onclick={exportCsv} disabled={exporting}><Icon name="dl" />{exporting ? 'Menyiapkan...' : 'Export CSV'}</button>
</PageHeader>

<form class="card filters" onsubmit={apply} aria-label="Filter log aktivitas">
  <label>Aksi<select class="field" bind:value={draft.action}><option value="">Semua Aksi</option><option value="create">Create</option><option value="update">Update</option><option value="delete">Delete</option></select></label>
  <label>Target entitas<select class="field" bind:value={draft.target}><option value="">Semua Target</option><option value="Employee">Karyawan</option><option value="MCU">MCU</option><option value="FollowUp">Follow-Up</option><option value="User">User</option></select></label>
  <label>User<input class="field" type="text" bind:value={draft.userName} placeholder="Nama atau ID user"></label>
  <label>Dari tanggal<input class="field" type="date" bind:value={draft.fromDate}></label>
  <label>Sampai tanggal<input class="field" type="date" bind:value={draft.toDate}></label>
  <div class="acts"><button class="btn pri" type="submit">Terapkan filter</button></div>
</form>

<Card title="Aktivitas" note={status === 'ready' ? `${result.total} catatan` : ''}>
  <DataState state={pageState} {error} onretry={load} emptyTitle="Tidak ada data aktivitas" emptyText="Ubah filter lalu terapkan lagi.">
    <ActivityTable rows={result.data} />
    <PageNumbers {page} pages={result.totalPages} onpage={go} />
  </DataState>
</Card>
