<script>
  import { onMount } from 'svelte';
  import PageHeader from '../../ui/PageHeader.svelte';
  import EmployeePicker from './EmployeePicker.svelte';
  import McuForm from './McuForm.svelte';
  import SavedNotice from './SavedNotice.svelte';
  import NewEmployeeDialog from '../../features/employee/NewEmployeeDialog.svelte';
  import { createEmployee, findEmployee } from '../../data/employeesCreate.js';
  import { getDepartments, getJobTitles } from '../../data/reference.js';
  import { getDoctors } from '../../data/mcuDetail.js';
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
    showToast(`MCU${labs} berhasil disimpan!`);
    result.warnings.forEach(showToast);
  }

  function again() {
    saved = null;
    employee = null;
  }

  onMount(async () => {
    const [depts, jobs, docs] = await Promise.all([getDepartments().catch(() => []), getJobTitles().catch(() => []), getDoctors().catch(() => [])]);
    departments = depts; jobTitles = jobs; doctors = docs;
    const id = parseQuery(location.search).employee;
    if (id) employee = await findEmployee(id).catch(() => null);
  });
</script>

<PageHeader title="Tambah Karyawan" subtitle="Cari atau tambah karyawan, lalu input hasil MCU." />

{#if saved}
  <SavedNotice result={saved} {employee} onagain={again} />
{:else if employee}
  <McuForm {employee} {doctors} {user} onsaved={done} onchange={() => (employee = null)} />
{:else}
  <EmployeePicker onpick={picked => (employee = picked)} onnew={() => (creating = true)} />
{/if}

<NewEmployeeDialog open={creating} {jobTitles} {departments} saving={busy} onsave={addEmployee} onclose={() => (creating = false)} />
