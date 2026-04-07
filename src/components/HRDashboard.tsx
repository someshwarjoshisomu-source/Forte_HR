// HRDashboard.tsx
import { useEffect, useState } from "react";
import { supabase } from "../utils/supabase/client";

import { Card } from "./ui/card";
import { Button } from "./ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { ScrollArea } from "./ui/scroll-area";
import { Badge } from "./ui/badge";

import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

import {
  Building2,
  TrendingUp,
  LogOut,
  Download,
  Share2,
  Zap,
  AlertTriangle,
  MessageSquare,
  Award,
  ArrowUp,
  Users,
} from "lucide-react";

interface HRDashboardProps {
  onNavigate: (page: string) => void;
  onLogout: () => void;
  user: any;
}

type HRStats = {
  totalEmployees: number;
  avgEngagement: number | null;
  avgWellbeing: number | null;
  highRiskCount: number;
  moderateRiskCount: number;
  lowRiskCount: number;
  sadMoods7d: number;
  recognition30d: number;
  engagementChange: number; // % change from last month
  attritionRiskPercent: number;
  sentimentRatio: { positive: number; neutral: number; negative: number };
};

type DepartmentEngagement = {
  department: string;
  engagement: number;
};

type MonthlyTrend = {
  month: string;
  engagement: number;
  positive: number;
  neutral: number;
  negative: number;
};

type FeedbackItem = {
  id: string;
  comments: string;
  department: string;
  sentiment: "positive" | "neutral" | "negative";
  created_at: string;
};

type RecognitionItem = {
  id: string;
  message: string;
  from_name: string;
  to_name: string;
  department: string;
  created_at: string;
};

type Insight = {
  title: string;
  message: string;
  type: "positive" | "warning" | "info";
};

