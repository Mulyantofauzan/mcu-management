/* Enam jenis data master: tabel, kolom daftar, isian form, dan pemetaan ke baris database. Murni dan diuji. */
export const RISK = { low: 'Rendah', moderate: 'Sedang', high: 'Tinggi' };
export const CATEGORY = { cardiovascular: 'Kardiovaskular', metabolic: 'Metabolik', respiratory: 'Respirasi', infectious: 'Infeksi', cancer: 'Kanker', other: 'Lainnya' };
const num = value => { const parsed = parseFloat(value); return Number.isNaN(parsed) ? null : parsed; };
const text = value => (String(value ?? '').trim() || null);

export const MASTER_TYPES = [
  { key: 'jobTitles', title: 'Jabatan', table: 'job_titles', logTarget: 'JobTitle', noun: 'job title', order: 'id',
    columns: [{ label: 'ID', value: row => row.id, num: true }, { label: 'Nama', value: row => row.name, strong: true }, { label: 'Tingkat Risiko', value: row => RISK[row.risk_level || 'moderate'] || 'Sedang' }],
    blank: () => ({ name: '', riskLevel: 'moderate' }), fromRow: row => ({ name: row.name, riskLevel: row.risk_level || 'moderate' }),
    toRow: form => ({ name: form.name.trim(), risk_level: form.riskLevel || 'moderate' }), detail: row => `${row.name}${row.risk_level ? `, Risk Level: ${row.risk_level}` : ''}` },
  { key: 'departments', title: 'Departemen', table: 'departments', logTarget: 'Department', noun: 'department', order: 'id',
    columns: [{ label: 'ID', value: row => row.id, num: true }, { label: 'Nama', value: row => row.name, strong: true }],
    blank: () => ({ name: '' }), fromRow: row => ({ name: row.name }), toRow: form => ({ name: form.name.trim() }), detail: row => row.name },
  { key: 'vendors', title: 'Vendor', table: 'vendors', logTarget: 'Vendor', noun: 'vendor', order: 'id',
    columns: [{ label: 'ID', value: row => row.id, num: true }, { label: 'Nama', value: row => row.name, strong: true }],
    blank: () => ({ name: '' }), fromRow: row => ({ name: row.name }), toRow: form => ({ name: form.name.trim() }), detail: row => row.name },
  { key: 'doctors', title: 'Dokter', table: 'doctors', logTarget: 'Doctor', noun: 'doctor', order: 'id',
    columns: [{ label: 'ID', value: row => row.id, num: true }, { label: 'Nama', value: row => row.name, strong: true }],
    blank: () => ({ name: '' }), fromRow: row => ({ name: row.name }), toRow: form => ({ name: form.name.trim() }), detail: row => row.name },
  { key: 'labItems', title: 'Item Pemeriksaan Lab', table: 'lab_items', logTarget: 'LabItem', noun: 'lab item', order: 'id', softDelete: true,
    columns: [{ label: 'Nama', value: row => row.name, strong: true }, { label: 'Satuan', value: row => row.unit || '-' },
      { label: 'Rentang Min-Max', value: row => `${row.min_range_reference ?? '-'} - ${row.max_range_reference ?? '-'}`, num: true }, { label: 'Status', status: row => row.is_active !== false }],
    blank: () => ({ name: '', description: '', unit: '', min: '', max: '', isActive: true }),
    fromRow: row => ({ name: row.name, description: row.description || '', unit: row.unit || '', min: row.min_range_reference ?? '', max: row.max_range_reference ?? '', isActive: row.is_active !== false }),
    toRow: form => ({ name: form.name.trim(), description: text(form.description), unit: form.unit.trim(), min_range_reference: num(form.min), max_range_reference: num(form.max), is_active: form.isActive !== false }),
    detail: row => row.name },
  { key: 'diseases', title: 'Penyakit', table: 'diseases', logTarget: 'Disease', noun: 'disease', order: 'id',
    columns: [{ label: 'ID', value: row => row.id, num: true }, { label: 'Nama', value: row => row.name, strong: true }, { label: 'Kategori', value: row => CATEGORY[row.category] || row.category || '-' },
      { label: 'Kode ICD-10', value: row => row.icd_10_code || '-' }, { label: 'Status', status: row => row.is_active !== false }],
    blank: () => ({ name: '', category: '', icd10: '', isActive: true }),
    fromRow: row => ({ name: row.name, category: row.category || '', icd10: row.icd_10_code || '', isActive: row.is_active !== false }),
    toRow: form => ({ name: form.name.trim(), category: form.category, icd_10_code: text(form.icd10), is_active: form.isActive !== false }),
    detail: row => `${row.name} (Category: ${row.category}${row.icd_10_code ? `, ICD-10: ${row.icd_10_code}` : ''})` }
];

export const typeByKey = key => MASTER_TYPES.find(type => type.key === key);

export function validateMasterForm(type, form) {
  const errors = [];
  if (!String(form.name || '').trim()) errors.push('Nama wajib diisi');
  if (type.key === 'diseases' && !form.category) errors.push('Kategori harus dipilih');
  if (type.key === 'labItems') {
    if (!String(form.unit || '').trim()) errors.push('Satuan wajib diisi');
    const min = num(form.min), max = num(form.max);
    if (min !== null && max !== null && min > max) errors.push('Rentang minimum tidak boleh lebih besar dari maksimum');
  }
  return { isValid: errors.length === 0, errors };
}
