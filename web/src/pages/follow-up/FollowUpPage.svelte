<script>
  import { onMount } from 'svelte';
  import PageHeader from '../../ui/PageHeader.svelte';
  import Card from '../../ui/Card.svelte';
  import Kpi from '../../ui/Kpi.svelte';
  import DataState from '../../ui/DataState.svelte';
  import Pager from '../../ui/Pager.svelte';
  import Icon from '../../ui/Icon.svelte';
  import FollowUpTable from './FollowUpTable.svelte';
  import FollowUpDialog from './FollowUpDialog.svelte';
  import { getCurrentModels } from '../../data/analytics.js';
  import { followUpRows, followUpStats, searchRows, departmentsOf, PAGE_SIZE } from './followUp.js';
  import { paginate } from '../kelola-karyawan/list.js';
  import { navigate } from '../../lib/router.svelte.js';
  import { getDoctors } from '../../data/mcuDetail.js';
  import { buildRujukanHtml, openPrintWindow, doctorNameOf } from '../../features/rujukan/rujukanLetter.js';
  import { calculateAge } from '../../lib/people.js';
  import { showToast } from '../../lib/toast.svelte.js';

  let { user } = $props();
  let status = $state('loading');
  let error = $state('');
  let models = $state([]);
  let filters = $state({ q: '', department: '' });
  let page = $state(1);
  let target = $state(null);

  const rows = $derived(followUpRows(models));
  const filtered = $derived(searchRows(rows, filters));
  const view = $derived(paginate(filtered, page, PAGE_SIZE));
  const stats = $derived(followUpStats(models));
  const pageState = $derived(status !== 'ready' ? status : filtered.length ? 'ready' : 'empty');

  $effect(() => { filters.q; filters.department; page = 1; });

  async function load() {
    status = 'loading';
    try {
      models = await getCurrentModels();
      status = 'ready';
    } catch (failure) {
      error = failure.message;
      status = 'error';
    }
  }

  async function printReferral({ employee, mcu }) {
    try {
      const doctors = await getDoctors().catch(() => []);
      const html = buildRujukanHtml({ ...employee, age: calculateAge(employee.birthDate) }, mcu, doctorNameOf(mcu.doctor, doctors));
      openPrintWindow(html);
      showToast('Surat Rujukan siap dicetak. Gunakan Ctrl+S atau Simpan PDF di jendela cetak.');
    } catch (failure) {
      showToast(`Gagal membuat surat rujukan: ${failure.message}`);
    }
  }

  function done(editMcuId) {
    target = null;
    if (editMcuId) navigate(`/tambah-karyawan?mcu=${encodeURIComponent(editMcuId)}`);
    else load();
  }

  onMount(load);
</script>

<PageHeader title="Follow-Up MCU" subtitle="Daftar karyawan yang memerlukan pemeriksaan lanjutan." />

{#if status === 'ready'}
  <div class="grid g-kpi">
    <Kpi label="Total Follow-Up" value={stats.total} sub="Menunggu hasil akhir" color="var(--warn)" />
    <Kpi label="Selesai Bulan Ini" value={stats.completed} sub="Hasil akhir sudah diisi" color="var(--good)" />
    <Kpi label="Perlu Perhatian" value={stats.critical} sub="MCU lebih dari 14 hari lalu" color="var(--crit)" />
  </div>
{/if}

<Card title="Daftar Follow-Up" note={status === 'ready' ? `${filtered.length} karyawan` : ''}>
  <div class="tools filter-tools">
    <label class="search" for="fu-search"><Icon name="search" size={17} /><input id="fu-search" type="search" bind:value={filters.q} placeholder="Cari nama atau ID karyawan" autocomplete="off"></label>
    <select class="field" bind:value={filters.department} aria-label="Filter departemen"><option value="">Semua departemen</option>{#each departmentsOf(rows) as department}<option>{department}</option>{/each}</select>
  </div>
  <DataState state={pageState} {error} onretry={load} emptyTitle={rows.length ? 'Tidak ada hasil' : 'Tidak ada follow-up'} emptyText={rows.length ? 'Ubah kata kunci atau filter.' : 'Semua karyawan sudah punya hasil akhir.'}>
    <FollowUpTable rows={view.items} onupdate={item => (target = item)} onreferral={printReferral} />
    <Pager page={view.page} pageSize={PAGE_SIZE} total={filtered.length} onpage={next => (page = next)} />
  </DataState>
</Card>

<FollowUpDialog {target} {user} onclose={() => (target = null)} ondone={done} />
