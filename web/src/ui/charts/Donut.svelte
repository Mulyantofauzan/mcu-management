<script>
  /* Donat SVG. items: [{label, value, color}]. Pusat menampilkan total dan satuan. */
  let { items, unit = '', label = 'Grafik donat' } = $props();
  const R = 62;
  const C = 2 * Math.PI * R;
  const GAP = 2;
  const total = $derived(items.reduce((sum, item) => sum + item.value, 0));
  const arcs = $derived.by(() => {
    let offset = 0;
    return items.filter(item => item.value > 0).map(item => {
      const length = total ? (item.value / total) * C : 0;
      const arc = { color: item.color, dash: Math.max(length - GAP, 0), offset: -offset };
      offset += length;
      return arc;
    });
  });
</script>

<svg viewBox="0 0 160 160" width="150" height="150" role="img" aria-label={label}>
  <circle cx="80" cy="80" r={R} fill="none" stroke="var(--surface-2)" stroke-width="20" />
  {#each arcs as arc}
    <circle cx="80" cy="80" r={R} fill="none" stroke={arc.color} stroke-width="20"
      stroke-dasharray="{arc.dash.toFixed(2)} {C.toFixed(2)}" stroke-dashoffset={arc.offset.toFixed(2)} transform="rotate(-90 80 80)" />
  {/each}
  <text x="80" y="82" text-anchor="middle" style="font-size:28px;font-weight:800;fill:var(--fg)">{total}</text>
  <text x="80" y="100" text-anchor="middle">{unit}</text>
</svg>
