<script>
  import Icon from '../ui/Icon.svelte';
  import { theme, toggleTheme } from '../lib/theme.svelte.js';
  import { toggleSidebar, sidebar } from '../lib/sidebar.svelte.js';
  import { navigate } from '../lib/router.svelte.js';
  import { initials, roleTitle } from '../lib/people.js';

  let { user, onlogout } = $props();
  let query = $state('');

  function search(event) {
    event.preventDefault();
    const q = query.trim();
    navigate(q ? `/kelola-karyawan?q=${encodeURIComponent(q)}` : '/kelola-karyawan');
  }
</script>

<header class="topbar">
  <button class="icon-btn menu-btn" type="button" onclick={toggleSidebar} aria-label="Tampilkan atau sembunyikan menu" aria-controls="side" aria-expanded={!sidebar.collapsed}>
    <Icon name="menu" />
  </button>
  <form class="search" role="search" onsubmit={search}>
    <Icon name="search" size={17} />
    <input id="gsearch" type="search" bind:value={query} placeholder="Cari nama atau NIK karyawan" autocomplete="off" aria-label="Cari karyawan">
  </form>
  <button class="icon-btn" type="button" onclick={toggleTheme} aria-label={theme.value === 'dark' ? 'Ganti ke tema terang' : 'Ganti ke tema gelap'}>
    <Icon name={theme.value === 'dark' ? 'sun' : 'moon'} />
  </button>
  <div class="me">
    <div class="who"><b>{user.displayName || user.username}</b><span>{roleTitle(user.role)}</span></div>
    <div class="ava" aria-hidden="true">{initials(user.displayName || user.username)}</div>
    <button class="icon-btn" type="button" onclick={onlogout} aria-label="Keluar dari aplikasi"><Icon name="logout" /></button>
  </div>
</header>
