<script>
  import Dialog from '../../ui/Dialog.svelte';
  import McuDetailPanel from './mcu/McuDetailPanel.svelte';
  import DataState from '../../ui/DataState.svelte';
  import { listEmployeeMcus } from '../../data/employees.js';
  import { formatDate } from '../../lib/format.js';
  import { calculateAge } from '../../lib/people.js';
  import { resultOf, pillClass } from '../../lib/status.js';

  let { employee, user, onclose, onchanged } = $props();
  let mcuId = $state(null);
  let state = $state('loading');
  let mcus = $state([]);
  let error = $state('');

  async function load(id) {
    state = 'loading';
    try {
      mcus = await listEmployeeMcus(id);
      state = mcus.length ? 'ready' : 'empty';
    } catch (failure) {
      error = failure.message;
      state = 'error';
    }
  }

  $effect(() => { if (employee) load(employee.employeeId); });
</script>

<Dialog open={Boolean(employee)} {onclose} title="Detail Karyawan" subtitle="Data karyawan dan riwayat MCU." size="wide">
  {#if employee}
    <div class="stackv">
      <section>
        <div class="kv">
          <div><span>Nama</span><b>{employee.name}</b></div>
          <div><span>ID</span><b>{employee.employeeId}</b></div>
          <div><span>Jabatan</span><b>{employee.jobTitle || '-'}</b></div>
          <div><span>Departemen</span><b>{employee.department || '-'}</b></div>
          <div><span>Tanggal lahir</span><b>{formatDate(employee.birthDate)}{#if calculateAge(employee.birthDate) !== null}&nbsp;({calculateAge(employee.birthDate)} tahun){/if}</b></div>
          <div><span>Golongan darah</span><b>{employee.bloodType || '-'}</b></div>
          <div><span>Status karyawan</span><b>{employee.employeeType || '-'}</b></div>
          <div><span>Status aktif</span><b><span class="pill" class:p0={employee.isActive} class:pm={!employee.isActive}>{employee.isActive ? 'Aktif' : 'Tidak aktif'}</span></b></div>
          {#if employee.vendorName}<div><span>Vendor</span><b>{employee.vendorName}</b></div>{/if}
          {#if !employee.isActive && employee.inactiveReason}<div><span>Alasan tidak aktif</span><b>{employee.inactiveReason}</b></div>{/if}
        </div>
      </section>
      <section>
        <h3>Riwayat MCU</h3>
        <DataState {state} {error} emptyTitle="Belum ada riwayat MCU" onretry={() => load(employee.employeeId)}>
          <div class="tbl-wrap">
            <table>
              <thead><tr><th>ID MCU</th><th>Tanggal</th><th>Jenis</th><th>Hasil</th><th>Aksi</th></tr></thead>
              <tbody>
                {#each mcus as mcu, index (mcu.mcuId)}
                  <tr>
                    <td class="num">{mcu.mcuId}{#if index === 0} <span class="tag">Terbaru</span>{/if}</td>
                    <td class="num">{formatDate(mcu.mcuDate)}</td>
                    <td>{mcu.mcuType || '-'}</td>
                    <td><span class="pill {pillClass(resultOf(mcu))}">{resultOf(mcu) || '-'}</span></td>
                    <td><button class="btn sm" type="button" onclick={() => (mcuId = mcu.mcuId)}>Detail</button></td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </DataState>
      </section>
    </div>
  {/if}
  {#snippet footer()}<button class="btn" type="button" onclick={onclose}>Tutup</button>{/snippet}
</Dialog>

{#if employee}
  <McuDetailPanel {mcuId} {employee} {user} onclose={() => (mcuId = null)} ondeleted={() => { mcuId = null; load(employee.employeeId); onchanged(); }} />
{/if}
