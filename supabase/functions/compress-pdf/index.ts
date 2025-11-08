/**
 * Supabase Edge Function - Compress PDF Files
 *
 * Triggered when files are uploaded to 'mcu-documents' storage bucket
 * Automatically compresses PDF files with gzip (50-70% reduction)
 *
 * Setup:
 * 1. Deploy this function: supabase functions deploy compress-pdf
 * 2. Create storage webhook in Supabase Dashboard:
 *    - Event: object.created
 *    - Bucket: mcu-documents
 *    - Function: compress-pdf
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';
import { compress } from 'https://deno.land/x/compress@v0.4.8/mod.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Only compress PDF files
const COMPRESSIBLE_TYPES = ['application/pdf'];
const COMPRESSION_SIZE_LIMIT = 50 * 1024 * 1024; // 50MB limit (larger files skip compression)

Deno.serve(async (req) => {
  try {
    const { record } = await req.json();

    if (!record) {
      return new Response(JSON.stringify({ error: 'No record provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { name, metadata } = record;
    const bucket = 'mcu-documents';

    console.log(`[Compress PDF] Processing: ${name}`);

    // Only compress PDFs
    if (!COMPRESSIBLE_TYPES.includes(metadata?.mimetype)) {
      console.log(`[Compress PDF] Skipping non-PDF: ${name}`);
      return new Response(JSON.stringify({ message: 'Not a PDF file, skipping compression' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Download file from storage
    const { data, error: downloadError } = await supabase.storage
      .from(bucket)
      .download(name);

    if (downloadError) {
      console.error(`[Compress PDF] Download failed: ${name}`, downloadError);
      throw downloadError;
    }

    // Check file size
    const fileSize = data.size;
    if (fileSize > COMPRESSION_SIZE_LIMIT) {
      console.log(
        `[Compress PDF] File too large (${(fileSize / 1024 / 1024).toFixed(1)}MB > 50MB), skipping compression`
      );
      return new Response(
        JSON.stringify({
          message: 'File too large, compression skipped',
          size: fileSize,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Compress with gzip
    const buffer = await data.arrayBuffer();
    const compressed = await compress(new Uint8Array(buffer), { type: 'gzip' });

    const originalSize = buffer.byteLength;
    const compressedSize = compressed.length;
    const ratio = ((1 - compressedSize / originalSize) * 100).toFixed(1);

    console.log(
      `[Compress PDF] Compressed: ${(originalSize / 1024).toFixed(1)}KB → ${(compressedSize / 1024).toFixed(1)}KB (${ratio}% reduction)`
    );

    // Replace file with compressed version
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(name, compressed, {
        contentType: 'application/gzip',
        upsert: true,
      });

    if (uploadError) {
      console.error(`[Compress PDF] Upload failed: ${name}`, uploadError);
      throw uploadError;
    }

    console.log(`[Compress PDF] Successfully compressed: ${name}`);

    return new Response(
      JSON.stringify({
        success: true,
        file: name,
        originalSize,
        compressedSize,
        reduction: `${ratio}%`,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[Compress PDF] Error:', error);

    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
