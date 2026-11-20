<script>
  /* Tabel Rahma seperti aplikasi lama: 22 kolom, dua baris judul berkelompok (Jakarta Cardiovascular Score dan Sindrom Metabolik). */
  import { RISK_LEVELS } from './assessment.js';

  let { rows, offset, ondetail } = $props();

  const dash = value => (value === undefined || value === null ? '-' : value);
  const TONE = { 1: 'p0', 2: 'p2', 3: 'p3' };
  const TOTAL_TONE = { 1: 'p0', 2: 'p0', 3: 'p2', 4: 'p2', 6: 'p3', 9: 's-unfit' };
  const LEVEL_TONE = { 1: 'p0', 2: 'p2', 3: 'p3', 4: 's-unfit' };
  const CV = ['JK', 'Umur', 'TD', 'IMT', 'Merokok', 'Diabetes', 'Aktivitas Fisik', 'Nilai', 'Risk'];
  const META = ['LP', 'TG', 'HDL', 'TD', 'GDP', 'Nilai', 'Risk'];
  const open = (row, event) => { if (event.type === 'click' || event.key === 'Enter' || event.key === ' ') { event.preventDefault(); ondetail(row); } };
</script>

<div class="tbl-wrap matrix-wrap">
  <table class="matrix">
    <thead>
      <tr>
        <th rowspan="2" class="st s1">No</th><th rowspan="2" class="st s2">Nama</th><th rowspan="2" class="st s3">Jabatan</th><th rowspan="2" class="st s4">Departemen</th>
        <th colspan="9" class="grp g-cv">Jakarta Cardiovascular Score</th><th colspan="7" class="grp g-meta">Sindrom Metabolik</th>
        <th rowspan="2" class="grp">Risk Total</th><th rowspan="2" class="grp">Risk Level</th>
      </tr>
      <tr>{#each CV as label (label)}<th class="sub g-cv">{label}</th>{/each}{#each META as label, index (index)}<th class="sub g-meta">{label}</th>{/each}</tr>
    </thead>
    <tbody>
      {#each rows as row, index (row.employeeId)}
        <tr class="row lvl-{row.riskLevel}" tabindex="0" onclick={event => open(row, event)} onkeydown={event => open(row, event)} aria-label={`Detail ${row.name}`}>
          <td class="st s1 num">{offset + index + 1}</td><td class="st s2 who"><b>{row.name}</b></td><td class="st s3">{row.jobTitle || '-'}</td><td class="st s4">{row.department || '-'}</td>
          <td class="c g-cv">{row.scores.jk}</td><td class="c g-cv">{row.scores.umur}</td><td class="c g-cv">{row.scores.td}</td><td class="c g-cv">{row.scores.imt}</td>
          <td class="c g-cv">{row.scores.merokok}</td><td class="c g-cv">{row.scores.diabetes}</td><td class="c g-cv">{row.scores.aktivitasFisik}</td>
          <td class="c strong">{row.score}</td><td class="c strong"><span class="pill-cell {TONE[row.cvLevel] || 'pm'}">{row.cvLevel || '-'}</span></td>
          <td class="c g-meta">{dash(row.metabolic.scores.lp)}</td><td class="c g-meta">{dash(row.metabolic.scores.tg)}</td><td class="c g-meta">{dash(row.metabolic.scores.hdl)}</td>
          <td class="c g-meta">{dash(row.metabolic.scores.td)}</td><td class="c g-meta">{dash(row.metabolic.scores.gdp)}</td>
          <td class="c g-meta strong">{dash(row.metabolic.totalScore)}</td><td class="c strong"><span class="pill-cell {TONE[row.metabolic.risk] || 'pm'}">{row.metabolic.risk || '-'}</span></td>
          <td class="c strong"><span class="pill-cell {TOTAL_TONE[row.riskTotal] || 'pm'}">{row.riskTotal || '-'}</span></td>
          <td class="c"><span class="pill {LEVEL_TONE[row.riskLevel] || 'pm'}">{RISK_LEVELS[row.riskLevel] || '-'}</span></td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>
<p class="muted legend-note">Risk Total = level Jakarta x risiko metabolik: 1-2 Low, 3-4 Medium, 6 High, 9 Critical. Klik baris untuk melihat rinciannya.</p>
