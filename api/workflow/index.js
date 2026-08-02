const { randomUUID } = require('crypto');
const {
  setCorsHeaders,
  verifyJwt,
  readJsonBody
} = require('../../server/auth-utils');
const {
  loadActiveUser,
  authorizeAction
} = require('../../server/workflow/authorization');
const { WorkflowService } = require('../../server/workflow/workflowService');
const {
  WORKFLOW_ERROR_CODES
} = require('../../server/workflow/constants');
const {
  WorkflowError,
  normalizeWorkflowError
} = require('../../server/workflow/errors');

const MAX_JSON_BODY_BYTES = 1024 * 1024;
const READ_ACTIONS = new Set([
  'bootstrap',
  'doctor-queue',
  'review-detail',
  'review-history',
  'petugas-queue',
  'joining-queue',
  'joining-history',
  'doctor-profile',
  'download-referral',
  'settings'
]);

const MUTATION_ACTIONS = new Set([
  'submit-review',
  'claim-review',
  'release-claim',
  'doctor-decision',
  'submit-followup',
  'joining-decision',
  'joining-correction',
  'share-status',
  'save-doctor-profile',
  'create-signature-upload',
  'confirm-signature-upload',
  'regenerate-referral',
  'update-expiry-setting',
  'set-feature-flag'
]);

function authenticate(req) {
  const header = req.headers.authorization || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) throw new WorkflowError(WORKFLOW_ERROR_CODES.UNAUTHORIZED);

  try {
    return verifyJwt(match[1]);
  } catch (error) {
    throw new WorkflowError(WORKFLOW_ERROR_CODES.UNAUTHORIZED, { cause: error });
  }
}

function assertMethodAction(method, action) {
  if (!action || typeof action !== 'string') {
    throw new WorkflowError(WORKFLOW_ERROR_CODES.ACTION_NOT_FOUND);
  }

  const allowed = method === 'GET' ? READ_ACTIONS : MUTATION_ACTIONS;
  if (!allowed.has(action)) {
    throw new WorkflowError(WORKFLOW_ERROR_CODES.ACTION_NOT_FOUND);
  }
}

function createWorkflowHandler(dependencies = {}) {
  const authenticateRequest = dependencies.authenticate || authenticate;
  const getAdmin = dependencies.getSupabaseAdmin
    || (() => require('../../server/supabaseAdmin').getSupabaseAdmin());
  const loadUser = dependencies.loadActiveUser || loadActiveUser;
  const authorize = dependencies.authorizeAction || authorizeAction;
  const createService = dependencies.createService
    || (supabase => new WorkflowService(supabase));
  const createRequestId = dependencies.createRequestId || randomUUID;

  return async function workflowHandler(req, res) {
    setCorsHeaders(req, res, 'GET, POST, OPTIONS');
    res.setHeader('Cache-Control', 'no-store');

    const requestId = createRequestId();
    res.setHeader('X-Request-ID', requestId);

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (!['GET', 'POST'].includes(req.method)) {
      return res.status(405).json({
        success: false,
        code: 'METHOD_NOT_ALLOWED',
        message: 'Method tidak diizinkan.',
        requestId
      });
    }

    try {
      const contentLength = Number(req.headers['content-length'] || 0);
      if (contentLength > MAX_JSON_BODY_BYTES) {
        throw new WorkflowError(WORKFLOW_ERROR_CODES.VALIDATION_FAILED, {
          message: 'Payload terlalu besar.'
        });
      }

      const payload = req.method === 'GET'
        ? { ...(req.query || {}) }
        : await readJsonBody(req);
      const action = String(payload.action || req.query?.action || '').trim();

      assertMethodAction(req.method, action);
      const claims = authenticateRequest(req);
      const supabase = getAdmin();
      const user = await loadUser(claims, supabase);
      authorize(action, user);

      const service = createService(supabase);
      const data = await service.execute(action, payload, user, requestId);

      return res.status(200).json({ success: true, data, requestId });
    } catch (rawError) {
      const error = normalizeWorkflowError(rawError);
      return res.status(error.status).json({
        success: false,
        code: error.code,
        message: error.message,
        requestId,
        ...(error.details ? { details: error.details } : {})
      });
    }
  };
}

const handler = createWorkflowHandler();

module.exports = handler;
module.exports.createWorkflowHandler = createWorkflowHandler;
module.exports.READ_ACTIONS = READ_ACTIONS;
module.exports.MUTATION_ACTIONS = MUTATION_ACTIONS;
