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
            return { success: false, error: 'Supabase not enabled' };
        }


        // Fetch all pemeriksaan_lab records
        const { data, error } = await supabase
            .from('pemeriksaan_lab')
            .select('id, lab_item_id, min_range_reference, max_range_reference, value')
            .order('lab_item_id')
            .limit(1000);

        if (error) {
            return { success: false, error: error.message };
        }

        if (!data || data.length === 0) {
            return { success: true, data: [] };
        }


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
                issues.push({
                    type: 'undefined',
                    labId: labId,
                    count: records.length
                });
                continue;
            }


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
                detailedIssues.forEach(issue => {
                });
                if (detailedIssues.length < corrupted) {
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
            }
        }

        // Summary

        const corruptedIssues = issues.filter(i => i.type === 'corrupted');
        const undefinedIssues = issues.filter(i => i.type === 'undefined');

        if (corruptedIssues.length === 0 && undefinedIssues.length === 0) {
            return {
                success: true,
                status: 'CLEAN',
                totalRecords: data.length,
                issues: []
            };
        } else {
            if (corruptedIssues.length > 0) {
                corruptedIssues.forEach(issue => {
                });
            }

            if (undefinedIssues.length > 0) {
                undefinedIssues.forEach(issue => {
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
        return { success: false, error: error.message };
    }
}

/**
 * Export verification function for console usage
 */
export default {
    verifyDatabaseIntegrity
};
