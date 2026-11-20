<script>
  import Sidebar from './Sidebar.svelte';
  import Topbar from './Topbar.svelte';
  import { closeMobileSidebar } from '../lib/sidebar.svelte.js';

  let { user, coverage = null, onlogout, children } = $props();
</script>

<svelte:window onkeydown={event => event.key === 'Escape' && closeMobileSidebar()} />

<a class="skip" href="#main">Lewati ke konten</a>
<div class="app">
  <Sidebar role={user.role} {coverage} />
  <div class="main">
    <Topbar {user} {onlogout} />
    <main id="main" class="content">{@render children()}</main>
  </div>
</div>
