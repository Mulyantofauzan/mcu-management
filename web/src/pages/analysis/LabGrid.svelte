<script>
  let { stats } = $props();
  const COLORS = { Normal: 'var(--good)', Low: 'var(--info)', High: 'var(--crit)', 'Not Recorded': 'var(--line-2)' };
  const ORDER = ['Normal', 'Low', 'High', 'Not Recorded'];
</script>

<div class="grid g-3">
  {#each stats as stat (stat.id)}
    <div class="card lab-card">
      <div class="head"><b>{stat.name}</b>{#if stat.average !== null}<span class="muted num">Avg: {stat.average.toFixed(2).replace('.', ',')} {stat.unit}</span>{/if}</div>
      <div class="stack" role="img" aria-label={`Status ${stat.name}`}>
        {#each ORDER as key (key)}{#if stat.counts[key]}<i style:width="{(stat.counts[key] / stat.total) * 100}%" style:background={COLORS[key]} title="{key}: {stat.counts[key]}"></i>{/if}{/each}
      </div>
      <div class="legend">{#each ORDER as key (key)}{#if stat.counts[key]}<span><i style:background={COLORS[key]}></i>{key} <b class="num">{stat.counts[key]}</b></span>{/if}{/each}</div>
    </div>
  {/each}
</div>
