import { authService } from '../services/authService.js';
import { workflowService } from '../services/workflowService.js';
import { workflowIdempotency } from '../utils/workflowIdempotency.js';
import { ensureWorkflowAlerts, presentWorkflowError } from '../utils/workflowErrorPresenter.js';
import { shareApprovedReview } from '../utils/whatsappShare.js';

const state = { tab: 'waiting', waiting: [], history: [], selected: null };
const $ = selector => document.querySelector(selector);

function escapeHtml(value) {
  return String(value ?? '-')
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

function formatDate(value) {
  if (!value) return '-';
  const raw = String(value);
  const date = new Date(raw.length === 10 ? `${raw}T00:00:00` : raw);
  return Number.isNaN(date.getTime()) ? '-' : new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(date);
}

function shareLabel(status) {
  return {
    not_started: 'Belum disiapkan',
    prepared: 'Disiapkan',
    confirmed_by_user: 'Dikonfirmasi pengguna',
    failed: 'Gagal disiapkan'
  }[status] || '-';
}

function rows() { return state.tab === 'waiting' ? state.waiting : state.history; }

function setTab(tab) {
  state.tab = tab;
  document.querySelectorAll('[data-joining-tab]').forEach(button => button.classList.toggle('active', button.dataset.joiningTab === tab));
  renderList();
}

function renderList() {
  const data = rows();
  $('#joining-title').textContent = state.tab === 'waiting' ? 'Daftar Tunggu' : 'Riwayat Keputusan';
  $('#joining-count').textContent = `${data.length} data`;
  $('#joining-empty').hidden = data.length > 0;
  $('#joining-list').innerHTML = data.map(row => {
    const mcu = row.mcu || {};
    const isCorrection = state.tab === 'history' && row.joining_status === 'not_joined';
    return `<article class="workflow-list-item">
      <div><strong>${escapeHtml(row.name)}</strong><small>${escapeHtml(row.employee_id)} · ${escapeHtml(row.department)}</small></div>
      <div><strong>${escapeHtml(mcu.current_medical_result || '-')}</strong><small>${escapeHtml(mcu.mcu_type || '-')} · ${formatDate(mcu.mcu_date)}</small></div>
      <div><span class="workflow-status ${row.joining_status === 'not_joined' ? 'workflow-status-danger' : row.joining_status === 'joined' ? 'workflow-status-success' : ''}">${escapeHtml(row.joining_status)}</span></div>
      <div><strong>${escapeHtml(shareLabel(mcu.current_share_status))}</strong><small>${escapeHtml(row.joining_decision_reason || '')}</small></div>
      ${state.tab === 'waiting'
        ? `<button type="button" class="workflow-btn" data-decide="${escapeHtml(row.employee_id)}">Proses</button>`
        : isCorrection ? `<button type="button" class="workflow-btn" data-correct="${escapeHtml(row.employee_id)}">Koreksi</button>` : '<span></span>'}
    </article>`;
  }).join('');
  document.querySelectorAll('[data-decide]').forEach(button => button.addEventListener('click', () => openDecision(button.dataset.decide)));
  document.querySelectorAll('[data-correct]').forEach(button => button.addEventListener('click', () => correctDecision(button.dataset.correct)));
}

async function loadData() {
  $('#refresh-joining').disabled = true;
  try {
    [state.waiting, state.history] = await Promise.all([
      workflowService.joiningQueue(false),
      workflowService.joiningQueue(true)
    ]);
    renderList();
  } catch (error) {
    await presentWorkflowError(error, { retry: loadData });
  } finally {
    $('#refresh-joining').disabled = false;
  }
}

function infoGrid(entries) {
  $('#joining-info').innerHTML = entries.map(([label, value]) => `<div class="workflow-info"><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join('');
}

function openDecision(employeeId) {
  state.selected = state.waiting.find(row => row.employee_id === employeeId);
  if (!state.selected?.mcu) return;
  const { mcu } = state.selected;
  $('#joining-dialog-title').textContent = state.selected.name;
  $('#joining-dialog-meta').textContent = state.selected.employee_id;
  infoGrid([
    ['Departemen', state.selected.department], ['Jabatan', state.selected.job_title], ['Jenis karyawan', state.selected.employee_type],
    ['MCU', mcu.mcu_type], ['Tanggal MCU', formatDate(mcu.mcu_date)], ['Hasil Dokter', mcu.current_medical_result]
  ]);
  $('#share-state').textContent = shareLabel(mcu.current_share_status);
  $('#override-field').hidden = mcu.current_share_status === 'confirmed_by_user';
  $('#joining-status').value = '';
  $('#joining-reason').value = '';
  $('#share-override-reason').value = '';
  $('#joining-overlay').hidden = false;
  document.body.style.overflow = 'hidden';
}

function closeDecision() {
  $('#joining-overlay').hidden = true;
  document.body.style.overflow = '';
  state.selected = null;
}

async function setShareStatus(nextStatus, failureReason = null) {
  const mcu = state.selected.mcu;
  const scope = `share:${mcu.mcu_id}:${mcu.workflow_version}:${nextStatus}`;
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
  $('#share-state').textContent = shareLabel(result.shareStatus);
  $('#override-field').hidden = result.shareStatus === 'confirmed_by_user';
  return result;
}

async function shareWhatsApp() {
  const popup = window.open('about:blank', '_blank');
  if (popup) popup.opener = null;
  $('#share-whatsapp').disabled = true;
  try {
    const detail = await workflowService.reviewDetail(state.selected.mcu.mcu_id);
    if (state.selected.mcu.current_share_status === 'not_started'
      || state.selected.mcu.current_share_status === 'failed') {
      await setShareStatus('prepared');
    }
    await shareApprovedReview(detail, popup);
    const Swal = await ensureWorkflowAlerts();
    const confirmation = await Swal.fire({
      icon: 'question',
      title: 'Sudah Dibagikan?',
      text: 'Konfirmasi hanya setelah ringkasan benar-benar dikirim ke grup HR/SHE.',
      confirmButtonText: 'Sudah Dibagikan',
      cancelButtonText: 'Belum',
      showCancelButton: true
    });
    if (confirmation.isConfirmed && state.selected.mcu.current_share_status === 'prepared') {
      await setShareStatus('confirmed_by_user');
    }
  } catch (error) {
    popup?.close();
    if (state.selected?.mcu?.current_share_status === 'prepared') {
      await setShareStatus('failed', 'Persiapan WhatsApp gagal di browser').catch(() => {});
    }
    await presentWorkflowError(error, { retry: shareWhatsApp });
  } finally {
    $('#share-whatsapp').disabled = false;
  }
}

async function saveDecision(event) {
  event.preventDefault();
  const row = state.selected;
  const joiningStatus = $('#joining-status').value;
  const reason = $('#joining-reason').value.trim();
  const shareOverrideReason = $('#share-override-reason').value.trim();
  if (!joiningStatus || (joiningStatus === 'not_joined' && !reason)
    || (row.mcu.current_share_status !== 'confirmed_by_user' && !shareOverrideReason)) {
    return presentWorkflowError({ code: 'WORKFLOW_VALIDATION_FAILED', message: 'Lengkapi keputusan dan alasan yang diwajibkan.' });
  }
  const scope = `joining:${row.employee_id}:${row.joining_version}`;
  $('#save-joining').disabled = true;
  try {
    await workflowService.mutate('joining-decision', {
      employeeId: row.employee_id,
      mcuId: row.mcu.mcu_id,
      expectedVersion: row.joining_version,
      joiningStatus,
      reason: joiningStatus === 'not_joined' ? reason : null,
      shareOverrideReason: row.mcu.current_share_status === 'confirmed_by_user' ? null : shareOverrideReason,
      idempotencyKey: workflowIdempotency.get(scope)
    }, scope);
    workflowIdempotency.clear(scope);
    const Swal = await ensureWorkflowAlerts();
    await Swal.fire({ icon: 'success', title: 'Keputusan Tersimpan', text: joiningStatus === 'joined' ? 'Karyawan ditandai bergabung.' : 'Kandidat ditandai tidak bergabung.' });
    closeDecision();
    await loadData();
  } catch (error) {
    await presentWorkflowError(error, { reload: loadData });
  } finally {
    $('#save-joining').disabled = false;
  }
}

async function correctDecision(employeeId) {
  const row = state.history.find(item => item.employee_id === employeeId);
  const Swal = await ensureWorkflowAlerts();
  const answer = await Swal.fire({
    icon: 'warning',
    title: 'Kembalikan ke Kandidat?',
    input: 'textarea',
    inputLabel: 'Alasan koreksi',
    inputValidator: value => value?.trim() ? undefined : 'Alasan wajib diisi.',
    showCancelButton: true,
    confirmButtonText: 'Simpan Koreksi'
  });
  if (!answer.isConfirmed) return;
  const scope = `joining-correction:${row.employee_id}:${row.joining_version}`;
  try {
    await workflowService.mutate('joining-correction', {
      employeeId: row.employee_id,
      expectedVersion: row.joining_version,
      reason: answer.value.trim(),
      idempotencyKey: workflowIdempotency.get(scope)
    }, scope);
    workflowIdempotency.clear(scope);
    await loadData();
  } catch (error) {
    await presentWorkflowError(error, { reload: loadData });
  }
}

async function init() {
  if (!authService.isAuthenticated()) {
    window.location.href = 'login.html';
    return;
  }
  try {
    const bootstrap = await workflowService.bootstrap();
    if (bootstrap.role !== 'Admin') {
      await presentWorkflowError({ code: 'WORKFLOW_FORBIDDEN', message: 'Halaman ini hanya untuk Administrator.' });
      window.location.href = '../index.html';
      return;
    }
    if (!bootstrap.workflowEnabled) return;
    await loadData();
  } catch (error) {
    await presentWorkflowError(error, { retry: init });
  }
}

document.querySelectorAll('[data-joining-tab]').forEach(button => button.addEventListener('click', () => setTab(button.dataset.joiningTab)));
$('#refresh-joining').addEventListener('click', loadData);
$('#close-joining').addEventListener('click', closeDecision);
$('#share-whatsapp').addEventListener('click', shareWhatsApp);
$('#joining-form').addEventListener('submit', saveDecision);
$('#joining-overlay').addEventListener('click', event => { if (event.target === $('#joining-overlay')) closeDecision(); });
init();
