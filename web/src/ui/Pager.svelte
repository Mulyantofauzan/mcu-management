<script>
  let { page, pageSize, total, onpage } = $props();
  const pages = $derived(Math.max(1, Math.ceil(total / pageSize)));
  const from = $derived(total ? (page - 1) * pageSize + 1 : 0);
  const to = $derived(Math.min(page * pageSize, total));
</script>

{#if total > 0}
  <div class="pager">
    <span>Menampilkan {from} sampai {to} dari {total}</span>
    {#if pages > 1}
      <div>
        <button class="btn sm" type="button" disabled={page <= 1} onclick={() => onpage(page - 1)}>Sebelumnya</button>
        <span class="num pager-at">{page} / {pages}</span>
        <button class="btn sm" type="button" disabled={page >= pages} onclick={() => onpage(page + 1)}>Berikutnya</button>
      </div>
    {/if}
  </div>
{/if}
