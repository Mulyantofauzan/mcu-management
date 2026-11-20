<script>
  /* Timeline SVG: satu titik per MCU, tinggi titik mengikuti tingkat hasil (Fit paling atas). */
  import { formatDate } from '../../lib/format.js';
  import { STATUS_COLORS } from '../../lib/chartColors.js';

  let { points } = $props();
  const W = 640, H = 200, LEFT = 90, RIGHT = 620, TOP = 24, BASE = 160;
  const LEVELS = [['Fit', 3], ['Follow-Up', 2], ['Temporary Unfit', 1.5], ['Unfit', 1]];
  const x = index => (points.length < 2 ? (LEFT + RIGHT) / 2 : LEFT + (index / (points.length - 1)) * (RIGHT - LEFT));
  const y = level => BASE - ((level - 1) / 2) * (BASE - TOP);
  const path = $derived(points.map((point, index) => `${index ? 'L' : 'M'}${x(index)},${y(point.level || 1)}`).join(' '));
</script>

<svg viewBox="0 0 {W} {H}" width="100%" role="img" aria-label="Timeline hasil MCU">
  {#each LEVELS as [label, level]}
    <line x1={LEFT - 10} x2={RIGHT + 10} y1={y(level)} y2={y(level)} stroke="var(--line)" />
    <text x={LEFT - 16} y={y(level) + 4} text-anchor="end">{label}</text>
  {/each}
  {#if points.length > 1}<path d={path} fill="none" stroke="var(--line-2)" stroke-width="2" />{/if}
  {#each points as point, index (point.mcuId)}
    <circle cx={x(index)} cy={y(point.level || 1)} r="7" fill={STATUS_COLORS[point.result] || 'var(--muted)'} stroke="var(--surface)" stroke-width="2"><title>{formatDate(point.date)}: {point.result || '-'}</title></circle>
    {#if points.length <= 8 || index % Math.ceil(points.length / 8) === 0}<text x={x(index)} y={H - 10} text-anchor="middle">{formatDate(point.date)}</text>{/if}
  {/each}
</svg>
