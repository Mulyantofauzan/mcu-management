/* Penilaian penglihatan: dipindahkan dari visionScaleHelper.js lama. Nilai terburuk dari empat pasang mata dipakai. */
export const VISION_GRADES = {
  normal: { label: 'Normal', values: ['6/6', '20/20', 'J1'] },
  ringan: { label: 'Gangguan Ringan', values: ['6/9', '6/12', '20/30', '20/40'] },
  sedang: { label: 'Gangguan Sedang', values: ['6/18', '6/24', '20/60', '20/80'] },
  berat: { label: 'Gangguan Berat', values: ['6/36', '6/60', '20/120', '20/200'] }
};
export const UNMEASURED = { id: 'unmeasured', label: 'Tidak Terukur' };
const HIERARCHY = ['berat', 'sedang', 'ringan', 'normal'];

export function visionGrade(value) {
  if (!value) return 'unmeasured';
  const normalized = String(value).trim().toUpperCase();
  const found = Object.entries(VISION_GRADES).find(([, grade]) => grade.values.some(item => item.toUpperCase() === normalized));
  return found ? found[0] : 'unmeasured';
}

const worse = (a, b) => {
  if (a === 'unmeasured') return b;
  if (b === 'unmeasured') return a;
  const x = HIERARCHY.indexOf(a), y = HIERARCHY.indexOf(b);
  if (x === -1) return b;
  if (y === -1) return a;
  return x < y ? a : b;
};

export function evaluateVision(mcu) {
  const pairs = [
    [mcu.visionDistantUnaidedLeft, mcu.visionDistantSpectaclesLeft], [mcu.visionDistantUnaidedRight, mcu.visionDistantSpectaclesRight],
    [mcu.visionNearUnaidedLeft, mcu.visionNearSpectaclesLeft], [mcu.visionNearUnaidedRight, mcu.visionNearSpectaclesRight]
  ];
  const eyes = pairs.map(([unaided, spectacles]) => worse(visionGrade(unaided), visionGrade(spectacles)));
  const measured = eyes.filter(grade => grade !== 'unmeasured');
  return measured.length ? measured.reduce(worse) : 'unmeasured';
}

export const gradeLabel = id => (id === 'unmeasured' ? UNMEASURED.label : VISION_GRADES[id]?.label);
