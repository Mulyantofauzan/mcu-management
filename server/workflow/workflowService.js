const { randomUUID } = require('crypto');
const {
  LOOPING_MEDICAL_RESULTS,
  TERMINAL_MEDICAL_RESULTS,
  WORKFLOW_ERROR_CODES
} = require('./constants');
const { WorkflowError, normalizeWorkflowError } = require('./errors');
const {
  generateReferralLetter,
  referralObjectKey
} = require('./referralLetterService');

function unwrapSetting(rows, key, fallback) {
  const row = (rows || []).find(item => item.setting_key === key);
  return row ? row.setting_value : fallback;
}

function requireFields(payload, fields) {
  const missing = fields.find(field => (
    payload[field] === undefined
    || payload[field] === null
    || payload[field] === ''
  ));

  if (missing) {
    throw new WorkflowError(WORKFLOW_ERROR_CODES.VALIDATION_FAILED, {
      details: { field: missing }
    });
  }
}

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;

function normalizePagination(payload = {}) {
  const requestedPage = Number(payload.page);
  const requestedPageSize = Number(payload.pageSize);
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const pageSize = Number.isInteger(requestedPageSize) && requestedPageSize > 0
    ? Math.min(requestedPageSize, MAX_PAGE_SIZE)
    : DEFAULT_PAGE_SIZE;

  return {
    page,
    pageSize,
    from: (page - 1) * pageSize,
    to: (page * pageSize) - 1
  };
}

function paginated(items, count, pagination) {
  const total = Number(count) || 0;
  return {
    items,
    page: pagination.page,
    pageSize: pagination.pageSize,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / pagination.pageSize)
  };
}

class WorkflowService {
  constructor(supabase, options = {}) {
    this.supabase = supabase || require('../supabaseAdmin').getSupabaseAdmin();
    this.storage = options.storage || null;
    this.generateReferralLetter = options.generateReferralLetter || generateReferralLetter;
  }

  getStorage() {
    if (!this.storage) {
      const { PrivateStorageService } = require('./privateStorageService');
      this.storage = new PrivateStorageService();
    }
    return this.storage;
  }

  async execute(action, payload, user, requestId) {
    const handlers = {
      bootstrap: () => this.getBootstrap(user),
      'doctor-queue': () => this.getDoctorQueue(),
      'review-detail': () => this.getReviewDetail(payload.mcuId),
      'review-history': () => this.getReviewHistory(payload),
      'petugas-queue': () => this.getPetugasQueue(),
      'joining-queue': () => this.getJoiningQueue(false, payload),
      'joining-history': () => this.getJoiningQueue(true, payload),
      'doctor-profile': () => this.getDoctorProfile(user.userId),
      'download-referral': () => this.getReferralDownload(payload),
      settings: () => this.getSettings(),
      'expiry-preview': () => this.getExpiryPreview(payload, user),
      'submit-review': () => this.submitReview(payload, user, requestId),
      'claim-review': () => this.claimReview(payload, user, requestId),
      'release-claim': () => this.releaseClaim(payload, user, requestId),
      'doctor-decision': () => this.applyDoctorDecision(payload, user, requestId),
      'submit-followup': () => this.submitFollowup(payload, user, requestId),
      'joining-decision': () => this.applyJoiningDecision(payload, user, requestId),
      'joining-correction': () => this.correctJoiningStatus(payload, user, requestId),
      'share-status': () => this.setShareStatus(payload, user, requestId),
      'save-doctor-profile': () => this.saveDoctorProfile(payload, user),
      'create-signature-upload': () => this.createSignatureUpload(payload, user),
      'confirm-signature-upload': () => this.confirmSignatureUpload(payload, user, requestId),
      'regenerate-referral': () => this.regenerateReferral(payload, user, requestId),
      'update-expiry-setting': () => this.updateExpirySetting(payload, user, requestId),
      'set-feature-flag': () => this.setFeatureFlag(payload, user, requestId)
    };

    const handler = handlers[action];
    if (!handler) {
      throw new WorkflowError(WORKFLOW_ERROR_CODES.ACTION_NOT_FOUND);
    }

    return handler();
  }

  async query(promise) {
    const { data, error, count } = await promise;
    if (error) throw normalizeWorkflowError(error);
    return { data, count };
  }

