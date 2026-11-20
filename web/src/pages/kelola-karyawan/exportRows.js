import { formatDate } from '../../lib/format.js';

export function employeeExportRows(employees) {
  return employees.map(employee => ({
    'ID Karyawan': employee.employeeId,
    Nama: employee.name,
    Jabatan: employee.jobTitle || '-',
    Departemen: employee.department || '-',
    'Tanggal Lahir': formatDate(employee.birthDate),
    'Status Karyawan': employee.employeeType,
    Vendor: employee.vendorName || '-',
    'Status Aktif': employee.isActive ? 'Active' : 'Inactive',
    'Golongan Darah': employee.bloodType
  }));
}
