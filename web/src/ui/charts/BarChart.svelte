<script>
  /* Batang vertikal dengan sumbu. items: [{label, value}]. */
  let { items, label = 'Grafik batang' } = $props();
  const W = 640, H = 250, LEFT = 30, RIGHT = 634, TOP = 16, BASE = 224;
  const niceMax = $derived.by(() => {
    const peak = Math.max(1, ...items.map(item => item.value));
    return peak <= 4 ? 4 : Math.ceil(peak / 4) * 4;
  });
  const ticks = $derived(Array.from({ length: 5 }, (_, i) => (niceMax / 4) * i));
  const y = value => BASE - (value / niceMax) * (BASE - TOP);
  const slot = $derived((RIGHT - LEFT) / Math.max(items.length, 1));
  const barWidth = $derived(Math.min(slot * 0.56, 40));
</script>

<svg viewBox="0 0 {W} {H}" width="100%" role="img" aria-label={label}>
  {#each ticks as tick}
    <line x1={LEFT} x2={RIGHT} y1={y(tick)} y2={y(tick)} stroke="var(--line)" />
    <text x={LEFT - 6} y={y(tick) + 4} text-anchor="end">{Number.isInteger(tick) ? tick : tick.toFixed(1)}</text>
  {/each}
  {#each items as item, index (item.label + index)}
    {@const x = LEFT + slot * index + (slot - barWidth) / 2}
    <rect {x} y={y(item.value)} width={barWidth} height={BASE - y(item.value)} rx="3" fill="var(--accent)" />
    {#if item.value > 0}
      <text x={x + barWidth / 2} y={y(item.value) - 5} text-anchor="middle" style="fill:var(--fg);font-weight:700">{item.value}</text>
    {/if}
    <text x={x + barWidth / 2} y={H - 8} text-anchor="middle">{item.label}</text>
  {/each}
</svg>
