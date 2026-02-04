# Loading Screen Troubleshooting Guide

## Status: COMPREHENSIVE DEBUG APPROACH

This guide helps identify why loading screens may not be displaying.

---

## Quick Test: test-loading.html

**File:** `/mcu-management/test-loading.html`

Test the loading screen in isolation without any app logic:
1. Open browser dev tools (F12)
2. Go to: `http://localhost:5000/mcu-management/test-loading.html` (adjust port/path)
3. Check Console tab for any errors
4. Loading overlay should appear for 3 seconds
5. Click "Simulate Loading" button to test progress animation

**Expected Result:**
- Loading overlay covers full screen
- Spinner animates
- Progress bar fills 0% → 100%
- Text updates with percentage
- After 3 seconds or 100% complete, loading disappears

---

## Browser Console Debugging

### Step 1: Check Initialization Logs

Open browser console (F12 → Console tab) and look for these messages:

```
✅ UnifiedLoading initialized: {
    elementFound: true,
    messageFound: true,
    progressBarFound: true,
    percentFound: true
}
```

**If `false` for any field:**
- Loading overlay HTML element is missing or selector is wrong
- Check HTML file for correct element IDs:
  - `#unified-loading-overlay` (main container)
  - `#unified-loading-message` (message text)
  - `#unified-loading-bar` (progress bar)
  - `#unified-loading-percent` (percentage number)

### Step 2: Check Show() Logs

Look for:
```
✅ Loading screen shown: {
    message: "Memuat Dashboard...",
    isVisible: true,
    display: "flex",
    hasHiddenClass: false
}
```

**If `display: "none"` or `hasHiddenClass: true`:**
- CSS is conflicting with inline styles
- Tailwind `.hidden` class (display: none) not being removed
- Solution: Add inline styles to HTML element (see below)

### Step 3: Check Network Activity

1. Open Console → Network tab
2. Check for JavaScript module loading errors
3. Look for 404s on imports
4. If modules fail to load, they can prevent `init()` function from running

---

## HTML Element Requirements

### Dashboard (index.html)

**Must have inline styles to override Tailwind:**

```html
<div id="unified-loading-overlay"
     class="hidden fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm"
     style="display: flex !important; visibility: visible !important; opacity: 1 !important;">
    <!-- Loading content -->
</div>
```

**Elements inside must exist:**
- `<p id="unified-loading-message">` - for message text
- `<div id="unified-loading-bar">` - progress bar (must be inside overflow-hidden container)
- `<span id="unified-loading-percent">` - percentage number

### Jakarta CV (assessment-rahma.html)

Same as dashboard - must have inline styles because of CSS conflicts with Tailwind.

---

## CSS Critical Sections

### Dashboard CSS (index.html `<style>`)

```css
/* MUST override .hidden class */
#unified-loading-overlay {
    position: fixed !important;
    display: flex !important;  /* Override Tailwind .hidden */
    visibility: visible !important;
    z-index: 9999 !important;
    /* ... other properties ... */
}

/* Auto-hide when page initializes */
body.initialized #unified-loading-overlay {
    display: none !important;
    visibility: hidden !important;
}
```

### Jakarta CV CSS (assessment-rahma.html `<style>`)

Same approach with !important flags to force override.

---

## JavaScript Execution Flow

### Dashboard (js/pages/dashboard.js)

```javascript
// 1. Import unifiedLoading manager
import { unifiedLoading } from '../utils/unifiedLoadingManager.js';

// 2. In init() function, first thing:
async function init() {
  try {
    unifiedLoading.show('Memuat Dashboard...');  // ← SHOWS LOADING
    unifiedLoading.updateProgress(5);

    // ... all the loading logic ...
    // updateProgress() called multiple times (5, 15, 25, 30, 40, 50, 80, 95, 100)

    unifiedLoading.hide();  // ← HIDES LOADING
    document.body.classList.add('initialized');  // ← TRIGGERS CSS HIDE
  } catch (error) {
    unifiedLoading.hide();
    document.body.classList.add('initialized');
  }
}

// 3. Auto-run when Supabase ready
supabaseReady.then(() => {
  init();  // ← STARTS INITIALIZATION
}).catch(() => {
  init();  // ← STARTS EVEN IF SUPABASE FAILS
});
```

### Jakarta CV (js/pages/assessment-rahma-dashboard.js)

Similar flow:

