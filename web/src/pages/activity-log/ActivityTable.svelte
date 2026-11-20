<script>
  import { detailOf } from './activityLog.js';

  let { rows } = $props();
  const ACTION = { create: 'p0', update: 'p2', delete: 'p3', restore: 'p1' };
</script>

<div class="tbl-wrap">
  <table>
    <thead><tr><th>Waktu</th><th>User</th><th>Aksi</th><th>Target</th><th>Detail</th></tr></thead>
    <tbody>
      {#each rows as activity (activity.id)}
        <tr>
          <td class="num">{new Date(activity.timestamp).toLocaleString('id-ID')}</td>
          <td>{activity.userName || 'System'}</td>
          <td><span class="pill {ACTION[activity.action] || 'pm'}">{activity.action}</span></td>
          <td><span class="tag">{activity.target || '-'}</span></td>
          <td class="muted detail">{detailOf(activity)}</td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>
