# 🔑 Setup Supabase Credentials - QUICK FIX

Environment variables di Netlify tidak bekerja dengan baik. Untuk sementara, kita akan **hardcode credentials langsung di file**.

⚠️ **CATATAN:** Ini bukan cara paling aman, tapi paling cepat untuk testing. Kita akan fix nanti dengan environment variables yang benar.

---

## 📋 Step-by-Step Instructions

### **Step 1: Dapatkan Supabase Credentials**

1. Buka **Supabase Dashboard**: https://app.supabase.com/
2. Login dan pilih project Anda
3. Klik **Settings** (ikon ⚙️ di sidebar kiri bawah)
4. Klik **API**
5. Copy **2 values** ini:

   **A. Project URL**
   ```
   Example: https://gbbpzbpfzzsmghciulse.supabase.co
   ```

   **B. anon public key** (key panjang di bawah "Project API keys" → "anon public")
   ```
   Example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6...
   ```

   ⚠️ **JANGAN COPY SERVICE_ROLE KEY!** Hanya copy **anon public** key saja.

---

### **Step 2: Edit env-config.js di GitHub**

#### **Option A: Edit Langsung di GitHub (Paling Mudah)**

1. Buka repository Anda di GitHub:
   ```
   https://github.com/Mulyantofauzan/mcu-management
   ```

2. Klik file **`env-config.js`**

3. Klik tombol **pencil (✏️)** di kanan atas untuk edit

4. **Replace line 16-17:**

   **SEBELUM:**
   ```javascript
   window.ENV = {
     SUPABASE_URL: 'YOUR_SUPABASE_URL',
     SUPABASE_ANON_KEY: 'YOUR_SUPABASE_ANON_KEY'
   };
   ```

   **SESUDAH:** (paste credentials Anda)
   ```javascript
   window.ENV = {
     SUPABASE_URL: 'https://gbbpzbpfzzsmghciulse.supabase.co',  // ← Paste Project URL di sini
     SUPABASE_ANON_KEY: 'eyJhbGciOiJI...'  // ← Paste anon public key di sini
   };
   ```

5. Scroll ke bawah, klik **"Commit changes"**

6. Di popup, klik **"Commit changes"** lagi

7. **Done!** Netlify akan auto-deploy dalam 1-2 menit

---

#### **Option B: Edit di Local (Jika Sudah Clone Repo)**

1. Buka file `env-config.js` di editor Anda

2. Replace line 16-17 dengan credentials Anda:
   ```javascript
   window.ENV = {
     SUPABASE_URL: 'https://gbbpzbpfzzsmghciulse.supabase.co',
     SUPABASE_ANON_KEY: 'eyJhbGciOiJI...'
   };
   ```

3. Save file

4. Commit dan push:
   ```bash
   git add env-config.js
   git commit -m "Add Supabase credentials to env-config.js"
   git push origin main
   ```

5. **Done!** Netlify akan auto-deploy

---

### **Step 3: Wait for Netlify Deploy**

1. Buka **Netlify Dashboard**: https://app.netlify.com/
2. Pilih site **mcu-management**
3. Tunggu deploy selesai (~1-2 menit)
4. Status harus: **✅ Published**

---

### **Step 4: Test!**

1. **Buka URL Netlify** Anda
2. **Hard refresh**: Cmd+Shift+R atau Ctrl+Shift+R
3. **Buka Console** (F12)
4. **Harus muncul:**
   ```
   📦 env-config.js loaded
   ✅ Supabase credentials configured
   ✅ Supabase client initialized
   🚀 Using Supabase as primary database
   ```

5. **Test manual:**
   ```javascript
   console.log(window.ENV);
   // Harus muncul:
   {
     SUPABASE_URL: "https://gbbpzbpfzzsmghciulse.supabase.co",
     SUPABASE_ANON_KEY: "eyJhbGci..."
   }
   ```

6. **Login**: admin / admin123
7. **Harus berhasil!** 🎉

---

## ⚠️ IMPORTANT NOTES

### **Apakah Ini Aman?**

**Untuk testing: Ya, cukup aman.**
- `anon public` key memang **dirancang untuk public**
- Key ini akan terlihat di browser users (network tab) anyway
- Supabase menggunakan Row Level Security (RLS) untuk proteksi data

**Untuk production: Perlu improvement.**
- Nanti kita akan setup environment variables dengan benar
- Atau gunakan Netlify Functions untuk proxy requests

### **Credentials Saya Aman?**

✅ **anon public key** = AMAN untuk di-commit ke GitHub
- Key ini public dan meant to be shared
- RLS policies melindungi data Anda

❌ **service_role key** = JANGAN PERNAH di-commit!
- Key ini punya full access ke database
- Jika ter-commit, REGENERATE IMMEDIATELY!

---

## 🐛 Troubleshooting

### Error: "Supabase credentials not found"
**Problem:** env-config.js belum di-edit atau masih `YOUR_SUPABASE_URL`
**Solution:** Edit file seperti Step 2 di atas

### Error: "Invalid API key"
**Problem:** Copy key yang salah (service_role instead of anon public)
**Solution:** Copy ulang **anon public** key dari Supabase Dashboard → Settings → API

### Masih pakai IndexedDB
**Problem:** Browser cache belum clear
**Solution:**
1. Hard refresh (Cmd+Shift+R)
2. Clear cache (Cmd+Shift+Delete → All time)
3. Test di Incognito/Private window

### Deploy Netlify stuck
**Problem:** Build script inject-env.sh masih jalan
**Solution:**
1. Edit `netlify.toml`
2. Change build command to empty: `command = ""`
3. Commit dan push

---

## 🎯 Summary

1. ✅ Copy **Project URL** dan **anon public key** dari Supabase
2. ✅ Edit **env-config.js** di GitHub (line 16-17)
3. ✅ Commit changes → Wait Netlify deploy
4. ✅ Hard refresh → Test login

**EZ! 🚀**

---

## 📞 Need Help?

Kalau masih stuck:
1. Screenshot console log (F12)
2. Screenshot output `console.log(window.ENV)`
3. Kirim ke saya

Kita akan debug bareng! 💪
