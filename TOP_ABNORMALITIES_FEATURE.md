# Top Abnormalities Chart Feature

## Overview

The Top Abnormalities Chart feature provides comprehensive visualization and ranking of abnormal medical conditions found in MCU (Medical Check-Up) data. It combines both laboratory results and clinical examination findings to identify the most common health issues within the screened population.

## Features

### 1. Abnormality Detection

#### Lab Results
- Detects abnormal lab values based on reference ranges
- Categorizes as "High" or "Low" when compared to normal range
- Supports all lab items: Hemoglobin, Cholesterol, Glucose, Triglycerides, etc.
- Uses standard medical reference ranges

**Example Lab Abnormalities:**
- Hemoglobin Tinggi (>17 g/dL)
- Kolesterol Tinggi (>200 mg/dL)
- Gula Darah Puasa Rendah (<70 mg/dL)

#### MCU Examination Findings
- **Blood Pressure**: Abnormal if SBP ≥ 130 OR DBP ≥ 85 (Hipertensi)
- **BMI**: Categories
  - Underweight: BMI < 18.5
  - Normal: BMI 18.5-24.9
  - Overweight: BMI 25-29.9
  - Obese: BMI ≥ 30
- **Vision**: Abnormal if worse than 6/6 (20/20) standard vision
  - Tracks 8 vision fields: distant/near, aided/unaided, left/right

**Example MCU Abnormalities:**
- Hipertensi (130/85 mmHg)
- Obese (BMI 31.5)
- Gangguan Penglihatan - Distant Vision Unaided (Left)

### 2. Ranking & Frequency Counting

- Counts total occurrences of each abnormality (per occurrence, not per unique condition)
- Ranks by frequency in descending order
- Supports configurable top-N display: 5, 10, 15, or 20 items

**Example:**
If 10 employees have hypertension, it shows "Hipertensi: 10 cases"

### 3. Visualization

#### Bar Chart View
- Horizontal bar chart (easier to read long condition names)
- Each bar represents an abnormality condition
- Length shows number of occurrences
- Color-coded by category (Lab Results, Hypertension, Obesity, Vision Defect)
- Interactive tooltips on hover

