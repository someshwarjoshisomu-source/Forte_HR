// src/components/ManagerDashboard.tsx
import { useEffect, useState } from "react";
import { supabase } from "../utils/supabase/client";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";

import {
  Users,
  TrendingUp,
  Award,
  MessageCircle,
  Activity,
  LogOut,
  Lightbulb,
  User,
  AlertTriangle,
} from "lucide-react";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";

interface ManagerDashboardProps {
  onNavigate: (page: string) => void;
  onLogout: () => void;
  user: any;
}

interface BurnoutConditions {
  highStressDays: number;
  sadDays: number;
  lowMicroDays: number;
}

interface BurnoutAlert {
  email: string;
  name: string;
  rulesTriggered: number;
  conditions: BurnoutConditions;
}

interface MicroTrendPoint {
  day: string;
  score: number;
}

interface Announcement {
  id: string;
  title: string | null;
  message: string | null;
  created_by: string | null;
  created_by_role: string | null;
  created_at: string;
}

export function ManagerDashboard({
  onNavigate,
  onLogout,
  user,
}: ManagerDashboardProps) {
  const [profile, setProfile] = useState<any>(null);

  const [summary, setSummary] = useState<any>(null);
  const [teamInsights, setTeamInsights] = useState<any[]>([]);
  const [topPerformers, setTopPerformers] = useState<any[]>([]);
  const [sentimentTrend, setSentimentTrend] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [moodDistribution, setMoodDistribution] = useState<any[]>([]);
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [burnoutAlerts, setBurnoutAlerts] = useState<BurnoutAlert[]>([]);
  const [microFeedbackTrend, setMicroFeedbackTrend] = useState<MicroTrendPoint[]>(
    []
  );

  const [stats, setStats] = useState({
    teamSize: 0,
    recognition30d: 0,
    avgEngagement: 0,
    highRiskCount: 0,
    avgStress: 0,
    avgMicro: 0,
  });

  // Announcements state
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [annTitle, setAnnTitle] = useState("");
  const [annMessage, setAnnMessage] = useState("");
  const [editingAnnId, setEditingAnnId] = useState<string | null>(null);
  const [savingAnnouncement, setSavingAnnouncement] = useState(false);
  const [deletingAnnId, setDeletingAnnId] = useState<string | null>(null);

  // ---------------------------
  // LOAD MANAGER PROFILE
  // ---------------------------
  useEffect(() => {
    if (!user?.email) return;

    const loadProfile = async () => {
      console.log("🔵 Loading manager profile for:", user.email);

      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .eq("email", user.email)
        .single();

      console.log("📥 Manager profile:", data);
      console.log("❌ Profile load error:", error);

      if (!error && data) {
        setProfile(data);
      }
    };

    loadProfile();
  }, [user]);

  // ---------------------------
  // LOAD ALL DASHBOARD DATA
  // ---------------------------
  useEffect(() => {
    if (!profile?.email) return;

    const load = async () => {
      const managerEmail: string = profile.email;
      console.log("🚀 ManagerDashboard LOADING for manager:", managerEmail);

      // 1️⃣ TEAM MEMBERS
      console.log("📌 Fetching team members for manager:", managerEmail);
      const { data: members, error: teamError } = await supabase
        .from("employees")
        .select("email, firstName, lastName, roleTitle, manager")
        .eq("manager", managerEmail);

      const team = members || [];
      const teamEmails = team.map((m: any) => m.email as string);

      console.log("📥 Team members:", team);
      console.log("❌ Team error:", teamError);

      setTeamMembers(team);
      setStats((s) => ({ ...s, teamSize: team.length }));

      // 2️⃣ MONTHLY SUMMARY
      console.log("📌 Fetching monthly summary:", managerEmail);
      const {
        data: summaryRows,
        error: summaryError,
      } = await supabase
        .from("manager_summary_monthly")
        .select("*")
        .eq("manager_email", managerEmail)
        .order("created_at", { ascending: false })
        .limit(1);

      console.log("📊 Summary rows:", summaryRows);
      console.log("❌ Summary error:", summaryError);

      if (!summaryError && summaryRows && summaryRows.length > 0) {
        const s = summaryRows[0] as any;
        setSummary(s);
        setStats((st) => ({
          ...st,
          avgEngagement: s.avg_engagement ?? 0,
        }));
      }

      // 3️⃣ TEAM INSIGHTS
      console.log("📌 Fetching AI-like insights");
      const {
        data: insights,
        error: insightsError,
      } = await supabase
        .from("team_insights")
        .select("*")
        .eq("manager_email", managerEmail)
        .order("created_at", { ascending: false })
        .limit(5);

      console.log("📥 Insights:", insights);
      console.log("❌ Insights error:", insightsError);
      setTeamInsights(insights || []);

      // 4️⃣ TOP PERFORMERS
      console.log("📌 Fetching top performers");
      const {
        data: performers,
        error: performersError,
      } = await supabase
        .from("top_performers")
        .select("*")
        .eq("manager_email", managerEmail)
        .order("rank", { ascending: true });

      console.log("📥 Top performers:", performers);
      console.log("❌ Top performers error:", performersError);
      setTopPerformers(performers || []);

      // 5️⃣ SENTIMENT TREND (daily)
      console.log("📌 Fetching sentiment trend for:", managerEmail);
      const {
        data: sentimentRows,
        error: sentimentError,
      } = await supabase
        .from("team_sentiment_daily")
        .select("*")
        .eq("manager_email", managerEmail)
        .order("date", { ascending: true })
        .limit(30); // pull more, we’ll slice last 14

      console.log("📥 Raw sentiment rows:", sentimentRows);
      console.log("❌ Sentiment error:", sentimentError);

      const trendMap: Record<string, number> = {};
      (sentimentRows || []).forEach((r: any) => {
        const key = new Date(r.date).toISOString().slice(0, 10);
        trendMap[key] = r.sentiment_score;
      });

      console.log("🗺 trendMap:", trendMap);

      // Generate last 14 days
      const trend: any[] = [];
      for (let i = 13; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);

        trend.push({
          day: d.toLocaleDateString("en-US", { weekday: "short" }),
          score: trendMap[key] ?? 0,
        });
      }

      console.log("📊 FINAL SENTIMENT TREND ARRAY:", trend);
      setSentimentTrend(trend);

      // 6️⃣ RECOGNITION COUNT (last 30 days)
      console.log("📌 Fetching recognition count");
      const {
        count: recognitionCount,
        error: recognitionError,
      } = await supabase
        .from("recognition")
        .select("*", { count: "exact", head: true })
        .in("to_email", teamEmails);

      console.log("📊 Recognition count (last 30 days):", recognitionCount);
      console.log("❌ Recognition error:", recognitionError);

      setStats((s) => ({
        ...s,
        recognition30d: recognitionCount ?? 0,
      }));

      // 7️⃣ MOOD DISTRIBUTION
      console.log("📌 Loading mood distribution");
      if (!summaryError && summaryRows && summaryRows.length > 0) {
        const s = summaryRows[0] as any;
        console.log("📊 Summary mood values:", s);

        setMoodDistribution([
          {
            name: "Positive",
            value: s.mood_positive ?? 0,
            color: "#33C38C",
          },
          {
            name: "Neutral",
            value: s.mood_neutral ?? 0,
            color: "#F59E0B",
          },
          {
            name: "Negative",
            value: s.mood_negative ?? 0,
            color: "#EF4444",
          },
        ]);
      } else {
        // fallback using mood_logs
        const {
          data: moodLogs,
          error: moodError,
        } = await supabase
          .from("mood_logs")
          .select("mood")
          .in("employee_email", teamEmails);

        console.log("📥 Mood logs fallback:", moodLogs);
        console.log("❌ Mood logs error:", moodError);

        const pos =
          moodLogs?.filter((l: any) => l.mood === "happy").length ?? 0;
        const neu =
          moodLogs?.filter((l: any) => l.mood === "neutral").length ?? 0;
        const neg =
          moodLogs?.filter((l: any) => l.mood === "sad").length ?? 0;

        setMoodDistribution([
          { name: "Positive", value: pos, color: "#33C38C" },
          { name: "Neutral", value: neu, color: "#F59E0B" },
          { name: "Negative", value: neg, color: "#EF4444" },
        ]);
      }

      // 8️⃣ ATTENDANCE FOR TODAY ONLY
      console.log("📌 Fetching today's attendance");

      const todayDate = new Date().toISOString().slice(0, 10);
      const todayStart = `${todayDate} 00:00:00`;
      const todayEnd = `${todayDate} 23:59:59`;

      const { data: todayLogs, error: todayError } = await supabase
        .from("mood_logs")
        .select("employee_email, mood, created_at")
        .gte("created_at", todayStart)
        .lte("created_at", todayEnd);

      console.log("📥 Today logs:", todayLogs);
      console.log("❌ Attendance error:", todayError);

      const todayAttendance = team.map((m: any) => {
        const log = todayLogs?.find((l: any) => l.employee_email === m.email);

        return {
          name: m.firstName ?? (m.email as string).split("@")[0],
          percentage: log ? 100 : 0,
          mood: log?.mood ?? "absent",
        };
      });

      console.log("📊 FINAL TODAY ATTENDANCE:", todayAttendance);
      setAttendanceData(todayAttendance);

      // 9️⃣ STRESS + MICRO-FEEDBACK (7-day window) + BURNOUT ALERTS
      console.log("📌 Loading 7-day stress & micro-feedback for burnout model");

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

      const sevenStartDate = sevenDaysAgo.toISOString().slice(0, 10);
      const sevenStart = `${sevenStartDate} 00:00:00`;
      const endDate = new Date().toISOString().slice(0, 10);
      const sevenEnd = `${endDate} 23:59:59`;

      type Mood7Row = {
        employee_email: string;
        mood: string | null;
        stress_level: number | null;
        created_at: string;
      };

      type Micro7Row = {
        employee_email: string;
        score: number | null;
        created_at: string;
      };

      // mood_logs with stress_level
      const {
        data: mood7dRaw,
        error: mood7dError,
      } = await supabase
        .from("mood_logs")
        .select("employee_email, mood, stress_level, created_at")
        .in("employee_email", teamEmails)
        .gte("created_at", sevenStart)
        .lte("created_at", sevenEnd);

      const mood7d = (mood7dRaw || []) as Mood7Row[];

      console.log("📥 7-day mood+stress logs:", mood7d);
      console.log("❌ 7-day mood+stress error:", mood7dError);

      // micro_feedback
      const {
        data: micro7dRaw,
        error: micro7dError,
      } = await supabase
        .from("micro_feedback")
        .select("employee_email, score, created_at")
        .in("employee_email", teamEmails)
        .gte("created_at", sevenStart)
        .lte("created_at", sevenEnd);

      const micro7d = (micro7dRaw || []) as Micro7Row[];

      console.log("📥 7-day micro_feedback rows:", micro7d);
      console.log("❌ 7-day micro_feedback error:", micro7dError);

      // ---- Aggregate for burnout rules + averages ----
      let stressSum = 0;
      let stressCount = 0;
      let microSum = 0;
      let microCount = 0;

      const alerts: BurnoutAlert[] = [];

      // Build micro trend per day (last 7 days)
      const microTrend: MicroTrendPoint[] = [];

      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        const label = d.toLocaleDateString("en-US", { weekday: "short" });

        const rowsForDay = micro7d.filter(
          (r) => new Date(r.created_at).toISOString().slice(0, 10) === key
        );

        if (rowsForDay.length > 0) {
          const sumDay = rowsForDay.reduce(
            (acc, r) => acc + (r.score ?? 0),
            0
          );
          const avgDay = sumDay / rowsForDay.length;
          microTrend.push({ day: label, score: Math.round(avgDay * 10) / 10 });
        } else {
          microTrend.push({ day: label, score: 0 });
        }
      }

      setMicroFeedbackTrend(microTrend);

      // For each team member, evaluate burnout rules
      team.forEach((m: any) => {
        const email: string = m.email;
        const name: string = m.firstName ?? email.split("@")[0];

        const userMoodLogs = mood7d.filter((l) => l.employee_email === email);
        const userMicroRows = micro7d.filter((r) => r.employee_email === email);

        const stressDates = new Set<string>();
        const sadDates = new Set<string>();
        const lowMicroDates = new Set<string>();

        // Mood + stress aggregation
        userMoodLogs.forEach((l) => {
          const dayKey = new Date(l.created_at).toISOString().slice(0, 10);

          if (l.stress_level != null) {
            stressSum += l.stress_level;
            stressCount++;
            if (l.stress_level >= 8) {
              stressDates.add(dayKey);
            }
          }

          if (l.mood === "sad") {
            sadDates.add(dayKey);
          }
        });

        // Micro-feedback aggregation
        userMicroRows.forEach((r) => {
          const dayKey = new Date(r.created_at).toISOString().slice(0, 10);
          microSum += r.score ?? 0;
          microCount++;

          if ((r.score ?? 0) <= 2) {
            lowMicroDates.add(dayKey);
          }
        });

        // Burnout rules
        const condA = stressDates.size >= 3; // high stress (>=8) on 3+ days
        const condB = sadDates.size >= 3; // sad mood on 3+ days
        const condC = lowMicroDates.size >= 2; // low micro score (<=2) on 2+ days

        const rulesTriggered = [condA, condB, condC].filter(Boolean).length;

        if (rulesTriggered > 0) {
          alerts.push({
            email,
            name,
            rulesTriggered,
            conditions: {
              highStressDays: stressDates.size,
              sadDays: sadDates.size,
              lowMicroDays: lowMicroDates.size,
            },
          });
        }
      });

      // Sort alerts: most rules triggered first
      alerts.sort((a, b) => b.rulesTriggered - a.rulesTriggered);

      // Average stress + micro-feedback
      const avgStress =
        stressCount > 0 ? Math.round((stressSum / stressCount) * 10) / 10 : 0;
      const avgMicro =
        microCount > 0 ? Math.round((microSum / microCount) * 10) / 10 : 0;

      setBurnoutAlerts(alerts.slice(0, 5));
      setStats((s) => ({
        ...s,
        highRiskCount: alerts.length,
        avgStress,
        avgMicro,
      }));

      // 🔟 MANAGER ANNOUNCEMENTS (only this manager's)
      console.log("📌 Loading manager announcements");
      const { data: annRows, error: annErr } = await supabase
        .from("announcements")
        .select("id, title, message, created_at, created_by, created_by_role")
        .eq("created_by", managerEmail)
        .order("created_at", { ascending: false })
        .limit(10);

      console.log("📢 Announcements:", annRows);
      console.log("❌ Announcements error:", annErr);

      setAnnouncements((annRows || []) as Announcement[]);
    };

    load();
  }, [profile]);

  // ---------------------------
  // ANNOUNCEMENT HANDLERS
  // ---------------------------
  const resetAnnouncementForm = () => {
    setEditingAnnId(null);
    setAnnTitle("");
    setAnnMessage("");
  };

  const handleAnnouncementSubmit = async () => {
    if (!profile?.email) return;
    if (!annTitle.trim() && !annMessage.trim()) return;

    const managerEmail: string = profile.email;
    const role: string = profile.roleTitle || "Manager";

    setSavingAnnouncement(true);

    try {
      if (editingAnnId) {
        // Update existing
        const { error } = await supabase
          .from("announcements")
          .update({
            title: annTitle.trim(),
            message: annMessage.trim(),
          })
          .eq("id", editingAnnId)
          .eq("created_by", managerEmail);

        if (!error) {
          setAnnouncements((prev) =>
            prev.map((a) =>
              a.id === editingAnnId
                ? { ...a, title: annTitle.trim(), message: annMessage.trim() }
                : a
            )
          );
          resetAnnouncementForm();
        } else {
          console.error("Announcement update error", error);
        }
      } else {
        // Insert new
        const { data, error } = await supabase
          .from("announcements")
          .insert({
            title: annTitle.trim(),
            message: annMessage.trim(),
            created_by: managerEmail,
            created_by_role: role,
          })
          .select(
            "id, title, message, created_at, created_by, created_by_role"
          )
          .single();

        if (!error && data) {
          setAnnouncements((prev) => [
            data as Announcement,
            ...prev,
          ]);
          resetAnnouncementForm();
        } else {
          console.error("Announcement insert error", error);
        }
      }
    } finally {
      setSavingAnnouncement(false);
    }
  };

  const handleAnnouncementEdit = (ann: Announcement) => {
    setEditingAnnId(ann.id);
    setAnnTitle(ann.title || "");
    setAnnMessage(ann.message || "");
  };

  const handleAnnouncementDelete = async (id: string) => {
    if (!profile?.email) return;

    const managerEmail: string = profile.email;
    setDeletingAnnId(id);

    try {
      const { error } = await supabase
        .from("announcements")
        .delete()
        .eq("id", id)
        .eq("created_by", managerEmail);

      if (!error) {
        setAnnouncements((prev) => prev.filter((a) => a.id !== id));
      } else {
        console.error("Announcement delete error", error);
      }
    } finally {
      setDeletingAnnId(null);
    }
  };

  const bannerTitle =
    stats.avgEngagement >= 80
      ? "Excellent Team Engagement — keep up the momentum!"
      : stats.avgEngagement >= 65
      ? "Stable Engagement — continue supporting your team."
      : "Low Engagement Detected — consider interventions.";

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#E8F1FF] via-white to-slate-50">
      {/* HEADER */}
      <header className="sticky top-0 bg-white/80 backdrop-blur-sm border-b border-slate-200 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-[#33C38C] to-emerald-600 p-2 rounded-xl">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl">ForteHR Manager Portal</h1>
              <p className="text-xs text-slate-600">
                Welcome {profile?.firstName}
              </p>
            </div>
          </div>

          <Button onClick={onLogout} variant="outline" className="rounded-xl">
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      {/* MAIN */}
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8 lg:pr-72">
        {/* Overview Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Engagement */}
          <Card className="p-6 rounded-3xl shadow-lg bg-gradient-to-br from-white to-[#E8F1FF]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Average Engagement</p>
                <h2 className="text-4xl text-[#33C38C]">
                  {stats.avgEngagement}%
                </h2>
              </div>
              <div className="bg-gradient-to-br from-[#33C38C] to-emerald-600 p-4 rounded-2xl">
                <TrendingUp className="w-8 h-8 text-white" />
              </div>
            </div>
          </Card>

          {/* Team Size */}
          <Card className="p-6 rounded-3xl shadow-lg bg-gradient-to-br from-white to-emerald-50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Team Members</p>
                <h2 className="text-4xl text-emerald-600">
                  {stats.teamSize}
                </h2>
              </div>
              <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-4 rounded-2xl">
                <Users className="w-8 h-8 text-white" />
              </div>
            </div>
          </Card>

          {/* Recognition */}
          <Card className="p-6 rounded-3xl shadow-lg bg-gradient-to-br from-white to-purple-50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Recognitions (30 days)</p>
                <h2 className="text-4xl text-purple-600">
                  {stats.recognition30d}
                </h2>
              </div>
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-4 rounded-2xl">
                <Award className="w-8 h-8 text-white" />
              </div>
            </div>
          </Card>
        </div>

        {/* Insights Banner */}
        <Card className="p-6 rounded-3xl shadow-lg bg-gradient-to-r from-[#33C38C] to-emerald-600 text-white">
          <div className="flex items-center gap-4">
            <Activity className="w-10 h-10" />
            <div>
              <h3 className="text-xl">{bannerTitle}</h3>
              <p className="text-emerald-100 text-sm">
                {stats.recognition30d > 0
                  ? `Recognition shared ${stats.recognition30d} times this month.`
                  : "Encourage your team with more recognition."}
              </p>
            </div>
          </div>
        </Card>

        {/* SENTIMENT TREND + MOOD DISTRIBUTION */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Sentiment Trend */}
          <Card className="p-8 rounded-3xl shadow-lg">
            <h3 className="text-xl mb-4">Team Sentiment Trend</h3>
            <div className="h-[420px] w-full">
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={sentimentTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis domain={["dataMin - 5", "dataMax + 5"]} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#33C38C"
                    strokeWidth={3}
                    dot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Mood Distribution */}
          <Card className="p-8 rounded-3xl shadow-lg">
            <h3 className="text-xl mb-4">Mood Distribution (Monthly)</h3>

            <div className="h-[420px] w-full">
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={moodDistribution}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="value"
                    label
                  >
                    {moodDistribution.map((s: any, i: number) => (
                      <Cell key={i} fill={s.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* TOP PERFORMERS */}
        <Card className="p-8 rounded-3xl shadow-lg">
          <h3 className="text-xl mb-4 flex items-center gap-2">
            <Award className="w-6 h-6 text-[#33C38C]" />
            Top Performers
          </h3>

          <div className="space-y-3">
            {topPerformers.length === 0 && (
              <p className="text-sm text-slate-500">No data yet.</p>
            )}

            {topPerformers.map((tp: any) => (
              <div
                key={tp.id}
                className="p-4 rounded-2xl bg-gradient-to-br from-white to-[#E8F1FF] flex items-center justify-between"
              >
                <div>
                  <p className="font-medium">{tp.employee_email}</p>
                  <p className="text-sm text-slate-500">
                    Engagement: {tp.engagement_score}%
                  </p>
                </div>

                <Badge className="bg-[#33C38C] text-white rounded-xl px-4 py-1">
                  Rank #{tp.rank}
                </Badge>
              </div>
            ))}
          </div>
        </Card>

        {/* TEAM INSIGHTS */}
        <Card className="p-8 rounded-3xl shadow-lg">
          <h3 className="text-xl mb-4 flex items-center gap-2">
            <Lightbulb className="w-6 h-6 text-yellow-500" />
            Team Insights
          </h3>

          <div className="space-y-4">
            {teamInsights.length === 0 && (
              <p className="text-sm text-slate-500">No insights available.</p>
            )}

            {teamInsights.map((ins: any) => (
              <Card
                key={ins.id}
                className="p-4 rounded-2xl border border-slate-200"
              >
                <p className="font-medium">{ins.insight}</p>
                <p className="text-xs text-slate-500 mt-1">
                  Category: {ins.category} • Score: {ins.score}
                </p>
              </Card>
            ))}
          </div>
        </Card>

        {/* ANNOUNCEMENTS (Manager-only create/edit/delete + scrollable list) */}
        <Card className="p-8 rounded-3xl shadow-lg bg-gradient-to-br from-white to-slate-50">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Form */}
            <div className="lg:w-2/5 space-y-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-purple-600" />
                <h3 className="text-lg font-semibold">
                  Team Announcements
                </h3>
              </div>
              <p className="text-xs text-slate-500">
                Share quick updates, wins, or reminders with your team. Only
                announcements created by you appear here.
              </p>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs text-slate-600">
                    Title
                  </label>
                  <Input
                    value={annTitle}
                    onChange={(e) => setAnnTitle(e.target.value)}
                    placeholder="e.g., Sprint review on Friday"
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-600">
                    Message
                  </label>
                  <textarea
                    value={annMessage}
                    onChange={(e) => setAnnMessage(e.target.value)}
                    placeholder="Short, clear update for your team..."
                    className="w-full min-h-[90px] rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
                  />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <Button
                    size="sm"
                    className="rounded-xl bg-gradient-to-r from-[#33C38C] to-emerald-600 text-white"
                    onClick={handleAnnouncementSubmit}
                    disabled={savingAnnouncement}
                  >
                    {savingAnnouncement
                      ? "Saving..."
                      : editingAnnId
                      ? "Update Announcement"
                      : "Post Announcement"}
                  </Button>
                  {editingAnnId && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-xl"
                      onClick={resetAnnouncementForm}
                    >
                      Cancel edit
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* List */}
            <div className="lg:w-3/5">
              <p className="text-xs text-slate-500 mb-2">
                Recent announcements
              </p>
              {announcements.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No announcements yet. Post one to keep everyone aligned.
                </p>
              ) : (
                <div className="max-h-72 overflow-y-auto pr-1 space-y-3">
                  {announcements.map((a) => (
                    <Card
                      key={a.id}
                      className="p-4 rounded-2xl border border-slate-200 flex flex-col gap-2"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-800">
                            {a.title || "Untitled announcement"}
                          </p>
                          <p className="text-xs text-slate-600 mt-1 whitespace-pre-line">
                            {a.message || ""}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1 text-[11px] text-slate-400">
                          <span>
                            {new Date(a.created_at).toLocaleDateString(
                              undefined,
                              {
                                month: "short",
                                day: "numeric",
                              }
                            )}
                          </span>
                          <div className="flex gap-1">
                            <button
                              className="px-2 py-0.5 rounded-full border border-slate-200 text-[11px] hover:bg-slate-50"
                              onClick={() => handleAnnouncementEdit(a)}
                            >
                              Edit
                            </button>
                            <button
                              className="px-2 py-0.5 rounded-full border border-red-200 text-[11px] text-red-600 hover:bg-red-50"
                              onClick={() => handleAnnouncementDelete(a.id)}
                              disabled={deletingAnnId === a.id}
                            >
                              {deletingAnnId === a.id ? "Deleting..." : "Delete"}
                            </button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* BURNOUT ALERTS */}
        <Card className="p-8 rounded-3xl shadow-lg bg-white">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <h3 className="text-xl">Burnout Alerts (Last 7 Days)</h3>
            </div>
            <Badge className="rounded-xl bg-slate-100 text-slate-700">
              Avg stress: {stats.avgStress}/10 • Avg micro: {stats.avgMicro}/5
            </Badge>
          </div>

          {burnoutAlerts.length === 0 ? (
            <p className="text-sm text-slate-500">
              No burnout risk detected in the last week. Keep supporting your
              team!
            </p>
          ) : (
            <div className="space-y-4">
              {burnoutAlerts.map((b) => {
                const riskLabel =
                  b.rulesTriggered === 1
                    ? "Low Risk"
                    : b.rulesTriggered === 2
                    ? "Moderate Risk"
                    : "High Risk";

                const riskColor =
                  b.rulesTriggered === 1
                    ? "text-emerald-600 bg-emerald-50"
                    : b.rulesTriggered === 2
                    ? "text-yellow-700 bg-yellow-50"
                    : "text-red-600 bg-red-50";

                return (
                  <Card
                    key={b.email}
                    className="p-5 rounded-2xl border border-slate-200 flex flex-col gap-3"
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-slate-800">
                        {b.name}
                      </p>
                      <span
                        className={`text-xs px-3 py-1 rounded-full border ${riskColor}`}
                      >
                        {riskLabel} • Rules {b.rulesTriggered}/3
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                      <span className="px-3 py-1 rounded-full bg-slate-100">
                        High stress: {b.conditions.highStressDays} days (≥ 8/10)
                      </span>
                      <span className="px-3 py-1 rounded-full bg-slate-100">
                        Sad mood: {b.conditions.sadDays} days
                      </span>
                      <span className="px-3 py-1 rounded-full bg-slate-100">
                        Low micro: {b.conditions.lowMicroDays} days (≤ 2/5)
                      </span>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Optional: micro-feedback mini trend */}
          {microFeedbackTrend.length > 0 && (
            <div className="mt-6">
              <p className="text-xs text-slate-500 mb-2">
                Team micro-feedback (last 7 days)
              </p>
              <div className="h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={microFeedbackTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="day" stroke="#64748b" />
                    <YAxis
                      stroke="#64748b"
                      domain={[0, 5]}
                      tickCount={6}
                    />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="#6366f1"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </Card>

        {/* ATTENDANCE */}
        <Card className="p-8 rounded-3xl shadow-lg">
          <h3 className="text-xl mb-4">Team Attendance (Mood Check-ins)</h3>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={attendanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="percentage" radius={[8, 8, 0, 0]}>
                  {attendanceData.map((a: any, i: number) => (
                    <Cell
                      key={i}
                      fill={
                        a.mood === "happy"
                          ? "#22C55E"
                          : a.mood === "neutral"
                          ? "#F59E0B"
                          : a.mood === "sad"
                          ? "#EF4444"
                          : "#D1D5DB"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Quick Actions — fixed on large screens, compact bottom on mobile */}
        <div>
          {/* Desktop / large: fixed right panel */}
          <div className="hidden lg:block">
            <div className="fixed right-6 top-28 z-50 w-64">
              <Card className="p-4 rounded-3xl shadow-2xl bg-gradient-to-br from-white to-purple-50 border border-slate-100">
                <h3 className="text-lg mb-3">Quick Actions</h3>
                <div className="flex flex-col gap-3">
                  <Button
                    className="w-full py-3 rounded-2xl bg-gradient-to-br from-[#33C38C] to-emerald-600 text-white flex items-center justify-center gap-2"
                    onClick={() => onNavigate("manager-recognition")}
                  >
                    <Award className="w-5 h-5" />
                    Recognition
                  </Button>

                  <Button
                    className="w-full py-3 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center gap-2"
                    onClick={() => onNavigate("manager-feedback")}
                  >
                    <MessageCircle className="w-5 h-5" />
                    Check Feedback
                  </Button>

                  <Button
                    className="w-full py-3 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 text-white flex items-center justify-center gap-2"
                    onClick={() => onNavigate("profile")}
                  >
                    <User className="w-5 h-5" />
                    Profile
                  </Button>
                </div>
              </Card>
            </div>
          </div>

          {/* Mobile: fixed bottom bar */}
          <div className="fixed left-0 right-0 bottom-0 z-50 p-3 bg-white/90 backdrop-blur-sm border-t border-slate-200 lg:hidden">
            <div className="max-w-7xl mx-auto px-6">
              <div className="flex justify-around">
                <button
                  onClick={() => onNavigate("manager-recognition")}
                  className="flex flex-col items-center gap-1 text-slate-700"
                >
                  <Award className="w-6 h-6 text-[#33C38C]" />
                  <span className="text-xs">Recognition</span>
                </button>

                <button
                  onClick={() => onNavigate("manager-feedback")}
                  className="flex flex-col items-center gap-1 text-slate-700"
                >
                  <MessageCircle className="w-6 h-6 text-blue-600" />
                  <span className="text-xs">Feedback</span>
                </button>

                <button
                  onClick={() => onNavigate("profile")}
                  className="flex flex-col items-center gap-1 text-slate-700"
                >
                  <User className="w-6 h-6 text-purple-600" />
                  <span className="text-xs">Profile</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
