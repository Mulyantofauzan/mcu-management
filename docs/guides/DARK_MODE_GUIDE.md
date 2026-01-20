# Dark Mode / Light Mode Guide

Aplikasi MCU-APP sekarang mendukung **Dark Mode** untuk nyaman dipakai kapan saja, termasuk kerja malam hari!

## 🌙 Cara Menggunakan Dark Mode

### Untuk End Users

#### Toggle Theme
1. Cari tombol 🌙 di navbar (pojok kanan, di samping notifikasi)
2. Klik tombol untuk switch antara mode:
   - **Light Mode** (☀️) - Interface putih, untuk siang hari
   - **Dark Mode** (🌙) - Interface gelap, untuk malam hari
   - **System Mode** (🖥️) - Ikuti pengaturan OS Anda

#### Preference Tersimpan
- Pilihan tema **otomatis disimpan** di browser
- Ketika login lagi, aplikasi akan menggunakan tema yang Anda pilih sebelumnya
- Setiap perangkat punya preferensi sendiri (tidak sync antar device)

#### Manual Checking
Buka browser console (F12) dan jalankan:
```javascript
window.themeManager.getThemeStatus()
```

Contoh output:
```javascript
{
  preference: "dark",           // 'light', 'dark', atau 'system'
  activeTheme: "dark",          // Tema yang sedang aktif
  isDark: true,                 // Apakah sedang dark mode?
  isLight: false,
  isSystem: false,
  systemTheme: "dark"           // Preferensi OS Anda
}
```

### Untuk Developers

#### Architecture

**themeManager.js** - Core logic:
```javascript
// File location: mcu-management/js/utils/themeManager.js

Key functions:
- initThemeManager()     - Initialize saat app start
- toggleTheme()          - Cycle through themes
- setTheme(theme)        - Set theme explicitly
- getThemeStatus()       - Get current theme info
- getActiveTheme()       - Get active theme (resolved)
- getStoredTheme()       - Get stored preference
- getSystemTheme()       - Get system preference
```

**Tailwind Config** - Dark mode enabled:
```javascript
// File: tailwind.config.js
darkMode: 'class',  // Use 'class' strategy
```

Ini berarti Tailwind akan menambahkan dark mode variant ketika ada `dark` class di HTML element.

**HTML & CSS**:
```html
<!-- Navbar button example -->
<button onclick="window.themeManager.toggleTheme()">
  <span class="text-gray-600 dark:text-gray-400">🌙</span>
  <span class="dark:hidden">Light</span>
  <span class="hidden dark:block">Dark</span>
</button>
```

Gunakan `dark:` prefix untuk styling di dark mode:
```html
<!-- Example -->
<div class="bg-white dark:bg-gray-900">
  <p class="text-gray-900 dark:text-gray-100">Text</p>
</div>
```

#### Storage

Theme preference disimpan di **localStorage**:
- Key: `madis_theme_preference`
- Values: `'light'`, `'dark'`, atau `'system'`

```javascript
// Check stored preference
localStorage.getItem('madis_theme_preference')

// Manually set preference
localStorage.setItem('madis_theme_preference', 'dark')
```

#### System Detection

Aplikasi menggunakan `prefers-color-scheme` media query untuk detect preferensi sistem:

```javascript
// Check system preference
window.matchMedia('(prefers-color-scheme: dark)').matches  // true if dark

// Listen to system changes
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
  console.log('System preference changed to:', e.matches ? 'dark' : 'light')
})
```

#### Adding Dark Mode Styling

Ketika menambah component baru, pastikan add dark mode styling:

```html
<!-- ❌ WRONG - No dark mode -->
<div class="bg-white text-gray-900">Content</div>

<!-- ✅ CORRECT - With dark mode -->
<div class="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">Content</div>
```

**Common Tailwind dark mode prefixes:**
- `dark:bg-*` - Background color
- `dark:text-*` - Text color
- `dark:border-*` - Border color
- `dark:hover:bg-*` - Hover state
- `dark:shadow-*` - Shadow effect

#### Color Scheme Recommendations

**Light Mode** - Default background: White (#ffffff)
- Text: Gray-900 (#111827)
- Borders: Gray-200 (#e5e7eb)
- Hover: Gray-100 (#f3f4f6)

**Dark Mode** - Dark background: Gray-900 (#111827)
- Text: Gray-100 (#f3f4f6)
- Borders: Gray-800 (#1f2937)
- Hover: Gray-800 (#1f2937)

#### Browser Meta Tag

App automatically updates `meta[name="theme-color"]` untuk mobile browser UI:
- Light mode: White (#ffffff)
- Dark mode: Dark gray (#1f2937)

Ini akan membuat browser address bar cocok dengan app theme.

## 🎨 How It Works Under The Hood

1. **Initialization** (`initThemeManager()` dipanggil saat app start)
   - Read stored preference dari localStorage
   - Jika `system`, detect OS preference
   - Add `dark` class ke `<html>` jika dark theme active

2. **Toggling Theme** (User klik tombol)
   - Save preference ke localStorage
   - Add/remove `dark` class dari `<html>`
   - Tailwind automatically update styling via CSS

3. **System Detection**
   - Listen untuk `prefers-color-scheme` changes
   - Update automatically jika user set ke `system` mode
   - Dispatch custom `themechange` event untuk other parts of app

4. **Persistence**
   - Stored di localStorage (client-side only)
   - No server/database involved
   - Fast, offline-capable

## 🐛 Troubleshooting

### Dark mode tidak bekerja?
1. Check: `window.themeManager.getThemeStatus()`
2. Pastikan `darkMode: 'class'` ada di `tailwind.config.js`
3. Clear browser cache dan hard refresh (Ctrl+Shift+R)

### Styling tidak konsisten?
1. Pastikan semua components punya `dark:` variant styling
2. Check media query dengan DevTools: Toggle device emulation to dark OS theme
3. Remember: Tailwind `dark:` prefix hanya work jika `darkMode: 'class'` di config

### Users lain tidak bisa lihat dark mode?
1. Theme preference disimpan locally - setiap device beda
2. User di komputer lain perlu set dark mode sendiri
3. Bukan sync across devices (by design - privacy, no server needed)

## 📱 Mobile Support

Dark mode **fully responsive**:
- Icon text hidden pada small screens (hanya icon terlihat)
- Meta theme-color update untuk mobile browser UI
- Smooth transitions on all devices

Test dengan emulasi mobile di DevTools (F12 → Responsive Design Mode)

## 🚀 Future Enhancements

Possible improvements:
1. **User profile preference** - Save ke database (sync across devices)
2. **Auto dark mode on schedule** - Dark mode at night, light at day
3. **Theme customization** - User bisa pilih warna custom
4. **Keyboard shortcut** - Alt+T untuk toggle theme
5. **Print mode** - Always light for printing

## 📋 Implementation Checklist

Ketika update aplikasi, pastikan:
- ✅ All new components punya `dark:` styling
- ✅ Colors contrast cukup di dark mode (WCAG AA)
- ✅ Test dengan actual dark OS theme (tidak emulation)
- ✅ Check images/icons readable di dark background
- ✅ Test di berbagai browser (Chrome, Firefox, Safari)
- ✅ Mobile dark mode tested

---

**Last Updated**: 2025-11-28
**Status**: ✅ Fully Implemented & Tested