  async rpc(name, args) {
    const { data, error } = await this.supabase.rpc(name, args);
    if (error) throw normalizeWorkflowError(error);
    return data;
  }

  async getSettings() {
    const { data } = await this.query(
      this.supabase
        .from('app_settings')
        .select('setting_key, setting_value, version, updated_at')
        .in('setting_key', ['mcu_approval_workflow_enabled', 'mcu_expiry_months'])
    );

    return {
      workflowEnabled: unwrapSetting(data, 'mcu_approval_workflow_enabled', false),
      expiryMonths: unwrapSetting(data, 'mcu_expiry_months', 18),
      settings: data || []
    };
  }

  async getBootstrap(user) {
    const settings = await this.getSettings();
    const counts = { review: 0, correction: 0, followup: 0, joining: 0 };

    if (settings.workflowEnabled && user.role === 'Dokter') {
      const result = await this.query(
        this.supabase
          .from('mcus')
          .select('mcu_id', { count: 'exact', head: true })
          .in('workflow_status', ['pending_review', 'in_review'])
          .is('deleted_at', null)
      );
      counts.review = result.count || 0;
    }

    if (settings.workflowEnabled && ['Admin', 'Petugas'].includes(user.role)) {
      const { data } = await this.query(
        this.supabase
          .from('mcus')
          .select('workflow_status')
          .in('workflow_status', ['draft', 'correction_required', 'followup_required'])
          .is('deleted_at', null)
      );
      counts.correction = (data || []).filter(row => ['draft', 'correction_required'].includes(row.workflow_status)).length;
      counts.followup = (data || []).filter(row => row.workflow_status === 'followup_required').length;
    }

    if (settings.workflowEnabled && user.role === 'Admin') {
      const result = await this.query(
        this.supabase
          .from('employees')
          .select('employee_id, mcus!inner(mcu_id)', { count: 'exact', head: true })
          .eq('joining_status', 'candidate')
          .is('deleted_at', null)
          .eq('mcus.workflow_status', 'completed')
          .is('mcus.deleted_at', null)
          .in('mcus.current_medical_result', TERMINAL_MEDICAL_RESULTS)
      );
      counts.joining = result.count || 0;
    }

    return { ...settings, role: user.role, counts };
  }

  async getDoctorQueue() {
    const { data } = await this.query(
      this.supabase
        .from('mcus')
        .select([
          'mcu_id',
          'employee_id',
          'mcu_type',
          'mcu_date',
          'workflow_status',
          'workflow_version',
          'current_medical_result',
          'current_review_cycle',
          'activated_at',
          'claimed_by',
          'claimed_at',
          'claim_expires_at',
          'created_at'
        ].join(','))
        .in('workflow_status', ['pending_review', 'in_review'])
        .is('deleted_at', null)
        .order('created_at', { ascending: true })
        .limit(200)
    );

    return this.enrichMcuRows(data || []);
  }

  async getPetugasQueue() {
    const { data } = await this.query(
      this.supabase
        .from('mcus')
        .select('mcu_id, employee_id, mcu_type, mcu_date, workflow_status, workflow_version, current_medical_result, current_review_cycle, current_share_cycle_id, current_share_status, updated_at')
        .in('workflow_status', ['draft', 'correction_required', 'followup_required'])
        .is('deleted_at', null)
        .order('updated_at', { ascending: true })
        .limit(200)
    );

    return this.enrichMcuRows(data || []);
  }

  async enrichMcuRows(rows) {
    const employeeIds = [...new Set(rows.map(row => row.employee_id).filter(Boolean))];
    if (!employeeIds.length) return rows;
    const { data: employees } = await this.query(
      this.supabase
        .from('employees')
        .select('employee_id, name, department, job_title, joining_status')
        .in('employee_id', employeeIds)
    );
    const byId = new Map((employees || []).map(employee => [employee.employee_id, employee]));
    return rows.map(row => ({ ...row, employee: byId.get(row.employee_id) || null }));
  }

