<script>
  import Card from '../../ui/Card.svelte';
  import { formatDateTime } from '../../lib/format.js';
  import { initials } from '../../lib/people.js';

  let { items, canOpenLog } = $props();
</script>

<Card title="Aktivitas Terbaru">
  {#snippet actions()}{#if canOpenLog}<a class="btn sm" href="/activity-log">Log lengkap</a>{/if}{/snippet}
  {#if items.length === 0}
    <p class="muted">Belum ada aktivitas.</p>
  {:else}
    <div class="list">
      {#each items as item, index (item.timestamp + index)}
        <div class="li">
          <div class="ava">{initials(item.who)}</div>
          <div class="tx"><div class="nm">{item.who}</div><div class="sub">{item.text} · {formatDateTime(item.timestamp)}</div></div>
          <span class="tag">{item.tag}</span>
        </div>
      {/each}
    </div>
  {/if}
</Card>
