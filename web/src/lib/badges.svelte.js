/* Angka kecil di menu: jumlah MCU expired dan warning (seperti badge menu aplikasi lama). */
import { getExpiryOverview } from '../data/analytics.js';

export const badges = $state({ expiry: 0 });

export async function refreshBadges() {
  try {
    const overview = await getExpiryOverview();
    badges.expiry = overview.filter(row => row.expiryStatus === 'EXPIRED' || row.expiryStatus === 'WARNING').length;
  } catch {
    badges.expiry = 0;
  }
}
