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
  import { newMcuForm, toMcuPayload, labResultsFrom } from './mcuFormModel.js';
  import { validateMcuPayload, validateLabValues } from '../../lib/mcuValidation.js';
  import { generateMcuId } from '../../lib/ids.js';
  import { createMcu } from '../../data/mcuCreate.js';
  import { uploadAll, rollbackUploads } from '../../data/files.js';

  let { employee, doctors, user, onsaved, onchange } = $props();
  const SECTIONS = ['Data karyawan', 'Pemeriksaan', 'Penglihatan', 'Lab', 'Penunjang', 'Riwayat', 'Rujukan', 'Hasil', 'Dokumen'];
  const ANCHORS = ['sec-karyawan', 'sec-fisik', 'sec-visus', 'sec-lab', 'sec-penunjang', 'sec-riwayat', 'sec-rujukan', 'sec-hasil', 'sec-dokumen'];

  let form = $state(newMcuForm());
  let errors = $state([]);
  let saving = $state(false);
  let alertBox = $state(null);
  let files = $state([]);
  let progress = $state('');

  async function submit(event) {
    event.preventDefault();
    if (saving) return;
    const payload = toMcuPayload(form, { mcuId: generateMcuId(), employeeId: employee.employeeId });
    errors = [...validateMcuPayload(payload).errors, ...validateLabValues(form.labs).errors];
    if (errors.length) { await Promise.resolve(); alertBox?.scrollIntoView({ block: 'center', behavior: 'smooth' }); return; }
    saving = true;
    const context = { employeeId: employee.employeeId, mcuId: payload.mcuId };
    let uploaded = [];
    try {
      if (files.length) {
        progress = 'Mengunggah dokumen...';
        const upload = await uploadAll(files, context, ({ index, count, percent }) => { progress = `Mengunggah ${index + 1}/${count}: ${percent}%`; });
        if (!upload.success) { errors = [`Unggah dokumen gagal: ${upload.error}`]; return; }
        uploaded = upload.results;
      }
      progress = 'Menyimpan data...';
      onsaved({ ...(await createMcu({ payload, labResults: labResultsFrom(form), user, employeeName: employee.name })), fileCount: uploaded.length });
    } catch (failure) {
      if (uploaded.length) await rollbackUploads(uploaded, context).catch(() => {});
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
      <p class="gap-top"><button class="btn sm" type="button" onclick={onchange}>Ganti karyawan</button></p>
    </SectionCard>
    <PhysicalSection bind:form />
    <VisionSection bind:form />
    <LabSection bind:form />
    <AncillarySection bind:form />
    <HistorySection bind:form />
    <ReferralSection bind:form {doctors} />
    <ResultSection bind:form />
    <SectionCard id="sec-dokumen" number="9" title="Dokumen MCU" note="PDF, PNG, atau JPG"><DocumentPicker bind:files disabled={saving} /></SectionCard>
    {#if errors.length}<div class="alert bad" role="alert" bind:this={alertBox}><b>Form belum lengkap atau gagal disimpan:</b><ul class="err-list">{#each errors as message}<li>{message}</li>{/each}</ul></div>{/if}
    <div class="savebar">
      <span class="muted"><span class="req">*</span> wajib diisi</span>
      <span class="inline"><button class="btn" type="button" onclick={onchange} disabled={saving}>Batal</button><button class="btn pri" type="submit" disabled={saving}>{saving ? progress || 'Menyimpan...' : 'Simpan MCU'}</button></span>
    </div>
  </form>
</div>
