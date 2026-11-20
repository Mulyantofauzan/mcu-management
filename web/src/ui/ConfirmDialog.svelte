<script>
  import Dialog from './Dialog.svelte';

  let { open, title, confirmLabel = 'Ya, hapus', busy = false, onconfirm, onclose, children } = $props();
</script>

<Dialog {open} {onclose} {title} size="center">
  {@render children()}
  {#snippet footer()}
    <button class="btn" type="button" onclick={onclose} disabled={busy} data-first>Batal</button>
    <button class="btn danger" type="button" onclick={onconfirm} disabled={busy}>{busy ? 'Memproses...' : confirmLabel}</button>
  {/snippet}
</Dialog>
