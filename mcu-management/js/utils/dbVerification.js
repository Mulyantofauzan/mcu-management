/**
 * Database Verification Utility
 *
 * Verifies if min/max reference ranges in pemeriksaan_lab table match
 * the correct values from labItemsMapping.
 *
 * Can be run from browser console:
 * import { verifyDatabaseIntegrity } from './utils/dbVerification.js'
 * await verifyDatabaseIntegrity()
 */

import { supabase, supabaseReady, isSupabaseEnabled } from '../services/supabaseClient.js';
import { LAB_ITEMS_MAPPING } from '../data/labItemsMapping.js';

/**
 * Verify database integrity
 * @returns {Promise<Object>} Verification results
 */
export async function verifyDatabaseIntegrity() {
    try {
        await supabaseReady;

        if (!isSupabaseEnabled()) {
            console.error('Supabase not enabled');
            return { success: false, error: 'Supabase not enabled' };
        }

        console.log('🔍 Verifying Database Integrity...\n');

        // Fetch all pemeriksaan_lab records
        const { data, error } = await supabase
            .from('pemeriksaan_lab')
            .select('id, lab_item_id, min_range_reference, max_range_reference, value')
            .order('lab_item_id')
            .limit(1000);

        if (error) {
            console.error('Database Error:', error);
            return { success: false, error: error.message };
        }

        if (!data || data.length === 0) {
            console.log('⚠️  No records found in pemeriksaan_lab table');
            return { success: true, data: [] };
        }

        console.log(`📊 Total records found: ${data.length}\n`);
        console.log('='.repeat(100));
        console.log('INTEGRITY CHECK RESULTS:');
        console.log('='.repeat(100) + '\n');

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
                const minMatches = parseFloat(record.min_range_reference) === parseFloat(expected.min);
                const maxMatches = parseFloat(record.max_range_reference) === parseFloat(expected.max);

                if (!minMatches || !maxMatches) {
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
        console.log('\n' + '='.repeat(100));
        console.log('SUMMARY:');
        console.log('='.repeat(100));

        const corruptedIssues = issues.filter(i => i.type === 'corrupted');
        const undefinedIssues = issues.filter(i => i.type === 'undefined');

        if (corruptedIssues.length === 0 && undefinedIssues.length === 0) {
            console.log('\n✅ DATABASE IS CLEAN - No integrity issues found!');
            console.log('\nAll lab items have correct min/max reference ranges matching labItemsMapping.');
            return {
                success: true,
                status: 'CLEAN',
                totalRecords: data.length,
                issues: []
            };
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

            return {
                success: false,
                status: 'ISSUES_FOUND',
                totalRecords: data.length,
                issues: issues
            };
        }

    } catch (error) {
        console.error('Error during verification:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Export verification function for console usage
 */
export default {
    verifyDatabaseIntegrity
};