  async getReviewDetail(mcuId) {
    requireFields({ mcuId }, ['mcuId']);

    const { data: mcu } = await this.query(
      this.supabase
        .from('mcus')
        .select('*')
        .eq('mcu_id', mcuId)
        .is('deleted_at', null)
        .maybeSingle()
    );
    if (!mcu) throw new WorkflowError(WORKFLOW_ERROR_CODES.NOT_FOUND);

    const [
      employeeResult,
      labResult,
      cycleResult,
      fileResult,
      followupResult,
      medicalHistoryResult,
      familyHistoryResult,
      priorMcuResult
    ] = await Promise.all([
      this.query(this.supabase.from('employees').select('*').eq('employee_id', mcu.employee_id).maybeSingle()),
      this.query(this.supabase.from('pemeriksaan_lab').select('*').eq('mcu_id', mcuId).is('deleted_at', null)),
      this.query(this.supabase.from('mcu_review_cycles').select('*').eq('mcu_id', mcuId).order('cycle_number')),
      this.query(this.supabase.from('mcufiles').select('fileid, filename, filetype, filesize, uploadedat').eq('mcuid', mcuId).is('deletedat', null)),
      this.query(this.supabase.from('mcu_followup_submissions').select('id, prior_review_cycle_id, evidence_notes, attachment_file_ids, submitted_by, created_at').eq('mcu_id', mcuId).order('created_at')),
      this.query(this.supabase.from('medical_histories').select('id, disease_name, year_diagnosed, notes').eq('mcu_id', mcuId)),
      this.query(this.supabase.from('family_histories').select('id, disease_name, family_member, age_at_diagnosis, status, notes').eq('mcu_id', mcuId)),
      this.query(
        this.supabase
          .from('mcus')
          .select('mcu_id, mcu_type, mcu_date, current_medical_result, initial_result, final_result, status, activated_at')
          .eq('employee_id', mcu.employee_id)
          .neq('mcu_id', mcuId)
          .is('deleted_at', null)
          .order('mcu_date', { ascending: false })
          .limit(10)
      )
    ]);

    const cycleIds = (cycleResult.data || []).map(cycle => cycle.id);
    const doctorIds = [...new Set((cycleResult.data || []).map(cycle => cycle.doctor_user_id).filter(Boolean))];
    const labItemIds = [...new Set((labResult.data || []).map(lab => lab.lab_item_id).filter(Boolean))];
    const [profileResult, documentResult, labItemResult] = await Promise.all([
      doctorIds.length ? this.query(
        this.supabase
          .from('doctor_profiles')
          .select('user_id, professional_name, registration_number')
          .in('user_id', doctorIds)
      ) : Promise.resolve({ data: [] }),
      cycleIds.length ? this.query(
        this.supabase
          .from('mcu_review_documents')
          .select('id, review_cycle_id, document_type, signature_version, created_at')
          .in('review_cycle_id', cycleIds)
      ) : Promise.resolve({ data: [] }),
      labItemIds.length ? this.query(
        this.supabase
          .from('lab_items')
          .select('id, name, unit, min_range_reference, max_range_reference')
          .in('id', labItemIds)
      ) : Promise.resolve({ data: [] })
    ]);
    const profiles = profileResult.data;
    const profileById = new Map((profiles || []).map(profile => [profile.user_id, profile]));
    const labItemById = new Map((labItemResult.data || []).map(item => [String(item.id), item]));

    return {
      mcu,
      employee: employeeResult.data,
      labs: (labResult.data || []).map(lab => ({
        ...lab,
        labItem: labItemById.get(String(lab.lab_item_id)) || null
      })),
      cycles: (cycleResult.data || []).map(cycle => ({
        ...cycle,
        doctorProfile: profileById.get(cycle.doctor_user_id) || null
      })),
      files: fileResult.data || [],
      documents: documentResult.data || [],
      followupSubmissions: followupResult.data || [],
      medicalHistories: medicalHistoryResult.data || [],
      familyHistories: familyHistoryResult.data || [],
      priorMcus: priorMcuResult.data || []
    };
  }

  async getReviewHistory(payload) {
    let query = this.supabase
      .from('mcu_review_cycles')
      .select('id, mcu_id, cycle_number, review_stage, decision, medical_result, clinical_notes, rejection_reason, doctor_user_id, finalized_at')
      .order('finalized_at', { ascending: false })
      .limit(200);

    if (payload.mcuId) query = query.eq('mcu_id', payload.mcuId);
    const { data } = await this.query(query);
    return data || [];
  }

