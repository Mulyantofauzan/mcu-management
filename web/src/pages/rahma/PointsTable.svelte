<script>
  import Card from '../../ui/Card.svelte';
  import { POINT_GROUPS, LEVEL_NOTES } from './pointsTable.js';
</script>

<Card title="Tabel poin" note="Total -7 sampai 18">
  <div class="tbl-wrap">
    <table>
      <thead><tr><th>Parameter</th><th>Kategori</th><th>Poin</th></tr></thead>
      <tbody>
        {#each POINT_GROUPS as group (group.name)}
          {#each group.rows as [label, points], index (label)}
            <tr>{#if index === 0}<td rowspan={group.rows.length}>{group.name}</td>{/if}<td>{label}</td><td class="num" align="right">{points}</td></tr>
          {/each}
        {/each}
      </tbody>
    </table>
  </div>
  <div class="legend gap-top">
    <span><i style="background:var(--good)"></i>{LEVEL_NOTES[0].label}: {LEVEL_NOTES[0].risk}</span>
    <span><i style="background:var(--warn)"></i>{LEVEL_NOTES[1].label}: {LEVEL_NOTES[1].risk}</span>
    <span><i style="background:var(--crit)"></i>{LEVEL_NOTES[2].label}: {LEVEL_NOTES[2].risk}</span>
  </div>
</Card>
