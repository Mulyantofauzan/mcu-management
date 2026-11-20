export function initials(name = '') {
  return String(name).split(/\s+/).filter(word => word && !/\.$/.test(word))
    .slice(0, 2).map(word => word[0]).join('').toUpperCase();
}

export function roleTitle(role) {
  return role === 'Admin' ? 'Administrator' : role || '';
}

export function calculateAge(birthDate, today = new Date()) {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return null;
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}
