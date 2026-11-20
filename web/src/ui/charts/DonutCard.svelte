<script>
  import Card from '../Card.svelte';
  import Donut from './Donut.svelte';

  let { title, note = '', items, unit = '', showShare = true } = $props();
  const total = $derived(items.reduce((sum, item) => sum + item.value, 0));
  const share = value => (total ? Math.round((value / total) * 100) : 0);
</script>

<Card {title} {note}>
  <div class="donut-wrap">
    <Donut {items} {unit} label={`Donat ${title}`} />
    <div class="donut-leg">
      {#each items as item (item.label)}
        <div>
          <i style:background={item.color}></i>{item.label}
          <b class="num">{item.value}{#if showShare}<span class="muted share"> · {share(item.value)}%</span>{/if}</b>
        </div>
      {/each}
    </div>
  </div>
</Card>