  async getJoiningQueue(history, payload = {}) {
    const pagination = normalizePagination(payload);
    const employeeFields = 'employee_id, name, department, job_title, employee_type, joining_status, joining_version, joining_decided_at, joining_decision_reason';
    const mcuFields = 'mcu_id, employee_id, mcu_type, mcu_date, current_medical_result, workflow_status, workflow_version, current_share_status, activated_at';

    if (!history) {
      const { data: employees, count } = await this.query(
        this.supabase
          .from('employees')
          .select(`${employeeFields}, mcus!inner(${mcuFields})`, { count: 'exact' })
          .is('deleted_at', null)
          .eq('joining_status', 'candidate')
          .eq('mcus.workflow_status', 'completed')
          .is('mcus.deleted_at', null)
          .in('mcus.current_medical_result', TERMINAL_MEDICAL_RESULTS)
          .order('employee_id', { ascending: false })
          .order('activated_at', { referencedTable: 'mcus', ascending: false })
          .limit(1, { referencedTable: 'mcus' })
          .range(pagination.from, pagination.to)
      );

      const items = (employees || []).map(({ mcus, ...employee }) => ({
        ...employee,
        mcu: Array.isArray(mcus) ? (mcus[0] || null) : (mcus || null)
      }));
      return paginated(items, count, pagination);
    }

    const { data: employees, count } = await this.query(
      this.supabase
        .from('employees')
        .select(employeeFields, { count: 'exact' })
        .is('deleted_at', null)
        .in('joining_status', ['joined', 'not_joined'])
        .order('joining_decided_at', { ascending: false, nullsFirst: false })
        .order('employee_id', { ascending: false })
        .range(pagination.from, pagination.to)
    );
    const employeeIds = (employees || []).map(row => row.employee_id);
    if (employeeIds.length === 0) return paginated([], count, pagination);

    const { data: mcus } = await this.query(
      this.supabase
        .from('mcus')
        .select(mcuFields)
        .in('employee_id', employeeIds)
        .eq('workflow_status', 'completed')
        .is('deleted_at', null)
        .order('activated_at', { ascending: false })
    );

    const latestByEmployee = new Map();
    (mcus || []).forEach(mcu => {
      if (!latestByEmployee.has(mcu.employee_id)) latestByEmployee.set(mcu.employee_id, mcu);
    });

    const items = (employees || []).map(employee => ({
      ...employee,
      mcu: latestByEmployee.get(employee.employee_id) || null
    }));
    return paginated(items, count, pagination);
  }

  async getDoctorProfile(userId) {
    const { data } = await this.query(
      this.supabase
        .from('doctor_profiles')
        .select('user_id, professional_name, registration_number, signature_version, updated_at')
        .eq('user_id', userId)
        .maybeSingle()
    );
    return data;
  }

  async getReferralDownload(payload) {
    requireFields(payload, ['reviewCycleId']);
    const { data: document } = await this.query(
      this.supabase
        .from('mcu_review_documents')
        .select('id, review_cycle_id, object_key, created_at')
        .eq('review_cycle_id', payload.reviewCycleId)
        .eq('document_type', 'referral_letter')
        .maybeSingle()
    );
    if (!document) throw new WorkflowError(WORKFLOW_ERROR_CODES.NOT_FOUND);

    return this.getStorage().createDownloadUrl(
      document.object_key,
      `surat-rujukan-${payload.reviewCycleId}.pdf`
    );
  }

  async submitReview(payload, user, requestId) {
    requireFields(payload, ['mcuId', 'expectedVersion', 'idempotencyKey']);
    return this.rpc('workflow_submit_review', {
      p_mcu_id: payload.mcuId,
      p_actor_user_id: user.userId,
      p_expected_version: payload.expectedVersion,
      p_request_id: requestId,
      p_idempotency_key: payload.idempotencyKey
    });
  }

  async claimReview(payload, user, requestId) {
    requireFields(payload, ['mcuId', 'expectedVersion', 'idempotencyKey']);
    return this.rpc('workflow_claim_review', {
      p_mcu_id: payload.mcuId,
      p_actor_user_id: user.userId,
      p_expected_version: payload.expectedVersion,
      p_request_id: requestId,
      p_idempotency_key: payload.idempotencyKey
    });
  }

  async releaseClaim(payload, user, requestId) {
    requireFields(payload, ['mcuId', 'expectedVersion', 'idempotencyKey']);
    return this.rpc('workflow_release_claim', {
      p_mcu_id: payload.mcuId,
      p_actor_user_id: user.userId,
      p_expected_version: payload.expectedVersion,
      p_reason: payload.reason || null,
      p_request_id: requestId,
      p_idempotency_key: payload.idempotencyKey
    });
  }

