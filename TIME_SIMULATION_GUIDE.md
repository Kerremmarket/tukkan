# ⏰ Time Simulation Guide

## Overview
The Time Simulation feature allows you to change the system's perceived time for testing purposes. This is particularly useful for testing time-sensitive features like:

- **25-day overdue payment detection** in Beklenen Ödemeler
- **Date-based filtering** and sorting
- **Cash flow calculations** across different time periods
- **Employee performance metrics** over time

## How to Access
1. Go to **Yönetici** (Manager) page
2. Look for the **🕐 Zaman Simülasyonu** button in the left sidebar (above the logout button)
3. Click to expand the time simulation panel

## Features

### 🎯 Current Time Display
- **Green text**: Shows real-time (no simulation active)
- **Orange text**: Shows simulated time (simulation active)
- **Top bar indicator**: Orange badge shows when simulation is active

### ⚙️ Time Controls

#### Manual Date Setting
- **Date picker**: Choose any specific date
- **"Zamanı Ayarla" button**: Apply the selected date
- **"Sıfırla" button**: Reset to real time

#### Quick Time Adjustment
- **-30 Gün**: Go back 30 days
- **-7 Gün**: Go back 7 days  
- **+7 Gün**: Go forward 7 days
- **+30 Gün**: Go forward 30 days

## Testing Scenarios

### 1. Test Overdue Payments
```
1. Make a sale with installments (nakit payment)
2. Go to Beklenen Ödemeler - payment appears normally
3. Use time simulation: +30 days
4. Check Beklenen Ödemeler - payment should show as overdue (red)
5. Reset to real time
```

### 2. Test Cash Flow Over Time
```
1. Make several sales in different months
2. Use time simulation to jump between months
3. Check Finansallar → Nakit Akışı to see data changes
4. Observe how the system handles future/past data
```

### 3. Test Employee Performance
```
1. Add employees and record sales
2. Use time simulation to advance time
3. Check employee performance metrics
4. See how time affects calculations
```

## Important Notes

⚠️ **Simulation Scope**: Time simulation affects:
- Date calculations (days since payment, etc.)
- Current month/year references
- Date formatting and comparisons
- New record creation dates

✅ **What's NOT Affected**:
- Existing database timestamps
- Backend server time
- Network requests (still use real time)
- File system dates

🔄 **Reset Behavior**:
- Always reset to real time when done testing
- Simulation is session-based (doesn't persist on refresh)
- No data is permanently altered

## Example Use Cases

### Scenario 1: Overdue Payment Testing
```
Goal: Test if payments show as overdue after 25 days

Steps:
1. Create a nakit sale with installments
2. Verify it appears in Beklenen Ödemeler
3. Set simulation to +26 days
4. Check if payment shows in red (overdue)
5. Try making a payment while in simulation
6. Reset to real time
```

### Scenario 2: Future Data Testing
```
Goal: Test how system handles future year data

Steps:
1. Set simulation to next year (e.g., 2026)
2. Check cash flow data for future months
3. Make sales in "future" time
4. Return to current time and see data persistence
```

## Tips for Effective Testing

1. **Start Small**: Use ±7 days for basic testing
2. **Document State**: Note what you're testing before changing time
3. **Always Reset**: Return to real time when done
4. **Check Multiple Pages**: See how time affects different features
5. **Test Edge Cases**: Try extreme dates (far future/past)

## Troubleshooting

**Issue**: Time simulation not working
- **Solution**: Check if you clicked "Zamanı Ayarla" after setting date

**Issue**: Some dates still show real time
- **Solution**: Some components might not use the simulated time function

**Issue**: Simulation persists after reset
- **Solution**: Refresh the page to ensure clean state

---

**Note**: This is a temporary testing feature and should be removed in production. The time simulation only affects the frontend calculations and display logic. 