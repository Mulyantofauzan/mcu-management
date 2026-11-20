<script>
  let { title, rows, note = '' } = $props();
</script>

<section>
  <h3>{title}</h3>
  {#if note}<p class="muted">{note}</p>{/if}
  <div class="kv">
    {#each rows as [label, value] (label)}<div><span>{label}</span><b>{value}</b></div>{/each}
  </div>
</section>
