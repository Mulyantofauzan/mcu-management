<script>
  import { onMount } from 'svelte';
  import PageHeader from '../../ui/PageHeader.svelte';
  import EmployeePicker from './EmployeePicker.svelte';
  import McuForm from './McuForm.svelte';
  import SavedNotice from './SavedNotice.svelte';
  import UpdatedNotice from './UpdatedNotice.svelte';
  import DataState from '../../ui/DataState.svelte';
  import NewEmployeeDialog from '../../features/employee/NewEmployeeDialog.svelte';
  import { createEmployee, findEmployee } from '../../data/employeesCreate.js';
  import { getDepartments, getJobTitles } from '../../data/reference.js';
  import { getDoctors, getMcu, getLabResults, getMcuMedicalHistories, getMcuFamilyHistories } from '../../data/mcuDetail.js';
  import { navigate } from '../../lib/router.svelte.js';
  import { parseQuery } from '../../lib/router.js';
  import { showToast } from '../../lib/toast.svelte.js';

  let { user } = $props();
  let employee = $state(null);
  let saved = $state(null);
  let departments = $state([]);
  let jobTitles = $state([]);
  let doctors = $state([]);
  let creating = $state(false);
  let busy = $state(false);
  let editInit = $state(null);
  let editState = $state('');
  let editError = $state('');
  let updated = $state(null);
  const mcuParam = parseQuery(location.search).mcu;

  async function addEmployee(form) {
    busy = true;
    try {
      employee = await createEmployee(form, user);
      creating = false;
      showToast('Karyawan berhasil ditambahkan!');
    } catch (failure) {
      showToast(`Gagal menambah karyawan: ${failure.message}`);
    } finally {
      busy = false;
    }
  }

  function done(result) {
    saved = result;
    const labs = result.labSaved ? ` dan ${result.labSaved} hasil lab` : '';
    const docs = result.fileCount ? ` serta ${result.fileCount} dokumen` : '';
    showToast(`MCU${labs}${docs} berhasil disimpan!`);
    result.warnings.forEach(showToast);
  }

  async function loadEdit(id) {
    editState = 'loading';
    try {
      const mcu = await getMcu(id);
      if (!mcu) throw new Error('MCU tidak ditemukan');
      const [labs, medical, family, found] = await Promise.all([getLabResults(id), getMcuMedicalHistories(id).catch(() => []), getMcuFamilyHistories(id).catch(() => []), findEmployee(mcu.employeeId).catch(() => null)]);
      employee = found || { employeeId: mcu.employeeId, name: mcu.employeeId };
      editInit = { mcu, labs, medical, family };
      editState = 'ready';
    } catch (failure) {
      editError = failure.message;
      editState = 'error';
    }
  }

  function updatedDone(result) {
    updated = result;
    showToast(result.changed || result.fileCount ? 'Perubahan MCU berhasil disimpan!' : 'Tidak ada perubahan untuk disimpan');
    result.warnings.forEach(showToast);
  }

  function again() {
    saved = null;
    employee = null;
  }

  onMount(async () => {
    const [depts, jobs, docs] = await Promise.all([getDepartments().catch(() => []), getJobTitles().catch(() => []), getDoctors().catch(() => [])]);
    departments = depts; jobTitles = jobs; doctors = docs;
    if (mcuParam) { await loadEdit(mcuParam); return; }
    const id = parseQuery(location.search).employee;
    if (id) employee = await findEmployee(id).catch(() => null);
  });
</script>

<PageHeader title={mcuParam ? 'Edit MCU' : 'Tambah Karyawan'} subtitle={mcuParam ? 'Perbarui hasil pemeriksaan. Setiap perubahan dicatat di riwayat.' : 'Cari atau tambah karyawan, lalu input hasil MCU.'} />

{#if mcuParam}
  {#if updated}
    <UpdatedNotice result={updated} {employee} />
  {:else}
    <DataState state={editState} error={editError} onretry={() => loadEdit(mcuParam)}>
      {#if editInit}<McuForm {employee} {doctors} {user} initial={editInit} onsaved={updatedDone} onchange={() => navigate('/kelola-karyawan')} />{/if}
    </DataState>
  {/if}
{:else if saved}
  <SavedNotice result={saved} {employee} onagain={again} />
{:else if employee}
  <McuForm {employee} {doctors} {user} onsaved={done} onchange={() => (employee = null)} />
{:else}
  <EmployeePicker onpick={picked => (employee = picked)} onnew={() => (creating = true)} />
{/if}

<NewEmployeeDialog open={creating} {jobTitles} {departments} saving={busy} onsave={addEmployee} onclose={() => (creating = false)} />
