export class McuFormFieldError extends Error {
  constructor(fieldId) {
    super(`Komponen form ${fieldId} belum termuat.`);
    this.name = 'McuFormFieldError';
    this.code = 'MCU_FORM_FIELD_MISSING';
    this.fieldId = fieldId;
  }
}

export function createMcuFormReader(form) {
  if (!form || typeof form.querySelector !== 'function') {
    throw new McuFormFieldError('mcu-form');
  }

  return fieldId => {
    const field = form.querySelector(`#${fieldId}`);
    if (!field || !('value' in field)) throw new McuFormFieldError(fieldId);
    return field.value;
  };
}
