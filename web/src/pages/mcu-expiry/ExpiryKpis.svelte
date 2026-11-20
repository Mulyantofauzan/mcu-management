<script>
  let { stats } = $props();
  const cards = $derived([
    { label: 'MCU Expired', value: stats.expired, sub: 'Masa berlaku sudah habis', share: stats.expiredShare, color: 'var(--crit)' },
    { label: 'MCU Warning (60 hari)', value: stats.warning, sub: 'Berakhir dalam 60 hari', share: stats.warningShare, color: 'var(--warn)' },
    { label: 'Total Perlu Diperhatikan', value: stats.total, sub: 'Expired ditambah Warning', share: stats.totalShare, color: 'var(--accent)' }
  ]);
</script>

<div class="grid g-kpi">
  {#each cards as card (card.label)}
    <div class="card kpi">
      <div class="l"><i style:background={card.color}></i>{card.label}</div>
      <div class="v num">{card.value}</div>
      <div class="s">{card.sub}</div>
      <div class="meter">
        <div class="bar" role="img" aria-label={`${card.share} persen`}><i style:width="{card.share}%" style:background={card.color}></i></div>
        <b class="num">{String(card.share).replace('.', ',')}%</b>
      </div>
    </div>
  {/each}
</div>
