# Firebase Login & Deployment Guide

## Status Saat Ini

✅ Firebase CLI sudah terinstall (versi 14.24.0)
✅ Firebase project sudah dikonfigurasi (mcu-management)
⏳ Firebase login belum dilakukan

---

## Step 1: Login ke Firebase

### Opsi A: Login Interaktif (Recommended)

Jalankan perintah ini di terminal lokal Anda:

```bash
cd /Users/mulyanto/Desktop/MCU-APP
npx firebase login
```

Ini akan membuka browser Firefox/Chrome untuk:
1. Meminta akses ke Google Account Anda
2. Meminta izin untuk Firebase
3. Menghasilkan token yang disimpan lokal

Setelah login berhasil, lanjut ke Step 2.

### Opsi B: Login dengan Token (Jika sudah punya)

Jika Anda sudah memiliki Firebase token:

```bash
npx firebase login:use --token YOUR_FIREBASE_TOKEN
```

---

## Step 2: Verifikasi Login

Setelah login, verifikasi dengan:

```bash
npx firebase projects:list
```

Anda harus melihat:
```
Available projects:
  - record-mcu
```

**Note:** Project ID adalah `record-mcu` (bukan `mcu-management`)

---

## Step 3: Deploy Cloud Function

Jalankan deployment:

```bash
cd /Users/mulyanto/Desktop/MCU-APP
npx firebase deploy --only functions:uploadToGoogleDrive
```

Proses deployment akan:
1. Memvalidasi Cloud Function code
2. Mengirim ke Firebase
3. Menjalankan di Google Cloud
4. Memberikan output dengan URL fungsi

### Expected Output:

```
=== Deploying to 'mcu-management'...

i  deploying functions
i  functions: uploading file storage...
i  functions: uploading functions code
i  functions: uploading functions code
✔  functions[uploadToGoogleDrive(us-central1)]: Successful create operation.
✔  Deploy complete!

Function URL (uploadToGoogleDrive):
https://us-central1-mcu-management.cloudfunctions.net/uploadToGoogleDrive
```

---

## Step 4: Copy Function URL

Dari output di atas, copy URL:
```
https://us-central1-mcu-management.cloudfunctions.net/uploadToGoogleDrive
```

---

## Step 5: Update Environment Variables

Update file: `/Users/mulyanto/Desktop/MCU-APP/mcu-management/.env.local`

```env
VITE_GOOGLE_DRIVE_ROOT_FOLDER_ID=1XJ2utC4aWHUdhdqerfRr96E3SSILmntH
VITE_GOOGLE_DRIVE_UPLOAD_ENDPOINT=https://us-central1-mcu-management.cloudfunctions.net/uploadToGoogleDrive
```

Ganti URL dengan yang dari Step 4.

---

## Step 6: Set Cloud Function Environment Variables

Cloud Function perlu 4 environment variables:

1. **GOOGLE_CREDENTIALS** - JSON dari credentials
2. **GOOGLE_DRIVE_ROOT_FOLDER_ID** - Folder ID
3. **SUPABASE_URL** - Supabase project URL
4. **SUPABASE_SERVICE_ROLE_KEY** - Service role key

### Cara Set via Firebase Console:

1. Go to: https://console.firebase.google.com/
2. Select project: **record-mcu**
3. Go to: **Functions** (sidebar)
4. Click on function: **uploadToGoogleDrive**
5. Go to **Runtime settings** tab
6. Scroll down ke **Runtime environment variables**
7. Add variables:

```
GOOGLE_CREDENTIALS = (paste JSON from /credentials/google-credentials.json)
GOOGLE_DRIVE_ROOT_FOLDER_ID = 1XJ2utC4aWHUdhdqerfRr96E3SSILmntH
SUPABASE_URL = https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY = your-service-role-key
```

8. Click **Deploy** or **Redeploy**

### Cara Set via gcloud CLI (Alternative):

