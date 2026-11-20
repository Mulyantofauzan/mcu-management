<script>
  import Icon from '../../ui/Icon.svelte';
  import { initials } from '../../lib/people.js';

  let { rows, ondetail, onedit, ondelete } = $props();
</script>

<div class="tbl-wrap">
  <table>
    <thead><tr><th>Nama</th><th>ID</th><th>Jabatan</th><th>Departemen</th><th>Status</th><th>Aksi</th></tr></thead>
    <tbody>
      {#each rows as employee (employee.employeeId)}
        <tr class="row" tabindex="0" onclick={() => ondetail(employee)}
          onkeydown={event => (event.key === 'Enter' || event.key === ' ') && event.target === event.currentTarget && (event.preventDefault(), ondetail(employee))}>
          <td><div class="who-c"><div class="ava">{initials(employee.name)}</div><div><b>{employee.name}</b></div></div></td>
          <td class="num muted">{employee.employeeId}</td>
          <td>{employee.jobTitle || '-'}</td>
          <td>{employee.department || '-'}</td>
          <td><span class="pill" class:p0={employee.isActive} class:pm={!employee.isActive}>{employee.isActive ? 'Aktif' : 'Tidak aktif'}</span></td>
          <td>
            <div class="actions-cell" onclick={event => event.stopPropagation()} role="presentation">
              <button class="btn sm" type="button" onclick={() => ondetail(employee)}>Detail</button>
              <button class="btn sm" type="button" onclick={() => onedit(employee)}>Edit</button>
              <a class="btn sm" href={`/tambah-karyawan?employee=${encodeURIComponent(employee.employeeId)}`}>Tambah MCU</a>
              <button class="btn sm icon danger-text" type="button" onclick={() => ondelete(employee)} aria-label={`Hapus ${employee.name}`}><Icon name="trash" /></button>
            </div>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>
