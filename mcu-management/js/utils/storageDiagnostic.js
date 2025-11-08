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
        console.error('❌ Supabase client not available. Make sure app is loaded.');
        console.groupEnd();
        return false;
    }

    const supabase = window._supabaseClient;

    try {
        // Check if we can get user
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError) {
            console.error('❌ Auth error:', authError);
            console.groupEnd();
            return false;
        }

        if (!user) {
            console.error('❌ Not authenticated. Please log in first.');
            console.groupEnd();
            return false;
        }

        console.log('✅ Authenticated as:', user.email);
        console.log('   User ID:', user.id);
        console.groupEnd();
        return true;
    } catch (error) {
        console.error('❌ Error checking connection:', error);
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
        console.error('❌ Supabase client not available.');
        console.groupEnd();
        return false;
    }

    const supabase = window._supabaseClient;
    const bucketName = 'mcu-documents';

    try {
        // List buckets to verify access
        const { data: buckets, error: listError } = await supabase.storage.listBuckets();

        if (listError) {
            console.error('❌ Cannot list buckets:', listError);
            console.groupEnd();
            return false;
        }

        const bucket = buckets.find(b => b.name === bucketName);

        if (!bucket) {
            console.error(`❌ Bucket '${bucketName}' not found`);
            console.log('   Available buckets:', buckets.map(b => b.name));
            console.groupEnd();
            return false;
        }

        console.log(`✅ Bucket '${bucketName}' found`);
        console.log('   Bucket details:', {
            id: bucket.id,
            name: bucket.name,
            public: bucket.public,
                created: bucket.created_at
        });
        console.groupEnd();
        return true;
    } catch (error) {
        console.error('❌ Error checking bucket:', error);
        console.groupEnd();
        return false;
    }
}

/**
 * Test 3: Check RLS policies
 */
export async function checkRLSPolicies() {
    console.group('🔍 Test 3: RLS Policies');

    console.warn('⚠️ RLS policies can only be checked via Supabase Dashboard or SQL Editor');
    console.log('To check RLS policies:');
    console.log('1. Go to Supabase Dashboard');
    console.log('2. Storage → mcu-documents → Policies');
    console.log('3. Screenshot the policies and note their USING/WITH CHECK clauses');
    console.groupEnd();
}

/**
 * Test 4: Simple test upload (will actually upload a small test file)
 */
export async function testUploadSimple() {
    console.group('🔍 Test 4: Simple Test Upload');

    if (!window._supabaseClient) {
        console.error('❌ Supabase client not available.');
        console.groupEnd();
        return false;
    }

    const supabase = window._supabaseClient;
    const bucketName = 'mcu-documents';
    const testFileName = `test-${Date.now()}.txt`;
    const testContent = new Blob(['test file content'], { type: 'text/plain' });
    const testFile = new File([testContent], testFileName);

    try {
        console.log(`📤 Attempting to upload: ${testFileName}`);

        const { data, error } = await supabase.storage
            .from(bucketName)
            .upload(testFileName, testFile);

        if (error) {
            console.error('❌ Upload failed');
            console.error('   Message:', error.message);
            console.error('   Status:', error.status);
            console.error('   Full error:', error);

            // Provide diagnostic hints
            if (error.message.includes('violates row-level security')) {
                console.log('\n💡 DIAGNOSIS: RLS Policy Issue');
                console.log('   The bucket has RLS policies blocking uploads');
                console.log('   Next steps: See RLS-DIAGNOSIS-AND-FIX.md');
            } else if (error.message.includes('mime type')) {
                console.log('\n💡 DIAGNOSIS: MIME Type Restriction');
                console.log('   The bucket restricts file types');
                console.log('   Next steps: Check bucket settings in Supabase Dashboard');
            } else if (error.message.includes('does not exist')) {
                console.log('\n💡 DIAGNOSIS: Bucket Not Found');
                console.log('   The bucket does not exist or is inaccessible');
            }

            console.groupEnd();
            return false;
        }

        console.log('✅ Test upload successful');
        console.log('   Path:', data.path);
        console.log('   ID:', data.id);

        // Clean up test file
        await supabase.storage.from(bucketName).remove([testFileName]);
        console.log('✅ Test file cleaned up');

        console.groupEnd();
        return true;
    } catch (error) {
        console.error('❌ Unexpected error:', error);
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
        console.error('❌ Supabase client not available.');
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
            console.error('❌ PDF upload failed');
            console.error('   Message:', error.message);
            console.error('   Status:', error.status);
            console.groupEnd();
            return false;
        }

        console.log('✅ PDF upload successful');
        console.log('   Path:', data.path);

        // Clean up test file
        await supabase.storage.from(bucketName).remove([testFileName]);
        console.log('✅ Test file cleaned up');

        console.groupEnd();
        return true;
    } catch (error) {
        console.error('❌ Unexpected error:', error);
        console.groupEnd();
        return false;
    }
}

/**
 * Run all diagnostics
 */
export async function runAllDiagnostics() {
    console.log('🔍 Running all diagnostic tests...\n');

    const test1 = await testSupabaseConnection();
    console.log();

    const test2 = test1 ? await testBucketAccess() : false;
    console.log();

    await checkRLSPolicies();
    console.log();

    const test4 = test2 ? await testUploadSimple() : false;
    console.log();

    const test5 = test2 ? await testUploadPDF() : false;
    console.log();

    // Summary
    console.group('📊 DIAGNOSTIC SUMMARY');
    console.log('✅ Supabase Connection:', test1 ? 'OK' : 'FAILED');
    console.log('✅ Bucket Access:', test2 ? 'OK' : 'FAILED');
    console.log('✅ Text File Upload:', test4 ? 'OK' : 'FAILED');
    console.log('✅ PDF Upload:', test5 ? 'OK' : 'FAILED');
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

    console.log('✅ Storage diagnostic tools available. Run:');
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
