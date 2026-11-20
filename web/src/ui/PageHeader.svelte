<script>
  let { title, subtitle = '', children } = $props();
</script>

<div class="ph">
  <div><h1>{title}</h1>{#if subtitle}<p>{subtitle}</p>{/if}</div>
  {#if children}<div class="acts">{@render children()}</div>{/if}
</div>
