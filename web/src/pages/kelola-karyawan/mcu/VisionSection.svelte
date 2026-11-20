<script>
  let { rows } = $props();
</script>

<section>
  <h3>Pemeriksaan penglihatan (detail)</h3>
  <div class="tbl-wrap">
    <table>
      <thead>
        <tr><th rowspan="2">Pemeriksaan</th><th colspan="2">Tanpa koreksi</th><th colspan="2">Dengan kacamata</th></tr>
        <tr><th>Mata kiri</th><th>Mata kanan</th><th>Mata kiri</th><th>Mata kanan</th></tr>
      </thead>
      <tbody>
        {#each rows as row (row.label)}
          <tr><td>{row.label}</td>{#each row.cells as cell, index (index)}<td class="num">{cell}</td>{/each}</tr>
        {/each}
      </tbody>
    </table>
  </div>
</section>
