/* Menyusun seluruh angka Dashboard dari data mentah dan filter. Murni, tanpa DOM. */
import { filterModels, activeEmployeeCount, isFollowUp, needsFollowUp } from './stats/filter.js';
import { statusCounts, typeCounts, departmentCounts, bloodTypeCounts, ageCounts, bmiCounts, withShare } from './stats/distributions.js';
import { monthlyTrend } from './stats/trend.js';
import { jakartaCounts } from './stats/jakartaCounts.js';
import { recentActivities } from './stats/activity.js';
import { STATUS_COLORS, TYPE_COLORS, RISK_COLORS, colorFor } from '../../lib/chartColors.js';

const colored = (items, map) => items.map((item, index) => ({ ...item, color: colorFor(map, item.label, index) }));

export function buildView(data, filters, today = new Date()) {
  const filtered = filterModels(data.models, filters);
  const followUpAll = data.models.filter(({ employee, mcu }) => employee?.isActive && needsFollowUp(mcu));
  const employeeById = new Map(data.models.map(({ employee }) => [employee.employeeId, employee]));
  const nameOf = id => employeeById.get(id)?.name;
  const dateless = filtered.filter(({ mcu }) => mcu.mcuDate);

  return {
    count: filtered.length,
    kpis: {
      employees: activeEmployeeCount(data.models),
      mcus: filtered.length,
      followUp: filtered.filter(({ mcu }) => isFollowUp(mcu)).length,
      expired: data.expiry.filter(item => item.expiryStatus === 'EXPIRED').length
    },
    trend: monthlyTrend(data.models.filter(({ employee }) => employee?.isActive), filters.from, filters.to),
    status: colored(statusCounts(filtered), STATUS_COLORS),
    types: colored(typeCounts(filtered), TYPE_COLORS),
    departments: withShare(departmentCounts(filtered, data.departments)),
    blood: colored(bloodTypeCounts(filtered), null).filter(item => item.value > 0),
    ages: withShare(ageCounts(filtered, today)),
    bmi: withShare(bmiCounts(filtered)).filter(item => item.label !== 'Tanpa data' || item.value > 0),
    risk: jakartaCounts(dateless, data.historiesByMcu, today).map((item, index) => ({ ...item, color: RISK_COLORS[index] })),
    followUps: followUpAll.slice(0, 5),
    followUpTotal: followUpAll.length,
    activities: recentActivities(data.activities, {
      employeeName: nameOf,
      mcuOwnerName: mcuId => nameOf(data.owners.get(mcuId))
    })
  };
}
