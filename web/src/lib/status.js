/* Tampilan hasil MCU: teks dan kelas pill. Hasil akhir menggantikan hasil awal bila ada. */
const PILL = {
  Fit: 's-fit',
  'Fit With Note': 's-note',
  'Follow-Up': 's-followup',
  'Temporary Unfit': 's-temp',
  Unfit: 's-unfit'
};

export const resultOf = mcu => mcu?.finalResult || mcu?.initialResult || '';
export const pillClass = result => PILL[result] || 's-none';