```bash
gcloud functions deploy uploadToGoogleDrive \
  --runtime nodejs18 \
  --trigger-http \
  --project=record-mcu \
  --set-env-vars \
  GOOGLE_CREDENTIALS="$(cat /Users/mulyanto/Desktop/MCU-APP/credentials/google-credentials.json | jq -c .)" \
  GOOGLE_DRIVE_ROOT_FOLDER_ID=1XJ2utC4aWHUdhdqerfRr96E3SSILmntH \
  SUPABASE_URL=https://your-project.supabase.co \
  SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

---

## Step 7: Create Supabase Table

1. Go to: https://app.supabase.com/
2. Select your MCU project
3. Go to **SQL Editor**
4. Create new query
5. Copy & paste SQL dari: `/Users/mulyanto/Desktop/MCU-APP/docs/SUPABASE_SETUP.md`
6. Execute

---

## Step 8: Test Upload

1. Open browser: http://localhost:5173 (or your app URL)
2. Go to "Tambah Karyawan" page
3. Add employee or search existing
4. Click "+ Tambah MCU"
5. Drag & drop a PDF or image
6. Click submit
7. Verify file appears in Google Drive & Supabase

---

## Troubleshooting

### Error: "Failed to authenticate, have you run firebase login?"

**Solution:** Run `npx firebase login`

### Error: "Permission denied" saat deploy

**Solution:**
- Pastikan Anda memiliki akses ke Firebase project "mcu-management"
- Pastikan akun Google memiliki editor role di project
- Coba login ulang: `npx firebase login --reauth`

### Error: "Function deployment failed"

**Solusi:**
1. Cek apakah ada error di console
2. Verifikasi file `functions/uploadToGoogleDrive.js` syntax
3. Cek apakah dependencies di `functions/package.json` valid
4. Lihat logs: `npx firebase functions:log`

### Error: "GOOGLE_CREDENTIALS not set"

**Solution:**
- Set environment variable di Firebase Console
- Atau deploy dengan flag `--set-env-vars` (lihat Step 6)

### Error: "Permission denied: Google Drive"

**Solution:**
- Pastikan Service Account punya akses ke folder
- Bagikan folder dengan email: `mcu-file-upload@mcu-management.iam.gserviceaccount.com`

---

## File Credentials

**Lokasi:** `/Users/mulyanto/Desktop/MCU-APP/credentials/google-credentials.json`

**Format:**
```json
{
  "type": "service_account",
  "project_id": "mcu-management",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----...",
  "client_email": "mcu-file-upload@mcu-management.iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "..."
}
```

---

## Monitoring Deployment

### View Real-time Logs:
```bash
npx firebase functions:log
```

### View Last 50 Logs:
```bash
npx firebase functions:log --limit 50
```

### Filter by Function:
```bash
npx firebase functions:log | grep uploadToGoogleDrive
```

---

## Commands Reference

| Command | Purpose |
|---------|---------|
| `npx firebase login` | Login to Firebase |
| `npx firebase projects:list` | List Firebase projects |
| `npx firebase deploy` | Deploy everything |
| `npx firebase deploy --only functions:uploadToGoogleDrive` | Deploy only Cloud Function |
| `npx firebase functions:log` | View function logs |
| `npx firebase functions:delete uploadToGoogleDrive` | Delete function |

---

## Checklist Sebelum Deploy

- [ ] Sudah run `npx firebase login`
- [ ] Sudah verifikasi project dengan `npx firebase projects:list`
- [ ] Sudah copy `.firebaserc` (sudah ada: ✅)
- [ ] Sudah update `.env.local` dengan deployment URL
- [ ] Sudah set environment variables di Firebase Console
- [ ] Sudah create Supabase table
- [ ] Sudah share Google Drive folder dengan Service Account

---

## Setelah Deployment

### Langkah Selanjutnya:

1. ✅ Deploy Cloud Function (sekarang)
2. ✅ Update .env.local dengan production URL
3. ✅ Create Supabase table
4. ⏳ Test file upload end-to-end
5. ⏳ Monitor logs untuk errors
6. ⏳ Verify files di Google Drive
7. ⏳ Verify metadata di Supabase

---

**Generated:** November 8, 2025
**Status:** Ready for deployment - tunggu Firebase login dari user
