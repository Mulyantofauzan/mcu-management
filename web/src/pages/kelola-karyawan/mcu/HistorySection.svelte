<script>
  let { medical, family } = $props();
</script>

<section>
  <h3>Riwayat kesehatan</h3>
  <p class="muted">Penyakit terdahulu</p>
  <div class="tags">
    {#if !medical.ok}<span class="muted">-</span>
    {:else if medical.data.length === 0}<span class="muted">Tidak ada riwayat penyakit</span>
    {:else}{#each medical.data as record (record.id)}<span class="tag">{record.diseaseName}{#if record.yearDiagnosed} ({record.yearDiagnosed}){/if}</span>{/each}{/if}
  </div>
  <p class="muted gap-top">Penyakit keluarga</p>
  <div class="tags">
    {#if !family.ok}<span class="muted">-</span>
    {:else if family.data.length === 0}<span class="muted">Tidak ada riwayat penyakit keluarga</span>
    {:else}{#each family.data as record (record.id)}<span class="tag">{record.familyMember}: {record.diseaseName}</span>{/each}{/if}
  </div>
</section>
