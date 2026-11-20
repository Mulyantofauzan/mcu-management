<script>
  import { ICONS } from '../lib/icons.js';
  let { name, size = 18 } = $props();
</script>

<svg class="i" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">{@html ICONS[name] ?? ''}</svg>
