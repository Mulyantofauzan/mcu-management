<script>
  import Dialog from '../../ui/Dialog.svelte';
  import DocumentPicker from '../../features/documents/DocumentPicker.svelte';
  import { RESULTS } from '../../lib/mcuOptions.js';
  import { pillClass } from '../../lib/status.js';
  import { getMcu } from '../../data/mcuDetail.js';
  import { updateMcu } from '../../data/mcuUpdate.js';
  import { uploadAll, rollbackUploads } from '../../data/files.js';
  import { showToast } from '../../lib/toast.svelte.js';

  let { target, user, onclose, ondone } = $props();
  let finalResult = $state('');
  let finalNotes = $state('');
  let files = $state([]);
  let saving = $state(false);
  let progress = $state('');
  let error = $state('');

  $effect(() => { if (target) { finalResult = ''; finalNotes = ''; files = []; error = ''; } });

  async function save(thenEdit) {
    if (saving) return;
    if (!finalResult || !finalNotes.trim()) { error = 'Hasil akhir dan catatan wajib diisi'; return; }
    saving = true;
    error = '';
    const ids = { mcuId: target.mcu.mcuId, employeeId: target.employee.employeeId };
    let uploaded = [];
    try {
      if (files.length) {
        const upload = await uploadAll(files, ids, ({ index, count, percent }) => { progress = `Mengunggah ${index + 1}/${count}: ${percent}%`; });
        if (!upload.success) { error = `Unggah dokumen gagal: ${upload.error}`; return; }
        uploaded = upload.results;
      }
      progress = 'Menyimpan...';
      const fresh = await getMcu(ids.mcuId);
      if (!fresh) throw new Error('MCU tidak ditemukan');
      await updateMcu({ mcuId: ids.mcuId, oldMcu: fresh, patch: { finalResult, finalNotes: finalNotes.trim() }, user, employeeName: target.employee.name });
      showToast('Follow-up berhasil diupdate!');
      ondone(thenEdit ? ids.mcuId : null);
    } catch (failure) {
      if (uploaded.length) await rollbackUploads(uploaded, ids).catch(() => {});
      error = `Gagal menyimpan: ${failure.message}`;
    } finally {
      saving = false;
      progress = '';
    }
  }
</script>

<Dialog open={Boolean(target)} {onclose} title="Update Follow-Up" subtitle="Isi hasil akhir pemeriksaan lanjutan." size="center">
  {#if target}
    <form id="followup-form" class="stackv" onsubmit={event => { event.preventDefault(); save(false); }}>
      <section>
        <h3>Nilai sebelumnya</h3>
        <div class="kv">
          <div><span>Karyawan</span><b>{target.employee.name} ({target.employee.employeeId})</b></div>
          <div><span>Hasil awal</span><b><span class="pill {pillClass(target.mcu.initialResult)}">{target.mcu.initialResult}</span></b></div>
          <div><span>Tekanan darah</span><b>{target.mcu.bloodPressure || '-'}</b></div>
          <div><span>BMI</span><b>{target.mcu.bmi || '-'}</b></div>
          <div class="full-row"><span>Catatan awal</span><b>{target.mcu.initialNotes || 'Tidak ada catatan'}</b></div>
        </div>
      </section>
      <div class="form">
        <label>Hasil akhir <span class="req" aria-hidden="true">*</span>
          <select class="field" bind:value={finalResult} required data-first><option value="">Pilih...</option>{#each RESULTS as result}<option>{result}</option>{/each}</select></label>
        <label class="full">Catatan akhir <span class="req" aria-hidden="true">*</span>
          <textarea class="field" rows="3" bind:value={finalNotes} required placeholder="Ringkasan hasil pemeriksaan lanjutan"></textarea></label>
      </div>
      <section><h3>Dokumen follow-up</h3><DocumentPicker bind:files disabled={saving} /></section>
      {#if error}<div class="alert bad" role="alert">{error}</div>{/if}
    </form>
  {/if}
  {#snippet footer()}
    <button class="btn" type="button" onclick={onclose} disabled={saving}>Batal</button>
    <button class="btn" type="button" onclick={() => save(true)} disabled={saving}>Simpan dan edit detail MCU</button>
    <button class="btn pri" type="submit" form="followup-form" disabled={saving}>{saving ? progress || 'Menyimpan...' : 'Simpan'}</button>
  {/snippet}
</Dialog>
