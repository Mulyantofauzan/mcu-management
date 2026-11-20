<script>
  import { pillClass } from '../../../lib/status.js';

  let { title, result, notes } = $props();
</script>

<section>
  <h3>{title}</h3>
  <p><span class="pill {pillClass(result)}">{result || '-'}</span></p>
  <p class="muted gap-top">Catatan: {notes || '-'}</p>
</section>
