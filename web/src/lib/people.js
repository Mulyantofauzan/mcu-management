export function initials(name = '') {
  return String(name).split(/\s+/).filter(word => word && !/\.$/.test(word))
    .slice(0, 2).map(word => word[0]).join('').toUpperCase();
}

export function roleTitle(role) {
  return role === 'Admin' ? 'Administrator' : role || '';
}
