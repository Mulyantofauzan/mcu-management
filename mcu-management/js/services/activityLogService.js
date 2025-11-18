/**
 * Activity Log Service
 * Handles fetching, filtering, pagination, and exporting activity logs for audit
 */

export class ActivityLogService {
    constructor(database) {
        this.database = database;
        this.allActivities = [];
        this.cacheLoadTime = null;
        this.CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache duration
        this.MAX_RECORDS = 5000; // Load maximum 5000 records instead of 10000
    }

    /**
     * Get activities with filtering and pagination (SERVER-SIDE)
     * @param {Object} options - { action, target, userName, fromDate, toDate, page, limit }
     * @returns {Object} - { data, totalPages, total, page, limit }
     */
    async getActivities(options = {}) {
        try {
            const {
                action = null,
                target = null,
                userName = null,
                fromDate = null,
                toDate = null,
                page = 1,
                limit = 20
            } = options;

            // Validate database adapter
            if (!this.database || !this.database.ActivityLog || !this.database.ActivityLog.getFiltered) {
                console.error('❌ Database adapter not properly initialized');
                console.error('database:', this.database);
                console.error('ActivityLog:', this.database?.ActivityLog);
                throw new Error('Database adapter tidak tersedia. ActivityLog.getFiltered tidak ditemukan');
            }

            // Use server-side filtering and pagination for better performance
            const filters = {
                action,
                target,
                userName,
                fromDate,
                toDate
            };

            console.log(`📊 Fetching activity logs (page: ${page}, limit: ${limit}, filters:`, filters, ')');

            const result = await this.database.ActivityLog.getFiltered(filters, page, limit);

            console.log(`✅ Loaded ${result.data.length} activity records (total: ${result.total})`);

            return {
                data: result.data,
                totalPages: result.totalPages,
                total: result.total,
                page: result.page,
                limit: result.limit
            };

        } catch (error) {
            console.error('❌ Error fetching activities:', error);
            throw error;
        }
    }

    /**
     * Clear cache to force reload on next request
     */
    clearCache() {
        this.allActivities = [];
        this.cacheLoadTime = null;
    }

    /**
     * Filter activities based on criteria
     * @private
     */
    filterActivities(activities, filters) {
        return activities.filter(activity => {
            const { action, target, userName, fromDate, toDate } = filters;

            // Filter by action
            if (action && activity.action !== action) {
                return false;
            }

            // Filter by target (entityType or target field)
            if (target) {
                const activityTarget = activity.entityType || activity.target;
                if (activityTarget !== target) {
                    return false;
                }
            }

            // Filter by user name (case-insensitive, partial match)
            if (userName) {
                const userNameLower = (activity.userName || '').toLowerCase();
                if (!userNameLower.includes(userName.toLowerCase())) {
                    return false;
                }
            }

            // Filter by date range
            if (fromDate || toDate) {
                const activityDate = new Date(activity.timestamp);

                if (fromDate) {
                    const fromDateObj = new Date(fromDate);
                    fromDateObj.setHours(0, 0, 0, 0);
                    if (activityDate < fromDateObj) {
                        return false;
                    }
                }

                if (toDate) {
                    const toDateObj = new Date(toDate);
                    toDateObj.setHours(23, 59, 59, 999);
                    if (activityDate > toDateObj) {
                        return false;
                    }
                }
            }

            return true;
        });
    }

