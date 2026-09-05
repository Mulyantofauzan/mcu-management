/** Delete an editable MCU attachment from R2 and its database metadata. */

const { setCorsHeaders, requireAuth } = require('../../server/auth-utils');
const { getSupabaseAdmin } = require('../../server/supabaseAdmin');
const { loadActiveUser } = require('../../server/workflow/authorization');
const { R2DirectUploadService } = require('../../server/r2DirectUploadService');

const EDITABLE_STATUSES = new Set(['draft', 'pending_review', 'correction_required']);

function createDeleteFileHandler(dependencies = {}) {
  const authenticate = dependencies.requireAuth || requireAuth;
  const getAdmin = dependencies.getSupabaseAdmin || getSupabaseAdmin;
  const loadUser = dependencies.loadActiveUser || loadActiveUser;
  const createStorage = dependencies.createStorage || (() => new R2DirectUploadService());

  return async function deleteFileHandler(req, res) {
    setCorsHeaders(req, res, 'DELETE, OPTIONS');
    res.setHeader('Cache-Control', 'no-store');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'DELETE') {
      return res.status(405).json({ success: false, error: 'Method tidak diizinkan.' });
    }

    const claims = authenticate(req, res);
    if (!claims) return;

    try {
      const fileId = String(req.query?.fileId || '').trim();
      if (!fileId) {
        return res.status(400).json({ success: false, error: 'File ID wajib diisi.' });
      }

      const supabase = getAdmin();
      const user = await loadUser(claims, supabase);
      if (!['Admin', 'Petugas'].includes(user.role)) {
        return res.status(403).json({ success: false, error: 'Anda tidak berhak menghapus dokumen MCU.' });
      }

      const { data: file, error: fileError } = await supabase
        .from('mcufiles')
        .select('fileid, mcuid, supabase_storage_path')
        .eq('fileid', fileId)
        .is('deletedat', null)
        .maybeSingle();
      if (fileError) throw fileError;
      if (!file) {
        return res.status(404).json({ success: false, error: 'File tidak ditemukan.' });
      }

      const { data: mcu, error: mcuError } = await supabase
        .from('mcus')
        .select('mcu_id, workflow_status')
        .eq('mcu_id', file.mcuid)
        .is('deleted_at', null)
        .maybeSingle();
      if (mcuError) throw mcuError;
      if (!mcu) {
        return res.status(404).json({ success: false, error: 'MCU pemilik file tidak ditemukan.' });
      }
      if (!EDITABLE_STATUSES.has(mcu.workflow_status)) {
        return res.status(409).json({
          success: false,
          error: 'Dokumen hanya dapat dihapus saat MCU masih draft, menunggu review, atau perlu perbaikan.'
        });
      }
      if (!file.supabase_storage_path) {
        return res.status(409).json({ success: false, error: 'Lokasi penyimpanan file tidak ditemukan.' });
      }

      await createStorage().deleteObject(file.supabase_storage_path);
      const { error: deleteError } = await supabase
        .from('mcufiles')
        .delete()
        .eq('fileid', file.fileid);
      if (deleteError) throw deleteError;

      return res.status(200).json({ success: true, message: 'File berhasil dihapus.' });
    } catch (error) {
      console.error('[delete-file] Delete failed:', error?.message || error);
      return res.status(500).json({
        success: false,
        error: 'File belum berhasil dihapus. Silakan coba lagi.'
      });
    }
  };
}

module.exports = createDeleteFileHandler();
module.exports.createDeleteFileHandler = createDeleteFileHandler;
module.exports.EDITABLE_STATUSES = EDITABLE_STATUSES;
