<script>
  import { onMount } from 'svelte';
  import PageHeader from '../../ui/PageHeader.svelte';
  import Card from '../../ui/Card.svelte';
  import Kpi from '../../ui/Kpi.svelte';
  import DataState from '../../ui/DataState.svelte';
  import Timeline from './Timeline.svelte';
  import McuCards from './McuCards.svelte';
  import HistoryTable from './HistoryTable.svelte';
  import { listEmployees, listEmployeeMcus } from '../../data/employees.js';
  import { VIEWS, filterByPeriod, summarize, timelinePoints } from './healthHistory.js';
  import { parseQuery } from '../../lib/router.js';

  let employees = $state([]);
  let employeeId = $state(parseQuery(location.search).employee || '');
  let view = $state('all');
  let all = $state([]);
  let status = $state('idle');
  let error = $state('');

  const employee = $derived(employees.find(item => item.employeeId === employeeId));
  const mcus = $derived(filterByPeriod(all, view));
  const summary = $derived(summarize(mcus));
  const pageState = $derived(status === 'ready' && !mcus.length ? 'empty' : status);

  async function pick() {
    all = [];
    if (!employeeId) { status = 'idle'; return; }
    status = 'loading';
    try { all = await listEmployeeMcus(employeeId); status = 'ready'; } catch (failure) { error = failure.message; status = 'error'; }
  }

  onMount(async () => {
    try {
      employees = (await listEmployees({ includeInactive: true })).sort((a, b) => a.name.localeCompare(b.name));
      if (employeeId) await pick();
    } catch (failure) {
      error = failure.message;
      status = 'error';
    }
  });
</script>

<PageHeader title="Riwayat Kesehatan Karyawan" subtitle="Lihat perkembangan hasil MCU karyawan dari waktu ke waktu." />

<div class="card filters" role="group" aria-label="Pilih karyawan">
  <label>Nama karyawan<select class="field" bind:value={employeeId} onchange={pick}><option value="">Pilih karyawan...</option>{#each employees as item (item.employeeId)}<option value={item.employeeId}>{item.name} ({item.employeeId})</option>{/each}</select></label>
  <label>Jenis tampilan<select class="field" bind:value={view}>{#each VIEWS as item (item.value)}<option value={item.value}>{item.label}</option>{/each}</select></label>
</div>

{#if status === 'idle'}
  <div class="empty"><b>Pilih karyawan</b><p>Pilih nama karyawan untuk melihat riwayat MCU-nya.</p></div>
{:else}
  <DataState state={pageState} {error} onretry={pick} emptyTitle="Tidak ada data MCU" emptyText="Karyawan ini belum memiliki riwayat MCU untuk periode yang dipilih.">
    <div class="grid g-kpi">
      <Kpi label="Karyawan" value={employee?.name || '-'} sub={`${employee?.department || '-'} · ${mcus.length} MCU`} />
      <Kpi label="Fit" value={summary.fit} sub="Hasil awal Fit" color="var(--good)" />
      <Kpi label="Unfit" value={summary.unfit} sub="Hasil awal Unfit" color="var(--crit)" />
      <Kpi label="Follow-Up" value={summary.followUp} sub={`Status terakhir: ${summary.latest}`} color="var(--warn)" />
    </div>
    <Card title="Timeline riwayat MCU" note="Satu titik per MCU"><Timeline points={timelinePoints(mcus)} /></Card>
    <Card title="Riwayat MCU"><McuCards {mcus} /></Card>
    <Card title="Riwayat detail"><HistoryTable {mcus} /></Card>
  </DataState>
{/if}
