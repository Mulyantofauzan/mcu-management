/**
 * Activity Log Service
 * Handles fetching, filtering, pagination, and exporting activity logs for audit
 */

export class ActivityLogService {
    constructor(database) {
        this.database = database;
        this.allActivities = [];
    }

    /**
     * Get activities with filtering and pagination
     * @param {Object} options - { action, target, userName, fromDate, toDate, page, limit }
     * @returns {Object} - { data, totalPages, total, page }
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

            // Get all activities from database (or cache if already loaded)
            if (this.allActivities.length === 0) {
                // Get all records (with high limit to get everything)
                const result = await this.database.getActivityLog(10000);
                this.allActivities = result || [];
            }

            // Filter activities
            let filtered = this.filterActivities(
                this.allActivities,
                { action, target, userName, fromDate, toDate }
            );

            // Sort by timestamp descending
            filtered.sort((a, b) => {
                const timeA = new Date(a.timestamp || 0).getTime();
                const timeB = new Date(b.timestamp || 0).getTime();
                return timeB - timeA;
            });

            // Paginate
            const totalItems = filtered.length;
            const totalPages = Math.ceil(totalItems / limit);
            const start = (page - 1) * limit;
            const end = start + limit;
            const data = filtered.slice(start, end);

            return {
                data,
                totalPages,
                total: totalItems,
                page,
                limit
            };

        } catch (error) {

            throw error;
        }
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
     * Export activities to CSV
     */
    async exportToCSV(filters = {}) {
        try {
            // Get all filtered activities (no pagination)
            const result = await this.getActivities({
                ...filters,
                page: 1,
                limit: 10000
            });

            const activities = result.data;

            if (!activities || activities.length === 0) {
                throw new Error('Tidak ada data untuk diekspor');
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
            const rows = activities.map(activity => [
                this.formatDate(activity.timestamp),
                activity.userName || 'System',
                activity.action,
                activity.entityType || activity.target || '-',
                activity.entityId || activity.details || '-'
            ]);

            // Create CSV content
            const csvContent = [
                headers.join(','),
                ...rows.map(row =>
                    row.map(cell => {
                        // Escape quotes and wrap in quotes if contains comma
                        const cellStr = String(cell);
                        return cellStr.includes(',') || cellStr.includes('"')
                            ? `"${cellStr.replace(/"/g, '""')}"`
                            : cellStr;
                    }).join(',')
                )
            ].join('\n');

            // Download CSV
            const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `activity-log-${new Date().toISOString().split('T')[0]}.csv`;
            link.click();

            return { success: true, recordsExported: activities.length };

        } catch (error) {

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
