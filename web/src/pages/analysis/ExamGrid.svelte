<script>
  import HBarsCard from '../../ui/charts/HBarsCard.svelte';
  import { examDistribution, EXAMS } from './analysis.js';
  import { withShare } from '../dashboard/stats/distributions.js';

  let { items } = $props();
  const cards = $derived(EXAMS.map(([key, title]) => ({ key, title, rows: withShare(examDistribution(items, key)) })));
</script>

<div class="grid g-3">
  {#each cards as card (card.key)}
    {#if card.rows.length}<HBarsCard title={card.title} note="% hasil tercatat" items={card.rows} />
    {:else}<div class="card"><div class="card-h"><h2>{card.title}</h2></div><div class="card-b"><p class="muted">No Data Recorded</p></div></div>{/if}
  {/each}
</div>
