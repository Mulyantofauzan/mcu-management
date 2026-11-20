<script>
  import SectionCard from './SectionCard.svelte';

  let { form = $bindable(), doctors } = $props();
</script>

<SectionCard id="sec-rujukan" number="7" title="Data rujukan" note="Opsional, dokter pemeriksa wajib">
  <div class="fgrid two">
    <label><span>Diberikan oleh (dokter) <span class="req" aria-hidden="true">*</span></span>
      <select class="field" bind:value={form.doctor} required><option value="">Pilih dokter pemeriksa</option>{#each doctors as doctor (doctor.id)}<option value={String(doctor.id)}>{doctor.name}</option>{/each}</select></label>
    <label><span>Kepada Yth (penerima rujukan)</span><input class="field" type="text" bind:value={form.recipient} placeholder="Contoh: dr. Sp.PD (Spesialis Penyakit Dalam)"></label>
    <label><span>Keluhan utama</span><textarea class="field" rows="2" bind:value={form.keluhanUtama} placeholder="Contoh: Nyeri dada kiri / Sesak napas saat aktivitas"></textarea></label>
    <label><span>Diagnosis kerja</span><textarea class="field" rows="2" bind:value={form.diagnosisKerja} placeholder="Contoh: Hipertensi stage 2 / DM tipe 2"></textarea></label>
    <label class="wide"><span>Alasan dirujuk</span><textarea class="field" rows="2" bind:value={form.alasanRujuk} placeholder="Contoh: Perlu konsultasi spesialis jantung"></textarea></label>
  </div>
</SectionCard>
