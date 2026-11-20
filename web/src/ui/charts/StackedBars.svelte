<script>
  /* Batang bertumpuk per kategori sumbu-x. series: [{label, values}], labels: [..]. Warna dari STATUS_COLORS. */
  import { STATUS_COLORS } from '../../lib/chartColors.js';

  let { labels, series, label = 'Grafik batang bertumpuk' } = $props();
  const W = 640, H = 260, LEFT = 34, RIGHT = 634, TOP = 16, BASE = 218;
  const totals = $derived(labels.map((_, i) => series.reduce((sum, s) => sum + s.values[i], 0)));
  const peak = $derived(Math.max(1, ...totals));
  const niceMax = $derived(peak <= 4 ? 4 : Math.ceil(peak / 4) * 4);
  const ticks = $derived(Array.from({ length: 5 }, (_, i) => (niceMax / 4) * i));
  const y = value => BASE - (value / niceMax) * (BASE - TOP);
  const slot = $derived((RIGHT - LEFT) / Math.max(labels.length, 1));
  const barWidth = $derived(Math.min(slot * 0.5, 56));
  const stacks = $derived(labels.map((_, i) => {
    let acc = 0;
    return series.map(s => { const from = acc; acc += s.values[i]; return { label: s.label, value: s.values[i], from, to: acc }; }).filter(part => part.value > 0);
  }));
</script>

<svg viewBox="0 0 {W} {H}" width="100%" role="img" aria-label={label}>
  {#each ticks as tick}
    <line x1={LEFT} x2={RIGHT} y1={y(tick)} y2={y(tick)} stroke="var(--line)" /><text x={LEFT - 6} y={y(tick) + 4} text-anchor="end">{Math.round(tick)}</text>
  {/each}
  {#each labels as name, i (name)}
    {@const x = LEFT + slot * i + (slot - barWidth) / 2}
    {#each stacks[i] as part (part.label)}
      <rect {x} y={y(part.to)} width={barWidth} height={y(part.from) - y(part.to)} fill={STATUS_COLORS[part.label] || 'var(--muted)'}><title>{part.label}: {part.value}</title></rect>
    {/each}
    <text x={x + barWidth / 2} y={y(totals[i]) - 5} text-anchor="middle" style="fill:var(--fg);font-weight:700">{totals[i]}</text>
    <text x={x + barWidth / 2} y={H - 10} text-anchor="middle">{name}</text>
  {/each}
</svg>
<div class="legend gap-top">{#each series as s (s.label)}<span><i style:background={STATUS_COLORS[s.label] || 'var(--muted)'}></i>{s.label}</span>{/each}</div>
