<script>
  import SectionCard from './SectionCard.svelte';
  import { RESULTS } from '../../lib/mcuOptions.js';

  let { form = $bindable() } = $props();
</script>

<SectionCard id="sec-hasil" number="8" title="Hasil" note="Hasil awal dan catatan wajib">
  <div class="fgrid ratio">
    <label><span>Hasil awal <span class="req" aria-hidden="true">*</span></span>
      <select class="field" bind:value={form.initialResult} required><option value="">Pilih...</option>{#each RESULTS as result}<option>{result}</option>{/each}</select></label>
    <label><span>Catatan awal <span class="req" aria-hidden="true">*</span></span>
      <textarea class="field" rows="3" bind:value={form.initialNotes} required placeholder="Ringkasan hasil dan saran"></textarea></label>
  </div>
</SectionCard>
