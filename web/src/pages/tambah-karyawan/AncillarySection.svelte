<script>
  import SectionCard from './SectionCard.svelte';
  import SelectOther from './SelectOther.svelte';
  import { XRAY, EKG, TREADMILL, NAPZA, COLORBLIND } from '../../lib/mcuOptions.js';

  let { form = $bindable() } = $props();
</script>

<SectionCard id="sec-penunjang" number="5" title="Pemeriksaan penunjang">
  <div class="fgrid">
    <SelectOther label="X-Ray" options={XRAY} bind:value={form.xray} bind:other={form.xrayOther} />
    <SelectOther label="EKG" options={EKG} bind:value={form.ekg} bind:other={form.ekgOther} />
    <SelectOther label="Treadmill" options={TREADMILL} bind:value={form.treadmill} bind:other={form.treadmillOther} />
    <SelectOther label="NAPZA" options={NAPZA} bind:value={form.napza} bind:other={form.napzaOther} />
    <SelectOther label="Buta warna" options={COLORBLIND} bind:value={form.colorblind} bind:other={form.colorblindOther} />
  </div>
</SectionCard>
