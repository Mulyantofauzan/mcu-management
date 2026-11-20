<script>
  import { onMount } from 'svelte';
  import PageHeader from '../../ui/PageHeader.svelte';
  import Card from '../../ui/Card.svelte';
  import DataState from '../../ui/DataState.svelte';
  import ConfirmDialog from '../../ui/ConfirmDialog.svelte';
  import Icon from '../../ui/Icon.svelte';
  import TrashTable from './TrashTable.svelte';
  import { listDeletedEmployees, listDeletedMcus, restoreEmployee, restoreMcu, permanentDeleteEmployee, permanentDeleteMcu } from '../../data/trash.js';
  import { runBatch, batchMessage, prune } from './selection.js';
  import { formatDate } from '../../lib/format.js';
  import { showToast } from '../../lib/toast.svelte.js';

  let { user } = $props();
  const EMPLOYEE_COLUMNS = [
    { label: 'Nama', render: row => row.name }, { label: 'ID', render: row => row.employeeId, num: true }, { label: 'Jabatan', render: row => row.jobTitle || '-' },
    { label: 'Departemen', render: row => row.department || '-' }, { label: 'Dihapus', render: row => formatDate(row.deletedAt), num: true }
  ];
  const MCU_COLUMNS = [
    { label: 'Karyawan', render: row => row.employeeName }, { label: 'MCU ID', render: row => row.mcuId, num: true }, { label: 'Tanggal', render: row => formatDate(row.mcuDate), num: true },
    { label: 'Tipe', render: row => row.mcuType || '-' }, { label: 'Tanggal hapus', render: row => formatDate(row.deletedAt), num: true }
  ];

  let tab = $state('employee');
  let status = $state('loading');
  let error = $state('');
  let employees = $state([]);
  let mcus = $state([]);
  let selected = $state({ employee: [], mcu: [] });
  let pending = $state(null);
  let busy = $state(false);

  const rows = $derived(tab === 'employee' ? employees : mcus);
  const pageState = $derived(status !== 'ready' ? status : rows.length ? 'ready' : 'empty');

  async function load() {
    status = 'loading';
    try {
      [employees, mcus] = await Promise.all([listDeletedEmployees(), listDeletedMcus()]);
      selected = { employee: prune(selected.employee, employees.map(row => row.employeeId)), mcu: prune(selected.mcu, mcus.map(row => row.mcuId)) };
      status = 'ready';
    } catch (failure) {
      error = failure.message;
      status = 'error';
    }
  }

  const ask = (kind, action) => ids => { if (ids.length) pending = { kind, action, ids }; };
  const bulk = (action) => ask(tab, action)(selected[tab]);

  async function confirm() {
    const { kind, action, ids } = pending;
    busy = true;
    const byEmployee = new Map(employees.map(row => [row.employeeId, row]));
    const runner = { 'employee:restore': id => restoreEmployee(byEmployee.get(id), user), 'employee:delete': id => permanentDeleteEmployee(byEmployee.get(id), user),
      'mcu:restore': id => restoreMcu(id), 'mcu:delete': id => permanentDeleteMcu(id, user) }[`${kind}:${action}`];
    const result = await runBatch(ids, runner);
    const message = batchMessage(kind === 'employee' ? 'karyawan' : 'MCU', action === 'restore' ? 'di-restore' : 'dihapus permanen', result);
    showToast(message.text);
    busy = false;
    pending = null;
    await load();
  }

  onMount(load);
</script>

<PageHeader title="Data Terhapus" subtitle="Restore atau hapus permanen data yang telah dihapus. Hanya Admin yang dapat mengakses halaman ini." />

<div class="seg" role="group" aria-label="Jenis data terhapus">
  <button type="button" aria-pressed={tab === 'employee'} onclick={() => (tab = 'employee')}>Karyawan <span>{employees.length}</span></button>
  <button type="button" aria-pressed={tab === 'mcu'} onclick={() => (tab = 'mcu')}>MCU <span>{mcus.length}</span></button>
</div>

<Card title={tab === 'employee' ? 'Daftar Karyawan Terhapus' : 'Daftar MCU Terhapus'}>
  <div class="tools filter-tools">
    <span class="muted">Total: <b class="num">{rows.length}</b> · Dipilih: <b class="num">{selected[tab].length}</b></span>
    <button class="btn" type="button" disabled={!selected[tab].length} onclick={() => bulk('restore')}><Icon name="history" />Restore terpilih</button>
    <button class="btn danger" type="button" disabled={!selected[tab].length} onclick={() => bulk('delete')}><Icon name="trash" />Hapus permanen terpilih</button>
  </div>
  <DataState state={pageState} {error} onretry={load} emptyTitle="Tempat sampah kosong" emptyText="Belum ada data yang dihapus.">
    {#if tab === 'employee'}
      <TrashTable rows={employees} idOf={row => row.employeeId} nameOf={row => row.name} columns={EMPLOYEE_COLUMNS} bind:selected={selected.employee} onrestore={ask('employee', 'restore')} ondelete={ask('employee', 'delete')} />
    {:else}
      <TrashTable rows={mcus} idOf={row => row.mcuId} nameOf={row => row.employeeName} columns={MCU_COLUMNS} bind:selected={selected.mcu} onrestore={ask('mcu', 'restore')} ondelete={ask('mcu', 'delete')} />
    {/if}
  </DataState>
</Card>

<ConfirmDialog open={Boolean(pending)} title={pending?.action === 'restore' ? 'Restore data?' : 'Hapus permanen?'} confirmLabel={pending?.action === 'restore' ? 'Ya, restore' : 'Ya, hapus permanen'} {busy} onconfirm={confirm} onclose={() => (pending = null)}>
  {#if pending}
    {#if pending.action === 'restore'}
      <p>Restore <b>{pending.ids.length}</b> {pending.kind === 'employee' ? 'karyawan beserta MCU dan dokumennya' : 'MCU'}?</p>
    {:else}
      <p>Hapus permanen <b>{pending.ids.length}</b> {pending.kind === 'employee' ? 'karyawan beserta seluruh MCU, hasil lab, dan dokumennya' : 'MCU beserta hasil lab, riwayat, dan dokumennya'}. <b>Tindakan ini tidak dapat dibatalkan.</b></p>
    {/if}
  {/if}
</ConfirmDialog>
