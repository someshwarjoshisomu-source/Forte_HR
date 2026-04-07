# HR Dashboard SQL Queries

This document outlines the SQL queries used in the HR Dashboard for month-based data filtering.

## Overview

All queries filter data by the selected month. When a user selects a month (e.g., "September 2025"), all charts and metrics update to show data only for that specific month.

## Key Queries

### 1. Performance Scores for Selected Month

```sql
SELECT 
  employee_email, 
  engagement_score, 
  wellbeing_score, 
  risk_score, 
  created_at
FROM performance_scores
WHERE created_at >= '2025-09-01T00:00:00.000Z'
  AND created_at <= '2025-09-30T23:59:59.999Z'
```

**Purpose**: Get all performance scores for the selected month to calculate:
- Average engagement
- Average wellbeing
- Risk counts (high/moderate/low)
- Department-wise engagement

### 2. Performance Scores for Previous Month (Comparison)

```sql
SELECT 
  employee_email, 
  engagement_score, 
  created_at
FROM performance_scores
WHERE created_at >= '2025-08-01T00:00:00.000Z'
  AND created_at <= '2025-08-31T23:59:59.999Z'
```

**Purpose**: Calculate engagement change percentage (current month vs previous month)

### 3. Monthly Trends (Last 6 Months)

For each of the last 6 months, including selected month:

```sql
-- Example for September 2025
SELECT engagement_score, created_at
FROM performance_scores
WHERE created_at >= '2025-09-01T00:00:00.000Z'
  AND created_at <= '2025-09-30T23:59:59.999Z'
```

**Purpose**: Calculate average engagement per month for the trend line

### 4. Mood Logs for Selected Month

```sql
SELECT mood, created_at
FROM mood_logs
WHERE created_at >= '2025-09-01T00:00:00.000Z'
  AND created_at <= '2025-09-30T23:59:59.999Z'
```

**Purpose**: 
- Calculate sentiment ratio (positive/neutral/negative)
- Count sad moods for the month
- Build sentiment trends for stacked bar chart

### 5. Mood Logs for Monthly Trends

For each month in the last 6 months:

```sql
-- Example for September 2025
SELECT mood, created_at
FROM mood_logs
WHERE created_at >= '2025-09-01T00:00:00.000Z'
  AND created_at <= '2025-09-30T23:59:59.999Z'
```

**Purpose**: Build sentiment distribution (positive/neutral/negative) for each month in the trend chart

### 6. Recognition Messages for Selected Month

```sql
SELECT id, message, from_email, to_email, created_at
FROM recognition
WHERE created_at >= '2025-09-01T00:00:00.000Z'
  AND created_at <= '2025-09-30T23:59:59.999Z'
ORDER BY created_at DESC
LIMIT 10
```

**Purpose**: Display recent recognition messages in the Recognition Wall

### 7. Recognition Count for Selected Month

```sql
SELECT COUNT(id)
FROM recognition
WHERE created_at >= '2025-09-01T00:00:00.000Z'
  AND created_at <= '2025-09-30T23:59:59.999Z'
```

**Purpose**: Count total recognition messages for the month

### 8. Recognition Count for Previous Month (Comparison)

```sql
SELECT COUNT(id)
FROM recognition
WHERE created_at >= '2025-08-01T00:00:00.000Z'
  AND created_at <= '2025-08-31T23:59:59.999Z'
```

**Purpose**: Compare recognition volume month-over-month for insights

### 9. Feedback for Selected Month

```sql
SELECT 
  id, 
  comments, 
  sender_email, 
  receiver_email, 
  created_at
FROM feedback
WHERE created_at >= '2025-09-01T00:00:00.000Z'
  AND created_at <= '2025-09-30T23:59:59.999Z'
ORDER BY created_at DESC
LIMIT 10
```

**Purpose**: Display recent anonymous feedback

### 10. Employees with Departments

```sql
SELECT email, department, firstName, lastName
FROM employees
WHERE role != 'hr'
```

**Purpose**: Map employee emails to departments for filtering and grouping

## Date Range Calculation

The dashboard calculates date ranges dynamically:

```javascript
// Selected month: "september-2025"
const monthIndex = 8; // September (0-indexed)
const year = 2025;

// Start of month
const monthStart = new Date(2025, 8, 1); // 2025-09-01 00:00:00

// End of month
const monthEnd = new Date(2025, 9, 0, 23, 59, 59); // 2025-09-30 23:59:59
```

## Department Filtering

When a department is selected (not "all"), additional filtering is applied:

```javascript
// Filter performance scores by department
const filteredRows = perfRows.filter((r) => {
  const email = r.employee_email.toLowerCase();
  const dept = employeeDeptMap[email];
  return dept === selectedDepartment;
});
```

## Notes

- All timestamps are stored in UTC
- Date comparisons use ISO 8601 format
- The dashboard automatically recalculates when month or department selection changes
- Previous month data is fetched for comparison calculations (engagement change, recognition trends)

