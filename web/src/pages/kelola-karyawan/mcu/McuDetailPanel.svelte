<script>
  import Dialog from '../../../ui/Dialog.svelte';
  import ConfirmDialog from '../../../ui/ConfirmDialog.svelte';
  import DataState from '../../../ui/DataState.svelte';
  import KvSection from './KvSection.svelte';
  import VisionSection from './VisionSection.svelte';
  import LabSection from './LabSection.svelte';
  import HistorySection from './HistorySection.svelte';
  import ResultSection from './ResultSection.svelte';
  import FilesSection from './FilesSection.svelte';
  import ChangesSection from './ChangesSection.svelte';
  import { loadMcuDetail } from './loadMcuDetail.js';
  import { infoRows, examRows, visionRows, referralRows } from './buildSections.js';
  import { softDeleteMcu } from '../../../data/mcuWrite.js';
  import { showToast } from '../../../lib/toast.svelte.js';

  let { mcuId, employee, user, onclose, ondeleted } = $props();
  let state = $state('loading');
  let error = $state('');
  let detail = $state(null);
  let confirming = $state(false);
  let busy = $state(false);

  async function load(id) {
    state = 'loading';
    try {
      detail = await loadMcuDetail(id);
      state = 'ready';
    } catch (failure) {
      error = failure.message;
      state = 'error';
    }
  }

  async function remove() {
    busy = true;
    try {
      await softDeleteMcu(detail.mcu, employee?.name, user);
      showToast('MCU berhasil dihapus');
      confirming = false;
      ondeleted();
    } catch (failure) {
      showToast(`Gagal menghapus MCU: ${failure.message}`);
    } finally {
      busy = false;
    }
  }

  $effect(() => { if (mcuId) load(mcuId); });
</script>

<Dialog open={Boolean(mcuId)} {onclose} title="Detail MCU" subtitle="Hasil pemeriksaan lengkap." size="wide">
  <DataState {state} {error} onretry={() => load(mcuId)}>
    {#if detail}
      <div class="stackv">
        <KvSection title="Data karyawan" rows={[['Nama', employee?.name || '-'], ['ID', employee?.employeeId || '-'], ['Jabatan', employee?.jobTitle || '-'], ['Departemen', employee?.department || '-']]} />
        <KvSection title="Informasi MCU" rows={infoRows(detail.mcu)} />
        <KvSection title="Hasil pemeriksaan" rows={examRows(detail.mcu)} />
        <VisionSection rows={visionRows(detail.mcu)} />
        <LabSection part={detail.lab} />
        <HistorySection medical={detail.medical} family={detail.family} />
        <KvSection title="Data rujukan (jika ada)" rows={referralRows(detail.mcu, detail.doctors.ok ? detail.doctors.data : [])} />
        <ResultSection title="Hasil awal" result={detail.mcu.initialResult} notes={detail.mcu.initialNotes} />
        {#if detail.mcu.finalResult}<ResultSection title="Hasil akhir (Follow-Up)" result={detail.mcu.finalResult} notes={detail.mcu.finalNotes} />{/if}
        <FilesSection part={detail.files} userId={user.userId} />
        <ChangesSection part={detail.changes} />
      </div>
    {/if}
  </DataState>
  {#snippet footer()}
    {#if detail}<button class="btn danger push-left" type="button" onclick={() => (confirming = true)}>Hapus MCU</button>{/if}
    <button class="btn" type="button" onclick={onclose}>Tutup</button>
    {#if detail}<a class="btn pri" href={`/tambah-karyawan?mcu=${encodeURIComponent(mcuId)}`}>Edit MCU</a>{/if}
  {/snippet}
</Dialog>

<ConfirmDialog open={confirming} title="Hapus MCU?" {busy} onconfirm={remove} onclose={() => (confirming = false)}>
  {#if detail}<p>MCU <b>{detail.mcu.mcuId}</b> milik {employee?.name || 'karyawan'} akan dipindahkan ke Data Terhapus.</p>{/if}
</ConfirmDialog>
