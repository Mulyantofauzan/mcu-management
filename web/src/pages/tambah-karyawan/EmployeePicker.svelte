<script>
  import Card from '../../ui/Card.svelte';
  import Icon from '../../ui/Icon.svelte';
  import { searchEmployees } from '../../data/employeesCreate.js';
  import { formatDate } from '../../lib/format.js';
  import { showToast } from '../../lib/toast.svelte.js';

  let { onpick, onnew } = $props();
  let term = $state('');
  let results = $state([]);
  let note = $state('');
  let timer;

  async function search() {
    const value = term.trim();
    results = [];
    if (!value) { note = ''; return; }
    if (value.length < 2) { note = 'Ketik minimal 2 karakter untuk mencari...'; return; }
    try {
      results = await searchEmployees(value);
      note = results.length ? '' : 'Tidak ditemukan';
    } catch (failure) {
      showToast(`Gagal mencari: ${failure.message}`);
    }
  }

  function typing() {
    clearTimeout(timer);
    timer = setTimeout(search, 250);
  }
</script>

<Card title="Cari karyawan" note="Pilih karyawan, lalu input hasil MCU">
  <div class="tools">
    <label class="search" for="pick-search"><Icon name="search" size={17} /><input id="pick-search" type="search" bind:value={term} oninput={typing} placeholder="Cari nama atau ID karyawan" autocomplete="off"></label>
    <button class="btn" type="button" onclick={onnew}><Icon name="plus" />Tambah karyawan baru</button>
  </div>
  {#if note}<p class="muted gap-top" role="status">{note}</p>{/if}
  {#if results.length}
    <div class="tbl-wrap gap-top">
      <table>
        <thead><tr><th>Nama</th><th>ID</th><th>Tanggal lahir</th><th>Jabatan</th><th>Departemen</th><th>Aksi</th></tr></thead>
        <tbody>
          {#each results as employee (employee.employeeId)}
            <tr><td><b>{employee.name}</b></td><td class="num muted">{employee.employeeId}</td><td class="num">{formatDate(employee.birthDate)}</td>
              <td>{employee.jobTitle || '-'}</td><td>{employee.department || '-'}</td>
              <td><button class="btn sm pri" type="button" onclick={() => onpick(employee)}>+ Tambah MCU</button></td></tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</Card>
