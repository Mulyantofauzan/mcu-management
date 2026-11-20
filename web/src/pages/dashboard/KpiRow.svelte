<script>
  import Kpi from '../../ui/Kpi.svelte';
  let { kpis } = $props();
</script>

<div class="grid g-kpi">
  <Kpi label="Total Karyawan" value={kpis.employees} sub="Status aktif" />
  <Kpi label="Jumlah MCU" value={kpis.mcus} sub="Tercatat pada periode filter" color="var(--info)" />
  <Kpi label="MCU Follow-Up" value={kpis.followUp} sub="Menunggu hasil akhir" color="var(--warn)" />
  <Kpi label="MCU Expired" value={kpis.expired} sub="Masa berlaku sudah habis" color="var(--crit)" />
</div>
