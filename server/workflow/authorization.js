const { WORKFLOW_ERROR_CODES } = require('./constants');
const { WorkflowError } = require('./errors');

const ACTION_ROLES = Object.freeze({
  bootstrap: ['Admin', 'Petugas', 'Dokter'],
  'doctor-queue': ['Dokter'],
  'review-detail': ['Admin', 'Petugas', 'Dokter'],
  'review-history': ['Admin', 'Dokter'],
  'petugas-queue': ['Petugas'],
  'joining-queue': ['Admin'],
  'joining-history': ['Admin'],
  'doctor-profile': ['Dokter'],
  'download-referral': ['Admin', 'Petugas', 'Dokter'],
  settings: ['Admin'],
  'expiry-preview': ['Admin'],
  'submit-review': ['Petugas'],
  'claim-review': ['Dokter'],
  'release-claim': ['Admin', 'Dokter'],
  'doctor-decision': ['Dokter'],
  'submit-followup': ['Petugas'],
  'joining-decision': ['Admin'],
  'joining-correction': ['Admin'],
  'share-status': ['Admin', 'Petugas', 'Dokter'],
  'save-doctor-profile': ['Dokter'],
  'create-signature-upload': ['Dokter'],
  'confirm-signature-upload': ['Dokter'],
  'regenerate-referral': ['Admin', 'Petugas', 'Dokter'],
  'update-expiry-setting': ['Admin'],
  'set-feature-flag': ['Admin']
});

function getClaimUserId(claims) {
  return claims?.app_user_id || claims?.sub || null;
}

async function loadActiveUser(claims, supabase) {
  const database = supabase || require('../supabaseAdmin').getSupabaseAdmin();
  const userId = getClaimUserId(claims);
  if (!userId) {
    throw new WorkflowError(WORKFLOW_ERROR_CODES.UNAUTHORIZED);
  }

  const { data: user, error } = await database
    .from('users')
    .select('user_id, username, display_name, role, active')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw new WorkflowError(WORKFLOW_ERROR_CODES.INTERNAL_ERROR, { cause: error });
  }
  if (!user || user.active !== true) {
    throw new WorkflowError(WORKFLOW_ERROR_CODES.USER_INACTIVE);
  }

  return {
    userId: user.user_id,
    username: user.username,
    displayName: user.display_name,
    role: user.role
  };
}

function authorizeAction(action, user) {
  const allowedRoles = ACTION_ROLES[action];
  if (!allowedRoles) {
    throw new WorkflowError(WORKFLOW_ERROR_CODES.ACTION_NOT_FOUND);
  }
  const allowed = allowedRoles.includes(user.role)
    || (user.role === 'Admin' && allowedRoles.includes('Petugas'));
  if (!allowed) {
    throw new WorkflowError(WORKFLOW_ERROR_CODES.FORBIDDEN);
  }
}

module.exports = {
  ACTION_ROLES,
  getClaimUserId,
  loadActiveUser,
  authorizeAction
};
