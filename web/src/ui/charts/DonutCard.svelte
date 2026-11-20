<script>
  import Card from '../Card.svelte';
  import Donut from './Donut.svelte';
  import { formatPercent } from '../../lib/percent.js';

  let { title, note = '', items, unit = '', showShare = true } = $props();
  const total = $derived(items.reduce((sum, item) => sum + item.value, 0));
</script>

<Card {title} {note}>
  <div class="donut-wrap">
    <Donut {items} {unit} label={`Donat ${title}`} />
    <div class="donut-leg">
      {#each items as item (item.label)}
        <div>
          <i style:background={item.color}></i>{item.label}
          <b class="num">{item.value}{#if showShare}<span class="muted share"> · {formatPercent(item.value, total)}</span>{/if}</b>
        </div>
      {/each}
    </div>
  </div>
</Card>
