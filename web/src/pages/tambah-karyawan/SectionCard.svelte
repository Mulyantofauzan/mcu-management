<script>
  let { id, number, title, note = '', children } = $props();
</script>

<section class="card sec-card" {id} aria-labelledby={`${id}-t`}>
  <div class="card-h"><h2 id={`${id}-t`}>{number}. {title}</h2>{#if note}<span>{note}</span>{/if}</div>
  <div class="card-b">{@render children()}</div>
</section>
