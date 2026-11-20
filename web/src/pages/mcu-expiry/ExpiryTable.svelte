<script>
  import { initials } from '../../lib/people.js';
  import { formatDate } from '../../lib/format.js';
  import { STATUS_LABEL, daysText } from './expiry.js';

  let { rows, offset } = $props();
</script>

<div class="tbl-wrap">
  <table>
    <thead><tr><th>No</th><th>ID karyawan</th><th>Nama</th><th>Departemen</th><th>Job title</th><th>Tanggal pemeriksaan</th><th>Berlaku sampai</th><th>Hari tersisa</th><th>Status</th></tr></thead>
    <tbody>
      {#each rows as row, index (row.employeeId)}
        <tr>
          <td class="num">{offset + index + 1}</td>
          <td class="num muted">{row.employeeId || '-'}</td>
          <td><div class="who-c"><div class="ava">{initials(row.name)}</div><div><b>{row.name}</b></div></div></td>
          <td>{row.department}</td>
          <td>{row.jobTitle}</td>
          <td class="num">{row.lastMcuDate ? formatDate(row.lastMcuDate) : '-'}</td>
          <td class="num">{row.expiryDate ? formatDate(row.expiryDate) : '-'}</td>
          <td class="num">{daysText(row.daysLeft)}</td>
          <td><span class="pill" class:p3={row.expiryStatus === 'EXPIRED'} class:p2={row.expiryStatus === 'WARNING'}>{STATUS_LABEL[row.expiryStatus] || row.expiryStatus}</span></td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>
