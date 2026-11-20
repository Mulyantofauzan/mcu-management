<script>
  import { formatDate } from '../../lib/format.js';
  import { initials, roleTitle } from '../../lib/people.js';

  let { users, currentUserId, onedit, onpassword, ondelete } = $props();
</script>

<div class="tbl-wrap">
  <table>
    <thead><tr><th>Username</th><th>Nama lengkap</th><th>Role</th><th>Status</th><th>Dibuat</th><th>Aksi</th></tr></thead>
    <tbody>
      {#each users as user (user.userId)}
        <tr>
          <td><div class="who-c"><div class="ava">{initials(user.displayName || user.username)}</div><div><b>{user.username}</b></div></div></td>
          <td>{user.displayName || '-'}</td>
          <td><span class="tag">{roleTitle(user.role)}</span></td>
          <td><span class="pill" class:p0={user.active} class:pm={!user.active}>{user.active ? 'Aktif' : 'Nonaktif'}</span></td>
          <td class="num">{formatDate(user.createdAt)}</td>
          <td>
            <div class="actions-cell">
              <button class="btn sm" type="button" onclick={() => onedit(user)}>Edit</button>
              <button class="btn sm" type="button" onclick={() => onpassword(user)}>Ubah password</button>
              {#if user.userId !== currentUserId}<button class="btn sm danger-text" type="button" onclick={() => ondelete(user)}>Hapus</button>{/if}
            </div>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>
