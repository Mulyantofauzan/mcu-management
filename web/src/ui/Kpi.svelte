<script>
  let { label, value, sub = '', color = 'var(--accent)', percent = null } = $props();
</script>

<div class="card kpi">
  <div class="l"><i style:background={color}></i>{label}</div>
  <div class="v num">{value}{#if percent !== null}<small>{percent}%</small>{/if}</div>
  {#if sub}<div class="s">{sub}</div>{/if}
</div>
