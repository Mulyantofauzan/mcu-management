import { authService } from '../services/authService.js';
import { workflowService } from '../services/workflowService.js';
import { downloadFile } from '../services/supabaseStorageService.js';
import { workflowIdempotency } from '../utils/workflowIdempotency.js';
import { ensureWorkflowAlerts, presentWorkflowError } from '../utils/workflowErrorPresenter.js';
import { approvedCycle, shareApprovedReview } from '../utils/whatsappShare.js';

const state = {
  tab: new URLSearchParams(window.location.search).get('tab') || 'pending',
  queue: [],
  history: [],
  historyLoaded: false,
  ready: false,
  detail: null,
  selectedReviewCycleId: null,
  leaseTimer: null
};

const $ = selector => document.querySelector(selector);
const pageLifecycle = () => window.MADIS_PAGE_LIFECYCLE;

function escapeHtml(value) {
  return String(value ?? '-')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatDate(value, withTime = false) {
  if (!value) return '-';
  const raw = String(value);
  const date = new Date(raw.length === 10 ? `${raw}T00:00:00` : raw);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    ...(withTime ? { timeStyle: 'short' } : {})
  }).format(date);
}

function statusLabel(status) {
  return {
    pending_review: 'Menunggu',
    in_review: 'Sedang direview',
    correction_required: 'Perlu koreksi',
    followup_required: 'Perlu follow-up',
    completed: 'Selesai'
  }[status] || status || '-';
}

function setTab(tab) {
  state.tab = ['pending', 'followup', 'history'].includes(tab) ? tab : 'pending';
  document.querySelectorAll('[data-tab]').forEach(button => {
    button.classList.toggle('active', button.dataset.tab === state.tab);
    button.setAttribute('aria-selected', String(button.dataset.tab === state.tab));
  });
  const url = new URL(window.location.href);
  if (state.tab === 'pending') url.searchParams.delete('tab');
  else url.searchParams.set('tab', state.tab);
  history.replaceState(null, '', url);
  renderList();
  if (state.ready && state.tab === 'history' && !state.historyLoaded) void loadHistoryData();
}

function queueForTab() {
  if (state.tab === 'history') return state.history;
  return state.queue.filter(item => state.tab === 'followup'
    ? Boolean(item.activated_at)
    : !item.activated_at);
}

function renderList() {
  const rows = queueForTab();
  $('#queue-title').textContent = state.tab === 'history'
    ? 'Riwayat Keputusan'
    : state.tab === 'followup' ? 'Review Follow-Up' : 'Menunggu Review Awal';
  $('#queue-meta').textContent = `${rows.length} data`;
  $('[data-count="pending"]').textContent = `(${state.queue.filter(item => !item.activated_at).length})`;
  $('[data-count="followup"]').textContent = `(${state.queue.filter(item => Boolean(item.activated_at)).length})`;
  $('#review-empty').hidden = rows.length > 0;
  $('#review-list').innerHTML = rows.map(item => state.tab === 'history'
    ? historyRow(item)
    : queueRow(item)).join('');
  document.querySelectorAll('[data-open-mcu]').forEach(button => {
    button.addEventListener('click', () => openDetail(
      button.dataset.openMcu,
      button.dataset.reviewCycle || null
    ));
  });
}

function queueRow(item) {
  const employee = item.employee || {};
  return `<article class="workflow-list-item">
    <div><strong>${escapeHtml(employee.name || item.employee_id)}</strong><small>${escapeHtml(item.employee_id)} · ${escapeHtml(employee.department)}</small></div>
    <div><strong>${escapeHtml(item.mcu_type)}</strong><small>${formatDate(item.mcu_date)}</small></div>
    <div><span class="workflow-status ${item.workflow_status === 'in_review' ? 'workflow-status-warning' : ''}">${escapeHtml(statusLabel(item.workflow_status))}</span></div>
    <div><strong>Siklus ${Number(item.current_review_cycle) + 1}</strong><small>${item.claimed_by ? `Claim: ${escapeHtml(item.claimed_by)}` : 'Belum diklaim'}</small></div>
    <button type="button" class="workflow-btn" data-open-mcu="${escapeHtml(item.mcu_id)}">Buka</button>
  </article>`;
}

