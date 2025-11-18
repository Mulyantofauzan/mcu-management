/**
 * Storage Diagnostic Utility
 *
 * Run diagnostic tests to identify file upload issues.
 * Copy and paste diagnostic functions into browser console to test.
 */

/**
 * Test 1: Check if Supabase is properly initialized
 */
export async function testSupabaseConnection() {
    console.group('🔍 Test 1: Supabase Connection');

    if (!window._supabaseClient) {
        console.groupEnd();
        return false;
    }

    const supabase = window._supabaseClient;

    try {
        // Check if we can get user
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError) {
            console.groupEnd();
            return false;
        }

        if (!user) {
            console.groupEnd();
            return false;
        }
        console.groupEnd();
        return true;
    } catch (error) {
        console.groupEnd();
        return false;
    }
}

/**
 * Test 2: Check bucket existence and access
 */
export async function testBucketAccess() {
    console.group('🔍 Test 2: Bucket Access');

    if (!window._supabaseClient) {
        console.groupEnd();
        return false;
    }

    const supabase = window._supabaseClient;
    const bucketName = 'mcu-documents';

    try {
        // List buckets to verify access
        const { data: buckets, error: listError } = await supabase.storage.listBuckets();

        if (listError) {
            console.groupEnd();
            return false;
        }

        const bucket = buckets.find(b => b.name === bucketName);

        if (!bucket) {
            console.log('   Available buckets:', buckets.map(b => b.name));
            console.groupEnd();
            return false;
        }
        console.groupEnd();
        return true;
    } catch (error) {
        console.groupEnd();
        return false;
    }
}

/**
 * Test 3: Check RLS policies
 */
export async function checkRLSPolicies() {
    console.group('🔍 Test 3: RLS Policies');
    console.groupEnd();
}

/**
 * Test 4: Simple test upload (will actually upload a small test file)
 */
export async function testUploadSimple() {
    console.group('🔍 Test 4: Simple Test Upload');

    if (!window._supabaseClient) {
        console.groupEnd();
        return false;
    }

    const supabase = window._supabaseClient;
    const bucketName = 'mcu-documents';
    const testFileName = `test-${Date.now()}.txt`;
    const testContent = new Blob(['test file content'], { type: 'text/plain' });
    const testFile = new File([testContent], testFileName);

    try {
        const { data, error } = await supabase.storage
            .from(bucketName)
            .upload(testFileName, testFile);

        if (error) {
            // Provide diagnostic hints
            if (error.message.includes('violates row-level security')) {
            } else if (error.message.includes('mime type')) {
            } else if (error.message.includes('does not exist')) {
            }

            console.groupEnd();
            return false;
        }
        // Clean up test file
        await supabase.storage.from(bucketName).remove([testFileName]);
        console.groupEnd();
        return true;
    } catch (error) {
        console.groupEnd();
        return false;
    }
}

/**
 * Test 5: Test upload with valid file type (PDF)
 */
export async function testUploadPDF() {
    console.group('🔍 Test 5: PDF Upload Test');

    if (!window._supabaseClient) {
        console.groupEnd();
        return false;
    }

    const supabase = window._supabaseClient;
    const bucketName = 'mcu-documents';
    const testFileName = `test-pdf-${Date.now()}.pdf`;

    // Create a minimal PDF for testing
    const pdfContent = new Blob(
        ['%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>>>endobj xref 0 4 0000000000 65535 f 0000000009 00000 n 0000000058 00000 n 0000000115 00000 n trailer<</Size 4/Root 1 0 R>>startxref 234 %%EOF'],
        { type: 'application/pdf' }
    );
    const testFile = new File([pdfContent], testFileName, { type: 'application/pdf' });

    try {
        console.log(`📤 Attempting to upload PDF: ${testFileName} (${testFile.size} bytes)`);

        const { data, error } = await supabase.storage
            .from(bucketName)
            .upload(testFileName, testFile);

        if (error) {
            console.groupEnd();
            return false;
        }
        // Clean up test file
        await supabase.storage.from(bucketName).remove([testFileName]);
        console.groupEnd();
        return true;
    } catch (error) {
        console.groupEnd();
        return false;
    }
}

/**
 * Run all diagnostics
 */
export async function runAllDiagnostics() {
    const test1 = await testSupabaseConnection();
    const test2 = test1 ? await testBucketAccess() : false;
    await checkRLSPolicies();
    const test4 = test2 ? await testUploadSimple() : false;
    const test5 = test2 ? await testUploadPDF() : false;
    // Summary
    console.group('📊 DIAGNOSTIC SUMMARY');
    console.groupEnd();

    return {
        supabaseConnection: test1,
        bucketAccess: test2,
        textUpload: test4,
        pdfUpload: test5,
        allPassed: test1 && test2 && test4 && test5
    };
}

/**
 * Export function to window for easy console access
 */
if (typeof window !== 'undefined') {
    window.storageDiagnostic = {
        testSupabaseConnection,
        testBucketAccess,
        checkRLSPolicies,
        testUploadSimple,
        testUploadPDF,
        runAllDiagnostics
    };
    console.log('   window.storageDiagnostic.runAllDiagnostics()  // Run all tests');
    console.log('   window.storageDiagnostic.testSupabaseConnection()  // Test auth only');
    console.log('   window.storageDiagnostic.testBucketAccess()  // Test bucket access');
    console.log('   window.storageDiagnostic.testUploadSimple()  // Test simple upload');
    console.log('   window.storageDiagnostic.testUploadPDF()  // Test PDF upload');
}

export default {
    testSupabaseConnection,
    testBucketAccess,
    checkRLSPolicies,
    testUploadSimple,
    testUploadPDF,
    runAllDiagnostics
};
