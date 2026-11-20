<script>
  /* Dialog modal: Esc menutup, klik latar menutup, fokus terkunci di dalam dan kembali ke pemicu. */
  import Icon from './Icon.svelte';
  import { pushDialog, popDialog, isTopDialog } from '../lib/dialogStack.js';

  let { open, onclose, title, subtitle = '', size = 'side', footer, children } = $props();
  let panel = $state(null);
  let trigger = null;
  const token = Symbol('dialog');

  const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

  $effect(() => {
    if (!open || !panel) return;
    trigger = document.activeElement;
    pushDialog(token);
    (panel.querySelector('[data-first]') || panel.querySelector(FOCUSABLE))?.focus();
    return () => { popDialog(token); trigger?.focus?.(); };
  });

  function keydown(event) {
    if (!open || !isTopDialog(token)) return;
    if (event.key === 'Escape') { event.stopPropagation(); onclose(); return; }
    if (event.key !== 'Tab' || !panel) return;
    const items = [...panel.querySelectorAll(FOCUSABLE)].filter(el => el.offsetParent !== null);
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
</script>

<svelte:window onkeydown={keydown} />

{#if open}
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
  <div class="scrim" class:center={size === 'center'} onclick={event => event.target === event.currentTarget && onclose()}>
    <div class="panel" class:wide={size === 'wide'} role="dialog" aria-modal="true" aria-label={title} bind:this={panel}>
      <div class="panel-h">
        <div><h2>{title}</h2>{#if subtitle}<p>{subtitle}</p>{/if}</div>
        <button class="icon-btn" type="button" onclick={onclose} aria-label="Tutup"><Icon name="x" /></button>
      </div>
      <div class="panel-b">{@render children()}</div>
      {#if footer}<div class="panel-f">{@render footer()}</div>{/if}
    </div>
  </div>
{/if}
