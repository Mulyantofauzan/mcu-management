<script>
  import SectionCard from './SectionCard.svelte';
  import SelectOther from './SelectOther.svelte';
  import { MCU_TYPES, AUDIO, SPIRO, HBSAG, SMOKING, EXERCISE, optionsWith } from '../../lib/mcuOptions.js';

  let { form = $bindable() } = $props();
</script>

<SectionCard id="sec-fisik" number="2" title="Pemeriksaan">
  <div class="fgrid">
    <label><span>Jenis MCU <span class="req" aria-hidden="true">*</span></span>
      <select class="field" bind:value={form.mcuType} required><option value="">Pilih...</option>{#each optionsWith(MCU_TYPES, form.mcuType) as type}<option>{type}</option>{/each}</select></label>
    <label><span>Tanggal MCU <span class="req" aria-hidden="true">*</span></span><input class="field" type="date" bind:value={form.mcuDate} required></label>
    <label><span>BMI (kg/m²)</span><input class="field num" type="number" step="any" bind:value={form.bmi} placeholder="Contoh: 24,5"></label>
    <label><span>Tekanan darah (mmHg)</span><input class="field num" type="text" inputmode="numeric" bind:value={form.bloodPressure} placeholder="120/80"></label>
    <label><span>Frekuensi napas (RR)</span><input class="field num" type="number" bind:value={form.respiratoryRate} placeholder="x/menit"></label>
    <label><span>Nadi</span><input class="field num" type="number" bind:value={form.pulse} placeholder="x/menit"></label>
    <label><span>Suhu (°C)</span><input class="field num" type="number" step="any" bind:value={form.temperature} placeholder="36,5"></label>
    <label><span>Lingkar perut (cm)</span><input class="field num" type="number" step="any" bind:value={form.chestCircumference}></label>
    <SelectOther label="Audiometri" options={AUDIO} bind:value={form.audiometry} bind:other={form.audiometryOther} />
    <SelectOther label="Spirometri" options={SPIRO} bind:value={form.spirometry} bind:other={form.spirometryOther} />
    <label><span>HBsAg</span><select class="field" bind:value={form.hbsag}><option value="">Pilih...</option>{#each optionsWith(HBSAG, form.hbsag) as option}<option>{option}</option>{/each}</select></label>
    <label><span>Status merokok</span><select class="field" bind:value={form.smokingStatus}><option value="">Pilih...</option>{#each optionsWith(SMOKING, form.smokingStatus) as option}<option>{option}</option>{/each}</select></label>
    <label><span>Frekuensi olahraga</span><select class="field" bind:value={form.exerciseFrequency}><option value="">Pilih...</option>{#each optionsWith(EXERCISE, form.exerciseFrequency) as option}<option>{option}</option>{/each}</select></label>
  </div>
</SectionCard>
