<script>
  import Dialog from '../../ui/Dialog.svelte';
  import { validateEmployeeForm } from '../../lib/validation.js';

  let { employee, jobTitles, departments, saving = false, onsave, onclose } = $props();
  const BLOOD = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  let form = $state(null);
  let errors = $state([]);

  $effect(() => {
    if (!employee) { form = null; return; }
    form = {
      name: employee.name || '', jobTitle: employee.jobTitle || '', department: employee.department || '',
      birthDate: employee.birthDate ? String(employee.birthDate).slice(0, 10) : '', bloodType: employee.bloodType || '',
      gender: employee.gender || 'Laki-laki', employeeType: employee.employeeType || 'Karyawan PST',
      vendorName: employee.vendorName || '', isActive: employee.isActive !== false, inactiveReason: employee.inactiveReason || ''
    };
    errors = [];
  });

  function submit(event) {
    event.preventDefault();
    const payload = { ...form, vendorName: form.employeeType === 'Vendor' ? form.vendorName : '' };
    const result = validateEmployeeForm(payload);
    errors = result.errors;
    if (result.isValid) onsave(employee.employeeId, payload);
  }
</script>

<Dialog open={Boolean(employee)} {onclose} title="Edit Karyawan" subtitle="Perbarui data karyawan." size="wide">
  {#if form}
    <form id="edit-employee" onsubmit={submit}>
      {#if errors.length}<div class="alert bad" role="alert"><ul class="err-list">{#each errors as message}<li>{message}</li>{/each}</ul></div>{/if}
      <div class="form">
        <label>ID Karyawan<input class="field" value={employee.employeeId} readonly></label>
        <label>Nama lengkap<input class="field" bind:value={form.name} required></label>
        <label>Jabatan
          <select class="field" bind:value={form.jobTitle} required>
            <option value="">Pilih...</option>
            {#each jobTitles as job (job.id)}<option>{job.name}</option>{/each}
            {#if form.jobTitle && !jobTitles.some(job => job.name === form.jobTitle)}<option>{form.jobTitle}</option>{/if}
          </select>
        </label>
        <label>Departemen
          <select class="field" bind:value={form.department} required>
            <option value="">Pilih...</option>
            {#each departments as department (department.id)}<option>{department.name}</option>{/each}
            {#if form.department && !departments.some(department => department.name === form.department)}<option>{form.department}</option>{/if}
          </select>
        </label>
        <label>Tanggal lahir<input class="field" type="date" bind:value={form.birthDate} required></label>
        <label>Golongan darah
          <select class="field" bind:value={form.bloodType} required><option value="">Pilih...</option>{#each BLOOD as type}<option>{type}</option>{/each}</select>
        </label>
        <label>Jenis kelamin
          <select class="field" bind:value={form.gender} required><option>Laki-laki</option><option>Perempuan</option></select>
        </label>
        <label>Status karyawan
          <select class="field" bind:value={form.employeeType} required><option>Karyawan PST</option><option>Vendor</option></select>
        </label>
        {#if form.employeeType === 'Vendor'}<label>Nama vendor<input class="field" bind:value={form.vendorName}></label>{/if}
        <label>Status aktif
          <select class="field" bind:value={form.isActive} required><option value={true}>Aktif</option><option value={false}>Tidak aktif</option></select>
        </label>
        {#if !form.isActive}<label class="full">Alasan tidak aktif<input class="field" bind:value={form.inactiveReason}></label>{/if}
      </div>
    </form>
  {/if}
  {#snippet footer()}
    <button class="btn" type="button" onclick={onclose} disabled={saving}>Batal</button>
    <button class="btn pri" type="submit" form="edit-employee" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</button>
  {/snippet}
</Dialog>
