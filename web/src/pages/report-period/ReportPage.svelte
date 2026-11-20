<script>
  import { onMount } from 'svelte';
  import PageHeader from '../../ui/PageHeader.svelte';
  import Card from '../../ui/Card.svelte';
  import Kpi from '../../ui/Kpi.svelte';
  import DataState from '../../ui/DataState.svelte';
  import Pager from '../../ui/Pager.svelte';
  import Icon from '../../ui/Icon.svelte';
  import ReportTable from './ReportTable.svelte';
  import { loadReportSources, getDepartments, getLabsForMcus, getLabItems } from '../../data/report.js';
  import { getDoctors } from '../../data/mcuDetail.js';
  import { defaultRange, buildReport, reportStats, consolidate, consolidatedCsv, reportFileName } from './report.js';
  import { paginate } from '../kelola-karyawan/list.js';
  import { showToast } from '../../lib/toast.svelte.js';

  const PAGE_SIZE = 50;
  const range = defaultRange();
  let filters = $state({ from: range.from, to: range.to, department: '', status: '' });
  let departments = $state([]);
  let state = $state('idle');
  let error = $state('');
  let report = $state(null);
  let employees = $state([]);
  let page = $state(1);
  let exporting = $state(false);

  const view = $derived(report ? paginate(report.rows, page, PAGE_SIZE) : null);
  const stats = $derived(report ? reportStats(report.rows, report.employeeCount) : null);
  const pageState = $derived(state === 'ready' && !report.rows.length ? 'empty' : state);

  async function generate(event) {
    event?.preventDefault();
    if (!filters.from || !filters.to) return showToast('Silakan isi tanggal mulai dan akhir');
    state = 'loading';
    try {
      const sources = await loadReportSources(filters.from, filters.to);
      employees = sources.employees;
      report = buildReport(sources.mcus, sources.employees, { department: filters.department, status: filters.status });
      page = 1;
      state = 'ready';
      showToast(`Laporan berhasil dibuat (${report.rows.length} data)`);
    } catch (failure) {
      error = failure.message;
      state = 'error';
    }
  }

  async function exportCsv() {
    exporting = true;
    try {
      const [labsByMcu, labItems, doctors] = await Promise.all([getLabsForMcus(report.mcus.map(mcu => mcu.mcuId)), getLabItems(), getDoctors().catch(() => [])]);
      const rows = consolidate(report.mcus, employees, { labsByMcu, labItems, doctors });
      if (!rows.length) throw new Error('Tidak ada data untuk di-export');
      const link = document.createElement('a');
      link.href = URL.createObjectURL(new Blob([consolidatedCsv(rows)], { type: 'text/csv;charset=utf-8;' }));
      link.download = reportFileName();
      link.click();
      showToast(`Export berhasil! ${rows.length} data karyawan`);
    } catch (failure) {
      showToast(`Gagal export: ${failure.message}`);
    } finally {
      exporting = false;
    }
  }

  onMount(async () => { departments = await getDepartments().catch(() => []); });
</script>

<PageHeader title="Laporan Periode" subtitle="Hasil MCU karyawan pada rentang tanggal tertentu.">
  <button class="btn" type="button" onclick={exportCsv} disabled={!report?.rows.length || exporting}><Icon name="dl" />{exporting ? 'Menyiapkan...' : 'Export CSV'}</button>
</PageHeader>

<form class="card filters" onsubmit={generate} aria-label="Filter laporan">
  <label>Tanggal mulai<input class="field" type="date" bind:value={filters.from} required></label>
  <label>Tanggal akhir<input class="field" type="date" bind:value={filters.to} required></label>
  <label>Departemen<select class="field" bind:value={filters.department}><option value="">Semua departemen</option>{#each departments as department (department.id)}<option>{department.name}</option>{/each}</select></label>
  <label>Status MCU<select class="field" bind:value={filters.status}><option value="">Semua</option><option>Fit</option><option>Unfit</option><option>Follow-Up</option></select></label>
  <div class="acts"><button class="btn pri" type="submit" disabled={state === 'loading'}>Buat laporan</button></div>
</form>

{#if stats}
  <div class="grid g-kpi">
    <Kpi label="Total Karyawan" value={stats.employees} sub="Karyawan unik pada laporan" />
    <Kpi label="Total MCU" value={stats.mcus} sub={`Fit: ${stats.fit} (${stats.fitPercent})`} color="var(--info)" />
    <Kpi label="Unfit / Follow-Up" value={stats.unfit} sub={stats.unfitPercent} color="var(--crit)" />
  </div>
{/if}

<Card title="Hasil laporan" note={report ? `${report.rows.length} hasil` : ''}>
  {#if state === 'idle'}
    <div class="empty"><b>Belum ada laporan</b><p>Pilih rentang tanggal lalu tekan "Buat laporan".</p></div>
  {:else}
    <DataState state={pageState} {error} onretry={generate} emptyTitle="Tidak ada data untuk periode ini" emptyText="Ubah rentang tanggal atau filter.">
      <ReportTable rows={view.items} offset={(view.page - 1) * PAGE_SIZE} />
      <Pager page={view.page} pageSize={PAGE_SIZE} total={report.rows.length} onpage={next => (page = next)} />
    </DataState>
  {/if}
</Card>
