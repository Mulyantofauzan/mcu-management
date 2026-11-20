/* Hapus MCU (soft delete) dengan verifikasi dan catatan audit, seperti mcuService.softDelete lama. */
import { getClient } from './client.js';
import { logActivity } from './activityWrite.js';

export async function softDeleteMcu(mcu, employeeName, user) {
  const client = await getClient();
  const now = new Date().toISOString();
  const { data, error } = await client.from('mcus').update({ deleted_at: now }).eq('mcu_id', mcu.mcuId).select('mcu_id, deleted_at');
  if (error) throw error;
  if (!data?.length || !data[0].deleted_at) throw new Error('MCU tidak berhasil dipindahkan ke Data Terhapus');
  await logActivity({
    action: 'delete', target: 'MCU', targetId: mcu.mcuId, user,
    details: `Moved MCU to trash: ${mcu.mcuId}. Date: ${mcu.mcuDate}, Employee: ${employeeName || 'Unknown'}`
  }).catch(() => {});
  return true;
}
