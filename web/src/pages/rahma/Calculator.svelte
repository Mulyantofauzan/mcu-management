<script>
  import Card from '../../ui/Card.svelte';
  import { jakartaScoreFromInputs, jakartaLevel } from '../../lib/jakarta.js';
  import { bmiFrom, LEVEL_NOTES } from './pointsTable.js';

  let f = $state({ gender: 'Laki-laki', age: 37, systolic: 138, diastolic: 88, height: 168, weight: 74, glucose: 104, smoking: 'Mantan perokok', exercise: '1-2x seminggu' });

  const bmi = $derived(bmiFrom(f.height, f.weight));
  const result = $derived(jakartaScoreFromInputs({
    gender: f.gender, age: Number(f.age), bloodPressure: f.systolic && f.diastolic ? `${f.systolic}/${f.diastolic}` : '',
    bmi: bmi ? String(bmi) : '', smoking: f.smoking, exercise: f.exercise, diabetes: Number(f.glucose) >= 126
  }));
  const level = $derived(jakartaLevel(result.score));
  const note = $derived(LEVEL_NOTES[level - 1]);
  const PILL = ['pm', 'p0', 'p2', 'p3'];
</script>

<Card title="Kalkulator" note="Rumus sama dengan penilaian karyawan">
  <div class="form">
    <label>Jenis kelamin<select class="field" bind:value={f.gender}><option>Laki-laki</option><option>Perempuan</option></select></label>
    <label>Usia (tahun)<input class="field num" type="number" min="18" max="90" bind:value={f.age}></label>
    <label>Sistolik (mmHg)<input class="field num" type="number" min="60" max="260" bind:value={f.systolic}></label>
    <label>Diastolik (mmHg)<input class="field num" type="number" min="40" max="160" bind:value={f.diastolic}></label>
    <label>Tinggi badan (cm)<input class="field num" type="number" min="120" max="210" bind:value={f.height}></label>
    <label>Berat badan (kg)<input class="field num" type="number" min="30" max="200" bind:value={f.weight}></label>
    <label>Gula darah puasa (mg/dL)<input class="field num" type="number" min="40" max="500" bind:value={f.glucose}></label>
    <label>Merokok<select class="field" bind:value={f.smoking}><option>Tidak merokok</option><option>Mantan perokok</option><option>Perokok aktif</option></select></label>
    <label>Aktivitas fisik<select class="field" bind:value={f.exercise}><option>Tidak pernah</option><option>1-2x sebulan</option><option>1-2x seminggu</option><option>2x seminggu</option></select></label>
  </div>
  <div class="live gap-top" aria-live="polite">
    <span>Skor total <b class="num result">{result.score}</b>{#if bmi}<span class="muted"> · IMT {String(bmi).replace('.', ',')}</span>{/if}{#if Number(f.glucose) >= 126}<span class="muted"> · diabetes (GDP 126 ke atas)</span>{/if}</span>
    <span class="pill {PILL[level]}">{note ? `Risiko ${note.label.split(' ')[0].toLowerCase()} (${note.risk})` : 'Di luar rentang'}</span>
  </div>
</Card>
