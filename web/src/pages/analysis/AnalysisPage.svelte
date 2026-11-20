<script>
  import { onMount } from 'svelte';
  import PageHeader from '../../ui/PageHeader.svelte';
  import Card from '../../ui/Card.svelte';
  import Kpi from '../../ui/Kpi.svelte';
  import DataState from '../../ui/DataState.svelte';
  import BarChart from '../../ui/charts/BarChart.svelte';
  import DonutCard from '../../ui/charts/DonutCard.svelte';
  import StackedBars from '../../ui/charts/StackedBars.svelte';
  import LabGrid from './LabGrid.svelte';
  import ExamGrid from './ExamGrid.svelte';
  import { getCurrentModels } from '../../data/analytics.js';
  import { getReviewedHistory } from '../../data/analysis.js';
  import { getLabsForMcus } from '../../data/report.js';
  import {
    yearlyEntries, yearsOf, applyFilters, summary, trendByYear, bmiDistribution, bloodPressureDistribution, visionDistribution,
    smokingDistribution, exerciseDistribution, labStats, optionsOf, STATUSES
  } from './analysis.js';
  import { showToast } from '../../lib/toast.svelte.js';

  const blank = () => ({ period: 'latest', year: '', department: '', jobTitle: '', status: '' });
  let draft = $state(blank());
  let applied = $state(blank());
  let current = $state([]);
  let yearly = $state(null);
  let labs = $state(new Map());
  let status = $state('loading');
  let error = $state('');

  const base = $derived(applied.period === 'all-years' ? (yearly ?? []) : current);
  const items = $derived(applyFilters(base, { ...applied, year: applied.period === 'all-years' ? applied.year : '' }));
  const stats = $derived(summary(items));
  const trend = $derived(trendByYear(items));
  const pageState = $derived(status !== 'ready' ? status : items.length ? 'ready' : 'empty');
  const years = $derived(yearsOf(yearly ?? []));

  const coloured = (rows, colors) => rows.map((row, i) => ({ ...row, color: colors[i % colors.length] }));
  const G = 'var(--good)', I = 'var(--info)', W = 'var(--warn)', C = 'var(--crit)', M = 'var(--muted)', F = 'var(--fg)';

  async function ensureLabs(list) {
    const missing = list.map(({ mcu }) => mcu.mcuId).filter(id => !labs.has(String(id)));
    if (!missing.length) return;
    try {
      const fetched = await getLabsForMcus(missing, 'mcu_id, lab_item_id, value, notes');
      const next = new Map(labs);
      fetched.forEach((rows, id) => next.set(id, rows));
      labs = next;
    } catch (failure) {
      showToast(`Data lab gagal dimuat: ${failure.message}`);
    }
  }

  $effect(() => { if (status === 'ready') ensureLabs(items); });

  async function load() {
    status = 'loading';
    try {
      current = await getCurrentModels();
      status = 'ready';
    } catch (failure) {
      error = failure.message;
      status = 'error';
    }
  }

  async function apply(event) {
    event.preventDefault();
    if (draft.period === 'all-years' && yearly === null) {
      try { yearly = yearlyEntries(await getReviewedHistory()); } catch (failure) { showToast(`Riwayat MCU gagal dimuat: ${failure.message}`); return; }
    }
    applied = { ...draft };
  }

  const reset = () => { draft = blank(); applied = blank(); };

  onMount(load);
</script>

<PageHeader title="Analisis" subtitle="Ringkasan hasil MCU, pemeriksaan, dan hasil lab karyawan." />

<form class="card filters" onsubmit={apply} aria-label="Filter analisis">
  <label>Periode MCU<select class="field" bind:value={draft.period}><option value="latest">MCU Terakhir</option><option value="all-years">Semua Tahun</option></select></label>
  {#if draft.period === 'all-years'}<label>Tahun MCU<select class="field" bind:value={draft.year}><option value="">Semua tahun</option>{#each years as year}<option>{year}</option>{/each}</select></label>{/if}
  <label>Departemen<select class="field" bind:value={draft.department}><option value="">Semua departemen</option>{#each optionsOf(base, item => item.employee.department) as item}<option>{item}</option>{/each}</select></label>
  <label>Job title<select class="field" bind:value={draft.jobTitle}><option value="">Semua job title</option>{#each optionsOf(base, item => item.employee.jobTitle) as item}<option>{item}</option>{/each}</select></label>
  <label>Status kesehatan<select class="field" bind:value={draft.status}><option value="">Semua status</option>{#each STATUSES as item}<option>{item}</option>{/each}</select></label>
  <div class="acts"><button class="btn pri" type="submit">Terapkan filter</button><button class="btn" type="button" onclick={reset}>Reset</button></div>
</form>

<DataState state={pageState} {error} onretry={load} emptyTitle="Tidak ada data" emptyText="Ubah filter lalu terapkan lagi.">
  <div class="grid g-kpi">
    <Kpi label="Total MCU" value={stats.total} sub={applied.period === 'latest' ? 'MCU terakhir per karyawan aktif' : 'Satu MCU per karyawan per tahun'} />
    <Kpi label="Fit" value={stats.fit} sub="Hasil Fit" color="var(--good)" />
    <Kpi label="Fit With Note" value={stats.fitWithNote} sub="Hasil Fit With Note" color="var(--info)" />
    <Kpi label="Unfit" value={stats.unfit} sub="Hasil Unfit" color="var(--crit)" />
  </div>
  <Card title="Trend MCU berdasarkan status dan tahun" note="Jumlah MCU per tahun"><StackedBars labels={trend.years.map(String)} series={trend.series} label="Grafik batang bertumpuk MCU per status dan tahun" /></Card>
  <div class="grid g-2">
    <Card title="Distribusi BMI" note="Jumlah karyawan"><BarChart items={bmiDistribution(items).map(row => ({ ...row, label: row.label.split(' ')[0] }))} label="Grafik batang distribusi BMI" /></Card>
    <Card title="Distribusi tekanan darah" note="mmHg"><BarChart items={bloodPressureDistribution(items)} label="Grafik batang distribusi tekanan darah" /></Card>
  </div>
  <div class="grid g-3">
    <DonutCard title="Hasil pemeriksaan penglihatan" note="Nilai terburuk dari 4 pasang mata" items={coloured(visionDistribution(items), [G, W, C, F, M])} unit="karyawan" />
    <DonutCard title="Status merokok" note="Karyawan" items={coloured(smokingDistribution(items), [G, W, C])} unit="karyawan" />
    <DonutCard title="Frekuensi olahraga" note="Karyawan" items={coloured(exerciseDistribution(items), [G, I, W, C])} unit="karyawan" />
  </div>
  <h2 class="group-title">Physical examination results</h2>
  <ExamGrid {items} />
  <h2 class="group-title">Analisis hasil lab</h2>
  <LabGrid stats={labStats(items, labs)} />
</DataState>
