/* CRUD data master. Cek "sedang digunakan" dan catatan audit mengikuti masterDataService dan labService lama. */
import { getClient, selectAll } from './client.js';
import { logActivity } from './activityWrite.js';
import { typeByKey } from '../lib/masterConfig.js';

export async function listMaster(typeKey) {
  const type = typeByKey(typeKey);
  return selectAll(type.table, query => (type.softDelete ? query.is('deleted_at', null) : query).order(type.order, { ascending: true }));
}

async function usage(client, type, row) {
  const count = async (table, build) => {
    const { count: total, error } = await build(client.from(table).select('*', { count: 'exact', head: true }));
    if (error) throw error;
    return total || 0;
  };
  switch (type.key) {
    case 'jobTitles': return { n: await count('employees', q => q.eq('job_title', row.name).is('deleted_at', null)), message: n => `Tidak dapat menghapus. Jabatan ini digunakan oleh ${n} karyawan.` };
    case 'departments': return { n: await count('employees', q => q.eq('department', row.name).is('deleted_at', null)), message: n => `Tidak dapat menghapus. Departemen ini digunakan oleh ${n} karyawan.` };
    case 'vendors': return { n: await count('employees', q => q.eq('vendor_name', row.name).is('deleted_at', null)), message: n => `Tidak dapat menghapus. Vendor ini digunakan oleh ${n} karyawan.` };
    case 'doctors': return { n: await count('mcus', q => q.eq('doctor', row.id).is('deleted_at', null)), message: n => `Tidak dapat menghapus. Dokter ini digunakan di ${n} catatan MCU.` };
    case 'labItems': return { n: await count('pemeriksaan_lab', q => q.eq('lab_item_id', row.id).is('deleted_at', null)), message: () => 'Tidak dapat menghapus. Item pemeriksaan ini sudah digunakan.' };
    case 'diseases': {
      const total = (await count('medical_histories', q => q.eq('disease_id', row.id))) + (await count('family_histories', q => q.eq('disease_id', row.id)));
      return { n: total, message: n => `Tidak dapat menghapus. Penyakit ini digunakan di ${n} catatan kesehatan.` };
    }
    default: return { n: 0, message: () => '' };
  }
}

export async function createMaster(typeKey, form, user) {
  const type = typeByKey(typeKey);
  const client = await getClient();
  const { data, error } = await client.from(type.table).insert(type.toRow(form)).select().single();
  if (error) throw error;
  await logActivity({ action: 'create', target: type.logTarget, targetId: String(data?.id ?? ''), user, details: `Created ${type.noun}: ${type.detail(data || type.toRow(form))}` }).catch(() => {});
  return data;
}

export async function updateMaster(typeKey, id, form, user) {
  const type = typeByKey(typeKey);
  const client = await getClient();
  const row = { ...type.toRow(form), updated_at: new Date().toISOString() };
  const { error } = await client.from(type.table).update(row).eq('id', id);
  if (error) throw error;
  await logActivity({ action: 'update', target: type.logTarget, targetId: String(id), user, details: `Updated ${type.noun}: ${type.detail(row)}` }).catch(() => {});
  return true;
}

export async function deleteMaster(typeKey, row, user) {
  const type = typeByKey(typeKey);
  const client = await getClient();
  const used = await usage(client, type, row);
  if (used.n > 0) throw new Error(used.message(used.n));
  const query = type.softDelete ? client.from(type.table).update({ deleted_at: new Date().toISOString() }) : client.from(type.table).delete();
  const { error } = await query.eq('id', row.id);
  if (error) throw error;
  await logActivity({ action: 'delete', target: type.logTarget, targetId: String(row.id), user, details: `Deleted ${type.noun}: ${row.name} (${row.id})` }).catch(() => {});
  return true;
}