  async applyDoctorDecision(payload, user, requestId) {
    requireFields(payload, ['mcuId', 'expectedVersion', 'decision', 'idempotencyKey']);
    const result = await this.rpc('workflow_apply_doctor_decision', {
      p_mcu_id: payload.mcuId,
      p_actor_user_id: user.userId,
      p_expected_version: payload.expectedVersion,
      p_decision: payload.decision,
      p_medical_result: payload.medicalResult || null,
      p_clinical_notes: payload.clinicalNotes || null,
      p_rejection_reason: payload.rejectionReason || null,
      p_request_id: requestId,
      p_idempotency_key: payload.idempotencyKey
    });

    if (result?.decision !== undefined && result.decision !== 'approved') return result;
    if (payload.decision !== 'approved'
      || !LOOPING_MEDICAL_RESULTS.includes(result?.medicalResult)
      || !result?.reviewCycleId) {
      return result;
    }

    const document = await this.prepareReferralDocument(
      result.reviewCycleId,
      user,
      requestId
    );
    return {
      ...result,
      ...(document.workflowVersion !== undefined
        ? { workflowVersion: document.workflowVersion }
        : {}),
      document
    };
  }

  async submitFollowup(payload, user, requestId) {
    requireFields(payload, ['mcuId', 'expectedVersion', 'evidenceNotes', 'idempotencyKey']);
    return this.rpc('workflow_submit_followup_evidence', {
      p_mcu_id: payload.mcuId,
      p_actor_user_id: user.userId,
      p_expected_version: payload.expectedVersion,
      p_evidence_notes: payload.evidenceNotes,
      p_attachment_file_ids: payload.attachmentFileIds || [],
      p_request_id: requestId,
      p_idempotency_key: payload.idempotencyKey
    });
  }

  async applyJoiningDecision(payload, user, requestId) {
    requireFields(payload, [
      'employeeId', 'mcuId', 'expectedVersion', 'joiningStatus', 'idempotencyKey'
    ]);
    return this.rpc('workflow_apply_joining_decision', {
      p_employee_id: payload.employeeId,
      p_mcu_id: payload.mcuId,
      p_actor_user_id: user.userId,
      p_expected_version: payload.expectedVersion,
      p_next_status: payload.joiningStatus,
      p_reason: payload.reason || null,
      p_share_override_reason: payload.shareOverrideReason || null,
      p_request_id: requestId,
      p_idempotency_key: payload.idempotencyKey
    });
  }

  async correctJoiningStatus(payload, user, requestId) {
    requireFields(payload, ['employeeId', 'expectedVersion', 'reason', 'idempotencyKey']);
    return this.rpc('workflow_correct_joining_status', {
      p_employee_id: payload.employeeId,
      p_actor_user_id: user.userId,
      p_expected_version: payload.expectedVersion,
      p_reason: payload.reason,
      p_request_id: requestId,
      p_idempotency_key: payload.idempotencyKey
    });
  }

  async setShareStatus(payload, user, requestId) {
    requireFields(payload, ['mcuId', 'expectedVersion', 'shareStatus', 'idempotencyKey']);
    return this.rpc('workflow_set_share_status', {
      p_mcu_id: payload.mcuId,
      p_actor_user_id: user.userId,
      p_expected_version: payload.expectedVersion,
      p_next_status: payload.shareStatus,
      p_failure_reason: payload.failureReason || null,
      p_request_id: requestId,
      p_idempotency_key: payload.idempotencyKey
    });
  }

  async saveDoctorProfile(payload, user) {
    requireFields(payload, ['professionalName']);
    if (payload.professionalName.length > 200 || (payload.registrationNumber || '').length > 100) {
      throw new WorkflowError(WORKFLOW_ERROR_CODES.VALIDATION_FAILED);
    }

    const { data, error } = await this.supabase
      .from('doctor_profiles')
      .upsert({
        user_id: user.userId,
        professional_name: payload.professionalName.trim(),
        registration_number: payload.registrationNumber?.trim() || null
      }, { onConflict: 'user_id' })
      .select('user_id, professional_name, registration_number, signature_version, updated_at')
      .single();

    if (error) throw normalizeWorkflowError(error);
    return data;
  }

