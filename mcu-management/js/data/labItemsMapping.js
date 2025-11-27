/**
 * Lab Items Mapping
 *
 * This file maps the actual lab_item_id values from Supabase database
 * to lab item names and metadata.
 *
 * CRITICAL: These IDs must match EXACTLY with database lab_items.id values
 * Used by forms to correctly save and load lab results
 */

export const LAB_ITEMS_MAPPING = {
    // Based on ACTUAL database entries from Supabase
    // IDs come from: SELECT id, name FROM lab_items ORDER BY id
    1: { name: 'SGOT', unit: 'IU/L', min: 5, max: 40 },
    2: { name: 'SGPT', unit: 'IU/L', min: 4, max: 44 },
    3: { name: 'Hemoglobin', unit: 'g/dL', min: 11, max: 16 },
    // ID 4 is MISSING in this database
    5: { name: 'Leukosit', unit: '10^3/μL', min: 4, max: 11 },
    6: { name: 'Trombosit', unit: '10^3/μL', min: 150, max: 400 },
    7: { name: 'Gula Darah Puasa', unit: 'mg/dL', min: 70, max: 100 },
    8: { name: 'Kolesterol Total', unit: 'mg/dL', min: 1, max: 200 },
    9: { name: 'Trigliserida', unit: 'mg/dL', min: 1, max: 150 },
    10: { name: 'HDL Kolestrol', unit: 'mg/dL', min: 30, max: 999 },
    11: { name: 'LDL Kolestrol', unit: 'mg/dL', min: 66, max: 999 },
    12: { name: 'Ureum', unit: 'mg/dL', min: 4, max: 50 },
    13: { name: 'Kreatinin', unit: 'mg/dL', min: 0.6, max: 1.2 },
    // IDs 14-30 are MISSING
    31: { name: 'Gula Darah 2 JPP', unit: 'mg/dL', min: 1, max: 999 },
    32: { name: 'Asam Urat', unit: 'mg/dl', min: 2, max: 999 }
};

/**
 * Get lab item info by ID
 * @param {number} labId - The lab_item_id from database
 * @returns {object} Lab item info with name, unit, min, max
 */
export function getLabItemInfo(labId) {
    return LAB_ITEMS_MAPPING[labId] || null;
}

/**
 * Get lab item ID by name
 * @param {string} labName - The name of the lab item
 * @returns {number} The lab_item_id or null
 */
export function getLabItemIdByName(labName) {
    for (const [id, info] of Object.entries(LAB_ITEMS_MAPPING)) {
        if (info.name === labName) {
            return parseInt(id);
        }
    }
    return null;
}

/**
 * Get all lab items as array
 * @returns {array} Array of lab items with id, name, unit, min, max
 */
export function getAllLabItems() {
    return Object.entries(LAB_ITEMS_MAPPING).map(([id, info]) => ({
        id: parseInt(id),
        ...info
    }));
}

export default LAB_ITEMS_MAPPING;
