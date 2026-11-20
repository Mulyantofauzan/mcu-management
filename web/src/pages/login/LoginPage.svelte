<script>
  import Icon from '../../ui/Icon.svelte';
  import { theme, toggleTheme } from '../../lib/theme.svelte.js';
  import { loginRequest, saveSession } from '../../lib/session.js';
  import { readStored, writeStored, removeStored } from '../../lib/storage.js';

  const REMEMBER_KEY = 'sehatra-remember-user';
  let { onsignin } = $props();

  const remembered = readStored(REMEMBER_KEY) || '';
  let username = $state(remembered);
  let password = $state('');
  let remember = $state(Boolean(remembered));
  let busy = $state(false);
  let error = $state('');

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    busy = true;
    error = '';
    try {
      const { user, token } = await loginRequest(username.trim(), password);
      saveSession(user, token);
      if (remember) writeStored(REMEMBER_KEY, username.trim());
      else removeStored(REMEMBER_KEY);
      onsignin(user);
    } catch (failure) {
      error = failure.message || 'Tidak dapat masuk. Coba lagi.';
    } finally {
      busy = false;
    }
  }
</script>

<main id="main" class="auth">
  <div class="card auth-card">
    <div class="brand">
      <div class="brand-mark" aria-hidden="true"><Icon name="shield" size={20} /></div>
      <div><b>Sehatra</b><small>Manajemen MCU</small></div>
    </div>
    <div>
      <h1 class="auth-title">Masuk</h1>
      <p class="muted">Gunakan akun yang diberikan administrator.</p>
    </div>
    {#if error}<div class="alert bad" role="alert">{error}</div>{/if}
    {#if busy}<div class="alert info" role="status">Memproses...</div>{/if}
    <form class="stackv" onsubmit={submit}>
      <div class="form form-single">
        <label>Username
          <input class="field" name="username" type="text" bind:value={username} placeholder="Masukkan username" required autocomplete="username">
        </label>
        <label>Password
          <input class="field" name="password" type="password" bind:value={password} placeholder="Masukkan password" required autocomplete="current-password">
        </label>
      </div>
      <label class="check"><input type="checkbox" bind:checked={remember}> Ingat saya</label>
      <button class="btn pri block" type="submit" disabled={busy}>Masuk</button>
    </form>
    <div class="auth-foot">&copy; 2025 SHE PST Site MHU · <span class="tag num">v{__APP_VERSION__}</span></div>
    <div class="auth-theme">
      <button class="icon-btn" type="button" onclick={toggleTheme} aria-label={theme.value === 'dark' ? 'Ganti ke tema terang' : 'Ganti ke tema gelap'}>
        <Icon name={theme.value === 'dark' ? 'sun' : 'moon'} />
      </button>
    </div>
  </div>
</main>
