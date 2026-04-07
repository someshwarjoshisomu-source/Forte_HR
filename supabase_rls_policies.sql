-- ============================================
-- RLS POLICIES FOR MANAGER DASHBOARD
-- ============================================
-- Run these SQL commands in your Supabase SQL Editor
-- to allow managers to view their team's data

-- ============================================
-- 1. PERFORMANCE_SCORES TABLE
-- ============================================

-- Enable RLS on performance_scores if not already enabled
ALTER TABLE performance_scores ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists (to avoid conflicts)
DROP POLICY IF EXISTS "Managers can read team performance scores" ON performance_scores;

-- Create policy: Managers can read performance scores for their direct reports
CREATE POLICY "Managers can read team performance scores"
ON performance_scores FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM employees
    WHERE employees.email = auth.email()
    AND employees.role = 'manager'
    AND employees.email = (
      SELECT manager FROM employees e2
      WHERE LOWER(e2.email) = LOWER(performance_scores.employee_email)
    )
  )
);

-- Also allow HR to read all performance scores
DROP POLICY IF EXISTS "HR can read all performance scores" ON performance_scores;

CREATE POLICY "HR can read all performance scores"
ON performance_scores FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM employees
    WHERE employees.email = auth.email()
    AND employees.role = 'hr'
  )
);

-- Employees can read their own performance scores
DROP POLICY IF EXISTS "Employees can read own performance scores" ON performance_scores;

CREATE POLICY "Employees can read own performance scores"
ON performance_scores FOR SELECT
USING (
  LOWER(employee_email) = LOWER(auth.email())
);

-- ============================================
-- 2. MOOD_LOGS TABLE
-- ============================================

-- Enable RLS on mood_logs if not already enabled
ALTER TABLE mood_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Managers can read team mood logs" ON mood_logs;

-- Create policy: Managers can read mood logs for their direct reports
CREATE POLICY "Managers can read team mood logs"
ON mood_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM employees
    WHERE employees.email = auth.email()
    AND employees.role = 'manager'
    AND employees.email = (
      SELECT manager FROM employees e2
      WHERE LOWER(e2.email) = LOWER(mood_logs.employee_email)
    )
  )
);

-- Also allow HR to read all mood logs
DROP POLICY IF EXISTS "HR can read all mood logs" ON mood_logs;

CREATE POLICY "HR can read all mood logs"
ON mood_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM employees
    WHERE employees.email = auth.email()
    AND employees.role = 'hr'
  )
);

-- Employees can read and insert their own mood logs
DROP POLICY IF EXISTS "Employees can read own mood logs" ON mood_logs;

CREATE POLICY "Employees can read own mood logs"
ON mood_logs FOR SELECT
USING (
  LOWER(employee_email) = LOWER(auth.email())
);

DROP POLICY IF EXISTS "Employees can insert own mood logs" ON mood_logs;

CREATE POLICY "Employees can insert own mood logs"
ON mood_logs FOR INSERT
WITH CHECK (
  LOWER(employee_email) = LOWER(auth.email())
);

-- ============================================
-- 3. RECOGNITION TABLE (if needed)
-- ============================================

-- Enable RLS on recognition if not already enabled
ALTER TABLE recognition ENABLE ROW LEVEL SECURITY;

-- Managers can read recognition for their team
DROP POLICY IF EXISTS "Managers can read team recognition" ON recognition;

CREATE POLICY "Managers can read team recognition"
ON recognition FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM employees
    WHERE employees.email = auth.email()
    AND employees.role = 'manager'
    AND (
      employees.email = (
        SELECT manager FROM employees e2
        WHERE LOWER(e2.email) = LOWER(recognition.to_email)
      )
      OR employees.email = (
        SELECT manager FROM employees e2
        WHERE LOWER(e2.email) = LOWER(recognition.from_email)
      )
    )
  )
);

-- HR can read all recognition
DROP POLICY IF EXISTS "HR can read all recognition" ON recognition;

CREATE POLICY "HR can read all recognition"
ON recognition FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM employees
    WHERE employees.email = auth.email()
    AND employees.role = 'hr'
  )
);

-- Employees can read recognition they sent or received
DROP POLICY IF EXISTS "Employees can read own recognition" ON recognition;

CREATE POLICY "Employees can read own recognition"
ON recognition FOR SELECT
USING (
  LOWER(to_email) = LOWER(auth.email())
  OR LOWER(from_email) = LOWER(auth.email())
);

-- Employees can insert recognition
DROP POLICY IF EXISTS "Employees can insert recognition" ON recognition;

CREATE POLICY "Employees can insert recognition"
ON recognition FOR INSERT
WITH CHECK (
  LOWER(from_email) = LOWER(auth.email())
);

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these to verify the policies are working:

-- Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('performance_scores', 'mood_logs', 'recognition');

-- Check existing policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename IN ('performance_scores', 'mood_logs', 'recognition')
ORDER BY tablename, policyname;

