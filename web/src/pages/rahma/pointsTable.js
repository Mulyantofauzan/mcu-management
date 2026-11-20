/* Tabel poin Skor Jakarta: nilai persis dari rumus (lib/jakarta.js), bukan dari desain. */
export const POINT_GROUPS = [
  { name: 'Jenis kelamin', rows: [['Laki-laki', 1], ['Perempuan', 0]] },
  { name: 'Usia', rows: [['Di bawah 35', -4], ['35 sampai 39', -3], ['40 sampai 44', -2], ['45 sampai 49', 0], ['50 sampai 54', 1], ['55 sampai 59', 2], ['60 ke atas', 3]] },
  { name: 'Tekanan darah', rows: [['Di bawah 130/85', 0], ['130-139 atau 85-89', 1], ['140-159 atau 90-99', 2], ['160-179 atau 100-109', 3], ['180 ke atas atau 110 ke atas', 4]] },
  { name: 'IMT', rows: [['Di bawah 26', 0], ['26 sampai 29,99', 1], ['30 ke atas', 2]] },
  { name: 'Merokok', rows: [['Tidak', 0], ['Mantan perokok', 3], ['Perokok aktif', 4]] },
  { name: 'Diabetes', rows: [['Ya', 2], ['Tidak', 0]] },
  { name: 'Aktivitas fisik', rows: [['Tidak pernah', 2], ['1-2x sebulan', 1], ['1-2x seminggu', 0], ['2x seminggu atau lebih', -3]] }
];

export const LEVEL_NOTES = [
  { label: 'Rendah (-7 sampai 1)', level: 1, risk: '<10%' },
  { label: 'Sedang (2 sampai 4)', level: 2, risk: '10-20%' },
  { label: 'Tinggi (5 ke atas)', level: 3, risk: '>20%' }
];

export const bmiFrom = (heightCm, weightKg) => {
  const h = Number(heightCm) / 100, w = Number(weightKg);
  return h > 0 && w > 0 ? Math.round((w / (h * h)) * 10) / 10 : null;
};
