<script>
  let { title, note = '', actions, children, label } = $props();
</script>

<section class="card" aria-label={label ?? title}>
  {#if title}
    <div class="card-h"><h2>{title}</h2>{#if actions}{@render actions()}{:else if note}<span>{note}</span>{/if}</div>
  {/if}
  <div class="card-b">{@render children()}</div>
</section>
