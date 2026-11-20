<script>
  /* Kolom form karyawan yang dipakai dialog Edit dan Tambah karyawan baru. */
  let { form = $bindable(), jobTitles, departments, employeeId = '' } = $props();
  const BLOOD = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
</script>

<div class="form">
  {#if employeeId}<label>ID Karyawan<input class="field" value={employeeId} readonly></label>{/if}
  <label>Nama lengkap<input class="field" bind:value={form.name} required autocomplete="off"></label>
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
