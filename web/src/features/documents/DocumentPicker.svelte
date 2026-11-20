<script>
  /* Antrean dokumen: pilih atau tarik file, validasi, dan hapus dari antrean. Unggah dilakukan saat form disimpan. */
  import Icon from '../../ui/Icon.svelte';
  import { checkMcuFile } from '../../lib/filePolicy.js';
  import { formatFileSize } from '../../lib/format.js';

  let { files = $bindable([]), disabled = false } = $props();
  let problems = $state([]);
  let input = $state(null);
  let dragging = $state(false);

  function add(list) {
    const accepted = [];
    const rejected = [];
    for (const file of list) {
      const verdict = checkMcuFile(file);
      if (!verdict.ok) rejected.push(`${file.name}: ${verdict.message}`);
      else if (files.some(existing => existing.name === file.name && existing.size === file.size)) rejected.push(`${file.name}: sudah ada di antrean.`);
      else accepted.push(file);
    }
    files = [...files, ...accepted];
    problems = rejected;
    if (input) input.value = '';
  }

  const drop = event => { event.preventDefault(); dragging = false; if (!disabled) add([...event.dataTransfer.files]); };
</script>

{#each files as file, index (file.name + file.size)}
  <div class="filerow">
    <span>{file.name} · {formatFileSize(file.size)}</span>
    <button class="btn sm" type="button" {disabled} onclick={() => (files = files.filter((_, i) => i !== index))}>Hapus</button>
  </div>
{/each}

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="dropzone" class:dragging ondragover={event => { event.preventDefault(); dragging = true; }} ondragleave={() => (dragging = false)} ondrop={drop}>
  <Icon name="upload" />
  <p><b>Pilih file atau tarik ke sini</b></p>
  <p class="muted">PDF kurang dari 10 MB, PNG/JPG maksimal 3 MB. Menghapus file dari antrean tidak menyimpan form.</p>
  <button class="btn" type="button" {disabled} onclick={() => input.click()}>Pilih file</button>
  <input bind:this={input} type="file" multiple accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg" hidden onchange={event => add([...event.currentTarget.files])}>
</div>
{#if problems.length}<div class="alert bad gap-top" role="alert"><ul class="err-list">{#each problems as message}<li>{message}</li>{/each}</ul></div>{/if}
