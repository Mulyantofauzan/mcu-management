<script>
  import { pageWindow } from '../lib/pagination.js';

  let { page, pages, onpage } = $props();
  const items = $derived(pageWindow(page, pages));
</script>

{#if pages > 1}
  <nav class="numbers" aria-label="Halaman">
    <button class="btn sm" type="button" disabled={page <= 1} onclick={() => onpage(page - 1)}>← Sebelumnya</button>
    {#each items as item, index (index)}
      {#if item === '...'}<span class="muted" aria-hidden="true">...</span>
      {:else}<button class="btn sm" class:pri={item === page} type="button" aria-current={item === page ? 'page' : undefined} onclick={() => onpage(item)}>{item}</button>{/if}
    {/each}
    <button class="btn sm" type="button" disabled={page >= pages} onclick={() => onpage(page + 1)}>Selanjutnya →</button>
  </nav>
{/if}
