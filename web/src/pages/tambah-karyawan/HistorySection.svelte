<script>
  import SectionCard from './SectionCard.svelte';
  import Icon from '../../ui/Icon.svelte';
  import { DISEASES, FAMILY_MEMBERS, CUSTOM_DISEASE } from '../../lib/mcuOptions.js';
  import { showToast } from '../../lib/toast.svelte.js';
  import { addMedical, addFamily } from './historyLists.js';

  let { form = $bindable() } = $props();
  let med = $state({ disease: '', custom: '' });
  let fam = $state({ disease: '', member: '', custom: '' });

  function addMed() {
    const result = addMedical(form.medical, med.disease, med.custom);
    if (result.error) return showToast(result.error);
    form.medical = result.list;
    med = { disease: '', custom: '' };
  }

  function addFam() {
    const result = addFamily(form.family, fam.disease, fam.member, fam.custom);
    if (result.error) return showToast(result.error);
    form.family = result.list;
    fam = { disease: '', member: '', custom: '' };
  }
</script>

<SectionCard id="sec-riwayat" number="6" title="Riwayat kesehatan" note="Penyakit terdahulu dan keluarga">
  <div class="fgrid two">
    <div>
      <h3 class="sub-h">Riwayat penyakit</h3>
      <div class="inline">
        <select class="field" bind:value={med.disease} aria-label="Pilih penyakit"><option value="">Pilih penyakit</option>{#each DISEASES as disease}<option>{disease}</option>{/each}</select>
        <button class="btn" type="button" onclick={addMed}>Tambah</button>
      </div>
      {#if med.disease === CUSTOM_DISEASE}<input class="field gap-top" bind:value={med.custom} placeholder="Sebutkan nama penyakit" aria-label="Nama penyakit"> {/if}
      <div class="chiprow" aria-label="Riwayat penyakit terpilih">
        {#each form.medical as disease (disease)}
          <span class="chip">{disease}<button type="button" onclick={() => (form.medical = form.medical.filter(item => item !== disease))} aria-label={`Hapus ${disease}`}><Icon name="x" /></button></span>
        {/each}
      </div>
    </div>
    <div>
      <h3 class="sub-h">Riwayat penyakit keluarga</h3>
      <div class="inline">
        <select class="field" bind:value={fam.disease} aria-label="Pilih penyakit keluarga"><option value="">Pilih penyakit</option>{#each DISEASES as disease}<option>{disease}</option>{/each}</select>
        <select class="field" bind:value={fam.member} aria-label="Anggota keluarga"><option value="">Hubungan</option>{#each FAMILY_MEMBERS as member}<option>{member}</option>{/each}</select>
        <button class="btn" type="button" onclick={addFam}>Tambah</button>
      </div>
      {#if fam.disease === CUSTOM_DISEASE}<input class="field gap-top" bind:value={fam.custom} placeholder="Sebutkan nama penyakit" aria-label="Nama penyakit keluarga"> {/if}
      <div class="chiprow" aria-label="Riwayat penyakit keluarga terpilih">
        {#each form.family as entry (entry.member + entry.disease)}
          <span class="chip">{entry.member}: {entry.disease}<button type="button" onclick={() => (form.family = form.family.filter(item => item !== entry))} aria-label={`Hapus ${entry.member}: ${entry.disease}`}><Icon name="x" /></button></span>
        {/each}
      </div>
    </div>
  </div>
</SectionCard>
