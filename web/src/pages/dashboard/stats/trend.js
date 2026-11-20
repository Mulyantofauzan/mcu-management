/* Tren bulanan: jumlah MCU terkini per bulan pada rentang filter. */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

export function monthlyTrend(models, from, to) {
  const end = to ? new Date(to) : new Date();
  const start = from ? new Date(from) : new Date(end.getFullYear(), end.getMonth() - 11, 1);
  const months = [];
  for (let cursor = new Date(start.getFullYear(), start.getMonth(), 1); cursor <= end; cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)) {
    months.push({ year: cursor.getFullYear(), month: cursor.getMonth() });
  }
  return months.map(({ year, month }) => ({
    label: months.length > 12 || months[0].year !== months[months.length - 1].year ? `${MONTHS[month]} ${String(year).slice(2)}` : MONTHS[month],
    value: models.filter(({ mcu }) => {
      const date = new Date(mcu.mcuDate);
      return date.getFullYear() === year && date.getMonth() === month;
    }).length
  }));
}
