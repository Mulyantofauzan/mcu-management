/**
 * Lab Service
 * Handles CRUD untuk:
 * 1. Lab Items (data master pemeriksaan lab)
 * 2. Pemeriksaan Lab (hasil pemeriksaan untuk setiap MCU)
 */

import { supabase, supabaseReady, isSupabaseEnabled } from '../config/supabase.js';
import { cacheManager } from '../utils/cacheManager.js';

class LabService {
  // ============================================
  // LAB ITEMS (Data Master)
  // ============================================

  /**
   * Buat item pemeriksaan lab baru
   */
  async createLabItem(data) {
    try {
      // Wait for Supabase to be ready
      await supabaseReady;

      if (!isSupabaseEnabled()) {
        throw new Error('Supabase not enabled');
      }

      const { data: result, error } = await supabase
        .from('lab_items')
        .insert([
          {
            name: data.name,
            description: data.description || null,
            unit: data.unit,
            min_range_reference: parseFloat(data.minRangeReference) || null,
            max_range_reference: parseFloat(data.maxRangeReference) || null,
            is_active: data.isActive !== false
          }
        ])
        .select();

      if (error) throw error;

      // Clear cache
      cacheManager.clear('labItems:all');

      return { success: true, data: result[0] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Ambil semua lab items (dengan caching)
   */
  async getAllLabItems(includeInactive = false) {
    try {
      // Wait for Supabase to be ready
      await supabaseReady;

      // Check if Supabase is enabled
      if (!isSupabaseEnabled()) {
        return [];
      }

      const cacheKey = includeInactive ? 'labItems:all:inactive' : 'labItems:all';
      const cached = cacheManager.get(cacheKey);

      if (cached) {
        return cached;
      }

      let query = supabase.from('lab_items').select('*');

      if (!includeInactive) {
        query = query.is('deleted_at', null);
      }

      const { data, error } = await query.order('name', { ascending: true });

      if (error) throw error;

      cacheManager.set(cacheKey, data);

      return data || [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Ambil lab item by ID
   */
  async getLabItemById(id) {
    try {
      const { data, error } = await supabase
        .from('lab_items')
        .select('*')
        .eq('id', id)
        .is('deleted_at', null)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      return null;
    }
  }

  /**
   * Update lab item
   */
  async updateLabItem(id, data) {
    try {
      const { data: result, error } = await supabase
        .from('lab_items')
        .update({
          name: data.name,
          description: data.description || null,
          unit: data.unit,
          min_range_reference: parseFloat(data.minRangeReference) || null,
          max_range_reference: parseFloat(data.maxRangeReference) || null,
          is_active: data.isActive !== false,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select();

      if (error) throw error;

      // Clear cache
      cacheManager.clear('labItems:all');
      cacheManager.clear('labItems:all:inactive');

      return { success: true, data: result[0] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete lab item (soft delete)
   */
  async deleteLabItem(id) {
    try {
      // Check jika lab item ini digunakan di pemeriksaan_lab
      const { data: pemeriksaan, error: checkError } = await supabase
        .from('pemeriksaan_lab')
        .select('id')
        .eq('lab_item_id', id)
        .is('deleted_at', null)
        .limit(1);

      if (checkError) throw checkError;

      if (pemeriksaan && pemeriksaan.length > 0) {
        throw new Error('Tidak dapat menghapus. Item pemeriksaan ini sudah digunakan.');
      }

      // Soft delete
      const { error } = await supabase
        .from('lab_items')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      // Clear cache
      cacheManager.clear('labItems:all');
      cacheManager.clear('labItems:all:inactive');

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ============================================
  // PEMERIKSAAN LAB (Hasil Pemeriksaan)
  // ============================================

  /**
   * Buat hasil pemeriksaan lab baru
   */
  async createPemeriksaanLab(data, currentUser) {
    try {
      // Wait for Supabase to be ready
      await supabaseReady;

      if (!isSupabaseEnabled()) {
        throw new Error('Supabase not enabled');
      }

      // ✅ CRITICAL FIX: Use labItemsMapping as source of truth for min/max ranges
      // This prevents mismatched min/max values caused by data corruption
      const { getLabItemInfo } = await import('../data/labItemsMapping.js');
      const labItemInfo = getLabItemInfo(data.labItemId);

      if (!labItemInfo) {
        throw new Error(`Lab item ${data.labItemId} tidak ditemukan atau invalid`);
      }

      const insertPayload = {
        mcu_id: data.mcuId,
        employee_id: data.employeeId,
        lab_item_id: data.labItemId,
        value: parseFloat(data.value),
        unit: labItemInfo.unit,
        // ✅ CRITICAL: Use labItemsMapping as AUTHORITATIVE source for ranges
        // This overrides any corrupted data in lab_items table
        min_range_reference: labItemInfo.min,
        max_range_reference: labItemInfo.max,
        notes: data.notes || null,
        created_by: currentUser?.userId || currentUser?.user_id || null
      };

      console.log(`[LabService] Creating lab result with payload:`, insertPayload);

      const { data: result, error } = await supabase
        .from('pemeriksaan_lab')
        .insert([insertPayload])
        .select();

      if (error) {
        console.error(`[LabService] INSERT ERROR for lab_item_id ${data.labItemId}:`, {
          error: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          payload: insertPayload
        });
        throw error;
      }

      // ✅ CRITICAL: Invalidate cache for this MCU since data changed
      cacheManager.clear(`labResults:${data.mcuId}`);

      return { success: true, data: result[0] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Ambil semua pemeriksaan lab untuk MCU tertentu
   */
  async getPemeriksaanLabByMcuId(mcuId) {
    try {
      // Wait for Supabase to be ready
      await supabaseReady;

      if (!isSupabaseEnabled()) {
        return [];
      }

      // ✅ CRITICAL: Check cache first to reduce repeated queries
      const cacheKey = `labResults:${mcuId}`;
      const cached = cacheManager.get(cacheKey);
      if (cached) {
        console.log(`[LabService] Cache HIT for MCU ${mcuId}: ${cached.length} results`);
        return cached;
      }

      const { data, error } = await supabase
        .from('pemeriksaan_lab')
        .select(`
          id,
          mcu_id,
          employee_id,
          lab_item_id,
          value,
          unit,
          min_range_reference,
          max_range_reference,
          notes,
          created_at,
          updated_at,
          lab_items:lab_item_id(id, name, description, unit)
        `)
        .eq('mcu_id', mcuId)
        .is('deleted_at', null)
        .not('lab_item_id', 'is', null) // Exclude rows with null lab_item_id
        .order('created_at', { ascending: true })
        .limit(50); // ✅ CRITICAL: Limit to 50 per MCU (max 14 expected) to prevent bloat

      if (error) throw error;
// [log removed]

      // ✅ FIXED: Relaxed filtering - only reject truly invalid data
      // Accept values > 0 and valid numeric values. Skip empty values instead of rejecting them.
      const validData = [];
      const invalidData = [];

      (data || []).forEach(item => {
        if (!item) {
          invalidData.push({item, reason: 'Item is null'});
          return;
        }
        if (!item.lab_item_id) {
          invalidData.push({item, reason: 'Missing lab_item_id'});
          return;
        }

        // ✅ FIXED: Allow empty/null values (just skip them, don't add to either list)
        // This allows items to be "not filled" without causing errors
        if (item.value === null || item.value === undefined || item.value === '') {
          // Don't add to validData OR invalidData - simply skip
          return;
        }

        // Trim and handle comma decimal separator (Indonesian format: 99,5 -> 99.5)
        let valueStr = String(item.value).trim();

        // Replace comma with dot for European decimal format
        valueStr = valueStr.replace(',', '.');

        // Convert to number
        const numValue = parseFloat(valueStr);

        // ✅ FIXED: Only reject if value is non-numeric or <= 0
        if (isNaN(numValue) || numValue <= 0) {
          invalidData.push({item, reason: `Invalid numeric: '${item.value}' -> ${numValue}`});
          return;
        }

        validData.push(item);
      });

      // Log summary (only if there are invalid items)
      if (invalidData.length > 0) {
        console.warn(`[LabService] Filtered ${invalidData.length} invalid records, kept ${validData.length}/${(data || []).length}`);
      }

      // ✅ CRITICAL: Cache the valid results to avoid repeated queries
      cacheManager.set(cacheKey, validData);
      console.log(`[LabService] Cached MCU ${mcuId}: ${validData.length} valid results`);

      return validData;
    } catch (error) {
      return [];
    }
  }

  /**
   * Update pemeriksaan lab
   */
  async updatePemeriksaanLab(id, data, currentUser) {
    try {
      const { data: result, error } = await supabase
        .from('pemeriksaan_lab')
        .update({
          value: parseFloat(data.value),
          notes: data.notes || null,
          updated_at: new Date().toISOString(),
          updated_by: currentUser?.userId || currentUser?.user_id || null
        })
        .eq('id', id)
        .select();

      if (error) throw error;

      // ✅ CRITICAL: Invalidate cache for this MCU since data changed
      if (result && result[0] && result[0].mcu_id) {
        cacheManager.clear(`labResults:${result[0].mcu_id}`);
      }

      return { success: true, data: result[0] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete pemeriksaan lab (soft delete)
   */
  async deletePemeriksaanLab(id) {
    try {
      // Get the MCU ID first so we can invalidate cache
      const { data: labRecord } = await supabase
        .from('pemeriksaan_lab')
        .select('mcu_id')
        .eq('id', id)
        .single();

      const { error } = await supabase
        .from('pemeriksaan_lab')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      // ✅ CRITICAL: Invalidate cache for this MCU since data changed
      if (labRecord && labRecord.mcu_id) {
        cacheManager.clear(`labResults:${labRecord.mcu_id}`);
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete semua pemeriksaan lab untuk MCU tertentu (soft delete)
   */
  async deletePemeriksaanLabByMcuId(mcuId) {
    try {
      const { error } = await supabase
        .from('pemeriksaan_lab')
        .update({ deleted_at: new Date().toISOString() })
        .eq('mcu_id', mcuId)
        .is('deleted_at', null);

      if (error) throw error;

      // ✅ CRITICAL: Invalidate cache for this MCU since data changed
      cacheManager.clear(`labResults:${mcuId}`);

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Helper: Determine jika value adalah "normal", "high", atau "low"
   */
  determineStatus(value, minRange, maxRange) {
    const numValue = parseFloat(value);
    const numMin = parseFloat(minRange);
    const numMax = parseFloat(maxRange);

    if (isNaN(numValue) || isNaN(numMin) || isNaN(numMax)) {
      return 'unknown';
    }

    if (numValue < numMin) return 'low';
    if (numValue > numMax) return 'high';
    return 'normal';
  }

  /**
   * NUCLEAR OPTION: Clean up phantom/orphaned lab records with invalid values FOR SPECIFIC MCU
   * Soft deletes any pemeriksaan_lab record for given MCU with value <= 0, null, or NaN
   * Called when user opens MCU edit modal to clean only that MCU's data
   */
  async cleanupPhantomLabRecords(mcuId) {
    try {
      await supabaseReady;

      if (!isSupabaseEnabled()) {
        throw new Error('Supabase not enabled');
      }

      if (!mcuId) {
        throw new Error('mcuId is required for cleanup');
      }

      // Get lab records for THIS MCU ONLY (including those with invalid values)
      const { data: allRecords, error: fetchError } = await supabase
        .from('pemeriksaan_lab')
        .select('id, value, mcu_id')
        .eq('mcu_id', mcuId)
        .is('deleted_at', null);

      if (fetchError) throw fetchError;

      // Identify records with invalid values
      const phantomIds = (allRecords || [])
        .filter(record => {
          const numValue = parseFloat(record.value);
          return isNaN(numValue) || numValue <= 0 || record.value === null || record.value === '';
        })
        .map(record => record.id);

      // Soft delete phantom records
      if (phantomIds.length > 0) {
// [log removed]
        const { error: deleteError } = await supabase
          .from('pemeriksaan_lab')
          .update({ deleted_at: new Date().toISOString() })
          .in('id', phantomIds);

        if (deleteError) throw deleteError;

        return { success: true, deletedCount: phantomIds.length, mcuId };
      }

      return { success: true, deletedCount: 0, mcuId };
    } catch (error) {
      return { success: false, error: error.message, deletedCount: 0, mcuId };
    }
  }

  /**
   * Compare old vs new lab results and return change records for audit trail
   * Used to track lab result changes in mcuChanges table
   * @param {Array} oldResults - Existing lab results from database
   * @param {Array} newResults - New lab results from form
   * @param {string} mcuId - MCU ID
   * @param {Object} currentUser - Current user object
   * @param {Array} labItems - Optional: lab items for getting names (if not provided, will fetch)
   */
  async getLabResultChanges(oldResults, newResults, mcuId, currentUser, labItems = null) {
    const changes = [];

    if (!oldResults) oldResults = [];
    if (!newResults) newResults = [];

    // Get lab items if not provided
    if (!labItems) {
      labItems = await this.getAllLabItems();
    }

    // Create map for quick item name lookup
    const itemNameMap = {};
    labItems.forEach(item => {
      itemNameMap[item.id] = item.name;
    });

    // Create maps for easy lookup
    const oldMap = {};
    const newMap = {};

    oldResults.forEach(r => {
      oldMap[r.lab_item_id] = r;
    });

    newResults.forEach(r => {
      newMap[r.labItemId] = r;
    });

    // Check for changes and new items
    for (const labItemId in newMap) {
      const newResult = newMap[labItemId];
      const oldResult = oldMap[labItemId];
      const itemName = itemNameMap[labItemId] || `Item ${labItemId}`;

      if (!oldResult) {
        // New lab result added
        changes.push({
          changeId: `change-${Date.now()}-${Math.random()}`,
          mcuId: mcuId,
          changedAt: new Date().toISOString(),
          changedBy: currentUser?.userId || currentUser?.id || 'system',
          fieldChanged: 'labResult',
          fieldName: 'labResult',
          fieldLabel: `Hasil Lab: ${itemName}`,
          oldValue: '-',
          newValue: `${newResult.value} (Status: ${newResult.notes || '-'})`,
          note: 'Lab result added'
        });
      } else if (String(oldResult.value) !== String(newResult.value)) {
        // Lab result value changed
        changes.push({
          changeId: `change-${Date.now()}-${Math.random()}`,
          mcuId: mcuId,
          changedAt: new Date().toISOString(),
          changedBy: currentUser?.userId || currentUser?.id || 'system',
          fieldChanged: 'labResult',
          fieldName: 'labResult',
          fieldLabel: `Hasil Lab: ${itemName}`,
          oldValue: `${oldResult.value} (Status: ${oldResult.notes || '-'})`,
          newValue: `${newResult.value} (Status: ${newResult.notes || '-'})`,
          note: 'Lab result value changed'
        });
      }
    }

    // Check for deleted lab results
    for (const labItemId in oldMap) {
      if (!newMap[labItemId]) {
        const oldResult = oldMap[labItemId];
        const itemName = itemNameMap[labItemId] || `Item ${labItemId}`;
        changes.push({
          changeId: `change-${Date.now()}-${Math.random()}`,
          mcuId: mcuId,
          changedAt: new Date().toISOString(),
          changedBy: currentUser?.userId || currentUser?.id || 'system',
          fieldChanged: 'labResult',
          fieldName: 'labResult',
          fieldLabel: `Hasil Lab: ${itemName}`,
          oldValue: `${oldResult.value}`,
          newValue: '-',
          note: 'Lab result removed'
        });
      }
    }

    return changes;
  }
}

export const labService = new LabService();
