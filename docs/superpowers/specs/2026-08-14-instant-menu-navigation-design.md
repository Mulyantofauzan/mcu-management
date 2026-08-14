# Instant Menu Navigation Design

## Context

MADIS is a multi-page application. Sidebar links perform normal same-origin
document navigation, and each destination initializes its own authentication,
sidebar, libraries, and data. Several legacy pages hide the entire `body` until
their data initialization finishes. That deliberate startup opacity creates the
blank white screen users see between menu selections.

An unused SPA router exists, but it only imports page JavaScript modules. It does
not fetch or replace each page's HTML, and most page modules initialize themselves
without a complete cleanup lifecycle. Enabling it would risk missing DOM,
duplicate listeners, and stale page state.

## Goal

Make same-origin menu navigation feel immediate and eliminate blank white frames
without converting MADIS into an SPA.

Success means:

- the current page remains visible until the browser presents the destination;
- the destination shell is visible immediately, even while its data is loading;
- loading indicators cover only the relevant content or operation;
- sidebar links, browser history, direct URLs, roles, and authentication continue
  to work normally;
- navigation remains usable when transition features or JavaScript are unavailable.

## Non-Goals

- Preserve unsaved form state after leaving a page.
- Replace the existing HTML pages with a client-side router.
- Change database schemas, API contracts, authentication, or authorization.
- Prefetch page data or execute page modules before the user navigates.

## Chosen Approach

Use progressive enhancement for the existing multi-page architecture.

1. Enable same-origin cross-document View Transitions in the shared stylesheet.
   Use a short root crossfade so the old page remains visible while the next
   document becomes ready.
2. Remove the whole-page startup hiding contract. The page shell, sidebar,
   headings, and static controls render immediately. Existing page initialization
   continues to populate dynamic data.
3. Add a small navigation state to the shared sidebar controller. Internal menu
   clicks show a thin progress indicator without replacing or clearing the current
   page. Modified clicks, external links, downloads, and current-page links retain
   native browser behavior.
4. Warm only the selected destination document on pointer hover, keyboard focus,
   or touch intent. Do not prerender pages or prefetch protected API data.
5. Honor `prefers-reduced-motion` by disabling animation while retaining stable
   page visibility and the progress indicator.

The old `spaRouter.js` remains inactive. Removing it is outside this change because
the service worker currently lists it as a static asset and deletion provides no
user-visible benefit.

## Navigation Flow

1. The user indicates intent on an internal sidebar link.
2. The browser receives a low-priority hint for that same-origin HTML document.
3. On an ordinary click, the shared controller marks navigation as pending and
   displays the thin progress indicator while leaving the current DOM untouched.
4. The browser performs normal navigation. Supported browsers crossfade the old
   and new documents; unsupported browsers use normal navigation.
5. The destination renders its shell immediately and initializes its own data.
6. Page-specific loading and error UI represent data availability without hiding
   the complete document.

## Error And Fallback Behavior

- Navigation links keep real `href` values and require no JavaScript router.
- A failed prefetch has no user-facing effect; the subsequent click uses normal
  navigation.
- Unsupported View Transition implementations ignore the CSS rule.
- Slow or failed data requests leave the destination shell visible and continue to
  use each page's existing error presentation.
- Authentication redirects continue through the existing page modules.

## Implementation Boundaries

Primary changes belong in the shared sidebar stylesheet and controller. Legacy
inline startup rules may be removed or narrowly overridden where required. The
dashboard's operation loading overlay must remain available for real work such as
uploads and saves; only its automatic full-page startup behavior is changed.

No new dependency or framework is introduced.

## Testing

Automated checks will verify that:

- shared navigation retains native links and ignores modified/external clicks;
- the shared styles opt into cross-document transitions;
- authenticated pages no longer hide their whole body before data initialization;
- reduced-motion users do not receive navigation animations;
- existing frontend contracts, full test suite, and production build still pass.

Manual QA will cover Chrome and Safari on desktop and mobile widths, including
sidebar navigation, report submenu links, doctor menus, browser back/forward,
slow-network loading, direct page loads, and logout/login redirects.

## Rollout

Ship as a presentation-only release through the existing GitHub-to-Vercel flow.
No migration or data backfill is required. If a browser ignores the transition,
MADIS falls back to normal navigation with the destination shell still visible.
