<script>
  import Card from '../../ui/Card.svelte';
  import { formatDate } from '../../lib/format.js';
  import { initials } from '../../lib/people.js';

  let { items, total } = $props();
</script>

<Card title="Perlu Follow-Up">
  {#snippet actions()}<a class="btn sm" href="/follow-up">Buka Follow-up</a>{/snippet}
  {#if items.length === 0}
    <p class="muted">Tidak ada yang perlu follow-up.</p>
  {:else}
    <div class="list">
      {#each items as { employee, mcu } (mcu.mcuId)}
        <a class="li" href="/follow-up">
          <div class="ava">{initials(employee.name)}</div>
          <div class="tx"><div class="nm">{employee.name}</div><div class="sub">{employee.department || '-'} · MCU {formatDate(mcu.mcuDate)}</div></div>
          <span class="pill s-followup">Follow-Up</span>
        </a>
      {/each}
    </div>
    {#if total > items.length}<p class="muted more">+{total - items.length} lainnya</p>{/if}
  {/if}
</Card>
