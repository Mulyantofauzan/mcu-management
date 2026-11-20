<script>
  import { onMount } from 'svelte';
  import PageHeader from '../../ui/PageHeader.svelte';
  import Card from '../../ui/Card.svelte';
  import DataState from '../../ui/DataState.svelte';
  import Pager from '../../ui/Pager.svelte';
  import Icon from '../../ui/Icon.svelte';
  import RiskCards from './RiskCards.svelte';
  import RiskTable from './RiskTable.svelte';
  import RiskDetailDialog from './RiskDetailDialog.svelte';
  import Calculator from './Calculator.svelte';
  import PointsTable from './PointsTable.svelte';
  import { getCurrentModels } from '../../data/analytics.js';
  import { getMedicalHistories } from '../../data/reference.js';
  import { getMetabolicLabs } from '../../data/assessment.js';
  import { groupHistories } from '../dashboard/stats/jakartaCounts.js';
  import { buildAssessments, filterAssessments, riskCounts, optionsOf, RISK_LEVELS } from './assessment.js';
  import { paginate } from '../kelola-karyawan/list.js';
  import { showToast } from '../../lib/toast.svelte.js';

  const PAGE_SIZE = 10;
  let tab = $state('dashboard');
  let status = $state('loading');
  let error = $state('');
  let all = $state([]);
  let filters = $state({ department: '', jobTitle: '', riskLevel: '', search: '' });
  let page = $state(1);
  let detail = $state(null);
  let exporting = $state(false);

  const filtered = $derived(filterAssessments(all, filters));
  const view = $derived(paginate(filtered, page, PAGE_SIZE));
  const pageState = $derived(status !== 'ready' ? status : filtered.length ? 'ready' : 'empty');

  $effect(() => { filters.department; filters.jobTitle; filters.riskLevel; filters.search; page = 1; });

  async function load() {
    status = 'loading';
    try {
      const [models, histories] = await Promise.all([getCurrentModels(), getMedicalHistories().catch(() => [])]);
      const labs = await getMetabolicLabs(models.map(({ mcu }) => mcu?.mcuId)).catch(() => new Map());
      all = buildAssessments(models, groupHistories(histories), labs);
      status = 'ready';
    } catch (failure) {
      error = failure.message;
      status = 'error';
    }
  }

  async function exportExcel() {
    exporting = true;
    try {
      const { exportRahmaExcel } = await import('../../features/export/rahmaWorkbook.js');
      await exportRahmaExcel(filtered, all);
      showToast('Data berhasil diexport ke Excel');
    } catch (failure) {
      showToast(`Gagal export data: ${failure.message}`);
    } finally {
      exporting = false;
    }
  }

  onMount(load);
</script>

<PageHeader title="Rahma - Jakarta Cardiovascular" subtitle="Penilaian risiko kardiovaskular dan sindrom metabolik karyawan.">
  <button class="btn" type="button" onclick={exportExcel} disabled={!filtered.length || exporting}><Icon name="dl" />{exporting ? 'Menyiapkan...' : 'Export ke Excel'}</button>
</PageHeader>

<div class="seg" role="group" aria-label="Tampilan">
  <button type="button" aria-pressed={tab === 'dashboard'} onclick={() => (tab = 'dashboard')}>Dashboard risiko</button>
  <button type="button" aria-pressed={tab === 'kalkulator'} onclick={() => (tab = 'kalkulator')}>Kalkulator dan tabel poin</button>
</div>

{#if tab === 'dashboard'}
  {#if status === 'ready'}<RiskCards counts={riskCounts(all)} />{/if}
  <Card title="Daftar risiko karyawan" note={status === 'ready' ? `${filtered.length} karyawan` : ''}>
    <div class="tools filter-tools">
      <label class="search" for="rahma-search"><Icon name="search" size={17} /><input id="rahma-search" type="search" bind:value={filters.search} placeholder="Cari nama" autocomplete="off"></label>
      <select class="field" bind:value={filters.department} aria-label="Filter departemen"><option value="">Semua departemen</option>{#each optionsOf(all, 'department') as item}<option>{item}</option>{/each}</select>
      <select class="field" bind:value={filters.jobTitle} aria-label="Filter jabatan"><option value="">Semua jabatan</option>{#each optionsOf(all, 'jobTitle') as item}<option>{item}</option>{/each}</select>
      <select class="field" bind:value={filters.riskLevel} aria-label="Filter risk level"><option value="">Semua risk level</option>{#each Object.entries(RISK_LEVELS) as [value, label]}<option {value}>{label} Risk</option>{/each}</select>
    </div>
    <DataState state={pageState} {error} onretry={load} emptyTitle="Tidak ada karyawan yang cocok" emptyText="Ubah filter atau kata kunci.">
      <RiskTable rows={view.items} offset={(view.page - 1) * PAGE_SIZE} ondetail={row => (detail = row)} />
      <Pager page={view.page} pageSize={PAGE_SIZE} total={filtered.length} onpage={next => (page = next)} />
    </DataState>
  </Card>
{:else}
  <div class="grid g-2"><Calculator /><PointsTable /></div>
{/if}

<RiskDetailDialog row={detail} onclose={() => (detail = null)} />
