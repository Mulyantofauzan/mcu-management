# 🚀 Production vs Development Mode

Aplikasi MCU Management mendukung 2 mode: **Production** dan **Development**.

---

## 🏭 **PRODUCTION MODE** (Default)

### **Karakteristik:**
- ✅ Pakai **Supabase** sebagai database
- ✅ **Auto-seeding DISABLED** (tidak ada data dummy)
- ✅ Data real dari user input
- ✅ Multi-user support
- ✅ Data tersimpan di cloud

### **Configuration:**

**File:** `env-config.js`

```javascript
window.ENV = {
  SUPABASE_URL: 'https://your-project.supabase.co',
  SUPABASE_ANON_KEY: 'your-anon-key',
  ENABLE_AUTO_SEED: false  // ← PRODUCTION: false
};
```

### **Behavior:**
1. Aplikasi konek ke Supabase
2. Auto-seeding **DISABLED**
3. Database kosong di awal (harus create user manual via SQL)
4. User input data via aplikasi
5. Semua data tersimpan di Supabase

### **Setup:**
1. Create Supabase project
2. Run `supabase-schema.sql` di SQL Editor
3. Run `supabase-enable-rls.sql` di SQL Editor
4. Run `supabase-add-missing-columns.sql` di SQL Editor
5. Create admin user manual via SQL:
   ```sql
   INSERT INTO users (user_id, username, password_hash, display_name, role, active)
   VALUES (
     'USR-20250101-0001',
     'admin',
     'YWRtaW4xMjM=',  -- Base64: admin123
     'Administrator',
     'Admin',
     true
   );
   ```
6. Set credentials di `env-config.js`
7. Deploy!

---

## 🧪 **DEVELOPMENT MODE**

### **Karakteristik:**
- ✅ Pakai **IndexedDB** (local browser storage)
- ✅ **Auto-seeding ENABLED** (generate 50 karyawan dummy)
- ✅ Data dummy untuk testing
- ✅ Single-user (data di browser)
- ✅ Data hilang kalau clear browser cache

### **Configuration:**

**File:** `env-config.js`

```javascript
window.ENV = {
  SUPABASE_URL: '',  // ← Kosongkan untuk development
  SUPABASE_ANON_KEY: '',
  ENABLE_AUTO_SEED: true  // ← DEVELOPMENT: true
};
```

### **Behavior:**
1. Aplikasi detect credentials kosong → Fallback ke IndexedDB
2. Auto-seeding **ENABLED**
3. Saat pertama load, auto-generate:
   - 2 users (admin/petugas)
   - 5 departments
   - 7 job titles
   - 3 vendors
   - 50 employees dummy
   - MCU records untuk employees
4. Data tersimpan di IndexedDB browser

### **Setup:**
1. Clone repository
2. Kosongkan `SUPABASE_URL` dan `SUPABASE_ANON_KEY` di `env-config.js`
3. Set `ENABLE_AUTO_SEED: true`
4. Open `index.html` di browser
5. Auto-seeding jalan otomatis
6. Login: admin/admin123

---

## 🔄 **Switching Between Modes**

### **Production → Development:**

1. Edit `env-config.js`:
   ```javascript
   SUPABASE_URL: '',  // Kosongkan
   SUPABASE_ANON_KEY: '',
   ENABLE_AUTO_SEED: true
   ```
2. Clear browser IndexedDB (F12 → Application → IndexedDB → Delete)
3. Refresh page
4. Auto-seeding jalan

### **Development → Production:**

1. Edit `env-config.js`:
   ```javascript
   SUPABASE_URL: 'https://your-project.supabase.co',
   SUPABASE_ANON_KEY: 'your-key',
   ENABLE_AUTO_SEED: false
   ```
2. Refresh page
3. Login dengan user dari Supabase

---

## ⚠️ **IMPORTANT: Production Safety**

### **Why Auto-Seeding is DISABLED in Production?**

