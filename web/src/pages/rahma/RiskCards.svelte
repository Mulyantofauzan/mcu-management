<script>
  let { counts } = $props();
  const PILL = { 1: 'p0', 2: 'p2', 3: 'p3', 4: 's-unfit' };
</script>

<div class="grid g-kpi">
  {#each counts as item (item.level)}
    <div class="card kpi">
      <div class="l"><span class="pill {PILL[item.level]} pill-sm">{item.label} Risk</span></div>
      <div class="v num">{item.count}<small>{item.percentText}</small></div>
      <div class="s">karyawan</div>
    </div>
  {/each}
</div>
