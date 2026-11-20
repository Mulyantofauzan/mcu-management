<script>
  import { pillClass } from '../../lib/status.js';

  let { rows, offset } = $props();
</script>

<div class="tbl-wrap">
  <table>
    <thead><tr><th>No</th><th>ID karyawan</th><th>Nama karyawan</th><th>Departemen</th><th>Jabatan</th><th>Tanggal MCU</th><th>Tipe MCU</th><th>Status</th><th>Hasil awal</th><th>Hasil akhir</th></tr></thead>
    <tbody>
      {#each rows as row, index (offset + index)}
        <tr>
          <td class="num">{offset + index + 1}</td><td class="num muted">{row.employeeId}</td><td><b>{row.employeeName}</b></td><td>{row.department}</td><td>{row.jobTitle}</td>
          <td class="num">{row.mcuDate}</td><td>{row.mcuType}</td><td><span class="pill {pillClass(row.status)}">{row.status}</span></td><td>{row.initialResult}</td><td>{row.finalResult}</td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>
