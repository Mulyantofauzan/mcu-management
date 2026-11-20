<script>
  /* Tabel data terhapus dengan kotak centang. columns: [{ label, render }]. */
  import { initials } from '../../lib/people.js';
  import { toggle, toggleAll } from './selection.js';

  let { rows, idOf, nameOf, columns, selected = $bindable([]), onrestore, ondelete } = $props();
  const ids = $derived(rows.map(idOf));
  const all = $derived(ids.length > 0 && ids.every(id => selected.includes(id)));
</script>

<div class="tbl-wrap">
  <table>
    <thead>
      <tr>
        <th><input type="checkbox" checked={all} onchange={() => (selected = toggleAll(selected, ids))} aria-label="Pilih semua"></th>
        {#each columns as column (column.label)}<th>{column.label}</th>{/each}
        <th>Aksi</th>
      </tr>
    </thead>
    <tbody>
      {#each rows as row (idOf(row))}
        <tr>
          <td><input type="checkbox" checked={selected.includes(idOf(row))} onchange={() => (selected = toggle(selected, idOf(row)))} aria-label={`Pilih ${nameOf(row)}`}></td>
          {#each columns as column, index (column.label)}
            <td class:num={column.num}>
              {#if index === 0}<div class="who-c"><div class="ava">{initials(nameOf(row))}</div><div><b>{column.render(row)}</b></div></div>{:else}{column.render(row)}{/if}
            </td>
          {/each}
          <td><div class="actions-cell"><button class="btn sm" type="button" onclick={() => onrestore([idOf(row)])}>Restore</button><button class="btn sm danger-text" type="button" onclick={() => ondelete([idOf(row)])}>Hapus permanen</button></div></td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>
