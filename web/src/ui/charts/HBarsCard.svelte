<script>
  import Card from '../Card.svelte';

  /* items: [{label, value, share}] dengan share dalam persen. Lebar batang relatif terhadap yang terbesar. */
  let { title, note = '', items } = $props();
  const max = $derived(Math.max(1, ...items.map(item => item.share)));
</script>

<Card {title} {note}>
  <div class="hb">
    {#each items as item (item.label)}
      <div class="hb-row">
        <span>{item.label}</span><b class="num">{item.share}%</b>
        <div class="track"><i style:width="{(item.share / max) * 100}%"></i></div>
      </div>
    {/each}
  </div>
</Card>