    /**
     * Export all filtered activities to CSV
     * Fetches all pages of filtered data and exports them
     */
    async exportToCSV(filters = {}) {
        try {
            console.log(`📥 Starting export with filters:`, filters);

            // First, get the first page to know total count
            const firstPage = await this.getActivities({
                ...filters,
                page: 1,
                limit: 100  // Use larger page size for export
            });

            if (!firstPage.data || firstPage.data.length === 0) {
                throw new Error('Tidak ada data untuk diekspor dengan filter yang dipilih');
            }

            // Collect all activities by fetching all pages
            let allActivities = [...firstPage.data];
            const totalPages = firstPage.totalPages;

            console.log(`📄 Total pages to export: ${totalPages}, Total records: ${firstPage.total}`);

            // Fetch remaining pages
            for (let page = 2; page <= totalPages; page++) {
                const pageResult = await this.getActivities({
                    ...filters,
                    page,
                    limit: 100
                });
                allActivities = [...allActivities, ...pageResult.data];
                console.log(`✅ Fetched page ${page}/${totalPages}`);
            }

            // Prepare CSV headers
            const headers = [
                'Waktu',
                'User',
                'Aksi',
                'Target',
                'Detail'
            ];

            // Prepare CSV rows
            const rows = allActivities.map(activity => [
                this.formatDate(activity.timestamp),
                activity.userName || 'System',
                activity.action,
                activity.entityType || activity.target || '-',
                activity.entityId || activity.details || '-'
            ]);

            // Create CSV content with filter info in comment
            let csvContent = '# Activity Log Export\n';
            csvContent += `# Exported: ${new Date().toLocaleString('id-ID')}\n`;
            if (Object.values(filters).some(v => v)) {
                csvContent += '# Filters Applied:\n';
                if (filters.action) csvContent += `# - Action: ${filters.action}\n`;
                if (filters.target) csvContent += `# - Target: ${filters.target}\n`;
                if (filters.userName) csvContent += `# - User: ${filters.userName}\n`;
                if (filters.fromDate) csvContent += `# - From Date: ${filters.fromDate}\n`;
                if (filters.toDate) csvContent += `# - To Date: ${filters.toDate}\n`;
            }
            csvContent += '#\n';
            csvContent += headers.join(',') + '\n';

            // Add data rows
            csvContent += rows.map(row =>
                row.map(cell => {
                    const cellStr = String(cell);
                    return cellStr.includes(',') || cellStr.includes('"')
                        ? `"${cellStr.replace(/"/g, '""')}"`
                        : cellStr;
                }).join(',')
            ).join('\n');

            // Generate filename with filter info
            const filterInfo = [];
            if (filters.action) filterInfo.push(`action-${filters.action}`);
            if (filters.target) filterInfo.push(`target-${filters.target}`);
            const filterStr = filterInfo.length > 0 ? `-${filterInfo.join('-')}` : '';
            const filename = `activity-log${filterStr}-${new Date().toISOString().split('T')[0]}.csv`;

            // Download CSV
            const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = filename;
            link.click();

            console.log(`✅ Export complete: ${allActivities.length} records exported`);
            return { success: true, recordsExported: allActivities.length };

        } catch (error) {
            console.error('❌ Export error:', error);
            throw error;
        }
    }

    /**
     * Format timestamp to localized date string
     * @private
     */
    formatDate(timestamp) {
        if (!timestamp) return '-';
        try {
            return new Date(timestamp).toLocaleString('id-ID');
        } catch {
            return String(timestamp);
        }
    }

    /**
     * Get activity statistics
     */
    async getStatistics(filters = {}) {
        try {
            const result = await this.getActivities({
                ...filters,
                page: 1,
                limit: 10000
            });

            const activities = result.data;

            const stats = {
                total: activities.length,
                byAction: {},
                byTarget: {},
                byUser: {}
            };

            // Count by action
            activities.forEach(activity => {
                const action = activity.action;
                stats.byAction[action] = (stats.byAction[action] || 0) + 1;

                const target = activity.entityType || activity.target;
                stats.byTarget[target] = (stats.byTarget[target] || 0) + 1;

                const user = activity.userName || 'System';
                stats.byUser[user] = (stats.byUser[user] || 0) + 1;
            });

            return stats;

        } catch (error) {

            throw error;
        }
    }

    /**
     * Clear cache (useful when activities are updated)
     */
    clearCache() {
        this.allActivities = [];
    }
}

export default ActivityLogService;
