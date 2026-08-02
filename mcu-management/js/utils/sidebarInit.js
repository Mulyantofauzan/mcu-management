/** Compatibility entry point. Canonical behavior lives in sidebar-manager.js. */
export async function initSidebar() {
  if (window.MADIS_SIDEBAR?.initialize) {
    await window.MADIS_SIDEBAR.initialize();
  }
}
