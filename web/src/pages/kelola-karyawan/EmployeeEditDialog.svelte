<script>
  import Dialog from '../../ui/Dialog.svelte';
  import EmployeeFields from '../../features/employee/EmployeeFields.svelte';
  import { validateEmployeeForm } from '../../lib/validation.js';

  let { employee, jobTitles, departments, saving = false, onsave, onclose } = $props();

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
      <EmployeeFields bind:form {jobTitles} {departments} employeeId={employee.employeeId} />
    </form>
  {/if}
  {#snippet footer()}
    <button class="btn" type="button" onclick={onclose} disabled={saving}>Batal</button>
    <button class="btn pri" type="submit" form="edit-employee" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</button>
  {/snippet}
</Dialog>