  async createSignatureUpload(payload, user) {
    requireFields(payload, ['contentType', 'contentLength']);
    return this.getStorage().createSignatureUpload({
      userId: user.userId,
      contentType: payload.contentType,
      contentLength: Number(payload.contentLength)
    });
  }

  async confirmSignatureUpload(payload, user, requestId) {
    requireFields(payload, ['objectKey', 'expectedVersion', 'idempotencyKey']);
    await this.getStorage().confirmSignatureUpload({
      userId: user.userId,
      objectKey: payload.objectKey
    });
    return this.rpc('workflow_confirm_doctor_signature', {
      p_actor_user_id: user.userId,
      p_expected_version: payload.expectedVersion,
      p_object_key: payload.objectKey,
      p_request_id: requestId,
      p_idempotency_key: payload.idempotencyKey
    });
  }

  async loadReferralContext(reviewCycleId) {
    const { data: reviewCycle } = await this.query(
      this.supabase
        .from('mcu_review_cycles')
        .select('id, mcu_id, cycle_number, decision, medical_result, clinical_notes, doctor_user_id, finalized_at')
        .eq('id', reviewCycleId)
        .maybeSingle()
    );
    if (!reviewCycle) throw new WorkflowError(WORKFLOW_ERROR_CODES.NOT_FOUND);

    const { data: mcu } = await this.query(
      this.supabase
        .from('mcus')
        .select('mcu_id, employee_id, mcu_type, mcu_date, blood_pressure, workflow_version')
        .eq('mcu_id', reviewCycle.mcu_id)
        .maybeSingle()
    );
    if (!mcu) throw new WorkflowError(WORKFLOW_ERROR_CODES.NOT_FOUND);

    const [employeeResult, profileResult] = await Promise.all([
      this.query(
        this.supabase
          .from('employees')
          .select('employee_id, name, date_of_birth, jenis_kelamin, employee_type, vendor_name, job_title')
          .eq('employee_id', mcu.employee_id)
          .maybeSingle()
      ),
      this.query(
        this.supabase
          .from('doctor_profiles')
          .select('user_id, professional_name, registration_number, signature_object_key, signature_version')
          .eq('user_id', reviewCycle.doctor_user_id)
          .maybeSingle()
      )
    ]);

    if (!employeeResult.data || !profileResult.data?.signature_object_key
      || profileResult.data.signature_version < 1) {
      throw new WorkflowError(WORKFLOW_ERROR_CODES.DOCUMENT_FAILED, {
        message: 'Profil atau tanda tangan dokter belum lengkap.'
      });
    }

    return {
      reviewCycle,
      mcu,
      employee: employeeResult.data,
      doctorProfile: profileResult.data
    };
  }

