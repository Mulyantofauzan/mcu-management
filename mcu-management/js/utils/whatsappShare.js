import { WorkflowApiError, workflowService } from '../services/workflowService.js';

const LOOPING_RESULTS = ['Follow-Up', 'Temporary Unfit'];

function clean(value, fallback = '-') {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  return text || fallback;
}

function formatDate(value, withTime = false) {
  if (!value) return '-';
  const raw = String(value);
  const date = new Date(raw.length === 10 ? `${raw}T00:00:00` : raw);
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    ...(withTime ? { timeStyle: 'short' } : {})
  }).format(date);
}

export function approvedCycle(detail, requestedCycleId = null) {
  const requested = (detail?.cycles || []).find(cycle => cycle.id === requestedCycleId);
  if (requestedCycleId && requested?.decision !== 'approved') return null;
  if (requested?.decision === 'approved' && !LOOPING_RESULTS.includes(requested.medical_result)) {
    return requested;
  }
  const cycleId = detail?.mcu?.current_share_cycle_id;
  return (detail?.cycles || []).find(cycle => cycle.id === cycleId)
    || [...(detail?.cycles || [])].reverse().find(cycle => cycle.decision === 'approved')
    || (requested?.decision === 'approved' ? requested : null)
    || null;
}

export function buildApprovedSummary(detail, requestedCycleId = null) {
  const { employee = {}, mcu = {} } = detail || {};
  const cycle = approvedCycle(detail, requestedCycleId);
  if (!cycle || cycle.decision !== 'approved') {
    throw new WorkflowApiError({
      code: 'WORKFLOW_INVALID_TRANSITION',
      message: 'Keputusan dokter yang disetujui belum tersedia.'
    }, 409);
  }
  const notes = clean(cycle.clinical_notes).slice(0, 300);
  const doctorName = clean(cycle.doctorProfile?.professional_name || cycle.doctor_user_id);
  return [
    '*Ringkasan Hasil MCU - MADIS*',
    `Nama: ${clean(employee.name)}`,
    `ID: ${clean(employee.employee_id)}`,
    `MCU: ${clean(mcu.mcu_type)} (${formatDate(mcu.mcu_date)})`,
    `Hasil: *${clean(cycle.medical_result)}*`,
    `Catatan: ${notes}`,
    `Dokter: ${doctorName}`,
    `Direview: ${formatDate(cycle.finalized_at, true)}`
  ].join('\n');
}

export function buildWhatsAppUrl(summary) {
  return `https://wa.me/?text=${encodeURIComponent(summary)}`;
}

async function downloadReferral(reviewCycleId) {
  const download = await workflowService.get('download-referral', { reviewCycleId });
  const link = document.createElement('a');
  link.href = download.downloadUrl;
  link.download = download.fileName;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export async function shareApprovedReview(detail, whatsappWindow, requestedCycleId = null) {
  const cycle = approvedCycle(detail, requestedCycleId);
  const summary = buildApprovedSummary(detail, requestedCycleId);
  if (!whatsappWindow || whatsappWindow.closed) {
    throw new WorkflowApiError({
      code: 'WORKFLOW_WHATSAPP_FAILED',
      message: 'Pop-up WhatsApp diblokir. Izinkan pop-up untuk MADIS, lalu coba lagi.'
    }, 0);
  }

  const hasDocument = LOOPING_RESULTS.includes(cycle.medical_result);
  if (hasDocument) await downloadReferral(cycle.id);

  try {
    whatsappWindow.location.href = buildWhatsAppUrl(summary);
  } catch (cause) {
    whatsappWindow.close();
    throw new WorkflowApiError({
      code: 'WORKFLOW_WHATSAPP_FAILED',
      message: 'WhatsApp tidak dapat dibuka. Coba lagi.'
    }, 0);
  }
  return { summary, reviewCycleId: cycle.id, hasDocument };
}
