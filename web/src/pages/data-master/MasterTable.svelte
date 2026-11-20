<script>
  let { type, rows, onedit, ondelete } = $props();
</script>

<div class="tbl-wrap">
  <table>
    <thead><tr>{#each type.columns as column (column.label)}<th>{column.label}</th>{/each}<th>Aksi</th></tr></thead>
    <tbody>
      {#each rows as row (row.id)}
        <tr>
          {#each type.columns as column (column.label)}
            <td class:num={column.num}>
              {#if column.status}<span class="pill" class:p0={column.status(row)} class:pm={!column.status(row)}>{column.status(row) ? 'Aktif' : 'Tidak aktif'}</span>
              {:else if column.strong}<b>{column.value(row)}</b>
              {:else}{column.value(row)}{/if}
            </td>
          {/each}
          <td><div class="actions-cell"><button class="btn sm" type="button" onclick={() => onedit(row)}>Edit</button><button class="btn sm danger-text" type="button" onclick={() => ondelete(row)}>Hapus</button></div></td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>
