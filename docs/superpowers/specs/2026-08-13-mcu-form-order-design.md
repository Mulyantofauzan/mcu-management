# MCU Form Order Design

Date: 2026-08-13
Status: Approved

## Goal

Align every complete MCU data-entry form with the reading order of the representative clinic report so petugas can transfer values from the PDF without repeatedly moving between distant sections.

This change only reorders existing UI fields. It does not add, remove, rename, or reinterpret stored data.

## Scope

Apply one canonical order to these form surfaces:

1. Tambah MCU on `pages/tambah-karyawan.html`.
2. Tambah MCU on `pages/kelola-karyawan.html`.
3. Edit MCU on `pages/kelola-karyawan.html`.
4. Update Detail MCU on `pages/follow-up.html`.

Follow-Up-only controls, such as previous values, review results, and follow-up documents, remain available. Shared MCU fields follow the canonical order below, while workflow-specific controls stay at the end of the relevant form.

## Source Order

The representative PDF presents information in this sequence:

1. Employee and MCU metadata.
2. Medical and family history.
3. Smoking and exercise habits.
4. Physical examination and vital signs.
5. Vision and color-blindness assessment.
6. Laboratory results and HBsAg.
7. Audiometry.
8. Spirometry.
9. ECG.
10. Treadmill.
11. X-Ray.
12. Medical conclusion and notes.

NAPZA, referral data, and document upload are existing application fields that are not consistently present in the representative report. They are placed beside the closest related application workflow rather than removed.

## Canonical Form Order

1. **Data Karyawan**
   Existing read-only employee identity summary.
2. **Data MCU**
   MCU type, MCU date, and doctor/data source.
3. **Riwayat Kesehatan**
   Personal and family medical history.
4. **Kebiasaan**
   Smoking status and exercise frequency.
5. **Pemeriksaan Fisik**
   Blood pressure, pulse, respiration rate, temperature, BMI, and waist circumference.
6. **Pemeriksaan Penglihatan**
   Distant and near vision, with and without spectacles, followed by color blindness.
7. **Pemeriksaan Laboratorium**
   Existing hematology and chemistry values, followed by HBsAg and NAPZA.
8. **Audiometri**
9. **Spirometri**
10. **EKG**
11. **Treadmill**
12. **X-Ray**
13. **Data Rujukan (Opsional)**
   Recipient, complaint, working diagnosis, and referral reason. The doctor/data-source field is already shown in Data MCU and must not be duplicated.
14. **Dokumen MCU**
15. **Hasil dan Catatan**
   Initial result and notes. Final Follow-Up result and notes follow the initial result when applicable.

## Implementation Boundaries

- Preserve every existing element ID, input type, option value, `required` attribute, event handler, and data attribute.
- Preserve the payload shape used by page scripts and services.
- Move HTML sections only; do not introduce a new form framework or shared rendering abstraction.
- Add clear section headings where Audiometry, Spirometry, EKG, Treadmill, and X-Ray become separate groups.
- Use the existing responsive grid classes and ensure the new grouping remains usable on mobile.
- Keep workflow notices and modal actions in their existing functional positions at the end of each form.

## Data And Database Impact

There is no database migration, backfill, RLS policy change, API contract change, or stored-data transformation.

Existing JavaScript continues to read fields by ID, so DOM order has no effect on persistence. Existing records remain unchanged.

## Validation And Errors

- Browser validation continues to use the existing `required` fields.
- The first invalid field follows the new visual order, making correction match the PDF workflow.
- Existing SweetAlert and inline error handling remain unchanged.
- Reordering must not hide conditional `Lainnya` inputs or disconnect their change handlers.

## Verification

1. Add a structural test that checks the canonical section order on all four complete form surfaces.
2. Verify all existing MCU field IDs remain present and unique within each form.
3. Run the existing add, edit, and follow-up tests.
4. Run JavaScript syntax checks and the production build.
5. Smoke-test each form at desktop and mobile widths.
6. Confirm an existing MCU can be opened and saved without changed values or payload keys.

## Non-Goals

- Adding fields from the PDF that the application does not currently store, such as weight or height.
- Extracting data automatically from uploaded PDFs.
- Changing validation rules, medical classifications, approval workflow, or database schema.
- Refactoring duplicate form markup into a new component system.
