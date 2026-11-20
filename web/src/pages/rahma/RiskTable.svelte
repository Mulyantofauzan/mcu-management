<script>
  import { RISK_LEVELS } from './assessment.js';
  import { METABOLIC_LABEL } from '../../lib/metabolic.js';
  import { initials } from '../../lib/people.js';

  let { rows, offset, ondetail } = $props();
  const PILL = { 1: 'p0', 2: 'p2', 3: 'p3', 4: 's-unfit' };
</script>

<div class="tbl-wrap">
  <table>
    <thead><tr><th>No</th><th>Nama</th><th>Jabatan</th><th>Departemen</th><th>Sindrom metabolik</th><th>Risk total</th><th>Risk level</th><th>Aksi</th></tr></thead>
    <tbody>
      {#each rows as row, index (row.employeeId)}
        <tr class="row" tabindex="0" onclick={() => ondetail(row)} onkeydown={event => (event.key === 'Enter' || event.key === ' ') && event.target === event.currentTarget && (event.preventDefault(), ondetail(row))}>
          <td class="num">{offset + index + 1}</td>
          <td><div class="who-c"><div class="ava">{initials(row.name)}</div><div><b>{row.name}</b></div></div></td>
          <td>{row.jobTitle || '-'}</td><td>{row.department || '-'}</td>
          <td><span class="pill" class:p3={row.metabolic.risk === 3} class:p0={row.metabolic.risk === 1} class:p2={row.metabolic.risk === 2} class:pm={!row.metabolic.risk}>{METABOLIC_LABEL[row.metabolic.risk] || '-'}</span></td>
          <td class="num"><b>{row.riskTotal || '-'}</b></td>
          <td>{#if row.riskLevel}<span class="pill {PILL[row.riskLevel]}">{RISK_LEVELS[row.riskLevel]}</span>{:else}<span class="pill pm">-</span>{/if}</td>
          <td><button class="btn sm" type="button" onclick={event => { event.stopPropagation(); ondetail(row); }}>Detail</button></td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>
