<script>
  import SectionCard from './SectionCard.svelte';
  import { VISION_VALUES, OTHER } from '../../lib/mcuOptions.js';

  let { form = $bindable() } = $props();
  const ROWS = [
    { label: 'Jauh', keys: ['visionDistantUnaidedLeft', 'visionDistantUnaidedRight', 'visionDistantSpectaclesLeft', 'visionDistantSpectaclesRight'] },
    { label: 'Dekat', keys: ['visionNearUnaidedLeft', 'visionNearUnaidedRight', 'visionNearSpectaclesLeft', 'visionNearSpectaclesRight'] }
  ];
  const SIDES = ['Tanpa koreksi, mata kiri', 'Tanpa koreksi, mata kanan', 'Dengan kacamata, mata kiri', 'Dengan kacamata, mata kanan'];
</script>

<SectionCard id="sec-visus" number="3" title="Pemeriksaan penglihatan" note="Skala Snellen">
  <div class="tbl-wrap">
    <table>
      <thead>
        <tr><th rowspan="2">Pemeriksaan</th><th colspan="2">Tanpa koreksi</th><th colspan="2">Dengan kacamata</th></tr>
        <tr><th>Mata kiri</th><th>Mata kanan</th><th>Mata kiri</th><th>Mata kanan</th></tr>
      </thead>
      <tbody>
        {#each ROWS as row (row.label)}
          <tr>
            <td>{row.label}</td>
            {#each row.keys as key, index (key)}
              <td>
                <select class="field" bind:value={form[key]} aria-label={`${row.label}, ${SIDES[index]}`}><option value="">Pilih</option>{#each VISION_VALUES as option}<option>{option}</option>{/each}</select>
                {#if form[key] === OTHER}<input class="field" type="text" bind:value={form[`${key}Other`]} placeholder="Isi nilai sendiri" aria-label={`${row.label}, ${SIDES[index]} (isian sendiri)`}>{/if}
              </td>
            {/each}
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</SectionCard>
