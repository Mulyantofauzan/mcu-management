<script>
  import SectionCard from './SectionCard.svelte';
  import PhysicalSection from './PhysicalSection.svelte';
  import VisionSection from './VisionSection.svelte';
  import LabSection from './LabSection.svelte';
  import AncillarySection from './AncillarySection.svelte';
  import HistorySection from './HistorySection.svelte';
  import ReferralSection from './ReferralSection.svelte';
  import ResultSection from './ResultSection.svelte';
  import DocumentPicker from '../../features/documents/DocumentPicker.svelte';
  import { newMcuForm, toMcuPayload, labResultsFrom, mcuToForm, changedPayload } from './mcuFormModel.js';
  import { validateMcuPayload, validateLabValues, validateLabEdit } from '../../lib/mcuValidation.js';
  import { generateMcuId } from '../../lib/ids.js';
  import { createMcu } from '../../data/mcuCreate.js';
  import { updateMcu } from '../../data/mcuUpdate.js';
  import ExistingFiles from '../../features/documents/ExistingFiles.svelte';
  import { uploadAll, rollbackUploads } from '../../data/files.js';

  let { employee, doctors, user, onsaved, onchange, initial = null } = $props();
  const editing = Boolean(initial);
  const fromInitial = () => mcuToForm(initial.mcu, initial.labs, initial.medical, initial.family);
  const baseline = editing ? fromInitial() : null;
  const SECTIONS = ['Data karyawan', 'Pemeriksaan', 'Penglihatan', 'Lab', 'Penunjang', 'Riwayat', 'Rujukan', 'Hasil', 'Dokumen'];
  const ANCHORS = ['sec-karyawan', 'sec-fisik', 'sec-visus', 'sec-lab', 'sec-penunjang', 'sec-riwayat', 'sec-rujukan', 'sec-hasil', 'sec-dokumen'];

  let form = $state(editing ? fromInitial() : newMcuForm());
  let errors = $state([]);
  let saving = $state(false);
  let alertBox = $state(null);
  let files = $state([]);
  let progress = $state('');

  async function submit(event) {
    event.preventDefault();
    if (saving) return;
    const ids = { mcuId: editing ? initial.mcu.mcuId : generateMcuId(), employeeId: employee.employeeId };
    const payload = toMcuPayload(form, ids);
    const labCheck = editing ? validateLabEdit(form.labs) : validateLabValues(form.labs);
    errors = [...validateMcuPayload(payload).errors, ...labCheck.errors];
    if (errors.length) { await Promise.resolve(); alertBox?.scrollIntoView({ block: 'center', behavior: 'smooth' }); return; }
    saving = true;
    let uploaded = [];
    try {
      if (files.length) {
        progress = 'Mengunggah dokumen...';
        const upload = await uploadAll(files, ids, ({ index, count, percent }) => { progress = `Mengunggah ${index + 1}/${count}: ${percent}%`; });
        if (!upload.success) { errors = [`Unggah dokumen gagal: ${upload.error}`]; return; }
        uploaded = upload.results;
      }
      progress = 'Menyimpan data...';
      const result = editing
        ? await updateMcu({ mcuId: ids.mcuId, oldMcu: initial.mcu, patch: changedPayload(form, baseline, ids), labInputs: labResultsFrom(form), user, employeeName: employee.name,
            histories: { existingMedical: initial.medical, existingFamily: initial.family, medical: form.medical, family: form.family } })
        : await createMcu({ payload, labResults: labResultsFrom(form), user, employeeName: employee.name });
      onsaved({ ...result, fileCount: uploaded.length, mcu: result.mcu || { mcuId: ids.mcuId } });
    } catch (failure) {
      if (uploaded.length) await rollbackUploads(uploaded, ids).catch(() => {});
      errors = [failure.message];
    } finally {
      saving = false;
      progress = '';
    }
  }
</script>

<div class="formwrap">
  <nav class="idx" aria-label="Bagian form">
    <div class="cap">Bagian</div>
    {#each SECTIONS as title, index}<a href={`#${ANCHORS[index]}`}><span class="n">{index + 1}</span>{title}</a>{/each}
  </nav>
  <form class="sections" onsubmit={submit} novalidate>
    <SectionCard id="sec-karyawan" number="1" title="Data karyawan" note="Karyawan terpilih">
      <div class="kv">
        <div><span>Nama</span><b>{employee.name}</b></div><div><span>ID</span><b>{employee.employeeId}</b></div>
        <div><span>Jabatan</span><b>{employee.jobTitle || '-'}</b></div><div><span>Departemen</span><b>{employee.department || '-'}</b></div>
      </div>
      {#if !editing}<p class="gap-top"><button class="btn sm" type="button" onclick={onchange}>Ganti karyawan</button></p>{/if}
    </SectionCard>
    <PhysicalSection bind:form />
    <VisionSection bind:form />
    <LabSection bind:form />
    <AncillarySection bind:form />
    <HistorySection bind:form />
    <ReferralSection bind:form {doctors} />
    <ResultSection bind:form />
    <SectionCard id="sec-dokumen" number="9" title="Dokumen MCU" note="PDF, PNG, atau JPG">{#if editing}<ExistingFiles mcuId={initial.mcu.mcuId} userId={user.userId} />{/if}<DocumentPicker bind:files disabled={saving} /></SectionCard>
    {#if errors.length}<div class="alert bad" role="alert" bind:this={alertBox}><b>Form belum lengkap atau gagal disimpan:</b><ul class="err-list">{#each errors as message}<li>{message}</li>{/each}</ul></div>{/if}
    <div class="savebar">
      <span class="muted"><span class="req">*</span> wajib diisi</span>
      <span class="inline"><button class="btn" type="button" onclick={onchange} disabled={saving}>Batal</button><button class="btn pri" type="submit" disabled={saving}>{saving ? progress || 'Menyimpan...' : editing ? 'Simpan perubahan' : 'Simpan MCU'}</button></span>
    </div>
  </form>
</div>
