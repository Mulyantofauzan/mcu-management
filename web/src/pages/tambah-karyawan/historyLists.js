/* Daftar riwayat penyakit: aturan tambah, duplikat, dan isian "Lainnya" dari aplikasi lama. */
import { CUSTOM_DISEASE } from '../../lib/mcuOptions.js';

function resolveDisease(disease, custom) {
  if (disease !== CUSTOM_DISEASE) return disease;
  return (custom || '').trim();
}

export function addMedical(list, disease, custom) {
  if (!disease) return { error: 'Pilih penyakit terlebih dahulu' };
  const name = resolveDisease(disease, custom);
  if (!name) return { error: 'Sebutkan nama penyakit' };
  if (list.includes(name)) return { error: 'Penyakit sudah ditambahkan' };
  return { list: [...list, name] };
}

export function addFamily(list, disease, member, custom) {
  if (!disease || !member) return { error: 'Pilih penyakit dan anggota keluarga' };
  const name = resolveDisease(disease, custom);
  if (!name) return { error: 'Sebutkan nama penyakit' };
  if (list.some(entry => entry.disease === name && entry.member === member)) {
    return { error: 'Kombinasi penyakit dan anggota keluarga sudah ditambahkan' };
  }
  return { list: [...list, { disease: name, member }] };
}
