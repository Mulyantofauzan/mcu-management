<script>
  import { toast } from '../lib/toast.svelte.js';
</script>

{#if toast.message}
  <div class="toast" role="status">{toast.message}</div>
{/if}
