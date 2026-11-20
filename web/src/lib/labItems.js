/* Item lab yang dikenal database. ID, satuan, dan rentang dipindahkan dari labItemsMapping.js lama. */
export const LAB_ITEMS = Object.freeze([
  { id: 5, name: 'Leukosit', unit: '10^3/μL', min: 4, max: 10 },
  { id: 6, name: 'Trombosit', unit: '10^3/μL', min: 150, max: 400 },
  { id: 3, name: 'Hemoglobin', unit: 'g/dL', min: 11, max: 17 },
  { id: 7, name: 'Glukosa Puasa', unit: 'mg/dL', min: 70, max: 110 },
  { id: 31, name: 'Gula Darah 2 JPP', unit: 'mg/dL', min: 1, max: 187 },
  { id: 8, name: 'Kolesterol Total', unit: 'mg/dL', min: 1, max: 200 },
  { id: 10, name: 'HDL', unit: 'mg/dL', min: 30, max: 200 },
  { id: 11, name: 'LDL', unit: 'mg/dL', min: 66, max: 159 },
  { id: 9, name: 'Trigliserida', unit: 'mg/dL', min: 1, max: 160 },
  { id: 32, name: 'Asam Urat', unit: 'mg/dl', min: 2, max: 7 },
  { id: 12, name: 'Ureum', unit: 'mg/dL', min: 4, max: 44.1 },
  { id: 13, name: 'Kreatinin', unit: 'mg/dL', min: 0.6, max: 1.3 },
  { id: 1, name: 'SGOT', unit: 'IU/L', min: 5, max: 34 },
  { id: 2, name: 'SGPT', unit: 'IU/L', min: 4, max: 36 }
]);

export const labItemById = id => LAB_ITEMS.find(item => item.id === Number(id)) || null;

/* Status lab yang disimpan di kolom notes (dibaca halaman Analisis): Low, High, atau Normal terhadap rentang rujukan. */
export function labStatusNote(item, value) {
  const number = parseFloat(value);
  if (!item || Number.isNaN(number) || !Number.isFinite(item.min) || !Number.isFinite(item.max)) return '';
  if (number < item.min) return 'Low';
  if (number > item.max) return 'High';
  return 'Normal';
}