function historyRow(item) {
  const employee = item.employee || {};
  const employeeId = item.employee_id || item.mcu?.employee_id;
  return `<article class="workflow-list-item">
    <div><strong>${escapeHtml(employee.name || employeeId || item.mcu_id)}</strong><small>${escapeHtml(employeeId)} · ${escapeHtml(item.mcu_id)} · Siklus ${escapeHtml(item.cycle_number)}</small></div>
    <div><strong>${escapeHtml(item.decision === 'approved' ? item.medical_result : 'Dikembalikan')}</strong><small>${escapeHtml(item.review_stage)}</small></div>
    <div><span class="workflow-status ${item.decision === 'approved' ? 'workflow-status-success' : 'workflow-status-danger'}">${escapeHtml(item.decision)}</span></div>
    <div><strong>${formatDate(item.finalized_at, true)}</strong><small>${escapeHtml(item.doctor_user_id)}</small></div>
    <button type="button" class="workflow-btn" data-open-mcu="${escapeHtml(item.mcu_id)}" data-review-cycle="${escapeHtml(item.id)}">Lihat</button>
  </article>`;
}

async function loadData() {
  $('#refresh-queue').disabled = true;
  pageLifecycle()?.setLoading('doctor-review-list', { retry: loadData });
  try {
    state.queue = await workflowService.doctorQueue();
    if (state.tab !== 'history') renderList();
    const rows = queueForTab();
    if (rows.length === 0) pageLifecycle()?.setEmpty('doctor-review-list', 'Tidak ada MCU pada antrean ini.');
    else pageLifecycle()?.setReady('doctor-review-list');
  } catch (error) {
    pageLifecycle()?.setError('doctor-review-list', error, loadData);
    await presentWorkflowError(error, { retry: loadData });
  } finally {
    $('#refresh-queue').disabled = false;
  }
}

async function loadHistoryData() {
  pageLifecycle()?.setLoading('doctor-review-list', { retry: loadHistoryData });
  try {
    state.history = await workflowService.reviewHistory();
    state.historyLoaded = true;
    if (state.tab === 'history') renderList();
    if (state.history.length === 0) pageLifecycle()?.setEmpty('doctor-review-list', 'Belum ada riwayat review.');
    else pageLifecycle()?.setReady('doctor-review-list');
  } catch (error) {
    pageLifecycle()?.setError('doctor-review-list', error, loadHistoryData);
    await presentWorkflowError(error, { retry: loadHistoryData });
  }
}

