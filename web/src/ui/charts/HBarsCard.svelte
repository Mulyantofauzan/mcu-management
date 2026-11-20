<script>
  import Card from '../Card.svelte';

  /* items: [{label, value, percent}]. Jumlah selalu tampil bersama persen; lebar batang relatif terhadap jumlah terbesar. */
  let { title, note = '', items } = $props();
  const max = $derived(Math.max(1, ...items.map(item => item.value)));
</script>

<Card {title} {note}>
  <div class="hb">
    {#each items as item (item.label)}
      <div class="hb-row">
        <span>{item.label}</span><b class="num">{item.value}<span class="muted share"> · {item.percent}</span></b>
        <div class="track"><i style:width="{(item.value / max) * 100}%"></i></div>
      </div>
    {/each}
  </div>
</Card>
