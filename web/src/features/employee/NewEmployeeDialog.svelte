<script>
  import Dialog from '../../ui/Dialog.svelte';
  import EmployeeFields from './EmployeeFields.svelte';
  import { validateEmployeeForm } from '../../lib/validation.js';

  let { open, jobTitles, departments, saving = false, onsave, onclose } = $props();
  const blank = () => ({ name: '', jobTitle: '', department: '', birthDate: '', bloodType: '', gender: 'Laki-laki', employeeType: 'Karyawan PST', vendorName: '', isActive: true, inactiveReason: '' });

  let form = $state(blank());
  let errors = $state([]);

  $effect(() => { if (open) { form = blank(); errors = []; } });

  function submit(event) {
    event.preventDefault();
    const sanitized = { ...form, name: form.name.trim().replace(/[<>]/g, '').slice(0, 200), vendorName: form.employeeType === 'Vendor' ? form.vendorName.trim().replace(/[<>]/g, '').slice(0, 200) : '' };
    const result = validateEmployeeForm(sanitized);
    errors = result.errors;
    if (result.isValid) onsave(sanitized);
  }
</script>

<Dialog {open} {onclose} title="Tambah Karyawan Baru" subtitle="Lengkapi data karyawan sebelum input MCU." size="wide">
  <form id="new-employee" onsubmit={submit}>
    {#if errors.length}<div class="alert bad" role="alert"><ul class="err-list">{#each errors as message}<li>{message}</li>{/each}</ul></div>{/if}
    <EmployeeFields bind:form {jobTitles} {departments} />
  </form>
  {#snippet footer()}
    <button class="btn" type="button" onclick={onclose} disabled={saving}>Batal</button>
    <button class="btn pri" type="submit" form="new-employee" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan karyawan'}</button>
  {/snippet}
</Dialog>