function infoGrid(target, entries) {
  target.innerHTML = entries.map(([label, value]) => `<div class="workflow-info"><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join('');
}

function labReference(lab) {
  const min = lab.min_range_reference ?? lab.labItem?.min_range_reference;
  const max = lab.max_range_reference ?? lab.labItem?.max_range_reference;
  if (min === null || min === undefined || max === null || max === undefined) return '-';
  return `${min} - ${max}`;
}

function renderSupportingData(labs, files) {
  const labRows = labs.length
    ? labs.map(lab => `<tr>
      <td>${escapeHtml(lab.labItem?.name || lab.lab_item_id)}</td>
      <td><strong>${escapeHtml(lab.value)}</strong></td>
      <td>${escapeHtml(lab.unit || lab.labItem?.unit)}</td>
      <td>${escapeHtml(labReference(lab))}</td>
      <td>${escapeHtml(lab.notes)}</td>
    </tr>`).join('')
    : '<tr><td colspan="5" class="workflow-meta">Tidak ada hasil laboratorium.</td></tr>';
  const fileRows = files.length
    ? files.map(file => `<div class="workflow-file-row">
      <div><strong>${escapeHtml(file.filename)}</strong><small>${Math.ceil(Number(file.filesize || 0) / 1024)} KB</small></div>
      <button type="button" class="workflow-btn" data-download-file="${escapeHtml(file.fileid)}">Buka</button>
    </div>`).join('')
    : '<p class="workflow-meta">Tidak ada lampiran.</p>';

  $('#supporting-data').innerHTML = `<div class="workflow-table-wrap">
    <table class="workflow-data-table">
      <thead><tr><th>Pemeriksaan</th><th>Nilai</th><th>Satuan</th><th>Rujukan</th><th>Status/Catatan</th></tr></thead>
      <tbody>${labRows}</tbody>
    </table>
  </div><div class="workflow-files"><h4>Lampiran</h4>${fileRows}</div>`;

  document.querySelectorAll('[data-download-file]').forEach(button => {
    button.addEventListener('click', () => openSupportingFile(button.dataset.downloadFile));
  });
}

function renderClinicalHistory(medicalHistories, familyHistories) {
  const own = medicalHistories.map(item => `<div class="workflow-compact-row">
    <strong>${escapeHtml(item.disease_name)}</strong>
    <small>Riwayat pribadi${item.year_diagnosed ? ` · ${escapeHtml(item.year_diagnosed)}` : ''}${item.notes ? ` · ${escapeHtml(item.notes)}` : ''}</small>
  </div>`);
  const family = familyHistories.map(item => `<div class="workflow-compact-row">
    <strong>${escapeHtml(item.disease_name)}</strong>
    <small>${escapeHtml(item.family_member)}${item.age_at_diagnosis ? ` · usia ${escapeHtml(item.age_at_diagnosis)}` : ''}${item.notes ? ` · ${escapeHtml(item.notes)}` : ''}</small>
  </div>`);
  $('#clinical-history').innerHTML = [...own, ...family].join('')
    || '<p class="workflow-meta">Tidak ada riwayat penyakit yang tercatat.</p>';
}

function renderPriorMcus(priorMcus) {
  $('#prior-mcu-history').innerHTML = priorMcus.length
    ? priorMcus.map(item => `<div class="workflow-compact-row">
      <strong>${escapeHtml(item.mcu_type)} · ${formatDate(item.mcu_date)}</strong>
      <small>${escapeHtml(item.current_medical_result || item.final_result || item.initial_result || item.status)}</small>
    </div>`).join('')
    : '<p class="workflow-meta">Belum ada MCU sebelumnya.</p>';
}

async function openSupportingFile(fileId) {
  const file = state.detail?.files?.find(item => String(item.fileid) === String(fileId));
  if (!file) return;
  const target = window.open('about:blank', '_blank');
  if (target) target.opener = null;
  try {
    const user = authService.getCurrentUser();
    const result = await downloadFile(file.fileid, file.filename, user?.userId, target);
    if (!result.success) {
      throw { code: 'WORKFLOW_DOCUMENT_FAILED', message: result.error || 'Lampiran gagal dibuka.' };
    }
  } catch (error) {
    target?.close();
    await presentWorkflowError(error, { retry: () => openSupportingFile(fileId) });
  }
}

function renderDetail() {
  const {
    employee = {}, mcu = {}, labs = [], files = [], cycles = [],
    medicalHistories = [], familyHistories = [], priorMcus = []
  } = state.detail;
  $('#detail-title').textContent = `${employee.name || mcu.employee_id} · ${mcu.mcu_id}`;
  infoGrid($('#employee-info'), [
    ['ID', employee.employee_id], ['Nama', employee.name], ['Departemen', employee.department],
    ['Jabatan', employee.job_title], ['Jenis', employee.employee_type], ['Status bergabung', employee.joining_status]
  ]);
  infoGrid($('#mcu-info'), [
    ['Jenis MCU', mcu.mcu_type], ['Tanggal', formatDate(mcu.mcu_date)], ['BMI', mcu.bmi],
    ['Tekanan darah', mcu.blood_pressure], ['Nadi', mcu.pulse], ['Frekuensi napas', mcu.respiratory_rate],
    ['Suhu', mcu.temperature], ['Lingkar dada', mcu.chest_circumference],
    ['Visus jauh tanpa kacamata (L/R)', `${mcu.vision_distant_unaided_left || '-'} / ${mcu.vision_distant_unaided_right || '-'}`],
    ['Visus jauh berkacamata (L/R)', `${mcu.vision_distant_spectacles_left || '-'} / ${mcu.vision_distant_spectacles_right || '-'}`],
    ['Visus dekat tanpa kacamata (L/R)', `${mcu.vision_near_unaided_left || '-'} / ${mcu.vision_near_unaided_right || '-'}`],
    ['Visus dekat berkacamata (L/R)', `${mcu.vision_near_spectacles_left || '-'} / ${mcu.vision_near_spectacles_right || '-'}`],
    ['Audiometri', mcu.audiometry], ['Spirometri', mcu.spirometry], ['X-Ray', mcu.xray],
    ['EKG', mcu.ekg], ['Treadmill', mcu.treadmill], ['HBsAg', mcu.hbsag],
    ['NAPZA', mcu.napza], ['Buta warna', mcu.colorblind], ['Kebiasaan merokok', mcu.smoking_status],
    ['Olahraga', mcu.exercise_frequency], ['Keluhan utama', mcu.keluhan_utama], ['Diagnosis kerja', mcu.diagnosis_kerja],
    ['Alasan rujuk', mcu.alasan_rujuk], ['Dokter/sumber data', mcu.doctor], ['Status workflow', statusLabel(mcu.workflow_status)]
  ]);
  renderSupportingData(labs, files);
  renderClinicalHistory(medicalHistories, familyHistories);
  renderPriorMcus(priorMcus);
  $('#cycle-history').innerHTML = cycles.length ? cycles.map(cycle => `<div class="workflow-list-item">
    <div><strong>Siklus ${escapeHtml(cycle.cycle_number)} · ${escapeHtml(cycle.decision)}</strong><small>${escapeHtml(cycle.medical_result || cycle.rejection_reason)}</small></div>
    <div><strong>${escapeHtml(cycle.doctorProfile?.professional_name || cycle.doctor_user_id)}</strong><small>${formatDate(cycle.finalized_at, true)}</small></div>
  </div>`).join('') : '<p class="workflow-meta">Belum ada keputusan sebelumnya.</p>';
  const selectedCycle = cycles.find(cycle => cycle.id === state.selectedReviewCycleId) || null;
  $('#medical-result').value = selectedCycle?.decision === 'approved' ? selectedCycle.medical_result || '' : '';
  $('#clinical-notes').value = selectedCycle?.clinical_notes || '';
  $('#rejection-reason').value = selectedCycle?.rejection_reason || '';
  updateClaimUi();
}

async function setShareStatus(detail, nextStatus, failureReason = null) {
  const mcu = detail.mcu;
  const scope = `doctor-share:${mcu.mcu_id}:${mcu.workflow_version}:${nextStatus}`;
  const result = await workflowService.mutate('share-status', {
    mcuId: mcu.mcu_id,
    expectedVersion: mcu.workflow_version,
    shareStatus: nextStatus,
    failureReason,
    idempotencyKey: workflowIdempotency.get(scope)
  }, scope);
  workflowIdempotency.clear(scope);
  mcu.workflow_version = result.workflowVersion;
  mcu.current_share_status = result.shareStatus;
  return result;
}

async function shareCurrentApproval(mcuId, reviewCycleId = null) {
  const popup = window.open('about:blank', '_blank');
  if (popup) popup.opener = null;
  let detail;
  let trackShareStatus = false;
  try {
    detail = await workflowService.reviewDetail(mcuId);
    const cycle = approvedCycle(detail, reviewCycleId);
    trackShareStatus = cycle?.id === detail.mcu.current_share_cycle_id;
    if (trackShareStatus && ['not_started', 'failed'].includes(detail.mcu.current_share_status)) {
      await setShareStatus(detail, 'prepared');
    }
    await shareApprovedReview(detail, popup, reviewCycleId);
    const Swal = await ensureWorkflowAlerts();
    const confirmation = await Swal.fire({
      icon: 'question',
      title: 'Sudah Dibagikan?',
      text: 'Konfirmasi setelah ringkasan benar-benar dikirim ke grup HR/SHE.',
      confirmButtonText: 'Sudah Dibagikan',
      cancelButtonText: 'Belum',
      showCancelButton: true
    });
    if (trackShareStatus && confirmation.isConfirmed && detail.mcu.current_share_status === 'prepared') {
      await setShareStatus(detail, 'confirmed_by_user');
    }
  } catch (error) {
    popup?.close();
    if (trackShareStatus && detail?.mcu?.current_share_status === 'prepared') {
      await setShareStatus(detail, 'failed', 'Persiapan WhatsApp gagal di browser').catch(() => {});
    }
    await presentWorkflowError(error, { retry: () => shareCurrentApproval(mcuId, reviewCycleId) });
  }
}

async function regenerateReferral(reviewCycleId) {
  const regenerated = await workflowService.mutate(
    'regenerate-referral',
    { reviewCycleId },
    `document:${reviewCycleId}`
  );
  if (regenerated?.status === 'failed') throw regenerated;
  const Swal = await ensureWorkflowAlerts();
  await Swal.fire({ icon: 'success', title: 'Surat Berhasil Dibuat', timer: 1400, showConfirmButton: false });
}

function ownsClaim() {
  const user = authService.getCurrentUser();
  const mcu = state.detail?.mcu;
  return mcu?.workflow_status === 'in_review'
    && mcu.claimed_by === user?.userId
    && new Date(mcu.claim_expires_at).getTime() > Date.now();
}

function updateClaimUi() {
  const mcu = state.detail?.mcu;
  const selectedCycle = state.detail?.cycles?.find(cycle => cycle.id === state.selectedReviewCycleId) || null;
  const isHistory = Boolean(selectedCycle);
  if (isHistory) {
    clearInterval(state.leaseTimer);
    $('#claim-review').hidden = false;
    $('#claim-review').disabled = true;
    $('#release-claim').hidden = false;
    $('#release-claim').disabled = true;
    $('#decision-form').hidden = false;
    $('#medical-result').disabled = true;
    $('#clinical-notes').readOnly = true;
    $('#rejection-reason').readOnly = true;
    $('#approve-review').disabled = true;
    $('#reject-review').disabled = true;
    $('#share-review').hidden = selectedCycle.decision !== 'approved';
    $('#share-review').disabled = selectedCycle.decision !== 'approved';
    $('#claim-message').hidden = false;
    $('#claim-message').textContent = 'Keputusan final hanya dapat dilihat. Hasil review tidak dapat diubah.';
    $('#claim-timer').textContent = '';
    return;
  }

  $('#claim-review').disabled = false;
  $('#release-claim').disabled = false;
  $('#medical-result').disabled = false;
  $('#clinical-notes').readOnly = false;
  $('#rejection-reason').readOnly = false;
  $('#approve-review').disabled = false;
  $('#reject-review').disabled = false;
  $('#share-review').hidden = true;
  const own = ownsClaim();
  const canClaim = ['pending_review', 'in_review'].includes(mcu?.workflow_status) && !own;
  $('#claim-review').hidden = !canClaim;
  $('#release-claim').hidden = !own;
  $('#decision-form').hidden = !own;
  $('#claim-message').hidden = own;
  if (!own && mcu?.workflow_status === 'in_review') {
    $('#claim-message').textContent = `Sedang direview dokter lain sampai ${formatDate(mcu.claim_expires_at, true)}.`;
  } else {
    $('#claim-message').textContent = 'Claim MCU sebelum memberi keputusan.';
  }
  clearInterval(state.leaseTimer);
  if (mcu?.claim_expires_at) {
    const tick = () => {
      const seconds = Math.max(0, Math.floor((new Date(mcu.claim_expires_at) - Date.now()) / 1000));
      $('#claim-timer').textContent = seconds ? `Sisa claim ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}` : 'Claim berakhir';
      if (!seconds) {
        clearInterval(state.leaseTimer);
        mcu.claim_expires_at = null;
        $('#decision-form').hidden = true;
        $('#release-claim').hidden = true;
        $('#claim-review').hidden = false;
      }
    };
    tick();
    state.leaseTimer = setInterval(tick, 1000);
  } else {
    $('#claim-timer').textContent = '';
  }
}

async function openDetail(mcuId, reviewCycleId = null) {
  try {
    state.detail = await workflowService.reviewDetail(mcuId);
    state.selectedReviewCycleId = reviewCycleId;
    if (reviewCycleId && !state.detail.cycles?.some(cycle => cycle.id === reviewCycleId)) {
      throw { code: 'WORKFLOW_NOT_FOUND', message: 'Siklus review tidak ditemukan.' };
    }
    renderDetail();
    $('#review-overlay').hidden = false;
    document.body.style.overflow = 'hidden';
  } catch (error) {
    await presentWorkflowError(error, { retry: () => openDetail(mcuId, reviewCycleId) });
  }
}

function closeDetail() {
  clearInterval(state.leaseTimer);
  $('#review-overlay').hidden = true;
  document.body.style.overflow = '';
  state.detail = null;
  state.selectedReviewCycleId = null;
}

async function claimReview() {
  const mcu = state.detail.mcu;
  const scope = `claim:${mcu.mcu_id}:${mcu.workflow_version}`;
  $('#claim-review').disabled = true;
  try {
    const result = await workflowService.mutate('claim-review', {
      mcuId: mcu.mcu_id,
      expectedVersion: mcu.workflow_version,
      idempotencyKey: workflowIdempotency.get(scope)
    }, scope);
    workflowIdempotency.clear(scope);
    Object.assign(mcu, {
      workflow_status: result.workflowStatus,
      workflow_version: result.workflowVersion,
      claimed_by: result.claimedBy,
      claimed_at: result.claimedAt,
      claim_expires_at: result.claimExpiresAt
    });
    updateClaimUi();
  } catch (error) {
    await presentWorkflowError(error, {
      reload: () => openDetail(mcu.mcu_id),
      readOnly: () => updateClaimUi()
    });
  } finally {
    $('#claim-review').disabled = false;
  }
}

async function releaseClaim() {
  const mcu = state.detail.mcu;
  const scope = `release:${mcu.mcu_id}:${mcu.workflow_version}`;
  try {
    await workflowService.mutate('release-claim', {
      mcuId: mcu.mcu_id,
      expectedVersion: mcu.workflow_version,
      idempotencyKey: workflowIdempotency.get(scope)
    }, scope);
    workflowIdempotency.clear(scope);
    closeDetail();
    await loadData();
  } catch (error) {
    await presentWorkflowError(error, { reload: () => openDetail(mcu.mcu_id) });
  }
}

async function submitDecision(decision) {
  const mcu = state.detail.mcu;
  const medicalResult = $('#medical-result').value;
  const clinicalNotes = $('#clinical-notes').value.trim();
  const rejectionReason = $('#rejection-reason').value.trim();
  if (decision === 'approved' && (!medicalResult || !clinicalNotes)) {
    return presentWorkflowError({ code: 'WORKFLOW_VALIDATION_FAILED', message: 'Hasil dokter dan catatan klinis wajib diisi.' });
  }
  if (decision === 'rejected' && !rejectionReason) {
    return presentWorkflowError({ code: 'WORKFLOW_VALIDATION_FAILED', message: 'Alasan pengembalian wajib diisi.' });
  }

  const scope = `decision:${mcu.mcu_id}:${mcu.workflow_version}:${decision}`;
  $('#approve-review').disabled = true;
  $('#reject-review').disabled = true;
  try {
    const result = await workflowService.mutate('doctor-decision', {
      mcuId: mcu.mcu_id,
      expectedVersion: mcu.workflow_version,
      decision,
      medicalResult: decision === 'approved' ? medicalResult : null,
      clinicalNotes: decision === 'approved' ? clinicalNotes : null,
      rejectionReason: decision === 'rejected' ? rejectionReason : null,
      idempotencyKey: workflowIdempotency.get(scope)
    }, scope);
    workflowIdempotency.clear(scope);
    const Swal = await ensureWorkflowAlerts();
    if (result.document?.status === 'failed') {
      await presentWorkflowError(result.document, {
        retry: () => regenerateReferral(result.reviewCycleId)
      });
    }
    if (decision === 'rejected') {
      await Swal.fire({ icon: 'success', title: 'Keputusan Tersimpan', text: decision === 'approved' ? `Hasil: ${medicalResult}` : 'Data dikembalikan ke Petugas.' });
    } else {
      const sharePrompt = await Swal.fire({
        icon: 'success',
        title: 'Keputusan Tersimpan',
        text: `Hasil: ${medicalResult}`,
        confirmButtonText: 'Bagikan ke WhatsApp',
        cancelButtonText: 'Nanti',
        showCancelButton: true
      });
      if (sharePrompt.isConfirmed) await shareCurrentApproval(mcu.mcu_id);
    }
    closeDetail();
    await loadData();
  } catch (error) {
    await presentWorkflowError(error, { reload: () => openDetail(mcu.mcu_id) });
  } finally {
    $('#approve-review').disabled = false;
    $('#reject-review').disabled = false;
  }
}

async function init() {
  if (!authService.isAuthenticated()) {
    window.location.href = 'login.html';
    return;
  }
  try {
    const bootstrap = await workflowService.bootstrap();
    if (bootstrap.role !== 'Dokter') {
      await presentWorkflowError({ code: 'WORKFLOW_FORBIDDEN', message: 'Halaman ini hanya untuk Dokter.' });
      window.location.href = '../index.html';
      return;
    }
    if (!bootstrap.workflowEnabled) {
      $('#feature-message').hidden = false;
      $('#feature-message').textContent = 'Workflow approval belum diaktifkan Administrator.';
      pageLifecycle()?.setEmpty('doctor-review-list', 'Workflow approval belum diaktifkan.');
      pageLifecycle()?.markInteractive();
      return;
    }
    state.ready = true;
    if (state.tab === 'history') await loadHistoryData();
    else await loadData();
    pageLifecycle()?.markInteractive();
  } catch (error) {
    pageLifecycle()?.setError('doctor-review-list', error, init);
    await presentWorkflowError(error, { retry: init });
  }
}

document.querySelectorAll('[data-tab]').forEach(button => button.addEventListener('click', () => setTab(button.dataset.tab)));
$('#refresh-queue').addEventListener('click', () => state.tab === 'history' ? loadHistoryData() : loadData());
$('#close-detail').addEventListener('click', closeDetail);
$('#claim-review').addEventListener('click', claimReview);
$('#release-claim').addEventListener('click', releaseClaim);
$('#approve-review').addEventListener('click', () => submitDecision('approved'));
$('#reject-review').addEventListener('click', () => submitDecision('rejected'));
$('#share-review').addEventListener('click', () => shareCurrentApproval(
  state.detail.mcu.mcu_id,
  state.selectedReviewCycleId
));
$('#review-overlay').addEventListener('click', event => {
  if (event.target === $('#review-overlay')) closeDetail();
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !$('#review-overlay').hidden) closeDetail();
});

setTab(state.tab);
init();
