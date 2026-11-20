<script>
  /* Tiga dialog sekaligus: tambah, edit, dan ubah password. Hanya satu yang terbuka (mode). */
  import Dialog from '../../ui/Dialog.svelte';
  import { validateNewUser, validateEditUser, validatePassword } from '../../lib/userValidation.js';

  let { mode, target, saving = false, onsave, onclose } = $props();
  let form = $state({});
  let errors = $state([]);

  $effect(() => {
    if (!mode) return;
    errors = [];
    form = mode === 'add' ? { username: '', displayName: '', role: 'Petugas', password: '', confirm: '' }
      : mode === 'edit' ? { username: target.username, displayName: target.displayName || '', role: target.role, active: target.active }
      : { password: '', confirm: '' };
  });

  function submit(event) {
    event.preventDefault();
    if (mode === 'add') { const result = validateNewUser(form); errors = result.errors; if (result.isValid) onsave(form); }
    else if (mode === 'edit') { const result = validateEditUser(form); errors = result.errors; if (result.isValid) onsave(form); }
    else { const message = validatePassword(form.password, form.confirm); errors = message ? [message] : []; if (!message) onsave({ password: form.password }); }
  }

  const titles = { add: ['Tambah User', 'Buat akun baru untuk Administrator atau Petugas.'], edit: ['Edit User', 'Perbarui data akun.'], password: ['Ubah Password', 'Atur password baru untuk akun ini.'] };
</script>

<Dialog open={Boolean(mode)} {onclose} title={titles[mode]?.[0] ?? ''} subtitle={titles[mode]?.[1] ?? ''} size="center">
  {#if mode}
    <form id="user-form" onsubmit={submit}>
      {#if errors.length}<div class="alert bad" role="alert"><ul class="err-list">{#each errors as message}<li>{message}</li>{/each}</ul></div>{/if}
      <div class="form form-single">
        {#if mode === 'add' || mode === 'edit'}
          <label>Username <input class="field" bind:value={form.username} required autocomplete="off" data-first></label>
          <label>Nama lengkap <input class="field" bind:value={form.displayName} required></label>
          <label>Role <select class="field" bind:value={form.role}><option value="Petugas">Petugas</option><option value="Admin">Administrator</option></select></label>
        {/if}
        {#if mode === 'edit'}<label>Status akun <select class="field" bind:value={form.active}><option value={true}>Aktif</option><option value={false}>Nonaktif</option></select></label>{/if}
        {#if mode === 'add' || mode === 'password'}
          <label>{mode === 'password' ? 'Password baru' : 'Password'} <input class="field" type="password" bind:value={form.password} required autocomplete="new-password"></label>
          <label>Konfirmasi password <input class="field" type="password" bind:value={form.confirm} required autocomplete="new-password"></label>
        {/if}
      </div>
    </form>
  {/if}
  {#snippet footer()}
    <button class="btn" type="button" onclick={onclose} disabled={saving}>Batal</button>
    <button class="btn pri" type="submit" form="user-form" disabled={saving}>{saving ? 'Menyimpan...' : mode === 'add' ? 'Tambah' : mode === 'password' ? 'Update' : 'Simpan'}</button>
  {/snippet}
</Dialog>
