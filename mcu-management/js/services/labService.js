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
      console.error('❌ Error creating lab item:', error.message);
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
        console.warn('⚠️ Supabase not enabled. Returning empty lab items.');
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
      console.error('❌ Error fetching lab items:', error.message);
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
      console.error('❌ Error fetching lab item:', error.message);
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
      console.error('❌ Error updating lab item:', error.message);
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
      console.error('❌ Error deleting lab item:', error.message);
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

      const labItem = await this.getLabItemById(data.labItemId);
      if (!labItem) {
        throw new Error('Lab item tidak ditemukan');
      }

      const { data: result, error } = await supabase
        .from('pemeriksaan_lab')
        .insert([
          {
            mcu_id: data.mcuId,
            employee_id: data.employeeId,
            lab_item_id: data.labItemId,
            value: parseFloat(data.value),
            unit: labItem.unit,
            min_range_reference: labItem.min_range_reference,
            max_range_reference: labItem.max_range_reference,
            notes: data.notes || null,
            created_by: currentUser?.userId || currentUser?.user_id || null
          }
        ])
        .select();

      if (error) throw error;

      return { success: true, data: result[0] };
    } catch (error) {
      console.error('❌ Error creating pemeriksaan lab:', error.message);
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
        console.warn('⚠️ Supabase not enabled. Returning empty results.');
        return [];
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
        .order('created_at', { ascending: true });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('❌ Error fetching pemeriksaan lab:', error.message);
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

      return { success: true, data: result[0] };
    } catch (error) {
      console.error('❌ Error updating pemeriksaan lab:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete pemeriksaan lab (soft delete)
   */
  async deletePemeriksaanLab(id) {
    try {
      const { error } = await supabase
        .from('pemeriksaan_lab')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('❌ Error deleting pemeriksaan lab:', error.message);
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

      return { success: true };
    } catch (error) {
      console.error('❌ Error deleting pemeriksaan lab by MCU ID:', error.message);
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
}

export const labService = new LabService();
