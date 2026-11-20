/* Pencocokan rute murni. Rute: { key, path }. Path statis, tanpa parameter, kecuali '*' sebagai cadangan. */
export function normalizePath(path = '/') {
  const clean = String(path).split(/[?#]/)[0].replace(/\/+$/, '');
  return clean === '' ? '/' : clean;
}

export function matchRoute(routes, path) {
  const target = normalizePath(path);
  return routes.find(route => route.path === target) || routes.find(route => route.path === '*') || null;
}

export function parseQuery(search = '') {
  const params = new URLSearchParams(String(search).replace(/^\?/, ''));
  return Object.fromEntries(params.entries());
}