#### List View
- Ranked list with numbering (#1, #2, etc.)
- Compact display with condition name and count
- Category badges with color coding
- Easy scanning of top abnormalities

### 4. Interactive Controls

- **View Toggle**: Switch between Bar Chart ↔ List View
- **Limit Selector**: Choose top 5, 10, 15, or 20 items
- **Summary Statistics**:
  - Total Conditions (unique abnormality types)
  - Total Occurrences (sum of all cases)
  - Most Common (highest frequency condition)

### 5. Filter Integration

The chart automatically responds to all dashboard filters:
- **Date Range**: Filter by date period
- **Department**: Filter by department
- **Employee Type**: Karyawan PST vs Vendor
- **MCU Status**: Fit, Follow-Up, Unfit, etc.

When filters change, the chart updates automatically to show only data matching the filters.

## Technical Architecture

### Service Layer: `abnormalitiesService.js`

**Core Functions:**

```javascript
// Collect abnormalities from lab results
collectLabAbnormalities(filteredMCUs)
  → Returns: [{name, count, type: 'lab', category, ...}, ...]

// Collect abnormalities from MCU exams
collectMCUAbnormalities(filteredMCUs)
  → Returns: [{name, count, type: 'mcu', category, ...}, ...]

// Get combined and ranked top abnormalities
getTopAbnormalities(filteredMCUs, options)
  → Options: { limit: 10, includeTypes: ['lab', 'mcu'] }
  → Returns: [...] sorted by frequency, limited to N items

// Get separate rankings for lab and MCU
getTopAbnormalitiesSeparate(filteredMCUs, labLimit, mcuLimit)
  → Returns: { lab: [...], mcu: [...], combined: [...] }

// Get summary statistics
getAbnormalitiesSummary(filteredMCUs)
  → Returns: { totalConditions, totalOccurrences, labConditions, mcuConditions, mostCommon }
```

**Reference Range Helpers:**

```javascript
// Determine lab status
determineLabStatus(value, minRange, maxRange)
  → Returns: 'low', 'high', or 'normal'

// Check blood pressure abnormality
isBPAbnormal(bpString)
  → Input: "120/80"
  → Returns: true/false

// Get BMI category
getBMICategory(bmi)
  → Returns: 'Underweight', 'Normal', 'Overweight', 'Obese'

// Check vision abnormality
isVisionAbnormal(visionValue)
  → Input: "6/9", "6/12", "CF", etc.
  → Returns: true/false
```

### Component Layer: `topAbnormalitiesChart.js`

**Main Class: `TopAbnormalitiesChart`**

```javascript
// Render complete chart with controls
render(filteredMCUs, options)
  → Displays header, controls, and content
  → Options: { limit, view: 'bar'|'list' }

// Render bar chart visualization
renderBarChart(container)
  → Uses Chart.js for horizontal bar chart
  → Color-coded by category

// Render list view
renderListView(container)
  → Ranked list with badges
  → Numbered #1-N

// Update when filters change
updateView(filteredMCUs, options)
  → Re-renders with new filtered data

// Switch between views
renderView()
  → Called when user toggles bar/list view
```

### Integration: `dashboard.js`

```javascript
// Function that renders top abnormalities chart
async function updateTopAbnormalitiesChart(filteredMCUs) {
  await topAbnormalitiesChartInstance.render(filteredMCUs, {
    limit: 10,
    view: 'bar'
  });
}

// Called from updateCharts() when data changes
function updateCharts(filteredMCUs) {
  // ... other charts ...
  updateTopAbnormalitiesChart(filteredMCUs); // NEW
}
```

## Data Flow

```
Dashboard Filter Change
    ↓
loadData() in dashboard.js
    ↓
Filter MCU records
    ↓
updateCharts(filteredMCUs)
    ↓
updateTopAbnormalitiesChart(filteredMCUs)
    ↓
abnormalitiesService.getTopAbnormalities(filteredMCUs)
    ↓
[Collect lab abnormalities + MCU abnormalities + Rank by frequency]
    ↓
topAbnormalitiesChartInstance.render(data)
    ↓
[Render bar chart or list view based on user selection]
    ↓
UI Display Updated
```

## Usage Examples

### Example 1: Basic Rendering

```javascript
import { topAbnormalitiesChartInstance } from '../components/topAbnormalitiesChart.js';

// Render with default settings
await topAbnormalitiesChartInstance.render(filteredMCUs);
```

### Example 2: Custom Limit

```javascript
// Render top 15 items
await topAbnormalitiesChartInstance.render(filteredMCUs, {
  limit: 15,
  view: 'bar'
});
```

### Example 3: Get Just the Data

```javascript
import abnormalitiesService from '../services/abnormalitiesService.js';

// Get top 10 abnormalities
const topAbnormalities = await abnormalitiesService.getTopAbnormalities(
  filteredMCUs,
  { limit: 10 }
);

// Process the data
topAbnormalities.forEach((item, index) => {
  console.log(`#${index + 1}: ${item.name} - ${item.count} cases`);
});
```

### Example 4: Get Statistics

```javascript
// Get summary
const summary = await abnormalitiesService.getAbnormalitiesSummary(filteredMCUs);

console.log(`Total conditions found: ${summary.totalConditions}`);
console.log(`Total cases: ${summary.totalOccurrences}`);
console.log(`Most common: ${summary.mostCommon.name}`);
```

## Data Structures

### Abnormality Object

```javascript
{
  name: "Hemoglobin Tinggi (>17 g/dL)",
  count: 12,
  type: "lab",
  labItemId: 3,
  displayName: "Hemoglobin",
  status: "high",
  unit: "g/dL",
  category: "Lab Results"
}

{
  name: "Hipertensi (140/90 mmHg)",
  count: 8,
  type: "mcu",
  examType: "bloodPressure",
  category: "Hypertension",
  sbp: 140,
  dbp: 90
}

