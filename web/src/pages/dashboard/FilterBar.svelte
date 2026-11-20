<script>
  let { filters = $bindable(), departments, onapply, onreset } = $props();
  const STATUSES = ['Fit', 'Fit With Note', 'Follow-Up', 'Temporary Unfit', 'Unfit'];

  function submit(event) {
    event.preventDefault();
    onapply();
  }
</script>

<form class="card filters" onsubmit={submit} aria-label="Filter dashboard">
  <label>Tanggal mulai<input class="field" name="from" type="date" bind:value={filters.from}></label>
  <label>Tanggal akhir<input class="field" name="to" type="date" bind:value={filters.to}></label>
  <label>Status karyawan
    <select class="field" name="employeeType" bind:value={filters.employeeType}>
      <option value="">Semua status</option><option>Karyawan PST</option><option>Vendor</option>
    </select>
  </label>
  <label>Departemen
    <select class="field" name="department" bind:value={filters.department}>
      <option value="">Semua departemen</option>
      {#each departments as department (department.id)}<option>{department.name}</option>{/each}
    </select>
  </label>
  <label>Status MCU
    <select class="field" name="mcuStatus" bind:value={filters.mcuStatus}>
      <option value="">Semua status MCU</option>
      {#each STATUSES as status}<option>{status}</option>{/each}
    </select>
  </label>
  <div class="acts"><button class="btn pri" type="submit">Terapkan filter</button><button class="btn" type="button" onclick={onreset}>Reset</button></div>
</form>
