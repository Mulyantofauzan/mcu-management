# Centralized SweetAlert Design

**Date:** 2026-08-14
**Status:** Approved Design, Pending Written Review
**Project:** MADIS MCU Management System

## Context

MADIS currently has three notification patterns: a shared custom `showToast()`,
a shared custom `confirmDialog()`, and several direct SweetAlert2 or native
browser dialogs. SweetAlert2 version `11.26.25` and its CSS and JavaScript assets
are already stored locally in the project. Workflow pages load those assets on
demand, but other pages do not share the same presentation.

The shared `showToast()` function is already used by more than 200 call sites.
Changing that central helper is safer than editing every feature separately.

## Goal

Apply one proportional and consistent SweetAlert2 presentation throughout MADIS
without changing feature logic or requiring an external CDN.

Success means:

- success and informational feedback appears as a compact top-right toast;
- warning and error feedback remains visible long enough to be understood;
- important errors and workflow failures use an acknowledgement modal;
- confirmations use consistent normal or destructive actions;
- dialogs remain usable on desktop and mobile;
- existing callers retain their current function signatures and behavior;
- the application remains usable if the alert asset fails to load.

## Non-Goals

- Change database schemas, stored data, APIs, authentication, or authorization.
- Rewrite page-specific business flows.
- Add another notification dependency or load assets from a CDN.
- Convert every validation message into a blocking modal.
- Redesign page forms or other MADIS components.

## Chosen Approach

Centralize SweetAlert2 configuration behind the existing shared UI helpers.

1. Extend the existing local SweetAlert loader into the single application alert
   provider. Keep `ensureWorkflowAlerts()` as a compatibility export for current
   workflow pages.
2. Make `showToast(message, type)` delegate to the configured SweetAlert toast.
   Its synchronous, fire-and-forget calling convention remains unchanged.
3. Make `confirmDialog(message, onConfirm, onCancel)` delegate to the configured
   SweetAlert confirmation modal while preserving its callback contract.
4. Provide a Promise-based confirmation helper for the few active code paths that
   currently call native `alert()` or `confirm()` directly.
5. Keep workflow and upload errors on their existing blocking modal path, but
   apply the same shared dimensions, colors, and responsive styling.
6. Load all SweetAlert assets lazily from the existing same-origin vendor folder.

No page receives its own SweetAlert configuration. This prevents visual drift and
keeps future changes in one place.

## Presentation Rules

### Toasts

- Position: top-right on desktop and top on narrow mobile screens.
- Maximum width: `360px`; on mobile, viewport width minus `24px`.
- Success and info duration: `2500ms`.
- Warning and error duration: `4500ms`.
- Include an icon and timer progress bar.
- Pause the timer while hovered or keyboard-focused.
- Allow long text to wrap instead of widening the viewport.
- Do not show a confirmation button.

### Alerts And Confirmations

- Maximum desktop width: `440px`; mobile width is viewport minus `32px`.
- Compact icon, approximately `52px`, with a `20px` title and readable body text.
- Minimum button height: `42px`.
- Standard confirmation uses MADIS blue.
- Destructive confirmation uses red and always includes `Batal`.
- Important errors never close automatically and do not close from an outside
  click.
- Focus moves into the dialog and returns to the initiating control after close.
- Reduced-motion preferences disable non-essential animation.

## Behavior And Compatibility

Existing `showToast()` calls continue to pass `success`, `info`, `warning`, or
`error`. The helper maps these values to the shared SweetAlert toast without
changing any page-level success or failure decision.

Existing callback-based confirmations continue to execute `onConfirm` only after
explicit confirmation and `onCancel` after cancellation. Promise-based callers
receive a boolean result. Destructive work must never run when the dialog is
dismissed or when its UI cannot be loaded.

Current workflow functions such as `presentWorkflowError()` and
`presentUploadError()` keep their error-code mapping and retry, reload, login, and
read-only handlers. Only their visual configuration is unified.

Active production paths that still use native browser dialogs, including logout,
file deletion, user deletion, database reseeding, and analysis load failure, will
use the shared helper. Inactive legacy files are not reactivated as part of this
change.

## Error Handling

The loader uses one cached Promise so simultaneous notifications do not inject
duplicate CSS or script tags. If loading fails, toast calls fall back to the
existing XSS-safe DOM toast. Confirmation calls use the existing custom DOM
dialog as a fallback and default to cancellation if no dialog can be presented.
No destructive action may be approved merely because alert assets failed.

Messages remain text, not untrusted HTML. Existing request IDs and workflow error
details remain visible in blocking error dialogs.

## Testing

Automated checks will verify that:

- local SweetAlert2 assets exist and no CDN is introduced;
- the loader injects each asset at most once;
- toast types use the approved position and timing;
- callback and Promise confirmations preserve confirm and cancel behavior;
- workflow error handlers retain their existing actions;
- active production paths no longer use native `alert()` or `confirm()`;
- the existing frontend tests and production build pass.

Manual browser QA will cover desktop and mobile widths for success, warning,
error, destructive confirmation, logout cancellation, long messages, rapid
multiple toasts, keyboard focus, and reduced motion.

## Rollout

Ship as a presentation-only release through the existing GitHub-to-Vercel flow.
Increment the frontend release and service-worker cache version so clients receive
the centralized alert implementation without requiring a hard refresh. No
migration, backfill, or production data modification is required.
