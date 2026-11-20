<script>
  import { onMount } from 'svelte';
  import PageHeader from '../../ui/PageHeader.svelte';
  import Card from '../../ui/Card.svelte';
  import DataState from '../../ui/DataState.svelte';
  import Pager from '../../ui/Pager.svelte';
  import Icon from '../../ui/Icon.svelte';
  import ExpiryKpis from './ExpiryKpis.svelte';
  import ExpiryTable from './ExpiryTable.svelte';
  import { getExpiryOverview } from '../../data/analytics.js';
  import { attentionRows, departmentsOf, filterAndSort, kpiStats, exportRows, PAGE_SIZE } from './expiry.js';
  import { downloadCsvFile } from '../../lib/csv.js';
  import { paginate } from '../kelola-karyawan/list.js';
  import { showToast } from '../../lib/toast.svelte.js';

  let status = $state('loading');
  let error = $state('');
  let overview = $state([]);
  let filters = $state({ department: '', status: '', sort: 'days' });
  let page = $state(1);

  const rows = $derived(attentionRows(overview));
  const filtered = $derived(filterAndSort(rows, filters));
  const view = $derived(paginate(filtered, page, PAGE_SIZE));
  const stats = $derived(kpiStats(overview));
  const pageState = $derived(status !== 'ready' ? status : filtered.length ? 'ready' : 'empty');

  $effect(() => { filters.department; filters.status; filters.sort; page = 1; });

  async function load() {
    status = 'loading';
    try {
      overview = await getExpiryOverview();
      status = 'ready';
    } catch (failure) {
      error = failure.message;
      status = 'error';
    }
  }

  function exportCsv() {
    if (!filtered.length) return showToast('Tidak ada baris yang dapat diekspor');
    downloadCsvFile(exportRows(filtered), `MCU_Expiry_${new Date().toISOString().slice(0, 10)}.csv`);
  }

  onMount(load);
</script>

<PageHeader title="Masa Berlaku MCU" subtitle="MCU berlaku 12 bulan sejak tanggal pemeriksaan.">
  <button class="btn" type="button" onclick={exportCsv}><Icon name="dl" />CSV</button>
</PageHeader>

{#if status === 'ready'}<ExpiryKpis {stats} />{/if}

<Card title="Daftar MCU Expired / Warning" note={status === 'ready' ? `${filtered.length} karyawan` : ''}>
  <div class="tools filter-tools">
    <select class="field" bind:value={filters.department} aria-label="Filter departemen"><option value="">Semua departemen</option>{#each departmentsOf(rows) as department}<option>{department}</option>{/each}</select>
    <select class="field" bind:value={filters.status} aria-label="Filter status"><option value="">Semua status</option><option value="EXPIRED">Expired</option><option value="WARNING">Warning</option></select>
    <select class="field" bind:value={filters.sort} aria-label="Urutan daftar"><option value="days">Urutkan: Hari</option><option value="status">Urutkan: Status</option></select>
  </div>
  <DataState state={pageState} {error} onretry={load} emptyTitle="Tidak ada data" emptyText="Tidak ada MCU yang expired atau mendekati expired.">
    <ExpiryTable rows={view.items} offset={(view.page - 1) * PAGE_SIZE} />
    <Pager page={view.page} pageSize={PAGE_SIZE} total={filtered.length} onpage={next => (page = next)} />
  </DataState>
</Card>
