<script>
  import { onMount } from 'svelte';
  import PageHeader from '../../ui/PageHeader.svelte';
  import DataState from '../../ui/DataState.svelte';
  import Card from '../../ui/Card.svelte';
  import DonutCard from '../../ui/charts/DonutCard.svelte';
  import HBarsCard from '../../ui/charts/HBarsCard.svelte';
  import BarChart from '../../ui/charts/BarChart.svelte';
  import FilterBar from './FilterBar.svelte';
  import KpiRow from './KpiRow.svelte';
  import FollowUpCard from './FollowUpCard.svelte';
  import ActivityCard from './ActivityCard.svelte';
  import { loadDashboardData } from './load.js';
  import { buildView } from './buildView.js';

  let { user } = $props();
  const blank = () => ({ from: '', to: '', employeeType: '', department: '', mcuStatus: '' });

  let status = $state('loading');
  let error = $state('');
  let data = $state(null);
  let draft = $state(blank());
  let applied = $state(blank());

  const view = $derived(data ? buildView(data, applied) : null);
  const pageState = $derived(status !== 'ready' ? status : view.count === 0 ? 'empty' : 'ready');

  async function load() {
    status = 'loading';
    try {
      data = await loadDashboardData();
      status = 'ready';
    } catch (failure) {
      error = failure.message;
      status = 'error';
    }
  }

  const apply = () => { applied = { ...draft }; };
  const reset = () => { draft = blank(); applied = blank(); };

  onMount(load);
</script>

<PageHeader title="Dashboard MCU" subtitle="Pemantauan hasil medical check-up karyawan.">
  <a class="btn pri" href="/tambah-karyawan">Input hasil MCU</a>
</PageHeader>

{#if data}<FilterBar bind:filters={draft} departments={data.departments} onapply={apply} onreset={reset} />{/if}

{#if view}<KpiRow kpis={view.kpis} />{/if}

<DataState state={pageState} {error} onretry={load} emptyTitle="Tidak ada data pada periode ini" emptyText="Ubah rentang tanggal atau reset filter.">
  <div class="grid g-2-1">
    <Card title="Trend MCU Bulanan" note="Jumlah MCU per bulan"><BarChart items={view.trend} label="Grafik batang jumlah MCU per bulan" /></Card>
    <DonutCard title="Status MCU" note="Hasil pada periode" items={view.status} unit="MCU" />
  </div>
  <div class="grid g-3">
    <DonutCard title="Jenis MCU" note="Pada periode" items={view.types} unit="MCU" />
    <HBarsCard title="Distribusi per Departemen" note="% MCU" items={view.departments} />
    <DonutCard title="Distribusi Golongan Darah" note="Karyawan" items={view.blood} unit="karyawan" />
  </div>
  <div class="grid g-3">
    <HBarsCard title="Distribusi Usia" note="% karyawan" items={view.ages} />
    <HBarsCard title="Distribusi BMI" note="% karyawan" items={view.bmi} />
    <DonutCard title="Risiko kardiovaskular" note="Skor Jakarta" items={view.risk} unit="karyawan" />
  </div>
  <div class="grid g-2">
    <FollowUpCard items={view.followUps} total={view.followUpTotal} />
    <ActivityCard items={view.activities} canOpenLog={user.role === 'Admin'} />
  </div>
</DataState>
