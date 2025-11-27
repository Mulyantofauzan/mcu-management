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
        id: parseInt(id, 10),
        ...info
    }));
}

/**
 * Validate if a lab_item_id exists in the database
 * @param {number} labId - The lab_item_id to validate
 * @returns {boolean} True if lab_item_id is valid
 */
export function isValidLabItemId(labId) {
    const id = typeof labId === 'string' ? parseInt(labId, 10) : labId;
    return id in LAB_ITEMS_MAPPING;
}

/**
 * Get all valid lab item IDs
 * @returns {array} Array of valid lab_item_id values (sorted)
 */
export function getValidLabItemIds() {
    return Object.keys(LAB_ITEMS_MAPPING)
        .map(id => parseInt(id, 10))
        .sort((a, b) => a - b);
}

/**
 * Validate and sanitize lab result data
 * Ensures data conforms to database schema before saving
 * @param {object} labResult - Lab result data to validate
 * @returns {object|null} Validated result or null if invalid
 */
export function validateLabResult(labResult) {
    if (!labResult || typeof labResult !== 'object') {
        console.warn('[labItemsMapping] Invalid lab result: not an object');
        return null;
    }

    // Support both labItemId and lab_item_id keys
    const labItemId = parseInt(labResult.labItemId || labResult.lab_item_id, 10);
    const value = parseFloat(labResult.value);

    // Validate required fields
    if (!isValidLabItemId(labItemId)) {
        console.warn(`[labItemsMapping] Invalid lab_item_id: ${labItemId}. Valid IDs: ${getValidLabItemIds().join(', ')}`);
        return null;
    }

    if (isNaN(value) || value <= 0) {
        console.warn(`[labItemsMapping] Invalid value for lab_item_id ${labItemId}: ${labResult.value}`);
        return null;
    }

    const itemInfo = LAB_ITEMS_MAPPING[labItemId];

    return {
        lab_item_id: labItemId,
        labItemId: labItemId,
        value: value,
        unit: itemInfo.unit,
        min_range_reference: itemInfo.min,
        max_range_reference: itemInfo.max
    };
}

/**
 * Count expected lab items in the system
 * @returns {number} Number of expected lab items (14)
 */
export function getExpectedLabItemCount() {
    return Object.keys(LAB_ITEMS_MAPPING).length;
}

/**
 * Sort lab results by desired display order
 * Orders items as they appear in the form (Asam Urat → Glukosa Puasa → ... → Ureum)
 * @param {array} labResults - Array of lab result objects (from database)
 * @returns {array} Sorted lab results in display order
 */
export function sortLabResultsByDisplayOrder(labResults) {
    // Define the desired order (IDs only, in display order)
    const desiredOrder = [32, 7, 31, 10, 3, 8, 13, 11, 5, 1, 2, 9, 6, 12];

    // Create a map for quick lookup of order index
    const orderMap = {};
    desiredOrder.forEach((id, index) => {
        orderMap[id] = index;
    });

    // Sort the results based on desired order
    // Items not in desired order go to the end
    return [...labResults].sort((a, b) => {
        const aOrder = orderMap[a.lab_item_id] !== undefined ? orderMap[a.lab_item_id] : 999;
        const bOrder = orderMap[b.lab_item_id] !== undefined ? orderMap[b.lab_item_id] : 999;
        return aOrder - bOrder;
    });
}

export default LAB_ITEMS_MAPPING;