export function HRDashboard({ onNavigate, onLogout, user }: HRDashboardProps) {
  const [profile, setProfile] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  const [selectedDepartment, setSelectedDepartment] =
    useState<string>("all");
  const [selectedMonth, setSelectedMonth] =
    useState<string>("november-2025");

  const [stats, setStats] = useState<HRStats>({
    totalEmployees: 0,
    avgEngagement: null,
    avgWellbeing: null,
    highRiskCount: 0,
    moderateRiskCount: 0,
    lowRiskCount: 0,
    sadMoods7d: 0,
    recognition30d: 0,
    engagementChange: 0,
    attritionRiskPercent: 0,
    sentimentRatio: { positive: 80, neutral: 15, negative: 5 },
  });

  const [departmentEngagement, setDepartmentEngagement] = useState<
    DepartmentEngagement[]
  >([]);
  const [monthlyTrends, setMonthlyTrends] = useState<MonthlyTrend[]>([]);
  const [recentFeedback, setRecentFeedback] = useState<FeedbackItem[]>([]);
  const [recognitionWall, setRecognitionWall] = useState<
    RecognitionItem[]
  >([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  // replaced static recent feedback with real anonymous feedback from DB
  const [anonFeedback, setAnonFeedback] = useState<any[]>([]);

  useEffect(() => {
    if (!user?.email) return;

    const loadData = async () => {
      try {
        // parse selectedMonth like "november-2025"
        const [monthName, year] = selectedMonth.split("-");
        const monthMap: Record<string, number> = {
          january: 0,
          february: 1,
          march: 2,
          april: 3,
          may: 4,
          june: 5,
          july: 6,
          august: 7,
          september: 8,
          october: 9,
          november: 10,
          december: 11,
        };

        const monthIndex =
          monthMap[monthName?.toLowerCase()] ?? new Date().getMonth();
        const yearNum = parseInt(year) || new Date().getFullYear();

        const monthStart = new Date(yearNum, monthIndex, 1);
        const monthEnd = new Date(yearNum, monthIndex + 1, 0, 23, 59, 59);
        const monthStartISO = monthStart.toISOString();
        const monthEndISO = monthEnd.toISOString();

        const prevMonthStart = new Date(yearNum, monthIndex - 1, 1);
        const prevMonthEnd = new Date(
          yearNum,
          monthIndex,
          0,
          23,
          59,
          59
        );
        const prevMonthStartISO = prevMonthStart.toISOString();
        const prevMonthEndISO = prevMonthEnd.toISOString();

        // HR profile
        const { data: profileData } = await supabase
          .from("employees")
          .select("*")
          .eq("email", user.email)
          .single();

        if (profileData) setProfile(profileData);

        // total employees (non-HR)
        const { count: totalEmployees } = await supabase
          .from("employees")
          .select("*", { count: "exact", head: true })
          .not("role", "eq", "hr");

        // all employees for department map
        const { data: allEmployees } = await supabase
          .from("employees")
          .select("email, department")
          .not("role", "eq", "hr");

        const employeeDeptMap: Record<string, string> = {};
        (allEmployees || []).forEach((emp: any) => {
          employeeDeptMap[emp.email?.toLowerCase() || ""] =
            emp.department || "Other";
        });

        // performance scores for current month
        const { data: perfRows } = await supabase
          .from("performance_scores")
          .select(
            "employee_email, engagement_score, wellbeing_score, risk_score, created_at"
          )
          .gte("created_at", monthStartISO)
          .lte("created_at", monthEndISO);

        // previous month for engagement change
        const { data: prevPerfRows } = await supabase
          .from("performance_scores")
          .select("employee_email, engagement_score, created_at")
          .gte("created_at", prevMonthStartISO)
          .lte("created_at", prevMonthEndISO);

        let avgEngagement: number | null = null;
        let avgWellbeing: number | null = null;
        let highRiskCount = 0;
        let moderateRiskCount = 0;
        let lowRiskCount = 0;

        const deptEngagementMap: Record<
          string,
          { total: number; count: number }
        > = {};

        // Filter for avg based on department if selected
        const filteredPerfRowsForAvg =
          selectedDepartment === "all"
            ? perfRows || []
            : (perfRows || []).filter((r) => {
                const email = (r.employee_email || "").toLowerCase();
                const dept = employeeDeptMap[email] || "Other";
                return dept === selectedDepartment;
              });

        if (filteredPerfRowsForAvg.length > 0) {
          const totalEng = filteredPerfRowsForAvg.reduce(
            (sum, r) => sum + (r.engagement_score ?? 0),
            0
          );
          const totalWell = filteredPerfRowsForAvg.reduce(
            (sum, r) => sum + (r.wellbeing_score ?? 0),
            0
          );
          const validEng = filteredPerfRowsForAvg.filter(
            (r) => r.engagement_score != null
          ).length;
          const validWell = filteredPerfRowsForAvg.filter(
            (r) => r.wellbeing_score != null
          ).length;

          avgEngagement =
            validEng > 0 ? Math.round(totalEng / validEng) : null;
          avgWellbeing =
            validWell > 0 ? Math.round(totalWell / validWell) : null;

          const filteredPerfRows =
            selectedDepartment === "all"
              ? perfRows || []
              : (perfRows || []).filter((r) => {
                  const email = (r.employee_email || "").toLowerCase();
                  const dept = employeeDeptMap[email] || "Other";
                  return dept === selectedDepartment;
                });

          filteredPerfRows.forEach((r) => {
            const email = (r.employee_email || "").toLowerCase();
            const dept = employeeDeptMap[email] || "Other";

            if (!deptEngagementMap[dept]) {
              deptEngagementMap[dept] = { total: 0, count: 0 };
            }

            if (r.engagement_score != null) {
              deptEngagementMap[dept].total += r.engagement_score;
              deptEngagementMap[dept].count++;
            }

            const risk = r.risk_score ?? 0;
            if (risk > 70) highRiskCount++;
            else if (risk >= 30) moderateRiskCount++;
            else lowRiskCount++;
          });
        }

        const deptEng: DepartmentEngagement[] = Object.entries(
          deptEngagementMap
        ).map(([department, data]) => ({
          department,
          engagement:
            data.count > 0 ? Math.round(data.total / data.count) : 0,
        }));
        deptEng.sort((a, b) => b.engagement - a.engagement);
        setDepartmentEngagement(deptEng);

        // monthly trends (last 6 months inc. selected)
        const monthlyData: Record<string, MonthlyTrend> = {};
        const monthNames = [
          "Jan",
          "Feb",
          "Mar",
          "Apr",
          "May",
          "Jun",
          "Jul",
          "Aug",
          "Sep",
          "Oct",
          "Nov",
          "Dec",
        ];

        for (let i = 5; i >= 0; i--) {
          const target = new Date(yearNum, monthIndex - i, 1);
          const mKey = monthNames[target.getMonth()];
          const mYear = target.getFullYear();
          const start = new Date(mYear, target.getMonth(), 1);
          const end = new Date(
            mYear,
            target.getMonth() + 1,
            0,
            23,
            59,
            59
          );

          monthlyData[mKey] = {
            month: mKey,
            engagement: 0,
            positive: 0,
            neutral: 0,
            negative: 0,
          };

          const { data: monthPerfRows } = await supabase
            .from("performance_scores")
            .select("engagement_score, created_at")
            .gte("created_at", start.toISOString())
            .lte("created_at", end.toISOString());

          if (monthPerfRows && monthPerfRows.length > 0) {
            const totalEng = monthPerfRows.reduce(
              (sum, r) => sum + (r.engagement_score ?? 0),
              0
            );
            const validEng = monthPerfRows.filter(
              (r) => r.engagement_score != null
            ).length;
            monthlyData[mKey].engagement =
              validEng > 0 ? Math.round(totalEng / validEng) : 0;
          }

          const { data: monthMoodRows } = await supabase
            .from("mood_logs")
            .select("mood, created_at")
            .gte("created_at", start.toISOString())
            .lte("created_at", end.toISOString());

          (monthMoodRows || []).forEach((m: any) => {
            if (m.mood === "happy") monthlyData[mKey].positive++;
            else if (m.mood === "neutral") monthlyData[mKey].neutral++;
            else if (m.mood === "sad") monthlyData[mKey].negative++;
          });
        }

        setMonthlyTrends(Object.values(monthlyData));

        const currentMonthEng = avgEngagement ?? 0;
        let prevMonthEng = 0;
        if (prevPerfRows && prevPerfRows.length > 0) {
          const totalPrevEng = prevPerfRows.reduce(
            (sum, r) => sum + (r.engagement_score ?? 0),
            0
          );
          const validPrevEng = prevPerfRows.filter(
            (r) => r.engagement_score != null
          ).length;
          prevMonthEng =
            validPrevEng > 0 ? Math.round(totalPrevEng / validPrevEng) : 0;
        }
        const engagementChange =
          currentMonthEng > 0 && prevMonthEng > 0
            ? currentMonthEng - prevMonthEng
            : 0;

        // "sad" moods in month
        const { count: sadMoods7d } = await supabase
          .from("mood_logs")
          .select("id", { count: "exact", head: true })
          .eq("mood", "sad")
          .gte("created_at", monthStartISO)
          .lte("created_at", monthEndISO);

        // recognition count
        const { count: recognition30d } = await supabase
          .from("recognition")
          .select("id", { count: "exact", head: true })
          .gte("created_at", monthStartISO)
          .lte("created_at", monthEndISO);

        // mood logs for sentiment ratio
        const { data: monthMoodRows } = await supabase
          .from("mood_logs")
          .select("mood, created_at")
          .gte("created_at", monthStartISO)
          .lte("created_at", monthEndISO);

        const totalMoods = (monthMoodRows || []).length;
        const positive =
          totalMoods > 0
            ? Math.round(
                ((monthMoodRows || []).filter(
                  (m: any) => m.mood === "happy"
                ).length /
                  totalMoods) *
                  100
              )
            : 0;
        const neutral =
          totalMoods > 0
            ? Math.round(
                ((monthMoodRows || []).filter(
                  (m: any) => m.mood === "neutral"
                ).length /
                  totalMoods) *
                  100
              )
            : 0;
        const negative =
          totalMoods > 0
            ? Math.round(
                ((monthMoodRows || []).filter(
                  (m: any) => m.mood === "sad"
                ).length /
                  totalMoods) *
                  100
              )
            : 0;

        const attritionRiskPercent =
          (totalEmployees ?? 0) > 0
            ? Math.round(
                ((highRiskCount / (totalEmployees ?? 1)) * 100) * 10
              ) / 10
            : 0;

        setStats({
          totalEmployees: totalEmployees ?? 0,
          avgEngagement,
          avgWellbeing,
          highRiskCount,
          moderateRiskCount,
          lowRiskCount,
          sadMoods7d: sadMoods7d ?? 0,
          recognition30d: recognition30d ?? 0,
          engagementChange,
          attritionRiskPercent,
          sentimentRatio: { positive, neutral, negative },
        });

        // feedback rows
        const { data: feedbackRows } = await supabase
          .from("feedback")
          .select("id, comments, sender_email, receiver_email, created_at")
          .gte("created_at", monthStartISO)
          .lte("created_at", monthEndISO)
          .order("created_at", { ascending: false })
          .limit(10);

        const feedbackItems: FeedbackItem[] = (feedbackRows || []).map(
          (f: any) => {
            const senderEmail = (f.sender_email || "").toLowerCase();
            const senderDept = employeeDeptMap[senderEmail] || "Other";
            let sentiment: "positive" | "neutral" | "negative" = "neutral";
            const text = (f.comments || "").toLowerCase();
            if (
              text.includes("great") ||
              text.includes("amazing") ||
              text.includes("love") ||
              text.includes("excellent")
            ) {
              sentiment = "positive";
            } else if (
              text.includes("problem") ||
              text.includes("issue") ||
              text.includes("concern") ||
              text.includes("difficult")
            ) {
              sentiment = "negative";
            }
            return {
              id: f.id,
              comments: f.comments || "",
              department: senderDept,
              sentiment,
              created_at: f.created_at,
            };
          }
        );
        setRecentFeedback(feedbackItems.slice(0, 8));

        // recognition rows
        const { data: recognitionRows } = await supabase
          .from("recognition")
          .select("id, message, from_email, to_email, created_at")
          .gte("created_at", monthStartISO)
          .lte("created_at", monthEndISO)
          .order("created_at", { ascending: false })
          .limit(10);

        const { data: allEmpsWithNames } = await supabase
          .from("employees")
          .select("email, firstName, lastName, department");

        const emailToName: Record<string, { name: string; dept: string }> =
          {};
        (allEmpsWithNames || []).forEach((emp: any) => {
          const email = (emp.email || "").toLowerCase();
          const name =
            `${emp.firstName || ""} ${emp.lastName || ""}`.trim() ||
            email;
          emailToName[email] = { name, dept: emp.department || "Other" };
        });

        const recognitionItems: RecognitionItem[] = (
          recognitionRows || []
        ).map((r: any) => {
          const fromEmail = (r.from_email || "").toLowerCase();
          const toEmail = (r.to_email || "").toLowerCase();
          const fromInfo =
            emailToName[fromEmail] || { name: fromEmail, dept: "Other" };
          const toInfo =
            emailToName[toEmail] || { name: toEmail, dept: "Other" };

          return {
            id: r.id,
            message: r.message || "",
            from_name: fromInfo.name,
            to_name: toInfo.name,
            department: toInfo.dept,
            created_at: r.created_at,
          };
        });
        setRecognitionWall(recognitionItems.slice(0, 6));

        // generated insights
        const generatedInsights: Insight[] = [];

        // recognition trend
        const { count: prevRecognition } = await supabase
          .from("recognition")
          .select("id", { count: "exact", head: true })
          .gte("created_at", prevMonthStartISO)
          .lte("created_at", prevMonthEndISO);

        if ((recognition30d ?? 0) > 0 && (prevRecognition ?? 0) > 0) {
          const recChange =
            (((recognition30d ?? 0) - (prevRecognition ?? 0)) /
              (prevRecognition ?? 1)) *
            100;
          if (recChange < -10) {
            generatedInsights.push({
              title: `Recognition decreased ${Math.abs(
                Math.round(recChange)
              )}% this month`,
              message: "Consider organizing a team appreciation event.",
              type: "warning",
            });
          } else if (recChange > 10) {
            generatedInsights.push({
              title: `Recognition increased ${Math.round(
                recChange
              )}% this month`,
              message: "Keep encouraging peer-to-peer appreciation.",
              type: "positive",
            });
          }
        }

        deptEng.forEach((dept) => {
          if (dept.engagement > 85 && dept.engagement > (avgEngagement ?? 0)) {
            generatedInsights.push({
              title: `${dept.department} engagement at ${dept.engagement}%`,
              message: "Department performing above company average.",
              type: "positive",
            });
          }
        });

        if (feedbackItems.length > 5) {
          generatedInsights.push({
            title: "Anonymous feedback volume increased",
            message: "Employees are actively sharing their thoughts.",
            type: "info",
          });
        }

        if (highRiskCount > 0) {
          generatedInsights.push({
            title: `${highRiskCount} employees showing high attrition risk`,
            message: "Schedule 1-on-1s with these employees to understand concerns.",
            type: "warning",
          });
        }

        setInsights(generatedInsights.slice(0, 4));
      } finally {
        setLoadingStats(false);
      }
    };

    loadData();
  }, [user, selectedMonth, selectedDepartment]);

  // Load anonymous feedback (most recent first)
  useEffect(() => {
    const loadAnon = async () => {
      try {
        const { data } = await supabase
          .from("anonymous_feedback")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(10);

        setAnonFeedback(data || []);
      } catch (err) {
        console.error("Failed to load anonymous feedback", err);
        setAnonFeedback([]);
      }
    };

    loadAnon();
  }, []);

  // Attrition breakdown chart
  const attritionChartData = [
    { name: "High Risk", value: stats.highRiskCount, color: "#EF4444" },
    { name: "Moderate", value: stats.moderateRiskCount, color: "#F59E0B" },
    { name: "Low Risk", value: stats.lowRiskCount, color: "#22C55E" },
  ];

  const getSentimentBadge = (sentiment: string) => {
    if (sentiment === "positive")
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (sentiment === "negative")
      return "bg-red-50 text-red-700 border-red-200";
    return "bg-yellow-50 text-yellow-700 border-yellow-200";
  };

  const getInsightCardClasses = (type: string) => {
    if (type === "positive") return "bg-green-50 border-green-200";
    if (type === "warning") return "bg-yellow-50 border-yellow-200";
    return "bg-blue-50 border-blue-200";
  };

  const getInsightIcon = (type: string) => {
    if (type === "positive")
      return <TrendingUp className="w-5 h-5 text-green-600" />;
    if (type === "warning")
      return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
    return <Zap className="w-5 h-5 text-blue-600" />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#E8F1FF] via-white to-slate-50">
      {/* HEADER */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left */}
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-purple-600 to-purple-700 p-2 rounded-xl">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl">ForteHR</h1>
                <p className="text-xs text-slate-600">
                  HR Analytics Dashboard
                </p>
              </div>
            </div>

            {/* Right */}
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                className="rounded-xl"
                onClick={() =>
                  alert("Export report functionality coming soon!")
                }
              >
                <Download className="w-4 h-4 mr-2" />
                Export Report
              </Button>

              {/* changed code */}
              <Button
                className="py-3 px-4 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 text-white flex items-center gap-2"
                onClick={() => onNavigate("hr-recognition")}
              >
                <Award className="w-4 h-4" />
                Recognitions
              </Button>
              {/* changed code */}

              <Button
                onClick={onLogout}
                variant="outline"
                className="rounded-xl"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN */}
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Top heading + filters */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-3xl">Organization-Wide Analytics</h2>
            <p className="text-slate-600 text-sm">
              Comprehensive insights into employee engagement and retention.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Select
              value={selectedDepartment}
              onValueChange={setSelectedDepartment}
            >
              <SelectTrigger className="w-48 rounded-xl">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departmentEngagement.map((dept) => (
                  <SelectItem
                    key={dept.department}
                    value={dept.department}
                  >
                    {dept.department}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={selectedMonth}
              onValueChange={setSelectedMonth}
            >
              <SelectTrigger className="w-48 rounded-xl">
                <SelectValue placeholder="Select Month" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="november-2025">
                  November 2025
                </SelectItem>
                <SelectItem value="october-2025">
                  October 2025
                </SelectItem>
                <SelectItem value="september-2025">
                  September 2025
                </SelectItem>
                <SelectItem value="august-2025">August 2025</SelectItem>
                <SelectItem value="july-2025">July 2025</SelectItem>
                <SelectItem value="june-2025">June 2025</SelectItem>
                <SelectItem value="may-2025">May 2025</SelectItem>
                <SelectItem value="april-2025">April 2025</SelectItem>
                <SelectItem value="march-2025">March 2025</SelectItem>
                <SelectItem value="february-2025">
                  February 2025
                </SelectItem>
                <SelectItem value="january-2025">
                  January 2025
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid md:grid-cols-4 gap-6">
          {/* Total Employees */}
          <Card className="p-6 shadow-lg border-0 rounded-3xl bg-gradient-to-br from-white to-[#E8F1FF]">
            <div className="space-y-2">
              <div className="text-sm text-slate-600">
                Total Employees
              </div>
              <div className="text-4xl text-blue-600">
                {loadingStats ? "…" : stats.totalEmployees}
              </div>
              <div className="text-xs text-slate-500">
                Across all departments
              </div>
            </div>
          </Card>

          {/* Engagement Index */}
          <Card className="p-6 shadow-lg border-0 rounded-3xl bg-gradient-to-br from-white to-emerald-50">
            <div className="space-y-2">
              <div className="text-sm text-slate-600">
                Engagement Index
              </div>
              <div className="flex items-center gap-2">
                <div className="text-4xl text-[#33C38C]">
                  {loadingStats ? "…" : `${stats.avgEngagement ?? 83}%`}
                </div>
                {stats.engagementChange > 0 && (
                  <div className="flex items-center text-emerald-600 text-xs">
                    <ArrowUp className="w-4 h-4 mr-1" />
                    +{stats.engagementChange}%
                  </div>
                )}
              </div>
              <div className="text-xs text-slate-500">
                Compared to previous month
              </div>
            </div>
          </Card>

          {/* Attrition Risk */}
          <Card className="p-6 shadow-lg border-0 rounded-3xl bg-gradient-to-br from-white to-red-50">
            <div className="space-y-2">
              <div className="text-sm text-slate-600">
                High-Risk Employees
              </div>
              <div className="text-4xl text-red-500">
                {loadingStats ? "…" : stats.highRiskCount}
              </div>
              <div className="text-xs text-slate-500">
                {stats.attritionRiskPercent}% of workforce
              </div>
            </div>
          </Card>

          {/* Sentiment Ratio */}
          <Card className="p-6 shadow-lg border-0 rounded-3xl bg-gradient-to-br from-white to-yellow-50">
            <div className="space-y-2">
              <div className="text-sm text-slate-600">
                Sentiment Ratio
              </div>
              <div className="text-2xl text-yellow-600">
                {loadingStats
                  ? "…"
                  : `${stats.sentimentRatio.positive}:${stats.sentimentRatio.neutral}:${stats.sentimentRatio.negative}`}
              </div>
              <div className="text-xs text-slate-500">
                Positive : Neutral : Negative
              </div>
            </div>
          </Card>
        </div>

        {/* AI-Powered Predictive Insights */}
        <Card className="p-8 shadow-lg border-0 rounded-3xl">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <Zap className="w-6 h-6 text-purple-600" />
              <h3 className="text-xl">
                AI-Powered Predictive Insights
              </h3>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {insights.length === 0 && !loadingStats && (
                <p className="text-sm text-slate-500">
                  No insights available yet for this period.
                </p>
              )}
              {insights.map((insight, idx) => (
                <Card
                  key={idx}
                  className={`p-6 border-2 rounded-2xl ${getInsightCardClasses(
                    insight.type
                  )}`}
                >
                  <div className="flex gap-4">
                    <div className="p-3 rounded-xl bg-white/70">
                      {getInsightIcon(insight.type)}
                    </div>
                    <div className="space-y-1">
                      <div className="font-medium text-slate-900 text-sm">
                        {insight.title}
                      </div>
                      <div className="text-xs text-slate-600">
                        {insight.message}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </Card>

        {/* Charts Row */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Engagement by Department */}
          <Card className="p-8 shadow-lg border-0 rounded-3xl bg-white">
            <div className="flex items-center gap-3 mb-4">
              <Users className="w-6 h-6 text-[#33C38C]" />
              <h3 className="text-xl">Engagement by Department</h3>
            </div>
            <div className="h-80">
              {departmentEngagement.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No department data available.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={departmentEngagement}
                    layout="vertical"
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis type="number" domain={[0, 100]} stroke="#64748b" />
                    <YAxis
                      type="category"
                      dataKey="department"
                      stroke="#64748b"
                      width={100}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "white",
                        border: "none",
                        borderRadius: "12px",
                        boxShadow: "0 10px 40px rgba(0,0,0,0.1)",
                      }}
                    />
                    <Bar
                      dataKey="engagement"
                      fill="#33C38C"
                      radius={[0, 8, 8, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>

          {/* Sentiment & Engagement Trends */}
          <Card className="p-8 shadow-lg border-0 rounded-3xl bg-white">
            <div className="flex items-center gap-3 mb-4">
              <TrendingUp className="w-6 h-6 text-[#33C38C]" />
              <h3 className="text-xl">
                Sentiment & Engagement Trends
              </h3>
            </div>
            <div className="h-80">
              {monthlyTrends.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No trend data available.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={monthlyTrends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="month" stroke="#64748b" />
                    <YAxis stroke="#64748b" domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "white",
                        border: "none",
                        borderRadius: "12px",
                        boxShadow: "0 10px 40px rgba(0,0,0,0.1)",
                      }}
                    />
                    <Legend />
                    <Bar
                      dataKey="positive"
                      stackId="a"
                      fill="#22C55E"
                    />
                    <Bar
                      dataKey="neutral"
                      stackId="a"
                      fill="#F59E0B"
                    />
                    <Bar
                      dataKey="negative"
                      stackId="a"
                      fill="#EF4444"
                    />
                    <Line
                      type="monotone"
                      dataKey="engagement"
                      stroke="#8B5CF6"
                      strokeWidth={3}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>
        </div>

        {/* Attrition Risk + (Optionally more charts later) */}
        <Card className="p-8 shadow-lg border-0 rounded-3xl bg-white">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-6 h-6 text-red-500" />
            <h3 className="text-xl">Attrition Risk Breakdown</h3>
          </div>
          <div className="w-full h-80 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={attritionChartData}
                  dataKey="value"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  innerRadius={40}
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                >
                  {attritionChartData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Feedback + Recognition */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Anonymous Feedback (real DB-backed) */}
          <Card className="p-6 rounded-2xl shadow-lg bg-white">
            <h3 className="text-xl mb-4 flex items-center gap-2">
              <MessageSquare className="w-6 h-6 text-purple-500" />
              Recent Anonymous Feedback
            </h3>

            <div className="space-y-4">
              {anonFeedback.length === 0 && (
                <p className="text-sm text-slate-500">No feedback submitted yet.</p>
              )}

              {anonFeedback.map((f: any) => (
                <Card
                  key={f.id}
                  className="p-4 rounded-2xl border bg-gradient-to-br from-white to-slate-50 shadow-sm"
                >
                  <p className="text-sm text-slate-800">{f.message}</p>

                  <div className="flex items-center gap-2 mt-3 text-xs text-slate-500">
                    <Badge className="bg-purple-100 text-purple-700 rounded-full">
                      {f.department}
                    </Badge>

                    {f.sentiment && (
                      <Badge className="bg-emerald-100 text-emerald-700 rounded-full">
                        {f.sentiment}
                      </Badge>
                    )}

                    <span>{new Date(f.created_at).toLocaleDateString()}</span>
                  </div>
                </Card>
              ))}
            </div>
          </Card>

          {/* Recognition Wall */}
          <Card className="p-8 shadow-lg border-0 rounded-3xl bg-gradient-to-br from-white to-purple-50">
            <div className="flex items-center gap-3 mb-4">
              <Award className="w-6 h-6 text-purple-600" />
              <h3 className="text-xl">Recognition Wall</h3>
            </div>
            <ScrollArea className="h-96 pr-3">
              <div className="space-y-4">
                {recognitionWall.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No recognition messages for this period.
                  </p>
                ) : (
                  recognitionWall.map((item) => (
                    <Card
                      key={item.id}
                      className="p-4 border-purple-200 bg-white rounded-2xl hover:shadow-lg transition-all"
                    >
                      <div className="space-y-2">
                        <div className="text-xs text-slate-600">
                          From{" "}
                          <span className="font-semibold">
                            {item.from_name}
                          </span>{" "}
                          to{" "}
                          <span className="font-semibold">
                            {item.to_name}
                          </span>
                        </div>
                        <p className="text-sm text-slate-800">
                          {item.message}
                        </p>
                        <Badge className="bg-purple-600 text-white text-xs rounded-lg">
                          {item.department}
                        </Badge>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </Card>
        </div>

        {/* Export Section */}
        <Card className="p-8 shadow-lg border-0 rounded-3xl bg-gradient-to-r from-purple-600 to-purple-700 text-white">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-2">
              <h3 className="text-2xl">
                Export Complete Analytics Report
              </h3>
              <p className="text-purple-100 text-sm">
                Download comprehensive insights for stakeholders and
                leadership.
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                className="bg-white text-purple-600 hover:bg-purple-50 rounded-xl px-6"
                onClick={() => alert("PDF export coming soon!")}
              >
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
              <Button className="bg-white/20 text-white hover:bg-white/30 rounded-xl px-6">
                <Share2 className="w-4 h-4 mr-2" />
                Share Report
              </Button>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
}
