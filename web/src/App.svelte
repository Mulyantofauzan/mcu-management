<script>
  import AppShell from './shell/AppShell.svelte';
  import Toast from './ui/Toast.svelte';
  import { ROUTES } from './routes.js';
  import { matchRoute } from './lib/router.js';
  import { resolveAccess } from './lib/roleAccess.js';
  import { pageLabel, pathFor } from './lib/nav.js';
  import { router, navigate, initRouter } from './lib/router.svelte.js';
  import { initTheme } from './lib/theme.svelte.js';
  import { initSidebar } from './lib/sidebar.svelte.js';
  import { getCurrentUser, clearSession, watchSession } from './lib/session.js';

  initTheme();
  initSidebar();
  initRouter();

  let user = $state(getCurrentUser());
  const route = $derived(matchRoute(ROUTES, router.path));
  const guard = $derived(decide(route, user));

  function decide(current, signedIn) {
    if (!current) return { go: '/login' };
    if (current.public) return signedIn ? { go: '/' } : { show: true };
    if (!signedIn) return { go: '/login' };
    if (current.key === 'not-found') return { show: true };
    const access = resolveAccess({ role: signedIn.role, page: current.key });
    return access.allowed ? { show: true } : { go: pathFor(access.redirectPage || 'dashboard') };
  }

  $effect(() => {
    if (guard.go) navigate(guard.go, { replace: true });
  });

  $effect(() => {
    document.title = route && !route.public ? `${pageLabel(route.key)} - MADIS` : 'Masuk - MADIS';
  });

  /* Token habis saat halaman dibiarkan terbuka: kembali ke halaman masuk tanpa menunggu klik. */
  $effect(() => {
    if (user) return watchSession(logout);
  });

  function logout() {
    clearSession();
    user = null;
    navigate('/login', { replace: true });
  }
</script>

{#if guard.show && route}
  {#await route.load() then page}
    {@const Page = page.default}
    {#if route.public}
      <Page onsignin={signedIn => { user = signedIn; navigate('/', { replace: true }); }} />
    {:else}
      <AppShell {user} onlogout={logout}><Page {user} /></AppShell>
    {/if}
  {/await}
{/if}
<Toast />
