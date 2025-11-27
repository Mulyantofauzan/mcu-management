#!/usr/bin/env node

/**
 * Database Integrity Verification Script
 *
 * Checks if min/max reference ranges in pemeriksaan_lab table match
 * the correct values from labItemsMapping.
 *
 * Usage: node verify-db-integrity.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env.local') });

// Expected lab items mapping (from labItemsMapping.js)
const LAB_ITEMS_MAPPING = {
    1: { name: 'SGOT', min: 5, max: 34 },
    2: { name: 'SGPT', min: 4, max: 36 },
    3: { name: 'Hemoglobin', min: 11, max: 17 },
    5: { name: 'Leukosit', min: 4, max: 10 },
    6: { name: 'Trombosit', min: 150, max: 400 },
    7: { name: 'Gula Darah Puasa', min: 70, max: 110 },
    8: { name: 'Kolesterol Total', min: 1, max: 200 },
    9: { name: 'Trigliserida', min: 1, max: 160 },
    10: { name: 'HDL Kolestrol', min: 30, max: 200 },
    11: { name: 'LDL Kolestrol', min: 66, max: 159 },
    12: { name: 'Ureum', min: 4, max: 44.1 },
    13: { name: 'Kreatinin', min: 0.6, max: 1.3 },
    31: { name: 'Gula Darah 2 JPP', min: 1, max: 187 },
    32: { name: 'Asam Urat', min: 2, max: 7 }
};

async function verifyDatabaseIntegrity() {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        console.error('❌ Error: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY not found in environment');
        process.exit(1);
    }

    console.log('🔍 Verifying Database Integrity...\n');
    console.log(`📍 Connected to: ${supabaseUrl}\n`);

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    try {
        // Fetch all pemeriksaan_lab records
        const { data, error } = await supabase
            .from('pemeriksaan_lab')
            .select('id, lab_item_id, min_range_reference, max_range_reference, value')
            .order('lab_item_id')
            .limit(1000);

        if (error) {
            console.error('❌ Database Error:', error);
            process.exit(1);
        }

        if (!data || data.length === 0) {
            console.log('⚠️  No records found in pemeriksaan_lab table');
            process.exit(0);
        }

        console.log(`📊 Total records found: ${data.length}\n`);
        console.log('=' .repeat(100));
        console.log('INTEGRITY CHECK RESULTS:');
        console.log('=' .repeat(100) + '\n');

        const issues = [];
        const byLabId = {};

        // Group by lab_item_id for analysis
        data.forEach(record => {
            if (!byLabId[record.lab_item_id]) {
                byLabId[record.lab_item_id] = [];
            }
            byLabId[record.lab_item_id].push(record);
        });

        // Check each lab item type
        for (const labItemId in byLabId) {
            const labId = parseInt(labItemId);
            const expected = LAB_ITEMS_MAPPING[labId];
            const records = byLabId[labId];

            if (!expected) {
                console.log(`⚠️  Lab Item ID ${labId}: NOT DEFINED IN MAPPING`);
                issues.push({
                    type: 'undefined',
                    labId: labId,
                    count: records.length
                });
                continue;
            }

            console.log(`\n📋 Lab Item: ${expected.name} (ID: ${labId})`);
            console.log(`   Expected Range: ${expected.min} - ${expected.max}`);
            console.log(`   Records: ${records.length}`);

            // Check for data corruption
            let corrupted = 0;
            const detailedIssues = [];

            records.forEach((record, idx) => {
                if (record.min_range_reference !== expected.min || record.max_range_reference !== expected.max) {
                    corrupted++;
                    if (detailedIssues.length < 5) { // Show first 5 issues
                        detailedIssues.push({
                            id: record.id,
                            actual: `${record.min_range_reference} - ${record.max_range_reference}`,
                            value: record.value
                        });
                    }
                }
            });

            if (corrupted > 0) {
                console.log(`   ❌ CORRUPTED: ${corrupted}/${records.length} records have wrong min/max`);
                detailedIssues.forEach(issue => {
                    console.log(`      - Record ${issue.id}: ${issue.actual} (value: ${issue.value})`);
                });
                if (detailedIssues.length < corrupted) {
                    console.log(`      ... and ${corrupted - detailedIssues.length} more`);
                }
                issues.push({
                    type: 'corrupted',
                    labId: labId,
                    name: expected.name,
                    expectedMin: expected.min,
                    expectedMax: expected.max,
                    corruptedCount: corrupted,
                    totalCount: records.length
                });
            } else {
                console.log(`   ✅ CLEAN: All records have correct min/max`);
            }
        }

        // Summary
        console.log('\n' + '=' .repeat(100));
        console.log('SUMMARY:');
        console.log('=' .repeat(100));

        const corruptedIssues = issues.filter(i => i.type === 'corrupted');
        const undefinedIssues = issues.filter(i => i.type === 'undefined');

        if (corruptedIssues.length === 0 && undefinedIssues.length === 0) {
            console.log('\n✅ DATABASE IS CLEAN - No integrity issues found!');
            console.log('\nAll lab items have correct min/max reference ranges matching labItemsMapping.');
        } else {
            if (corruptedIssues.length > 0) {
                console.log(`\n❌ CORRUPTED DATA FOUND in ${corruptedIssues.length} lab item(s):`);
                corruptedIssues.forEach(issue => {
                    console.log(`   - ${issue.name} (ID: ${issue.labId}): ${issue.corruptedCount}/${issue.totalCount} records corrupted`);
                    console.log(`     Expected: ${issue.expectedMin} - ${issue.expectedMax}`);
                });
                console.log('\n💡 Solution: Run the SQL migration fix-corrupted-min-max-ranges.sql');
            }

            if (undefinedIssues.length > 0) {
                console.log(`\n⚠️  UNDEFINED LAB ITEMS in database (not in labItemsMapping):`);
                undefinedIssues.forEach(issue => {
                    console.log(`   - Lab Item ID ${issue.labId}: ${issue.count} records`);
                });
            }
        }

        console.log('\n' + '=' .repeat(100) + '\n');

        process.exit(corruptedIssues.length > 0 ? 1 : 0);

    } catch (error) {
        console.error('❌ Error during verification:', error.message);
        process.exit(1);
    }
}

// Run verification
verifyDatabaseIntegrity();
