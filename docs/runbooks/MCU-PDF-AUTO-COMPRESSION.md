# MCU PDF Auto-Compression Runbook

## Purpose

MADIS accepts non-empty `.pdf` files regardless of browser MIME or scanner-specific bytes. Files up to 5 MB upload unchanged. Larger files are compressed toward 5 MB; when compression fails, the original is accepted only when it remains below 10 MB. Uploads go directly to the private `CLOUDFLARE_R2_BUCKET_NAME` bucket. The Vercel function only creates a five-minute upload URL and verifies metadata.

## Required R2 CORS

Configure the MCU bucket with this policy before deploying the browser upload flow:

```json
[
  {
    "AllowedOrigins": [
      "https://madis.sabdamu.my.id"
    ],
    "AllowedMethods": [
      "PUT"
    ],
    "AllowedHeaders": [
      "Content-Type"
    ],
    "ExposeHeaders": [
      "ETag"
    ],
    "MaxAgeSeconds": 3600
  }
]
```

Add an exact localhost origin temporarily when testing locally. Do not use `*` for production origins.

## Pending Upload Lifecycle

Create an object-expiration lifecycle rule on the MCU bucket:

- Prefix: `pending/mcu-uploads/`
- Expiration: one day after object creation

The API deletes pending objects immediately after confirmation or validation failure. The lifecycle rule is the fallback for interrupted browser sessions.

## Deployment Order

1. Confirm the MCU bucket has public access disabled.
2. Apply CORS and the pending-prefix lifecycle rule.
3. Verify the Vercel project has the existing `CLOUDFLARE_R2_*` variables.
4. Deploy the API and static client together.
5. Upload a synthetic PDF under 5 MB with an empty or generic browser MIME.
6. Upload a synthetic scan PDF over 5 MB and confirm compression targets 5 MB.
7. Force compression failure for a PDF below 10 MB and confirm the original uploads.
8. Confirm a 10 MB PDF is rejected when compression fails.
9. Confirm download still uses `/api/download-file` and a temporary signed URL.

## Failure Checks

- `PDF Terlalu Besar`: source exceeds 25 MB.
- `Hasil Masih Terlalu Besar`: a PDF of 10 MB or more cannot be compressed to the 5 MB target.
- Browser reports `Load failed`: verify R2 CORS and the `mcu-files...r2.cloudflarestorage.com` CSP origin.
- Confirmation fails: inspect object metadata and ensure `Content-Type` is `application/pdf`; do not log the signed URL or document bytes.
- Repeated pending objects: verify the lifecycle prefix exactly matches `pending/mcu-uploads/`.
