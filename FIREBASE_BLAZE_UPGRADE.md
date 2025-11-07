# Firebase Blaze Plan Upgrade Required

## ⚠️ Status

Firebase project **`record-mcu`** perlu diupgrade ke **Blaze (pay-as-you-go)** plan untuk mendeploy Cloud Functions.

---

## 🔴 Error Message

```
Error: Your project record-mcu must be on the Blaze (pay-as-you-go) plan
to complete this command. Required API cloudbuild.googleapis.com can't
be enabled until the upgrade is complete.
```

---

## ✅ Solusi: Upgrade ke Blaze Plan

### Step 1: Buka Firebase Console

Klik link ini atau buka secara manual:

```
https://console.firebase.google.com/project/record-mcu/usage/details
```

### Step 2: Upgrade Plan

1. Di Firebase Console, klik tab **Usage and billing** (atau "Upgrade" button)
2. Pilih **Blaze** plan (pay-as-you-go)
3. Masukkan informasi kartu kredit Google Cloud
4. Konfirmasi upgrade
5. Tunggu hingga upgrade selesai (biasanya instant)

### Step 3: Verifikasi APIs Enabled

Setelah upgrade, APIs berikut harus enabled:
- ✅ Cloud Functions API
- ✅ Cloud Build API
- ✅ Artifact Registry API

Biasanya akan auto-enabled ketika Anda deploy.

---

## 💰 Pricing Info

### Firebase Blaze (Pay-as-you-go)

**Cloud Functions:**
- 2 juta invocations/bulan → FREE
- Setiap invocation setelah itu: $0.40 per juta
- Compute time: $0.000002417 per CPU-second

**Estimate untuk app ini:**
- Upload files: ~100 invocations/hari = 3,000/bulan
- **Cost:** FREE (dalam free tier 2 juta invocations)

**Google Drive API:**
- FREE (quota-based, tidak merekam ulang)

**Supabase:**
- Database operations: relatif murah (per request)

**Bottom line:** Cost akan minimal (hampir FREE) untuk volume normal.

---

## 🚀 Setelah Upgrade

Setelah upgrade ke Blaze, jalankan deployment lagi:

```bash
npx firebase deploy --only functions:uploadToGoogleDrive
```

Deployment seharusnya berhasil dan memberikan output:

```
Function URL (uploadToGoogleDrive):
https://us-central1-record-mcu.cloudfunctions.net/uploadToGoogleDrive
```

---

## 📋 Checklist

- [ ] Buka Firebase Console
- [ ] Navigate ke Usage and Billing
- [ ] Klik Upgrade ke Blaze
- [ ] Masukkan kartu kredit
- [ ] Konfirmasi upgrade
- [ ] Tunggu hingga selesai
- [ ] Verify di console bahwa APIs enabled
- [ ] Jalankan deployment ulang

---

## ⚡ Important Notes

1. **Blaze adalah free untuk sebagian besar use cases** - Anda hanya bayar jika exceed free tier
2. **Spark plan tidak bisa deploy Cloud Functions** - Ini adalah limitation Google Firebase
3. **Alternative:** Gunakan serverless platform lain (Vercel, Netlify) - tapi akan butuh refactor
4. **Recommended:** Upgrade ke Blaze (cost akan minimal untuk app ini)

---

## 🔄 Next Steps

1. Upgrade Firebase project ke Blaze plan
2. Run deployment command ulang:
   ```bash
   npx firebase deploy --only functions:uploadToGoogleDrive
   ```
3. Copy function URL ke `.env.local`
4. Continue dengan sisa setup

---

**Firebase Project:** record-mcu
**Current Plan:** Spark (free)
**Required Plan:** Blaze (pay-as-you-go)
**Cost for this app:** Minimal (FREE tier covers it)

Ready untuk upgrade? 🚀
