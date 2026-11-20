<script>
  import SectionCard from './SectionCard.svelte';
  import { LAB_ITEMS } from '../../lib/labItems.js';

  let { form = $bindable() } = $props();
</script>

<SectionCard id="sec-lab" number="4" title="Pemeriksaan lab" note="Semua 14 item wajib diisi dengan angka">
  <div class="fgrid">
    {#each LAB_ITEMS as item (item.id)}
      <label>
        <span>{item.name} <span class="muted">({item.unit})</span> <span class="req" aria-hidden="true">*</span></span>
        <input class="field num" type="number" step="any" min="0" bind:value={form.labs[item.id]} required>
        <small class="hint">Normal {item.min} - {item.max}</small>
      </label>
    {/each}
  </div>
</SectionCard>
