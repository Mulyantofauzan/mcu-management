/* Penyaringan dan halaman daftar karyawan (murni). */
export const PAGE_SIZE = 10;

export function filterEmployees(employees, { q = '', department = '', active = '', type = '' } = {}) {
  const term = q.trim().toLowerCase();
  return employees.filter(employee => {
    if (department && employee.department !== department) return false;
    if (active === 'Active' && !employee.isActive) return false;
    if (active === 'Inactive' && employee.isActive) return false;
    if (type && employee.employeeType !== type) return false;
    if (!term) return true;
    return [employee.name, employee.employeeId, employee.jobTitle].some(value => String(value || '').toLowerCase().includes(term));
  });
}

export function paginate(items, page, size = PAGE_SIZE) {
  const pages = Math.max(1, Math.ceil(items.length / size));
  const current = Math.min(Math.max(1, page), pages);
  return { items: items.slice((current - 1) * size, current * size), page: current, pages };
}
