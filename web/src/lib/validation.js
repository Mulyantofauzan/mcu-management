/* Validasi form karyawan. Aturan dan pesan dipindahkan dari validation.js aplikasi lama. */
export function validateEmployeeForm(data, today = new Date()) {
  const errors = [];
  const name = (data.name || '').trim();

  if (!name) errors.push('Nama lengkap harus diisi');
  else if (name.length < 3) errors.push('Nama lengkap minimal 3 karakter');
  else if (data.name.length > 200) errors.push('Nama lengkap maksimal 200 karakter');

  if (!data.jobTitle) errors.push('Jabatan harus dipilih');
  if (!data.department) errors.push('Departemen harus dipilih');

  if (!data.birthDate) {
    errors.push('Tanggal lahir harus diisi');
  } else {
    const birth = new Date(data.birthDate);
    if (birth > today) errors.push('Tanggal lahir tidak boleh di masa depan');
    const age = today.getFullYear() - birth.getFullYear();
    if (age < 16) errors.push('Karyawan minimal berusia 16 tahun');
    else if (age > 150) errors.push('Tanggal lahir tidak valid');
  }

  if (!data.bloodType) errors.push('Golongan darah harus dipilih');
  if (!data.gender) errors.push('Jenis kelamin harus dipilih');
  if (!data.employeeType) errors.push('Status karyawan harus dipilih');
  if (data.employeeType === 'Vendor' && !(data.vendorName || '').trim()) {
    errors.push('Nama vendor harus diisi untuk status Vendor');
  }
  if (data.isActive === undefined || data.isActive === null) errors.push('Status aktif harus dipilih');
  if (data.isActive === false && !(data.inactiveReason || '').trim()) {
    errors.push('Alasan tidak aktif harus diisi untuk status Inactive');
  }
  return { isValid: errors.length === 0, errors };
}
