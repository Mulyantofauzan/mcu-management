<script>
  import Dialog from '../../ui/Dialog.svelte';
  import { RISK_LEVELS } from './assessment.js';
  import { METABOLIC_LABEL } from '../../lib/metabolic.js';

  let { row, onclose } = $props();
  const sign = value => (value > 0 ? `+${value}` : String(value));
  const flag = value => (value === undefined ? '-' : value === 1 ? 'Ya' : 'Tidak');
</script>

<Dialog open={Boolean(row)} {onclose} title="Detail Risiko Kardiovaskular" subtitle="Skor Jakarta dan sindrom metabolik." size="wide">
  {#if row}
    <div class="stackv">
      <section>
        <div class="kv">
          <div><span>Nama</span><b>{row.name}</b></div><div><span>Jabatan</span><b>{row.jobTitle || '-'}</b></div>
          <div><span>Departemen</span><b>{row.department || '-'}</b></div><div><span>Risk level</span><b>{RISK_LEVELS[row.riskLevel] || '-'}</b></div>
        </div>
      </section>
      <section>
        <h3>Skor Jakarta</h3>
        <div class="tbl-wrap"><table>
          <thead><tr><th>Parameter</th><th>Nilai</th><th>Poin</th></tr></thead>
          <tbody>
            <tr><td>Jenis kelamin</td><td class="muted">{row.gender || '-'}</td><td class="num" align="right"><b>{sign(row.scores.jk)}</b></td></tr>
            <tr><td>Usia</td><td class="muted">{row.age ?? '-'} tahun</td><td class="num" align="right"><b>{sign(row.scores.umur)}</b></td></tr>
            <tr><td>Tekanan darah</td><td class="muted">{row.bloodPressure || '-'} mmHg</td><td class="num" align="right"><b>{sign(row.scores.td)}</b></td></tr>
            <tr><td>Indeks massa tubuh</td><td class="muted">{row.bmi || '-'}</td><td class="num" align="right"><b>{sign(row.scores.imt)}</b></td></tr>
            <tr><td>Merokok</td><td class="muted">{row.smoking || '-'}</td><td class="num" align="right"><b>{sign(row.scores.merokok)}</b></td></tr>
            <tr><td>Diabetes mellitus</td><td class="muted">{row.diabetes ? 'Ya' : 'Tidak'}</td><td class="num" align="right"><b>{sign(row.scores.diabetes)}</b></td></tr>
            <tr><td>Aktivitas fisik</td><td class="muted">{row.exercise || '-'}</td><td class="num" align="right"><b>{sign(row.scores.aktivitasFisik)}</b></td></tr>
          </tbody>
        </table></div>
        <p class="gap-top"><b>Skor total: {row.score}</b> · Level Jakarta {row.cvLevel || '-'}</p>
      </section>
      <section>
        <h3>Sindrom metabolik</h3>
        <div class="tbl-wrap"><table>
          <thead><tr><th>Komponen</th><th>Memenuhi kriteria</th></tr></thead>
          <tbody>
            <tr><td>Lingkar perut{#if row.waist} ({row.waist} cm){/if}</td><td>{flag(row.metabolic.scores.lp)}</td></tr>
            <tr><td>Trigliserida</td><td>{flag(row.metabolic.scores.tg)}</td></tr>
            <tr><td>HDL</td><td>{flag(row.metabolic.scores.hdl)}</td></tr>
            <tr><td>Tekanan darah</td><td>{flag(row.metabolic.scores.td)}</td></tr>
            <tr><td>Gula darah puasa</td><td>{flag(row.metabolic.scores.gdp)}</td></tr>
          </tbody>
        </table></div>
        <p class="gap-top"><b>{METABOLIC_LABEL[row.metabolic.risk] || 'Tidak diketahui'}</b> · {row.metabolic.countedCriteria} dari 5 kriteria tersedia · Risk total: <b>{row.riskTotal || '-'}</b></p>
      </section>
    </div>
  {/if}
  {#snippet footer()}<button class="btn" type="button" onclick={onclose}>Tutup</button>{/snippet}
</Dialog>