1. **Data Contamination**
   - Auto-seeding generate 50 karyawan dummy
   - Dummy data tercampur dengan real data
   - Hard to clean up

2. **Security**
   - Dummy users dengan password default (admin123)
   - Potential security risk

3. **Professional**
   - Production app tidak boleh ada dummy data
   - Data harus dari real user input

### **How Auto-Seeding Works?**

**Check:** `js/seedData.js` line 266-274

```javascript
export async function checkAndSeedIfEmpty() {
  const enableAutoSeed = window.ENV?.ENABLE_AUTO_SEED === true;

  if (!enableAutoSeed) {
    console.log('ℹ️ Auto-seeding DISABLED (production mode)');
    return { success: true, message: 'Auto-seeding disabled' };
  }

  // Only runs if ENABLE_AUTO_SEED = true
  // ...
}
```

**Behavior:**
- `ENABLE_AUTO_SEED = false` → Function exits early, no seeding
- `ENABLE_AUTO_SEED = true` → Check if DB empty → Seed if empty

---

## 🎯 **Recommended Setup**

### **For Production Deployment (Netlify):**

```javascript
// env-config.js
window.ENV = {
  SUPABASE_URL: 'https://xqyuktsfjvdqfhulobai.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGci...',
  ENABLE_AUTO_SEED: false  // ← ALWAYS false for production!
};
```

### **For Local Development:**

```javascript
// env-config.js (local copy, don't commit!)
window.ENV = {
  SUPABASE_URL: '',  // Use IndexedDB
  SUPABASE_ANON_KEY: '',
  ENABLE_AUTO_SEED: true  // Enable dummy data
};
```

---

## 📋 **Checklist: Before Production Deploy**

- [ ] `SUPABASE_URL` dan `SUPABASE_ANON_KEY` filled
- [ ] `ENABLE_AUTO_SEED: false` ✅ **CRITICAL!**
- [ ] Supabase schema created (`supabase-schema.sql`)
- [ ] RLS policies enabled (`supabase-enable-rls.sql`)
- [ ] Missing columns added (`supabase-add-missing-columns.sql`)
- [ ] Admin user created manually
- [ ] Test login works
- [ ] No dummy data in Supabase tables

---

## 🆘 **Troubleshooting**

### **Issue: Auto-seeding jalan di production!**

**Symptom:** 50 karyawan dummy muncul di Supabase

**Cause:** `ENABLE_AUTO_SEED: true` di production

**Fix:**
1. Edit `env-config.js`: Set `ENABLE_AUTO_SEED: false`
2. Clear dummy data di Supabase:
   ```sql
   TRUNCATE TABLE employees CASCADE;
   TRUNCATE TABLE mcus CASCADE;
   TRUNCATE TABLE mcu_changes CASCADE;
   ```
3. Commit & deploy

### **Issue: Auto-seeding tidak jalan di development**

**Symptom:** Database kosong, tidak ada dummy data

**Cause:**
- `ENABLE_AUTO_SEED: false` OR
- Database sudah ada users (seeding hanya jalan kalau empty)

**Fix:**
1. Set `ENABLE_AUTO_SEED: true` di env-config.js
2. Clear IndexedDB (F12 → Application → IndexedDB → Delete)
3. Refresh page

---

## 💡 **Best Practice**

1. **Use `.gitignore`** untuk env-config.js (jangan commit credentials!)
2. **Use environment-specific configs:**
   - `env-config.production.js` (Supabase, no seeding)
   - `env-config.development.js` (IndexedDB, with seeding)
3. **Document your setup** untuk team members
4. **Test di staging environment** sebelum production deploy

---

## 🚀 **Summary**

| Mode | Database | Auto-Seed | Use Case |
|------|----------|-----------|----------|
| **Production** | Supabase | ❌ Disabled | Live deployment |
| **Development** | IndexedDB | ✅ Enabled | Local testing |

**Current setup:** ✅ **Production Mode** (auto-seed disabled, Supabase enabled)

**Safe for production deployment!** 🎉