```javascript
export async function initAssessmentRahmaDAshboard() {
  try {
    unifiedLoading.show('Memuat data... Harap tunggu sebentar');
    unifiedLoading.updateProgress(5);

    // ... data loading ...
    // updateProgress called (5, 40, 50, 70, 90, 100)

    unifiedLoading.updateProgress(100);
    await new Promise(resolve => setTimeout(resolve, 300));
    unifiedLoading.hide();
    // ... render content ...
    document.body.classList.add('initialized');  // ← CSS HIDES OVERLAY
  } catch (error) {
    unifiedLoading.hide();
    // ...
    document.body.classList.add('initialized');
  }
}
```

---

## Common Issues & Solutions

### Issue 1: Loading overlay not visible at all

**Diagnosis:**
- Open console, no logs from unifiedLoading
- init() function not being called

**Solutions:**
1. Check if unifiedLoading is imported in JS file
2. Check if init() function is being called (check at end of file)
3. Check for JavaScript syntax errors (Console tab)
4. Check Network tab for failed imports

### Issue 2: Loading overlay visible but no text/progress bar

**Diagnosis:**
- Logs show `messageFound: false` or `progressBarFound: false`
- Loading element found but child elements not

**Solutions:**
1. Verify HTML element IDs match exactly:
   - `#unified-loading-message`
   - `#unified-loading-bar`
   - `#unified-loading-percent`
2. Check selector paths - querySelector looks inside loading element
3. Ensure correct nesting: progress bar must be in overflow:hidden container

### Issue 3: Loading overlay appears but progress doesn't animate

**Diagnosis:**
- Overlay visible
- Progress bar exists but stuck at 0%
- updateProgress() not being called OR not updating DOM

**Solutions:**
1. Check if updateProgress() is being called (add console.log)
2. Verify element references are correct
3. Check if CSS transitions are applied to progress bar
4. Uncomment detailed logging in updateProgress() to see all progress values

### Issue 4: Loading screen doesn't hide after loading completes

**Diagnosis:**
- Overlay stays visible after data loads
- Either unifiedLoading.hide() not called OR document.body.classList.add('initialized') not called

**Solutions:**
1. Check error handling - catches might not be adding 'initialized' class
2. Verify CSS rule for hiding: `body.initialized #unified-loading-overlay { display: none !important; }`
3. Check browser console for errors that prevent class from being added
4. Add logging to confirm both hide() and classList.add() are called

---

## Testing Checklist

- [ ] Open test-loading.html - does overlay appear?
- [ ] Check browser console - any JS errors?
- [ ] Check network tab - any 404s on module imports?
- [ ] Check console for "✅ UnifiedLoading initialized" log
- [ ] Check console for "✅ Loading screen shown" log
- [ ] Verify HTML element IDs match selectors
- [ ] Verify inline styles on loading overlay element
- [ ] Verify CSS !important flags are present
- [ ] Clear browser cache and reload (Ctrl+Shift+R or Cmd+Shift+R)
- [ ] Test in incognito/private mode to exclude cache issues
- [ ] Check that init() function exists at end of dashboard.js
- [ ] Check that supabaseReady promise triggers init()

---

## CSS Specificity Reference

**Inline styles win over:**
- External CSS files
- `<style>` blocks
- Tailwind classes
- Element classes

**Why inline styles needed here:**
```
Tailwind .hidden class: `.hidden { display: none }`  → Applied via class attribute
CSS !important in <style>: `#unified-loading-overlay { display: flex !important; }`  → Applied via selector
Inline style: `style="display: flex !important;"`  → ALWAYS WINS

When both are !important, inline wins because it's applied directly to element.
```

---

## Getting Help

If loading screen still not working:

1. **Check console logs** - what does unifiedLoading say?
2. **Inspect element** - right-click overlay → Inspect
   - Check computed styles - what's final display value?
   - Check classList - does it have 'hidden' class?
   - Check inline styles - are they applied?
3. **Test with test-loading.html** - does basic version work?
4. **Check Network** - are all modules loading?
5. **Hard refresh** - Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

---

## Files Involved

- **Dashboard:**
  - `index.html` - HTML structure + inline CSS
  - `js/pages/dashboard.js` - Calls unifiedLoading.show()
  - `js/utils/unifiedLoadingManager.js` - Core logic

- **Jakarta CV:**
  - `pages/assessment-rahma.html` - HTML structure + inline CSS
  - `js/pages/assessment-rahma-dashboard.js` - Calls unifiedLoading.show()
  - `js/utils/unifiedLoadingManager.js` - Core logic (shared)

- **Testing:**
  - `test-loading.html` - Standalone test without app logic

---

**Last Updated:** 2026-02-04
**Status:** Added comprehensive debug logging and test file
