<script>
  import Icon from '../ui/Icon.svelte';
  import { menuForRole, pathFor } from '../lib/nav.js';
  import { router } from '../lib/router.svelte.js';
  import { sidebar, closeMobileSidebar } from '../lib/sidebar.svelte.js';
  import { badges } from '../lib/badges.svelte.js';

  let { role, coverage = null } = $props();
  const groups = $derived(menuForRole(role));
</script>

<aside class="side" class:open={sidebar.mobileOpen} id="side" aria-label="Navigasi utama">
  <div class="brand">
    <div class="brand-mark" aria-hidden="true"><Icon name="shield" size={20} /></div>
    <div><b>MADIS</b><small>Medical Check-Up Analysis &amp; Data Information System</small></div>
  </div>
  <nav class="nav" aria-label="Menu">
    {#each groups as group, index (group.label)}
      <div class="nav-label" style:margin-top={index ? '14px' : null}>{group.label}</div>
      {#each group.items as item (item.key)}
        {@const href = pathFor(item.key)}
        <a {href} aria-current={router.path === href ? 'page' : undefined} onclick={closeMobileSidebar}>
          <Icon name={item.icon} />{item.label}
          {#if item.key === 'mcu-expiry-management' && badges.expiry > 0}<span class="cnt" aria-label={`${badges.expiry} perlu diperhatikan`}>{badges.expiry}</span>{/if}
        </a>
      {/each}
    {/each}
  </nav>
  {#if coverage}
    <div class="cycle">
      <div class="t">Cakupan MCU {coverage.year}</div>
      <div class="v num">{coverage.percent}%</div>
      <div class="bar"><i style:width="{coverage.percent}%"></i></div>
      <div class="s">{coverage.done} dari {coverage.total} karyawan</div>
    </div>
  {/if}
</aside>
<div class="side-backdrop" class:open={sidebar.mobileOpen} onclick={closeMobileSidebar} aria-hidden="true"></div>
