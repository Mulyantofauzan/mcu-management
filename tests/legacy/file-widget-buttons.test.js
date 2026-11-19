const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = relative => fs.readFileSync(path.resolve(__dirname, '../..', relative), 'utf8');

// The upload widget is mounted inside the MCU <form> (add, tambah and edit
// modals). A <button> without type="button" defaults to type="submit", so
// clicking "Delete" on a wrong file used to submit and save the whole form.
for (const file of [
  'mcu-management/js/components/fileUploadWidget.js',
  'mcu-management/js/components/fileListViewer.js'
]) {
  test(`${path.basename(file)}: every <button> is type="button" so it cannot submit a parent form`, () => {
    const buttons = read(file).match(/<button\b[^>]*>/g) || [];
    assert.ok(buttons.length > 0, 'expected at least one button in template');
    const offenders = buttons.filter(tag => !/\btype="button"/.test(tag));
    assert.deepEqual(offenders, []);
  });
}

test('upload widget containers are inside forms, which is why the button type matters', () => {
  const kelola = read('mcu-management/pages/kelola-karyawan.html');
  const tambah = read('mcu-management/pages/tambah-karyawan.html');
  const insideForm = (html, id) => {
    const at = html.indexOf(`id="${id}"`);
    return html.lastIndexOf('<form', at) > html.lastIndexOf('</form>', at);
  };
  assert.ok(insideForm(kelola, 'add-file-upload-container'));
  assert.ok(insideForm(kelola, 'file-upload-container-edit'));
  assert.ok(insideForm(tambah, 'mcu-file-upload-container'));
});
