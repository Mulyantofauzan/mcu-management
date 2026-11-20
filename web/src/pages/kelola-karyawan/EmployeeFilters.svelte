<script>
  import Icon from '../../ui/Icon.svelte';

  let { filters = $bindable(), departments, onclear } = $props();
</script>

<div class="tools filter-tools">
  <label class="search" for="emp-search">
    <Icon name="search" size={17} />
    <input id="emp-search" type="search" bind:value={filters.q} placeholder="Cari nama, ID, atau jabatan" autocomplete="off">
  </label>
  <select class="field" bind:value={filters.department} aria-label="Filter departemen">
    <option value="">Semua departemen</option>
    {#each departments as department (department.id)}<option>{department.name}</option>{/each}
  </select>
  <select class="field" bind:value={filters.active} aria-label="Filter status aktif">
    <option value="">Semua status</option><option value="Active">Aktif</option><option value="Inactive">Tidak aktif</option>
  </select>
  <select class="field" bind:value={filters.type} aria-label="Filter tipe employment">
    <option value="">Semua tipe</option><option>Karyawan PST</option><option>Vendor</option>
  </select>
  <button class="btn" type="button" onclick={onclear}>Bersihkan filter</button>
</div>
