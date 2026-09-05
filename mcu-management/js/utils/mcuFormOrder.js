function directField(form, suffix) {
  return form.querySelector(`[id$="${suffix}"]`)?.closest('div') || null;
}

function appendField(form, suffix, target) {
  const field = directField(form, suffix);
  if (field && target) target.append(field);
  return field;
}

export const HEALTH_CERTIFICATE_TYPE = 'Surat Sehat';
const DETAILED_MCU_FIELDS = [
  'bmi', 'bloodPressure', 'respiratoryRate', 'pulse', 'temperature',
  'chestCircumference', 'visionDistantUnaideLeft', 'visionDistantUnaideRight',
  'visionDistantSpectaclesLeft', 'visionDistantSpectaclesRight',
  'visionNearUnaideLeft', 'visionNearUnaideRight', 'visionNearSpectaclesLeft',
  'visionNearSpectaclesRight', 'audiometry', 'spirometry', 'xray', 'ekg',
  'treadmill', 'hbsag', 'napza', 'colorblind', 'smokingStatus',
  'exerciseFrequency'
];

export function isHealthCertificate(type) {
  return String(type || '').trim() === HEALTH_CERTIFICATE_TYPE;
}

export function hasFullMcuHistory(mcus = [], excludedMcuId = null) {
  return mcus.some((mcu) => {
    const mcuId = mcu.mcuId || mcu.mcu_id;
    const deletedAt = mcu.deletedAt || mcu.deleted_at;
    const mcuType = mcu.mcuType || mcu.mcu_type;
    return !deletedAt && mcuId !== excludedMcuId && !isHealthCertificate(mcuType);
  });
}

export function normalizeMcuDataForType(mcuData) {
  if (!isHealthCertificate(mcuData?.mcuType)) return mcuData;

  const normalized = { ...mcuData, medicalHistories: [], familyHistories: [] };
  DETAILED_MCU_FIELDS.forEach((field) => {
    normalized[field] = null;
  });
  return normalized;
}

export function applyMcuTypeMode(form, type) {
  if (!form) return;
  const reduced = isHealthCertificate(type);

  form.querySelectorAll('[data-mcu-order]').forEach((section) => {
    const order = Number(section.dataset.mcuOrder);
    if (order < 20 || order >= 90) return;

    section.classList.toggle('hidden', reduced);
    section.querySelectorAll('input, select, textarea').forEach((control) => {
      if (reduced && control.required) {
        control.dataset.mcuRequired = 'true';
        control.required = false;
      } else if (!reduced && control.dataset.mcuRequired === 'true') {
        control.required = true;
        delete control.dataset.mcuRequired;
      }
    });
  });

  form.dataset.mcuTypeMode = reduced ? 'health-certificate' : 'full';
}

export function bindMcuTypeModes(root = document) {
  root.querySelectorAll('form[data-mcu-canonical-order]').forEach((form) => {
    const typeField = form.querySelector('select[id$="mcu-type"]');
    if (!typeField || typeField.dataset.mcuTypeModeBound === 'true') return;

    typeField.dataset.mcuTypeModeBound = 'true';
    typeField.addEventListener('change', () => applyMcuTypeMode(form, typeField.value));
    applyMcuTypeMode(form, typeField.value);
  });
}

export function sortByMcuOrder(nodes) {
  return [...nodes].sort(
    (left, right) => Number(left.dataset.mcuOrder) - Number(right.dataset.mcuOrder)
  );
}

export function applyCanonicalMcuFormOrder(root = document) {
  root.querySelectorAll('form[data-mcu-canonical-order]').forEach((form) => {
    const metadata = form.querySelector('[data-mcu-target="metadata"]');
    const labStatic = form.querySelector('[data-mcu-target="laboratory-static"]');
    const supporting = form.querySelector('[data-mcu-target="supporting"]');

    appendField(form, '-doctor', metadata);
    appendField(form, '-hbsag', labStatic);
    appendField(form, '-napza', labStatic);

    const colorBlind = directField(form, '-colorblind');
    if (colorBlind) {
      colorBlind.dataset.mcuOrder = '52';
      colorBlind.classList.add('mb-4');
      form.append(colorBlind);
    }

    ['-ekg', '-treadmill', '-xray'].forEach((suffix) => {
      appendField(form, suffix, supporting);
    });

    const children = [...form.children];
    const footer = children.find((node) => node.classList.contains('modal-footer')) || null;
    const orderedNodes = children.filter((node) => node.dataset.mcuOrder);
    sortByMcuOrder(orderedNodes).forEach((node) => {
      form.insertBefore(node, footer);
    });
  });

  bindMcuTypeModes(root);
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => applyCanonicalMcuFormOrder(), { once: true });
  } else {
    applyCanonicalMcuFormOrder();
  }
}
