<script>
  import { onMount } from 'svelte';
  import PageHeader from '../../ui/PageHeader.svelte';
  import Card from '../../ui/Card.svelte';
  import DataState from '../../ui/DataState.svelte';
  import Pager from '../../ui/Pager.svelte';
  import ConfirmDialog from '../../ui/ConfirmDialog.svelte';
  import Icon from '../../ui/Icon.svelte';
  import EmployeeFilters from './EmployeeFilters.svelte';
  import EmployeeTable from './EmployeeTable.svelte';
  import EmployeeDetailDialog from './EmployeeDetailDialog.svelte';
  import EmployeeEditDialog from './EmployeeEditDialog.svelte';
  import { listEmployees, updateEmployee, softDeleteEmployee } from '../../data/employees.js';
  import { getDepartments, getJobTitles } from '../../data/reference.js';
  import { filterEmployees, paginate, PAGE_SIZE } from './list.js';
  import { employeeExportRows } from './exportRows.js';
  import { downloadCsv } from '../../lib/csv.js';
  import { showToast } from '../../lib/toast.svelte.js';
  import { parseQuery } from '../../lib/router.js';

  let { user } = $props();
  const blank = () => ({ q: '', department: '', active: '', type: '' });

  let status = $state('loading');
  let error = $state('');
  let employees = $state([]);
  let departments = $state([]);
  let jobTitles = $state([]);
  let filters = $state({ ...blank(), q: parseQuery(location.search).q || '' });
  let page = $state(1);
  let detail = $state(null);
  let editing = $state(null);
  let deleting = $state(null);
  let busy = $state(false);

  const filtered = $derived(filterEmployees(employees, filters));
  const view = $derived(paginate(filtered, page));
  const pageState = $derived(status !== 'ready' ? status : filtered.length ? 'ready' : 'empty');

  $effect(() => { filters.q; filters.department; filters.active; filters.type; page = 1; });

  async function load() {
    status = 'loading';
    try {
      const [list, depts, jobs] = await Promise.all([
        listEmployees({ includeInactive: true }),
        getDepartments().catch(() => []),
        getJobTitles().catch(() => [])
      ]);
      employees = list; departments = depts; jobTitles = jobs;
      status = 'ready';
    } catch (failure) {
      error = failure.message;
      status = 'error';
    }
  }

  async function save(employeeId, form) {
    busy = true;
    try {
      await updateEmployee(employeeId, form, user);
      showToast('Data karyawan berhasil diupdate');
      editing = null;
      await load();
    } catch (failure) {
      showToast(`Gagal mengupdate karyawan: ${failure.message}`);
    } finally {
      busy = false;
    }
  }

  async function remove() {
    busy = true;
    try {
      await softDeleteEmployee(deleting.employeeId, deleting.name, user);
      showToast('Karyawan berhasil dihapus');
      deleting = null;
      await load();
    } catch (failure) {
      showToast(`Gagal menghapus: ${failure.message}`);
    } finally {
      busy = false;
    }
  }

  const exportCsv = () => (filtered.length ? downloadCsv(employeeExportRows(filtered), 'data_karyawan') : showToast('Tidak ada data untuk diekspor'));

  onMount(load);
</script>

<PageHeader title="Kelola Karyawan" subtitle="Cari, filter, dan kelola data karyawan beserta riwayat MCU-nya.">
  <button class="btn" type="button" onclick={exportCsv}><Icon name="dl" />Export</button>
  <a class="btn pri" href="/tambah-karyawan"><Icon name="plus" />Tambah karyawan</a>
</PageHeader>

<Card title="Daftar Karyawan" note={status === 'ready' ? `${filtered.length} karyawan` : ''}>
  <EmployeeFilters bind:filters {departments} onclear={() => (filters = blank())} />
  <DataState state={pageState} {error} onretry={load} emptyTitle="Tidak ada data" emptyText="Ubah filter atau kata kunci.">
    <EmployeeTable rows={view.items} ondetail={employee => (detail = employee)} onedit={employee => (editing = employee)} ondelete={employee => (deleting = employee)} />
    <Pager page={view.page} pageSize={PAGE_SIZE} total={filtered.length} onpage={next => (page = next)} />
  </DataState>
</Card>

<EmployeeDetailDialog employee={detail} onclose={() => (detail = null)} />
<EmployeeEditDialog employee={editing} {jobTitles} {departments} saving={busy} onsave={save} onclose={() => (editing = null)} />
<ConfirmDialog open={Boolean(deleting)} title="Hapus karyawan?" {busy} onconfirm={remove} onclose={() => (deleting = null)}>
  {#if deleting}<p>Karyawan <b>{deleting.name}</b> akan dipindahkan ke Data Terhapus bersama semua MCU dan dokumennya.</p>{/if}
</ConfirmDialog>
