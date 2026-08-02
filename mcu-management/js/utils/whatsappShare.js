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

export function approvedCycle(detail) {
  const cycleId = detail?.mcu?.current_share_cycle_id;
  return (detail?.cycles || []).find(cycle => cycle.id === cycleId)
    || [...(detail?.cycles || [])].reverse().find(cycle => cycle.decision === 'approved')
    || null;
}

export function buildApprovedSummary(detail) {
  const { employee = {}, mcu = {} } = detail || {};
  const cycle = approvedCycle(detail);
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

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const area = document.createElement('textarea');
  area.value = text;
  area.style.position = 'fixed';
  area.style.opacity = '0';
  document.body.appendChild(area);
  area.select();
  const copied = document.execCommand('copy');
  area.remove();
  if (!copied) throw new Error('Clipboard unavailable');
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

export async function shareApprovedReview(detail, whatsappWindow) {
  const cycle = approvedCycle(detail);
  try {
    const summary = buildApprovedSummary(detail);
    await copyText(summary);
    if (LOOPING_RESULTS.includes(cycle.medical_result)) {
      await downloadReferral(cycle.id);
    }
    if (!whatsappWindow || whatsappWindow.closed) throw new Error('Popup blocked');
    whatsappWindow.location.href = 'https://web.whatsapp.com/';
    return { summary, reviewCycleId: cycle.id, hasDocument: LOOPING_RESULTS.includes(cycle.medical_result) };
  } catch (cause) {
    whatsappWindow?.close();
    throw new WorkflowApiError({
      code: 'WORKFLOW_WHATSAPP_FAILED',
      message: 'Ringkasan tidak dapat disiapkan. Izinkan pop-up dan akses clipboard, lalu coba lagi.'
    }, 0);
  }
}