{
  name: "Obese (BMI 31.5)",
  count: 15,
  type: "mcu",
  examType: "bmi",
  category: "Obesity",
  bmiValue: 31.5,
  bmiCategory: "Obese"
}
```

### Summary Object

```javascript
{
  totalConditions: 42,        // Unique abnormality types
  totalOccurrences: 156,      // Total number of cases
  labConditions: 28,          // Lab-related abnormalities
  mcuConditions: 14,          // MCU exam abnormalities
  mostCommon: {               // Highest frequency
    name: "Kolesterol Tinggi",
    count: 25,
    category: "Lab Results"
  }
}
```

## Color Coding

### Category Colors

| Category | Color | Use Case |
|----------|-------|----------|
| Lab Results | Blue (#3b82f6) | Laboratory test abnormalities |
| Hypertension | Red (#ef4444) | High blood pressure |
| Obesity | Orange (#f97316) | BMI-related abnormalities |
| Vision Defect | Indigo (#6366f1) | Vision test abnormalities |

## Browser Compatibility

- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support (iOS 13+)
- IE11: ❌ Not supported (uses ES6 modules)

## Performance Considerations

1. **Data Loading**: Lab results are loaded on-demand when needed
2. **Calculation**: Abnormality detection is O(n) - linear in number of records
3. **Ranking**: Sorting is done client-side for instant filtering
4. **Chart Rendering**: Chart.js instance is destroyed/recreated on view switch
5. **Memory**: Charts are cleaned up when component is destroyed

## Limitations & Future Enhancements

### Current Limitations

1. **Vision categorization**: Uses hardcoded abnormality patterns (could use reference ranges)
2. **BP thresholds**: Fixed at 130/85 (could be configurable)
3. **Export**: No built-in export to PDF/Excel (can be added)

### Potential Enhancements

1. **Trend Analysis**: Show abnormality trends over time
2. **Comparison**: Compare abnormality rates between departments
3. **Alerts**: Highlight critical abnormalities in red
4. **Filtering**: Allow filtering by abnormality type within the chart
5. **Details Modal**: Click on bar to see all employees with that condition
6. **Export**: Export to PDF/Excel for reports

## Troubleshooting

### Chart not displaying

**Check:**
- Container element `#top-abnormalities-container` exists in HTML
- filteredMCUs is not empty
- No JavaScript errors in browser console

### Data seems incorrect

**Check:**
- Lab reference ranges in labItemsMapping.js are correct
- Database has pemeriksaan_lab records with valid values
- MCU records have blood_pressure, bmi, and vision fields

### Chart is slow

**Check:**
- Number of MCU records is not excessive (>10,000)
- Lab results are loaded efficiently
- Chart.js is not rendering too many items (consider limiting to top 20)

## Testing

### Manual Testing Checklist

- [ ] Chart renders on dashboard load
- [ ] Bar chart displays correctly with data
- [ ] Switch to list view works
- [ ] Switch back to bar chart works
- [ ] Limit selector changes top N items
- [ ] Filter changes update the chart
- [ ] Date range filter updates the chart
- [ ] Department filter updates the chart
- [ ] Summary statistics are accurate
- [ ] Color coding matches categories
- [ ] Long condition names are truncated properly
- [ ] No JavaScript errors in console

### Unit Testing Locations

- `abnormalitiesService` functions can be tested independently
- `topAbnormalitiesChart` rendering can be tested with mock data
- Integration test: Full dashboard flow with filter changes

## Related Files

- **Service**: `/js/services/abnormalitiesService.js`
- **Component**: `/js/components/topAbnormalitiesChart.js`
- **Dashboard**: `/js/pages/dashboard.js`
- **HTML**: `/index.html` (container added)
- **Lab Mapping**: `/js/data/labItemsMapping.js` (for lab item reference ranges)

## Commit Information

- **Feature Commit**: `45dbf16`
- **Date Implemented**: January 2026
- **Feature Status**: ✅ Complete & Production Ready
