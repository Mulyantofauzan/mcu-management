<script>
  import Card from '../../ui/Card.svelte';

  let { result, employee, onagain } = $props();
</script>

<Card title="MCU berhasil disimpan" note={employee?.name}>
  <p class="muted">ID MCU (salin untuk referensi):</p>
  <p class="saved-id num" id="saved-mcu-id">{result.mcu.mcuId}</p>
  {#if result.warnings.length}<div class="alert info" role="status">{result.warnings.join(' ')}</div>{/if}
  <p class="gap-top inline">
    <button class="btn pri" type="button" onclick={onagain}>Input MCU lain</button>
    <a class="btn" href="/kelola-karyawan">Ke Kelola Karyawan</a>
  </p>
</Card>
