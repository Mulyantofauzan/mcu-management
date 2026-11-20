<script>
  import { onMount } from 'svelte';
  import PageHeader from '../../ui/PageHeader.svelte';
  import Card from '../../ui/Card.svelte';
  import DataState from '../../ui/DataState.svelte';
  import ConfirmDialog from '../../ui/ConfirmDialog.svelte';
  import Icon from '../../ui/Icon.svelte';
  import UserTable from './UserTable.svelte';
  import UserDialogs from './UserDialogs.svelte';
  import { listUsers, createUser, updateUser, deleteUser } from '../../data/users.js';
  import { showToast } from '../../lib/toast.svelte.js';

  let { user } = $props();
  let status = $state('loading');
  let error = $state('');
  let users = $state([]);
  let mode = $state(null);
  let target = $state(null);
  let deleting = $state(null);
  let busy = $state(false);

  const pageState = $derived(status !== 'ready' ? status : users.length ? 'ready' : 'empty');

  async function load() {
    status = 'loading';
    try { users = await listUsers(); status = 'ready'; } catch (failure) { error = failure.message; status = 'error'; }
  }

  const open = (next, row = null) => { mode = next; target = row; };
  const close = () => { mode = null; target = null; };

  async function save(form) {
    busy = true;
    try {
      if (mode === 'add') { await createUser(form); showToast('User berhasil ditambahkan'); }
      else if (mode === 'edit') { await updateUser(target.userId, form); showToast('User berhasil diupdate'); }
      else { await updateUser(target.userId, { password: form.password }); showToast('Password berhasil diubah'); }
      close();
      await load();
    } catch (failure) {
      showToast(`Gagal menyimpan user: ${failure.message}`);
    } finally {
      busy = false;
    }
  }

  async function remove() {
    busy = true;
    try {
      await deleteUser(deleting.userId);
      showToast('User berhasil dihapus');
      deleting = null;
      await load();
    } catch (failure) {
      showToast(`Gagal menghapus user: ${failure.message}`);
    } finally {
      busy = false;
    }
  }

  onMount(load);
</script>

<PageHeader title="Kelola User" subtitle="Akun, peran, dan password pengguna aplikasi.">
  <button class="btn pri" type="button" onclick={() => open('add')}><Icon name="plus" />Tambah User</button>
</PageHeader>

<Card title="Daftar User" note={status === 'ready' ? `${users.length} akun` : ''}>
  <DataState state={pageState} {error} onretry={load} emptyTitle="Belum ada user">
    <UserTable {users} currentUserId={user.userId} onedit={row => open('edit', row)} onpassword={row => open('password', row)} ondelete={row => (deleting = row)} />
  </DataState>
</Card>

<UserDialogs {mode} {target} saving={busy} onsave={save} onclose={close} />
<ConfirmDialog open={Boolean(deleting)} title="Hapus user?" {busy} onconfirm={remove} onclose={() => (deleting = null)}>
  {#if deleting}<p>User <b>{deleting.username}</b> akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.</p>{/if}
</ConfirmDialog>
