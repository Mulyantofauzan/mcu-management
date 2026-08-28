import { authService } from '../services/authService.js';
import { WorkflowApiError, workflowService } from '../services/workflowService.js';
import { workflowIdempotency } from '../utils/workflowIdempotency.js';
import { ensureWorkflowAlerts, presentWorkflowError } from '../utils/workflowErrorPresenter.js';

const state = { profile: null };
const $ = selector => document.querySelector(selector);
const pageLifecycle = () => window.MADIS_PAGE_LIFECYCLE;

function signatureVersion() {
  return Number(state.profile?.signature_version ?? state.profile?.signatureVersion ?? 0);
}

function renderProfile() {
  $('#professional-name').value = state.profile?.professional_name || '';
  $('#registration-number').value = state.profile?.registration_number || '';
  const version = signatureVersion();
  $('#signature-status').textContent = version
    ? `Tanda tangan aktif · versi ${version} · diperbarui ${new Date(state.profile.updated_at || state.profile.updatedAt).toLocaleString('id-ID')}`
    : 'Belum ada tanda tangan.';
}

async function loadProfile() {
  state.profile = await workflowService.doctorProfile();
  renderProfile();
}

async function saveProfile(event) {
  event.preventDefault();
  const professionalName = $('#professional-name').value.trim();
  if (!professionalName) {
    return presentWorkflowError({
      code: 'WORKFLOW_VALIDATION_FAILED',
      message: 'Nama profesional wajib diisi.'
    });
  }
  $('#save-profile').disabled = true;
  try {
    state.profile = await workflowService.mutate('save-doctor-profile', {
      professionalName,
      registrationNumber: $('#registration-number').value.trim() || null
    }, 'doctor-profile');
    renderProfile();
    const Swal = await ensureWorkflowAlerts();
    await Swal.fire({ icon: 'success', title: 'Profil Tersimpan', timer: 1400, showConfirmButton: false });
  } catch (error) {
    await presentWorkflowError(error, { retry: () => saveProfile(event) });
  } finally {
    $('#save-profile').disabled = false;
  }
}

function validateSignature(file) {
  if (!file || !['image/png', 'image/jpeg'].includes(file.type)) {
    throw new WorkflowApiError({
      code: 'WORKFLOW_VALIDATION_FAILED',
      message: 'Pilih file PNG atau JPEG.'
    }, 422);
  }
  if (file.size < 1 || file.size > 2 * 1024 * 1024) {
    throw new WorkflowApiError({
      code: 'WORKFLOW_VALIDATION_FAILED',
      message: 'Ukuran tanda tangan maksimal 2 MB.'
    }, 422);
  }
}

async function uploadSignature() {
  const file = $('#signature-file').files[0];
  try {
    validateSignature(file);
    if (!state.profile?.professional_name) {
      throw new WorkflowApiError({
        code: 'WORKFLOW_VALIDATION_FAILED',
        message: 'Simpan profil dokter sebelum mengunggah tanda tangan.'
      }, 422);
    }
    $('#upload-signature').disabled = true;
    const upload = await workflowService.mutate('create-signature-upload', {
      contentType: file.type,
      contentLength: file.size
    }, 'signature-upload-url');

    const response = await fetch(upload.uploadUrl, {
      method: 'PUT',
      headers: upload.requiredHeaders,
      body: file
    });
    if (!response.ok) {
      throw new WorkflowApiError({
        code: 'WORKFLOW_NETWORK_ERROR',
        message: 'Upload tanda tangan ke storage gagal.'
      }, response.status);
    }

    const scope = `signature-confirm:${upload.objectKey}`;
    const confirmed = await workflowService.mutate('confirm-signature-upload', {
      objectKey: upload.objectKey,
      expectedVersion: signatureVersion(),
      idempotencyKey: workflowIdempotency.get(scope)
    }, scope);
    workflowIdempotency.clear(scope);
    state.profile = {
      ...state.profile,
      signature_version: confirmed.signatureVersion,
      updated_at: confirmed.updatedAt
    };
    $('#signature-file').value = '';
    renderProfile();
    const Swal = await ensureWorkflowAlerts();
    await Swal.fire({ icon: 'success', title: 'Tanda Tangan Tersimpan', text: `Versi ${confirmed.signatureVersion}` });
  } catch (error) {
    await presentWorkflowError(error, {
      retry: uploadSignature,
      presentation: error?.code === 'WORKFLOW_DOCUMENT_FAILED'
        ? { title: 'Penyimpanan TTD Belum Siap' }
        : undefined
    });
  } finally {
    $('#upload-signature').disabled = false;
  }
}

async function init() {
  if (!authService.isAuthenticated()) {
    window.location.href = 'login.html';
    return;
  }
  pageLifecycle()?.setLoading('doctor-profile', { retry: init });
  try {
    const bootstrap = await workflowService.bootstrap();
    if (bootstrap.role !== 'Dokter') {
      await presentWorkflowError({ code: 'WORKFLOW_FORBIDDEN', message: 'Halaman ini hanya untuk Dokter.' });
      window.location.href = '../index.html';
      return;
    }
    await loadProfile();
    pageLifecycle()?.setReady('doctor-profile');
    pageLifecycle()?.markInteractive();
  } catch (error) {
    pageLifecycle()?.setError('doctor-profile', error, init);
    await presentWorkflowError(error, { retry: init });
  }
}

$('#doctor-profile-form').addEventListener('submit', saveProfile);
$('#upload-signature').addEventListener('click', uploadSignature);
init();
