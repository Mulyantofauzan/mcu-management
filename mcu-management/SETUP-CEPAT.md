# 🚀 Setup Cepat - Login Fix

Fix untuk error **"Cannot access 'db' before initialization"** sudah di-push ke GitHub!

---

## ✅ Step 1: Tunggu Netlify Deploy Selesai

1. Buka **Netlify Dashboard**: https://app.netlify.com/
2. Pilih site Anda: **mcu-management**
3. Lihat status deploy (biasanya 1-2 menit)
4. Tunggu sampai status: **✅ Published**

---

## 🔧 Step 2: Setup Environment Variables di Netlify

### 2.1. Dapatkan Supabase Credentials

1. Buka **Supabase Dashboard**: https://app.supabase.com/
2. Pilih project Anda
3. Klik **Settings** (ikon gear di sidebar kiri)
4. Klik **API**
5. Copy 2 values ini:
   - **Project URL** (contoh: `https://gbbpzbpfzzsmghciulse.supabase.co`)
   - **anon public** key (key panjang yang mulai dengan `eyJ...`)

### 2.2. Set di Netlify

1. Di **Netlify Dashboard**, buka site Anda
2. Klik **Site settings**
3. Di sidebar kiri, klik **Environment variables**
4. Klik **Add a variable** → **Add a single variable**
5. Tambahkan 2 variables:

**Variable 1:**
- **Key**: `SUPABASE_URL`
- **Value**: Paste **Project URL** dari Supabase
- **Scopes**: Pilih semua (Production, Deploy previews, Branch deploys)
- Klik **Create variable**

**Variable 2:**
- **Key**: `SUPABASE_ANON_KEY`
- **Value**: Paste **anon public** key dari Supabase
- **Scopes**: Pilih semua
- Klik **Create variable**

### 2.3. Trigger Redeploy

1. Kembali ke **Deploys** tab
2. Klik **Trigger deploy** (dropdown)
3. Pilih **Clear cache and deploy site**
4. Tunggu 1-2 menit sampai deploy selesai

---

## 🗄️ Step 3: Setup Supabase RLS Policies

### 3.1. Jalankan SQL

1. Buka **Supabase Dashboard**
2. Klik **SQL Editor** di sidebar kiri
3. Klik **New query**
4. Copy-paste isi file **`supabase-enable-rls-with-policies.sql`** (yang sudah Anda select tadi)
5. Klik **Run** (atau Ctrl/Cmd + Enter)
6. Tunggu sampai muncul "Success. No rows returned"

### 3.2. Verify Policies

1. Klik **Authentication** → **Policies**
2. Pilih table `users`
3. Harus ada 4 policies:
   - Public read access
   - Public insert access
   - Public update access
   - Public delete access
4. Verify untuk table lain juga (employees, mcus, dll)

---

## 🧪 Step 4: Test Login

1. Buka URL Netlify Anda (contoh: `https://mcu-management.netlify.app`)
2. Akan redirect ke login page
3. Buka **Developer Console** (F12 atau Cmd+Option+I)
4. Di tab **Console**, harus muncul:
   ```
   ✅ Supabase client initialized
   🚀 Using Supabase as primary database
   Database initialized successfully
   ```

5. **Login** dengan:
   - **Username**: `admin`
   - **Password**: `admin123`

6. Jika berhasil, akan redirect ke **Dashboard**

---

## ❌ Jika Masih Error

### Error: "Supabase credentials not found"

**Cek di Console:**
```javascript
console.log(window.ENV);
```

Harus muncul:
```
{
  SUPABASE_URL: "https://gbbpzbpfzzsmghciulse.supabase.co",
  SUPABASE_ANON_KEY: "eyJ..."
}
```

**Jika masih kosong `{}`:**
- Environment variables belum ter-inject
- Redeploy lagi di Netlify
- Clear browser cache (Ctrl+Shift+R atau Cmd+Shift+R)

### Error: "new row violates row-level security policy"

**Berarti RLS policies belum di-run.**

**Fix:**
1. Buka Supabase SQL Editor
2. Jalankan SQL dari file `supabase-enable-rls-with-policies.sql`

### Error: "Failed to load resource: 401"

**Berarti Supabase ANON_KEY salah atau expired.**

**Fix:**
1. Cek lagi ANON_KEY di Supabase Dashboard → Settings → API
2. Copy ulang **anon public** key (bukan service_role!)
3. Update di Netlify environment variables
4. Redeploy

---

## 📋 Checklist

Ikuti urutan ini:

- [ ] **Step 1**: Tunggu Netlify deploy selesai (cek status di Netlify Dashboard)
- [ ] **Step 2.1**: Copy Supabase credentials (Project URL + anon public key)
- [ ] **Step 2.2**: Set environment variables di Netlify
- [ ] **Step 2.3**: Trigger redeploy (Clear cache and deploy site)
- [ ] **Step 3.1**: Jalankan SQL `supabase-enable-rls-with-policies.sql` di Supabase SQL Editor
- [ ] **Step 3.2**: Verify policies ada di Supabase → Authentication → Policies
- [ ] **Step 4**: Test login di Netlify URL
- [ ] **Verify**: Cek console harus muncul "✅ Supabase client initialized"

---

## 🎯 Expected Result

Setelah semua step selesai:

1. ✅ Login form berfungsi
2. ✅ Supabase terdeteksi (console log "Using Supabase")
3. ✅ Tidak ada error "Cannot access 'db' before initialization"
4. ✅ Tidak ada error RLS 401
5. ✅ Dashboard muncul setelah login
6. ✅ Data tersimpan di Supabase (bukan IndexedDB)

---

## 💡 Testing di Local (Opsional)

Jika mau test di `localhost` tanpa deploy:

```javascript
// Buka browser console di localhost
// Set credentials sementara:
localStorage.setItem('DEV_SUPABASE_URL', 'https://gbbpzbpfzzsmghciulse.supabase.co');
localStorage.setItem('DEV_SUPABASE_ANON_KEY', 'eyJ...');  // Paste anon key

// Reload page
location.reload();
```

⚠️ **PENTING**: Jangan commit credentials ke Git! Ini hanya untuk testing local saja.

---

## 🆘 Masih Ada Masalah?

Screenshot error di console dan kirim ke saya. Pastikan include:
1. Full error message
2. Output dari `console.log(window.ENV)`
3. URL Netlify Anda
