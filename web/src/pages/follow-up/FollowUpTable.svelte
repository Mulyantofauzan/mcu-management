<script>
  import { initials } from '../../lib/people.js';
  import { formatDate } from '../../lib/format.js';
  import { pillClass } from '../../lib/status.js';
  import { shortNotes } from './followUp.js';

  let { rows, onupdate, onreferral } = $props();
</script>

<div class="tbl-wrap">
  <table>
    <thead><tr><th>Nama karyawan</th><th>ID karyawan</th><th>Departemen</th><th>Tanggal MCU</th><th>Hasil awal</th><th>Catatan</th><th>Aksi</th></tr></thead>
    <tbody>
      {#each rows as { employee, mcu } (mcu.mcuId)}
        <tr class="row" tabindex="0" onclick={() => onupdate({ employee, mcu })}
          onkeydown={event => (event.key === 'Enter' || event.key === ' ') && event.target === event.currentTarget && (event.preventDefault(), onupdate({ employee, mcu }))}>
          <td><div class="who-c"><div class="ava">{initials(employee.name)}</div><div><b>{employee.name}</b></div></div></td>
          <td class="num muted">{employee.employeeId}</td>
          <td>{employee.department || '-'}</td>
          <td class="num">{formatDate(mcu.mcuDate)}</td>
          <td><span class="pill {pillClass(mcu.initialResult)}">{mcu.initialResult}</span></td>
          <td class="notes" title={mcu.initialNotes || ''}>{shortNotes(mcu.initialNotes)}</td>
          <td><div class="actions-cell"><button class="btn sm" type="button" onclick={event => { event.stopPropagation(); onreferral({ employee, mcu }); }}>Surat rujukan</button><button class="btn sm pri" type="button" onclick={event => { event.stopPropagation(); onupdate({ employee, mcu }); }}>Update</button></div></td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>
