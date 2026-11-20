<script>
  /* Pilihan dengan opsi "Lainnya" yang membuka isian bebas. */
  import { OTHER } from '../../lib/mcuOptions.js';

  let { label, options, value = $bindable(), other = $bindable(), id } = $props();
</script>

<label>
  <span>{label}</span>
  <select class="field" {id} bind:value>{#each options as option}<option>{option}</option>{/each}</select>
  {#if value === OTHER}<input class="field" type="text" bind:value={other} placeholder="Isi nilai sendiri" aria-label={`${label} (isian sendiri)`}>{/if}
</label>
