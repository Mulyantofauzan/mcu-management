<script>
  import { onMount } from 'svelte';
  import Card from '../../ui/Card.svelte';
  import DataState from '../../ui/DataState.svelte';
  import Pager from '../../ui/Pager.svelte';
  import Icon from '../../ui/Icon.svelte';
  import McuDetailPanel from './mcu/McuDetailPanel.svelte';
  import { loadMcuListSources } from '../../data/mcuList.js';
  import { groupHistories } from '../dashboard/stats/jakartaCounts.js';
  import { buildMcuRows, filterMcuRows, yearsOfRows, LEVEL_LABEL, PAGE_SIZE } from './mcuList.js';
  import { paginate } from './list.js';
  import { formatDate } from '../../lib/format.js';
  import { initials } from '../../lib/people.js';
  import { pillClass } from '../../lib/status.js';
  import { MCU_TYPES, RESULTS } from '../../lib/mcuOptions.js';

  let { user } = $props();
  const PILL = { 1: 'p0', 2: 'p2', 3: 'p3' };
  let status = $state('loading');
  let error = $state('');
  let rows = $state([]);
  let filters = $state({ q: '', year: '', type: '', result: '' });
  let page = $state(1);
  let open = $state(null);

  const filtered = $derived(filterMcuRows(rows, filters));
  const view = $derived(paginate(filtered, page, PAGE_SIZE));
  const pageState = $derived(status !== 'ready' ? status : filtered.length ? 'ready' : 'empty');

  $effect(() => { filters.q; filters.year; filters.type; filters.result; page = 1; });

  async function load() {
    status = 'loading';
    try {
      const { mcus, employees, histories } = await loadMcuListSources();
      rows = buildMcuRows(mcus, employees, groupHistories(histories));
      status = 'ready';
    } catch (failure) {
      error = failure.message;
      status = 'error';
    }
  }

  onMount(load);
</script>

<Card title="Data MCU" note={status === 'ready' ? `${filtered.length} MCU` : ''}>
  <div class="tools filter-tools">
    <label class="search" for="mcu-search"><Icon name="search" size={17} /><input id="mcu-search" type="search" bind:value={filters.q} placeholder="Cari nama, NIK, atau ID MCU" autocomplete="off"></label>
    <select class="field" bind:value={filters.year} aria-label="Filter tahun"><option value="">Semua tahun</option>{#each yearsOfRows(rows) as year}<option>{year}</option>{/each}</select>
    <select class="field" bind:value={filters.type} aria-label="Filter jenis MCU"><option value="">Semua jenis</option>{#each MCU_TYPES as type}<option>{type}</option>{/each}</select>
    <select class="field" bind:value={filters.result} aria-label="Filter hasil MCU"><option value="">Semua hasil</option>{#each RESULTS as result}<option>{result}</option>{/each}</select>
  </div>
  <DataState state={pageState} {error} onretry={load} emptyTitle="Tidak ada data MCU" emptyText="Ubah filter atau kata kunci.">
    <div class="tbl-wrap">
      <table>
        <thead><tr><th>ID MCU</th><th>Karyawan</th><th>Tanggal</th><th>Jenis</th><th>Hasil</th><th>Skor Jakarta</th><th>Aksi</th></tr></thead>
        <tbody>
          {#each view.items as row (row.mcuId)}
            <tr class="row" tabindex="0" onclick={() => (open = row)} onkeydown={event => (event.key === 'Enter' || event.key === ' ') && event.target === event.currentTarget && (event.preventDefault(), (open = row))}>
              <td class="num muted">{row.mcuId}</td>
              <td><div class="who-c"><div class="ava">{initials(row.name)}</div><div><b>{row.name}</b></div></div></td>
              <td class="num">{formatDate(row.date)}</td>
              <td><span class="tag">{row.type}</span></td>
              <td><span class="pill {pillClass(row.result)}">{row.result || '-'}</span></td>
              <td>{#if row.level}<span class="pill {PILL[row.level]}">JCS {row.score} · {LEVEL_LABEL[row.level]}</span>{:else}<span class="muted">-</span>{/if}</td>
              <td><button class="btn sm" type="button" onclick={event => { event.stopPropagation(); open = row; }}>Detail</button></td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
    <Pager page={view.page} pageSize={PAGE_SIZE} total={filtered.length} onpage={next => (page = next)} />
  </DataState>
</Card>

{#if open}<McuDetailPanel mcuId={open.mcuId} employee={open.employee} {user} onclose={() => (open = null)} ondeleted={() => { open = null; load(); }} />{/if}
