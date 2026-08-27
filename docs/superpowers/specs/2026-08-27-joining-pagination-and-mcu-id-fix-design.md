# Joining Pagination and MCU Upload ID Fix Design

## Context

The Administrator joining-decision page currently loads at most 200 waiting
employees and 200 history records, then renders every returned record at once.
The history has reached the API limit, so client-side pagination would hide any
records beyond the first 200.

The quick Add MCU flow also assigns the employee ID before resetting the form.
The reset clears the hidden `mcu-employee-id` field and leaves the upload path
without a valid employee ID. Production data confirms that active employee IDs
already satisfy the storage-safe format; the database values do not need repair.

## Scope

- Paginate both `Daftar Tunggu` and `Riwayat` with 10 records per page.
- Fetch only the active page from the workflow API.
- Show the visible range, total records, compact page numbers, previous, and
  next controls.
- Return to page 1 when switching tabs or manually reloading data.
- Route quick Add MCU requests through the canonical Add MCU opener so the
  employee ID, MCU ID, file widget, laboratory widget, and defaults share one
  initialization path.
- Preserve the existing authorization, decision, correction, and upload rules.

## Non-Goals

- No database schema migration or data rewrite.
- No search, filtering, page-size selector, infinite scroll, or URL page state.
- No change to the 10 MB PDF and 3 MB image upload limits.
- No redesign of the joining cards.

## API Design

`joining-queue` and `joining-history` accept `page` and `pageSize`. The server
normalizes them to positive integers and caps `pageSize` at 50. The page sends
`pageSize=10`.

The service queries employees using a Supabase range for the requested page and
an exact total count. History is ordered by `joining_decided_at` descending,
then `employee_id` descending. Waiting records are ordered by `employee_id`
descending. MCU lookup remains limited to employees on the requested page.

The response shape is:

```json
{
  "items": [],
  "page": 1,
  "pageSize": 10,
  "total": 200,
  "totalPages": 20
}
```

If a mutation removes the last item from the current page, the client reloads
the nearest valid page.

## UI Design

Each tab owns its page number and result metadata. The active tab renders only
its current `items`. The toolbar count continues to show the full total.

Below the list, an accessible navigation row shows:

- `1-10 dari 200 data`
- `Sebelumnya`
- first page, nearby page numbers, ellipses, and last page
- `Selanjutnya`

Unavailable controls are disabled. Pagination is hidden for an empty result and
kept compact on mobile by limiting the visible numeric buttons.

## MCU ID Fix

The quick-entry handler delegates to `openAddMCUForEmployee(employeeId)` instead
of duplicating a partial form setup. The canonical opener remains responsible
for resetting the form and then restoring the hidden employee ID, generating a
new MCU ID, and initializing upload and laboratory widgets.

The upload validator remains strict because its value is used in an R2 object
key. The fix supplies the correct database ID instead of weakening validation.

## Error Handling

- Invalid pagination input is normalized server-side rather than passed to the
  database.
- Existing workflow error presentation handles failed page requests and retry.
- The current list remains visible until a successful response replaces it.
- A missing employee in the quick flow uses the existing user-facing error and
  does not initialize an upload.

## Testing

- Service tests cover page normalization, stable range boundaries, total count,
  both statuses, and an out-of-range page.
- Frontend contract tests cover the response shape, 10-record page size, tab
  reset, pagination controls, and delegation of quick Add MCU to the canonical
  opener.
- Existing workflow, storage, and frontend tests must remain green.
- Browser smoke testing checks first/next/last navigation on history, independent
  tab page state, mobile layout, and the quick Add MCU form's upload request
  metadata without saving a production MCU.

## Success Criteria

- Both tabs display no more than 10 records at once while all records remain
  reachable.
- The displayed range and total are accurate after switching tabs, reloading,
  deciding, or correcting a record.
- Quick Add MCU always sends the selected employee ID and a newly generated MCU
  ID to upload preparation.
- No production employee or MCU data is modified by deployment.