  async prepareReferralDocument(reviewCycleId, user, requestId) {
    const { data: existing } = await this.query(
      this.supabase
        .from('mcu_review_documents')
        .select('id, review_cycle_id, object_key, signature_version, created_at')
        .eq('review_cycle_id', reviewCycleId)
        .eq('document_type', 'referral_letter')
        .maybeSingle()
    );
    if (existing) {
      const { data: cycle } = await this.query(
        this.supabase
          .from('mcu_review_cycles')
          .select('mcu_id')
          .eq('id', reviewCycleId)
          .maybeSingle()
      );
      const { data: mcu } = cycle
        ? await this.query(
          this.supabase
            .from('mcus')
            .select('workflow_version')
            .eq('mcu_id', cycle.mcu_id)
            .maybeSingle()
        )
        : { data: null };
      return {
        status: 'ready',
        documentId: existing.id,
        reviewCycleId: existing.review_cycle_id,
        createdWithSignatureVersion: existing.signature_version,
        createdAt: existing.created_at,
        ...(mcu ? { workflowVersion: mcu.workflow_version } : {})
      };
    }

    let uploadedObjectKey = null;
    try {
      const context = await this.loadReferralContext(reviewCycleId);
      const storage = this.getStorage();
      const signatureBuffer = await storage.getBuffer(
        context.doctorProfile.signature_object_key
      );
      const generated = await this.generateReferralLetter({
        ...context,
        signatureBuffer
      });
      const objectKey = referralObjectKey(context.reviewCycle, generated.sha256);
      uploadedObjectKey = objectKey;
      await storage.putBuffer(objectKey, generated.buffer, 'application/pdf', {
        reviewCycleId,
        signatureVersion: context.doctorProfile.signature_version
      });
      const registered = await this.rpc('workflow_register_review_document', {
        p_review_cycle_id: reviewCycleId,
        p_actor_user_id: user.userId,
        p_object_key: objectKey,
        p_content_sha256: generated.sha256,
        p_signature_version: context.doctorProfile.signature_version,
        p_request_id: requestId,
        p_idempotency_key: `document:${reviewCycleId}`
      });

      return {
        status: 'ready',
        documentId: registered.documentId,
        reviewCycleId,
        workflowVersion: registered.workflowVersion,
        createdWithSignatureVersion: context.doctorProfile.signature_version
      };
    } catch (error) {
      const { data: registered } = await this.query(
        this.supabase
          .from('mcu_review_documents')
          .select('id, review_cycle_id, object_key, signature_version, created_at')
          .eq('review_cycle_id', reviewCycleId)
          .eq('document_type', 'referral_letter')
          .maybeSingle()
      ).catch(() => ({ data: null }));
      if (registered) {
        if (uploadedObjectKey && uploadedObjectKey !== registered.object_key) {
          await this.getStorage().deleteObject(uploadedObjectKey).catch(() => {});
        }
        return {
          status: 'ready',
          documentId: registered.id,
          reviewCycleId: registered.review_cycle_id,
          createdWithSignatureVersion: registered.signature_version,
          createdAt: registered.created_at
        };
      }
      await this.recordDocumentFailure(reviewCycleId, user, requestId).catch(() => {});
      return {
        status: 'failed',
        code: WORKFLOW_ERROR_CODES.DOCUMENT_FAILED,
        message: 'Approval berhasil, tetapi dokumen gagal dibuat. Gunakan tombol coba lagi.'
      };
    }
  }

  async recordDocumentFailure(reviewCycleId, user, requestId) {
    return this.rpc('workflow_record_document_failure', {
      p_review_cycle_id: reviewCycleId,
      p_actor_user_id: user.userId,
      p_failure_code: WORKFLOW_ERROR_CODES.DOCUMENT_FAILED,
      p_request_id: requestId,
      p_idempotency_key: `document-failed:${reviewCycleId}`
    });
  }

  async regenerateReferral(payload, user, requestId) {
    requireFields(payload, ['reviewCycleId']);
    return this.prepareReferralDocument(payload.reviewCycleId, user, requestId);
  }

  async updateExpirySetting(payload, user, requestId) {
    requireFields(payload, ['expectedVersion', 'expiryMonths', 'idempotencyKey']);
    const impact = await this.getExpiryPreview(payload, user);
    return this.rpc('workflow_update_expiry_months', {
      p_actor_user_id: user.userId,
      p_expected_version: payload.expectedVersion,
      p_expiry_months: Number(payload.expiryMonths),
      p_impact: impact,
      p_request_id: requestId,
      p_idempotency_key: payload.idempotencyKey
    });
  }

  async getExpiryPreview(payload, user) {
    requireFields(payload, ['expiryMonths']);
    const expiryMonths = Number(payload.expiryMonths);
    if (!Number.isInteger(expiryMonths) || expiryMonths < 1 || expiryMonths > 120) {
      throw new WorkflowError(WORKFLOW_ERROR_CODES.VALIDATION_FAILED, {
        details: { field: 'expiryMonths' }
      });
    }
    return this.rpc('workflow_preview_expiry_impact', {
      p_actor_user_id: user.userId,
      p_expiry_months: expiryMonths
    });
  }

  async setFeatureFlag(payload, user, requestId) {
    requireFields(payload, ['expectedVersion', 'enabled', 'reason', 'idempotencyKey']);
    if (typeof payload.enabled !== 'boolean') {
      throw new WorkflowError(WORKFLOW_ERROR_CODES.VALIDATION_FAILED, {
        details: { field: 'enabled' }
      });
    }
    return this.rpc('workflow_set_feature_flag', {
      p_actor_user_id: user.userId,
      p_expected_version: payload.expectedVersion,
      p_enabled: payload.enabled,
      p_reason: payload.reason,
      p_request_id: requestId,
      p_idempotency_key: payload.idempotencyKey
    });
  }
}

module.exports = {
  WorkflowService,
  requireFields,
  normalizePagination,
  unwrapSetting,
  createIdempotencyKey: randomUUID
};
