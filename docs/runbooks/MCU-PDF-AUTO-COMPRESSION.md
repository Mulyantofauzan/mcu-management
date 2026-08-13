# MCU PDF Auto-Compression Runbook

## Purpose

MADIS prepares MCU PDFs locally, stores at most 5 MB per PDF, and uploads the prepared bytes directly to the private `CLOUDFLARE_R2_BUCKET_NAME` bucket. The Vercel function only creates a five-minute upload URL and verifies the result.

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
5. Upload a synthetic PDF under 3 MB.
6. Upload a synthetic scan PDF over 3 MB and confirm the stored size is at most 5 MB.
7. Confirm download still uses `/api/download-file` and a temporary signed URL.

## Failure Checks

- `PDF Terlalu Besar`: source exceeds 25 MB.
- `Hasil Masih Terlalu Besar`: the 120 DPI/0.60 fallback remains over 5 MB.
- Browser reports `Load failed`: verify R2 CORS and the `mcu-files...r2.cloudflarestorage.com` CSP origin.
- Confirmation fails: inspect object metadata and ensure `Content-Type` is `application/pdf`; do not log the signed URL or document bytes.
- Repeated pending objects: verify the lifecycle prefix exactly matches `pending/mcu-uploads/`.
