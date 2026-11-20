<script>
  import Dialog from '../../ui/Dialog.svelte';
  import { RISK, CATEGORY, validateMasterForm } from '../../lib/masterConfig.js';

  let { open, type, row = null, saving = false, onsave, onclose } = $props();
  let form = $state({});
  let errors = $state([]);

  $effect(() => { if (open) { form = row ? type.fromRow(row) : type.blank(); errors = []; } });

  function submit(event) {
    event.preventDefault();
    const result = validateMasterForm(type, form);
    errors = result.errors;
    if (result.isValid) onsave(form);
  }
</script>

<Dialog {open} {onclose} title={`${row ? 'Edit' : 'Tambah'} ${type.title}`} subtitle="Data master dipakai di seluruh form aplikasi." size="center">
  <form id="master-form" onsubmit={submit}>
    {#if errors.length}<div class="alert bad" role="alert"><ul class="err-list">{#each errors as message}<li>{message}</li>{/each}</ul></div>{/if}
    <div class="form form-single">
      <label>Nama <span class="req" aria-hidden="true">*</span><input class="field" bind:value={form.name} required autocomplete="off" data-first></label>
      {#if type.key === 'jobTitles'}
        <label>Tingkat risiko pekerjaan<select class="field" bind:value={form.riskLevel}>{#each Object.entries(RISK) as [value, label]}<option {value}>{label}</option>{/each}</select></label>
      {/if}
      {#if type.key === 'labItems'}
        <label>Deskripsi<textarea class="field" rows="2" bind:value={form.description}></textarea></label>
        <label>Satuan <span class="req" aria-hidden="true">*</span><input class="field" bind:value={form.unit}></label>
        <label>Rentang rujukan minimum<input class="field num" type="number" step="any" bind:value={form.min}></label>
        <label>Rentang rujukan maksimum<input class="field num" type="number" step="any" bind:value={form.max}></label>
      {/if}
      {#if type.key === 'diseases'}
        <label>Kategori <span class="req" aria-hidden="true">*</span><select class="field" bind:value={form.category}><option value="">-- Pilih Kategori --</option>{#each Object.entries(CATEGORY) as [value, label]}<option {value}>{label}</option>{/each}</select></label>
        <label>Kode ICD-10<input class="field" bind:value={form.icd10}></label>
      {/if}
      {#if type.key === 'labItems' || type.key === 'diseases'}
        <label>Status<select class="field" bind:value={form.isActive}><option value={true}>Aktif</option><option value={false}>Tidak aktif</option></select></label>
      {/if}
    </div>
  </form>
  {#snippet footer()}
    <button class="btn" type="button" onclick={onclose} disabled={saving}>Batal</button>
    <button class="btn pri" type="submit" form="master-form" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</button>
  {/snippet}
</Dialog>
