// src/components/EmployeeDashboard.tsx
import { useEffect, useState } from "react";
import { supabase } from "../utils/supabase/client";
import { toast } from "react-hot-toast";

import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Progress } from "./ui/progress";
import { Badge } from "./ui/badge";

import {
  Smile,
  Meh,
  Frown,
  MessageCircle,
  TrendingUp,
  Award,
  Activity,
  Home,
  LogOut,
  AlertTriangle,
  Megaphone,
  Bot,
  Send,
  X,
} from "lucide-react";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import { FeedbackModal } from "./FeedbackModal";

interface EmployeeDashboardProps {
  onNavigate: (page: string) => void;
  onLogout: () => void;
  user: any;
}

type MoodStats = {
  loading: boolean;
  total30d: number;
  happy: number;
  neutral: number;
  sad: number;
  lastMood: "happy" | "neutral" | "sad" | null;
};

type EngagementPoint = {
  label: string;
  score: number;
};

type RecognitionItem = {
  id: string;
  from_email: string;
  to_email: string;
  message: string;
  created_at: string;
  from_name: string;
  to_name: string;
  direction: "to" | "from"; // "to" = you received, "from" = you sent
};

type Announcement = {
  id: string;
  title: string | null;
  message: string | null;
  created_at: string;
  created_by: string | null;
  created_by_role: string | null;
};

type CompanyRecognition = {
  id: string;
  from_name: string;
  to_name: string;
  message: string;
  created_at: string;
  department?: string | null;
  tags?: string[];
};

export function EmployeeDashboard({
  onNavigate,
  onLogout,
  user,
}: EmployeeDashboardProps) {
  const [selectedMood, setSelectedMood] = useState<
    "happy" | "neutral" | "sad" | null
  >(null);

  const [moodSubmitted, setMoodSubmitted] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedback, setFeedback] = useState("");

  const [moodStats, setMoodStats] = useState<MoodStats>({
    loading: true,
    total30d: 0,
    happy: 0,
    neutral: 0,
    sad: 0,
    lastMood: null,
  });

  const [engagementData, setEngagementData] = useState<EngagementPoint[]>([]);
  const [engagementDelta, setEngagementDelta] = useState<number | null>(null);

  const [wellbeingScores, setWellbeingScores] = useState<{
    mental: number;
    physical: number;
    workLife: number;
    career: number;
  }>({
    mental: 80,
    physical: 75,
    workLife: 70,
    career: 85,
  });



    // 👉 AI Chatbot state
  type ChatMessage = {
    role: "user" | "assistant";
    content: string;
  };

  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hi, I’m your ForteHR Assistant. I can help with how you’re feeling at work, managing stress, and planning your career steps.",
    },
  ]);
  const [chatLoading, setChatLoading] = useState(false);


  const [recognitionFeed, setRecognitionFeed] = useState<RecognitionItem[]>([]);
  const [loadingRecognition, setLoadingRecognition] = useState(true);

  // 👉 New: Stress slider state
  const [stressLevel, setStressLevel] = useState<number>(5);

  // 👉 New: Micro-feedback poll state
  const [microFeedbackScore, setMicroFeedbackScore] = useState<number | null>(
    null
  );
  const [microSubmitting, setMicroSubmitting] = useState(false);
  const [microSubmitted, setMicroSubmitted] = useState(false);

  // 👉 New: Announcements feed
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(true);

  // 👉 New: Company-wide recognition wall
  const [companyWall, setCompanyWall] = useState<CompanyRecognition[]>([]);
  const [loadingWall, setLoadingWall] = useState(true);

  // Utility: format "time ago"
  const formatTimeAgo = (isoString: string) => {
    const created = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - created.getTime();

    const minutes = Math.floor(diffMs / (1000 * 60));
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes} min ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;

    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} day${days > 1 ? "s" : ""} ago`;

    const weeks = Math.floor(days / 7);
    return `${weeks} week${weeks > 1 ? "s" : ""} ago`;
  };

  // ---- Load Profile ----
  useEffect(() => {
    if (!user?.email) return;

    const fetchProfile = async () => {
      const { data } = await supabase
        .from("employees")
        .select("*")
        .eq("email", user.email)
        .single();

      if (data) setProfile(data);
    };

    fetchProfile();
  }, [user]);

  // ---- Load Mood Stats (and reusable for refresh) ----
  const refreshMoodStats = async () => {
    if (!user?.email) return;

    const thirty = new Date();
    thirty.setDate(thirty.getDate() - 30);

    const { data: rows } = await supabase
      .from("mood_logs")
      .select("mood, created_at")
      .eq("employee_email", user.email)
      .gte("created_at", thirty.toISOString());

    let happy = 0,
      neutral = 0,
      sad = 0;

    rows?.forEach((r: any) => {
      if (r.mood === "happy") happy++;
      if (r.mood === "neutral") neutral++;
      if (r.mood === "sad") sad++;
    });

    const { data: latest } = await supabase
      .from("mood_logs")
      .select("mood")
      .eq("employee_email", user.email)
      .order("created_at", { ascending: false })
      .limit(1);

    setMoodStats({
      loading: false,
      total30d: rows?.length ?? 0,
      happy,
      neutral,
      sad,
      lastMood: latest?.[0]?.mood ?? null,
    });
  };

  useEffect(() => {
    refreshMoodStats();
  }, [user]);

  // ---- Load Engagement Trend + Wellbeing from performance_scores ----
  useEffect(() => {
    if (!user?.email) return;

    const loadPerformanceData = async () => {
      const { data: perfRows } = await supabase
        .from("performance_scores")
        .select("engagement_score, wellbeing_score, risk_score, created_at")
        .eq("employee_email", user.email)
        .order("created_at", { ascending: true })
        .limit(6);

      if (perfRows && perfRows.length > 0) {
        const points: EngagementPoint[] = perfRows.map(
          (row: any, idx: number) => {
            const created = new Date(row.created_at);
            const label =
              perfRows.length <= 6
                ? `Week ${idx + 1}`
                : created.toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  });

            return {
              label,
              score: row.engagement_score ?? 0,
            };
          }
        );

        setEngagementData(points);

        const first = perfRows[0];
        const last = perfRows[perfRows.length - 1];
        if (
          first &&
          last &&
          first.engagement_score != null &&
          last.engagement_score != null
        ) {
          setEngagementDelta(last.engagement_score - first.engagement_score);
        } else {
          setEngagementDelta(null);
        }

        const latest = perfRows[perfRows.length - 1];
        const engagement = latest.engagement_score ?? 80;
        const wellbeing = latest.wellbeing_score ?? 80;
        const risk = latest.risk_score ?? 40;

        const mental = Math.min(100, Math.max(40, wellbeing));
        const physical = Math.min(100, Math.max(40, wellbeing - 5));
        const workLife = Math.min(100, Math.max(30, 100 - risk));
        const career = Math.min(
          100,
          Math.max(50, Math.round((engagement + wellbeing) / 2))
        );

        setWellbeingScores({
          mental,
          physical,
          workLife,
          career,
        });
      } else {
        setEngagementData([]);
        setEngagementDelta(null);
      }
    };

    loadPerformanceData();
  }, [user]);

  // ---- Load personal Recognition feed (TO + FROM this employee) ----
  useEffect(() => {
    if (!user?.email) return;

    const loadRecognition = async () => {
      setLoadingRecognition(true);

      const { data: recRows } = await supabase
        .from("recognition")
        .select("id, from_email, to_email, message, created_at")
        .or(`from_email.eq.${user.email},to_email.eq.${user.email}`)
        .order("created_at", { ascending: false })
        .limit(10);

      if (!recRows || recRows.length === 0) {
        setRecognitionFeed([]);
        setLoadingRecognition(false);
        return;
      }

      const emailSet = new Set<string>();
      (recRows || []).forEach((r: any) => {
        if (r.from_email) emailSet.add(r.from_email.toLowerCase());
        if (r.to_email) emailSet.add(r.to_email.toLowerCase());
      });

      const emails = Array.from(emailSet);
      let emailToName: Record<string, string> = {};

      if (emails.length > 0) {
        const { data: employeeRows } = await supabase
          .from("employees")
          .select("email, firstName, lastName")
          .in("email", emails);

        (employeeRows || []).forEach((emp: any) => {
          const e = (emp.email || "").toLowerCase();
          const name =
            `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || emp.email;
          emailToName[e] = name;
        });
      }

      const mapped: RecognitionItem[] = (recRows || []).map((r: any) => {
        const fromEmail = (r.from_email || "").toLowerCase();
        const toEmail = (r.to_email || "").toLowerCase();
        const userEmail = (user.email || "").toLowerCase();

        const fromName = emailToName[fromEmail] || r.from_email || "Someone";
        const toName = emailToName[toEmail] || r.to_email || "Someone";

        const direction: "to" | "from" =
          toEmail === userEmail ? "to" : "from";

        return {
          id: r.id,
          from_email: r.from_email,
          to_email: r.to_email,
          message: r.message,
          created_at: r.created_at,
          from_name: fromName,
          to_name: toName,
          direction,
        };
      });

      setRecognitionFeed(mapped);
      setLoadingRecognition(false);
    };

    loadRecognition();
  }, [user]);

  // ---- Load announcements ----
  useEffect(() => {
    const loadAnnouncements = async () => {
      setLoadingAnnouncements(true);
      const { data, error } = await supabase
        .from("announcements")
        .select("id, title, message, created_at, created_by, created_by_role")
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) {
        console.error("Error loading announcements", error);
        setAnnouncements([]);
      } else {
        setAnnouncements((data || []) as Announcement[]);
      }
      setLoadingAnnouncements(false);
    };

    loadAnnouncements();
  }, []);

  // ---- Load company-wide recognition wall ----
  useEffect(() => {
    const loadCompanyWall = async () => {
      setLoadingWall(true);

      const { data: recRows, error } = await supabase
        .from("recognition")
        .select(
          "id, from_email, to_email, message, created_at, department, tags"
        )
        .order("created_at", { ascending: false })
        .limit(30);

      if (error) {
        console.error("Error loading recognition wall", error);
        setCompanyWall([]);
        setLoadingWall(false);
        return;
      }

      if (!recRows || recRows.length === 0) {
        setCompanyWall([]);
        setLoadingWall(false);
        return;
      }

      const emailSet = new Set<string>();
      (recRows || []).forEach((r: any) => {
        if (r.from_email) emailSet.add(r.from_email.toLowerCase());
        if (r.to_email) emailSet.add(r.to_email.toLowerCase());
      });

      const emails = Array.from(emailSet);
      let emailToName: Record<string, string> = {};

      if (emails.length > 0) {
        const { data: employeeRows } = await supabase
          .from("employees")
          .select("email, firstName, lastName")
          .in("email", emails);

        (employeeRows || []).forEach((emp: any) => {
          const e = (emp.email || "").toLowerCase();
          const name =
            `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || emp.email;
          emailToName[e] = name;
        });
      }

      const mapped: CompanyRecognition[] = (recRows || []).map((r: any) => {
        const fromEmail = (r.from_email || "").toLowerCase();
        const toEmail = (r.to_email || "").toLowerCase();

        const fromName = emailToName[fromEmail] || r.from_email || "Someone";
        const toName = emailToName[toEmail] || r.to_email || "Someone";

        let parsedTags: string[] = [];
        if (Array.isArray(r.tags)) {
          parsedTags = (r.tags as any[]).map((t) => String(t)).filter(Boolean);
        } else if (typeof r.tags === "string") {
          parsedTags = r.tags
            .split(",")
            .map((t: string) => t.trim())
            .filter(Boolean);
        }

        return {
          id: r.id,
          from_name: fromName,
          to_name: toName,
          message: r.message,
          created_at: r.created_at,
          department: r.department ?? null,
          tags: parsedTags,
        };
      });

      setCompanyWall(mapped);
      setLoadingWall(false);
    };

    loadCompanyWall();
  }, []);

  // ---- Submit Mood to Supabase (with stress_level) ----
  const handleMoodSubmit = async () => {
    if (!selectedMood || !user?.email) return;

    const email = user.email.toLowerCase();
    const today = new Date().toISOString().slice(0, 10);
    const start = today + " 00:00:00";
    const end = today + " 23:59:59";

    const { data: todayRows } = await supabase
      .from("mood_logs")
      .select("id")
      .eq("employee_email", email)
      .gte("created_at", start)
      .lte("created_at", end);

    if (todayRows && todayRows.length > 0) {
      alert("You already submitted today's mood!");
      return;
    }

    await supabase.from("mood_logs").insert({
      employee_email: email,
      mood: selectedMood,
      stress_level: stressLevel,
      created_at: new Date().toISOString(),
    });

    setMoodSubmitted(true);
    setTimeout(() => setMoodSubmitted(false), 3000);

    await refreshMoodStats();
  };

  // ---- Micro-feedback poll submit ----
  const handleMicroFeedbackSubmit = async () => {
    if (!user?.email) return;
    if (microFeedbackScore == null) {
      toast.error("Please select a rating for your day.");
      return;
    }

    setMicroSubmitting(true);
    const email = user.email.toLowerCase();

    try {
      const today = new Date().toISOString().slice(0, 10);
      const start = today + " 00:00:00";
      const end = today + " 23:59:59";

      const { data: existing } = await supabase
        .from("micro_feedback")
        .select("id, created_at")
        .eq("employee_email", email)
        .gte("created_at", start)
        .lte("created_at", end);

      if (existing && existing.length > 0) {
        toast("You've already logged today's quick check-in.", {
          icon: "✅",
        });
        setMicroSubmitted(true);
        setMicroSubmitting(false);
        return;
      }

      const { error } = await supabase.from("micro_feedback").insert({
        employee_email: email,
        score: microFeedbackScore,
      });

      if (error) {
        console.error("Micro feedback insert error", error);
        toast.error("Could not submit quick check-in.");
      } else {
        toast.success("Thanks for your quick check-in!");
        setMicroSubmitted(true);
      }
    } finally {
      setMicroSubmitting(false);
    }
  };

  const handleSubmitFeedback = async () => {
    if (!feedback.trim()) {
      toast.error("Please write your feedback.");
      return;
    }

    const email = user?.email?.toLowerCase();
    if (!email) {
      toast.error("User not found.");
      return;
    }

    const { data: emp, error: empErr } = await supabase
      .from("employees")
      .select("department")
      .eq("email", email)
      .single();

    if (empErr) console.error("Emp load error for anonymous feedback", empErr);

    const department = emp?.department ?? "General";

    const moodValue =
      selectedMood === "happy"
        ? "happy"
        : selectedMood === "neutral"
        ? "neutral"
        : "sad";

    const { error } = await supabase.from("anonymous_feedback").insert({
      employee_email: email,
      message: feedback.trim(),
      mood: moodValue,
      department: department,
      sentiment: null,
    });

    if (error) {
      toast.error("Failed to submit feedback.");
      console.error(error);
      return;
    }

    toast.success("Your anonymous feedback has been submitted!");
    setFeedback("");
    setSelectedMood(null);
  };
  const handleSendChat = async () => {
    if (!chatInput.trim()) return;

    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    console.log("Using OpenAI API Key:", apiKey ? "FOUND" : "NOT FOUND");
    if (!apiKey) {
      toast.error("AI assistant is not configured yet.");
      return;
    }

    const newUserMessage: ChatMessage = {
      role: "user",
      content: chatInput.trim(),
    };

    const messagesSoFar = [...chatMessages, newUserMessage];

    setChatMessages(messagesSoFar);
    setChatInput("");
    setChatLoading(true);

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4.1-mini",
          messages: [
            {
              role: "system",
              content:
                "You are ForteHR Assistant, a calm, empathetic HR-style AI. You support employees with work stress, work-life balance, and career growth. Be practical, encouraging, and concise. Don’t sound like a therapist; sound like a supportive HR and career mentor.",
            },
            ...messagesSoFar.map((m) => ({
              role: m.role,
              content: m.content,
            })),
          ],
          temperature: 0.7,
        }),
      });

      const data = await response.json();

      const reply =
        data?.choices?.[0]?.message?.content?.trim() ||
        "I’m sorry, I couldn’t generate a response right now.";

      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: reply,
      };

      setChatMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      console.error("AI chat error:", err);
      toast.error("The assistant is temporarily unavailable.");
    } finally {
      setChatLoading(false);
    }
  };


  const renderMoodInsightText = () => {
    if (moodStats.loading) return <p>Loading...</p>;

    const { total30d, happy, neutral, sad, lastMood } = moodStats;

    if (total30d === 0)
      return (
        <>
          <p>You haven’t logged any check-ins this month.</p>
          <p>Start today by selecting your mood above.</p>
        </>
      );

    return (
      <div className="space-y-1">
        <p>
          In the last 30 days, you logged <b>{total30d}</b> moods:{" "}
          <b>{happy} happy</b>, <b>{neutral} neutral</b>, <b>{sad} sad</b>.
        </p>

        {lastMood && (
          <p>
            Your most recent check-in was{" "}
            <b className="capitalize">{lastMood}</b>.
          </p>
        )}

        {sad > total30d / 3 ? (
          <p className="text-red-500">
            You’ve been feeling low recently. Try taking small breaks or talking
            to someone you trust.
          </p>
        ) : happy >= neutral && happy >= sad ? (
          <p className="text-green-600">
            Your mood is very positive — keep it going!
          </p>
        ) : (
          <p className="text-yellow-600">
            Mixed moods recently — small habits can help you stay balanced.
          </p>
        )}
      </div>
    );
  };

  const stressLabel =
    stressLevel <= 3 ? "Low" : stressLevel <= 7 ? "Moderate" : "High";

  const stressColor =
    stressLevel <= 3
      ? "text-emerald-600 bg-emerald-50"
      : stressLevel <= 7
      ? "text-yellow-700 bg-yellow-50"
      : "text-red-600 bg-red-50";

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#E8F1FF] via-white to-slate-50 pb-24">
      {/* HEADER */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-[#33C38C] to-emerald-600 p-2 rounded-xl">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl">ForteHR</h1>
                <p className="text-xs text-slate-600">Employee Portal</p>
              </div>
            </div>
            <Button onClick={onLogout} variant="outline" className="rounded-xl">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Greeting */}
        <div className="space-y-2">
          <h2 className="text-3xl">
            Hi {profile?.firstName ?? "there"}, how are you feeling today?
          </h2>
          <p className="text-slate-600">
            Your well-being matters to us. Share your mood and track your
            growth.
          </p>
        </div>

        {/* Mood Tracker + Stress Slider */}
        <Card className="p-8 shadow-lg border-0 rounded-3xl bg-gradient-to-br from-white to-[#E8F1FF]">
          <div className="space-y-8">
            <div className="flex items-center gap-3">
              <Smile className="w-6 h-6 text-[#33C38C]" />
              <h3 className="text-xl">Daily Mood Check-in</h3>
            </div>

            {/* Mood icons */}
            <div className="flex gap-6 justify-center">
              <button
                onClick={() => setSelectedMood("happy")}
                className={`p-8 rounded-3xl transition-all duration-300 ${
                  selectedMood === "happy"
                    ? "bg-[#33C38C] shadow-2xl scale-110"
                    : "bg-white hover:bg-slate-50 shadow-lg hover:scale-105"
                }`}
              >
                <Smile
                  className={`w-16 h-16 ${
                    selectedMood === "happy" ? "text-white" : "text-[#33C38C]"
                  }`}
                />
              </button>
              <button
                onClick={() => setSelectedMood("neutral")}
                className={`p-8 rounded-3xl transition-all duration-300 ${
                  selectedMood === "neutral"
                    ? "bg-yellow-500 shadow-2xl scale-110"
                    : "bg-white hover:bg-slate-50 shadow-lg hover:scale-105"
                }`}
              >
                <Meh
                  className={`w-16 h-16 ${
                    selectedMood === "neutral"
                      ? "text-white"
                      : "text-yellow-500"
                  }`}
                />
              </button>
              <button
                onClick={() => setSelectedMood("sad")}
                className={`p-8 rounded-3xl transition-all duration-300 ${
                  selectedMood === "sad"
                    ? "bg-red-500 shadow-2xl scale-110"
                    : "bg-white hover:bg-slate-50 shadow-lg hover:scale-105"
                }`}
              >
                <Frown
                  className={`w-16 h-16 ${
                    selectedMood === "sad" ? "text-white" : "text-red-500"
                  }`}
                />
              </button>
            </div>

            {/* Stress slider */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  <span className="text-sm font-medium text-slate-700">
                    Stress level today
                  </span>
                </div>
                <span
                  className={`text-xs px-3 py-1 rounded-full border ${stressColor}`}
                >
                  {stressLabel} • {stressLevel}/10
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500 w-10 text-left">1</span>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={stressLevel}
                  onChange={(e) => setStressLevel(Number(e.target.value))}
                  className="w-full accent-[#33C38C]"
                />
                <span className="text-xs text-slate-500 w-10 text-right">
                  10
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                This stays private but helps the system understand long-term
                stress trends.
              </p>
            </div>

            <div className="text-center">
              <Button
                onClick={handleMoodSubmit}
                disabled={!selectedMood}
                className="px-8 py-6 rounded-xl bg-gradient-to-r from-[#33C38C] to-emerald-600 hover:from-emerald-600 hover:to-[#33C38C] disabled:opacity-50"
              >
                {moodSubmitted ? "✓ Mood Submitted!" : "Submit Mood & Stress"}
              </Button>
            </div>
          </div>
        </Card>

        {/* Recognition + Well-Being + Mood Insights */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Recognition Feed (dynamic) */}
          <Card className="p-8 shadow-lg border-0 rounded-3xl">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <Award className="w-6 h-6 text-[#33C38C]" />
                <h3 className="text-xl">Recognition Feed</h3>
              </div>

              {loadingRecognition ? (
                <p className="text-sm text-slate-500">Loading recognition…</p>
              ) : recognitionFeed.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No recognition activity yet. Start by appreciating a teammate
                  on the Recognition page.
                </p>
              ) : (
                <div className="space-y-4">
                  {recognitionFeed.map((item) => (
                    <Card
                      key={item.id}
                      className="p-6 border-slate-200 rounded-2xl hover:shadow-lg transition-all"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="text-sm text-slate-600">
                              {item.direction === "to" ? (
                                <span>
                                  {item.from_name}{" "}
                                  <span className="font-medium">
                                    recognized you
                                  </span>
                                </span>
                              ) : (
                                <span>
                                  You{" "}
                                  <span className="font-medium">
                                    recognized {item.to_name}
                                  </span>
                                </span>
                              )}
                            </div>
                            <p className="text-slate-800">{item.message}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-sm text-slate-500">
                          <span>{formatTimeAgo(item.created_at)}</span>
                          <div className="flex items-center gap-2">
                            {/* likes removed per request */}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </Card>

          {/* Right side: Well-Being Tracker + Mood Insights */}
          <div className="space-y-6">
            {/* Well-Being Tracker */}
            <Card className="p-8 shadow-lg border-0 rounded-3xl">
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <Activity className="w-6 h-6 text-[#33C38C]" />
                  <h3 className="text-xl">Well-Being Tracker</h3>
                </div>
                <div className="space-y-6">
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Mental Wellness</span>
                      <span className="text-[#33C38C]">
                        {wellbeingScores.mental}%
                      </span>
                    </div>
                    <Progress
                      value={wellbeingScores.mental}
                      className="h-3 bg-slate-200"
                    />
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Physical Health</span>
                      <span className="text-blue-600">
                        {wellbeingScores.physical}%
                      </span>
                    </div>
                    <Progress
                      value={wellbeingScores.physical}
                      className="h-3 bg-slate-200"
                    />
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Work-Life Balance</span>
                      <span className="text-yellow-600">
                        {wellbeingScores.workLife}%
                      </span>
                    </div>
                    <Progress
                      value={wellbeingScores.workLife}
                      className="h-3 bg-slate-200"
                    />
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Career Growth</span>
                      <span className="text-purple-600">
                        {wellbeingScores.career}%
                      </span>
                    </div>
                    <Progress
                      value={wellbeingScores.career}
                      className="h-3 bg-slate-200"
                    />
                  </div>
                  <Card className="p-4 bg-gradient-to-br from-[#E8F1FF] to-emerald-50 border-0 rounded-2xl">
                    <p className="text-sm text-slate-700">
                      💡{" "}
                      <span>
                        These scores update as your engagement and wellbeing
                        improve over time.
                      </span>
                    </p>
                  </Card>
                </div>
              </div>
            </Card>

            {/* Mood Insights */}
            <Card className="p-6 shadow-lg border-0 rounded-3xl bg-white">
              <h3 className="text-xl font-semibold mb-3">Your Mood Insights</h3>
              <div className="text-sm text-slate-700">
                {renderMoodInsightText()}
              </div>
            </Card>
          </div>
        </div>

        {/* Announcements + Engagement Journey + Micro Feedback */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Announcements */}
          <Card className="p-6 shadow-lg border-0 rounded-3xl lg:col-span-1 bg-white">
            <div className="flex items-center gap-3 mb-4">
              <Megaphone className="w-5 h-5 text-purple-600" />
              <h3 className="text-lg font-semibold">Announcements</h3>
            </div>
            {loadingAnnouncements ? (
              <p className="text-sm text-slate-500">Loading announcements…</p>
            ) : announcements.length === 0 ? (
              <p className="text-sm text-slate-500">
                No announcements yet. Important company or team updates will
                appear here.
              </p>
            ) : (
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {announcements.map((a) => (
                  <Card
                    key={a.id}
                    className="p-4 rounded-2xl border border-slate-200"
                  >
                    <p className="text-sm font-medium text-slate-800">
                      {a.title || "Update"}
                    </p>
                    <p className="text-xs text-slate-600 mt-1">
                      {a.message || ""}
                    </p>
                    <div className="flex items-center justify-between mt-2 text-[11px] text-slate-400">
                      <span>
                        {new Date(a.created_at).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                      {a.created_by_role && (
                        <span className="px-2 py-0.5 rounded-full bg-slate-100">
                          {a.created_by_role}
                        </span>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </Card>

          {/* Engagement Journey */}
          <Card className="p-8 shadow-lg border-0 rounded-3xl lg:col-span-2">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-6 h-6 text-[#33C38C]" />
                  <h3 className="text-xl">Your Engagement Journey</h3>
                </div>
                <Badge className="bg-[#33C38C] text-white rounded-xl px-4 py-1">
                  {engagementDelta == null
                    ? "Tracked over time"
                    : engagementDelta >= 0
                    ? `+${engagementDelta}% This Period`
                    : `${engagementDelta}% This Period`}
                </Badge>
              </div>
              <div className="h-64">
                {engagementData.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No engagement scores available yet. As soon as your manager
                    or system logs performance, your journey will appear here.
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={engagementData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="label" stroke="#64748b" />
                      <YAxis stroke="#64748b" domain={[0, 100]} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "white",
                          border: "none",
                          borderRadius: "12px",
                          boxShadow: "0 10px 40px rgba(0,0,0,0.1)",
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="score"
                        stroke="#33C38C"
                        strokeWidth={3}
                        dot={{ fill: "#33C38C", r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Company-wide Recognition Wall */}
        <Card className="p-8 shadow-lg border-0 rounded-3xl bg-white">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Award className="w-6 h-6 text-[#33C38C]" />
              <h3 className="text-xl">Company Recognition Wall</h3>
            </div>
            <span className="text-xs text-slate-500">
              Latest appreciation across the organization
            </span>
          </div>

          {loadingWall ? (
            <p className="text-sm text-slate-500">Loading recognition wall…</p>
          ) : companyWall.length === 0 ? (
            <p className="text-sm text-slate-500">
              No recognition activity yet. Once people start appreciating each
              other, it will show up here.
            </p>
          ) : (
            <div className="space-y-4 max-h-80 overflow-y-auto pr-1">
              {companyWall.map((rec) => (
                <Card
                  key={rec.id}
                  className="p-4 rounded-2xl border border-slate-200 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-sm text-slate-700">
                        <span className="font-semibold">{rec.from_name}</span>{" "}
                        <span className="text-slate-500">recognized</span>{" "}
                        <span className="font-semibold">{rec.to_name}</span>
                      </p>
                      <p className="text-sm text-slate-800">
                        “{rec.message}”
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        {rec.department && (
                          <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-xl">
                            {rec.department}
                          </Badge>
                        )}
                        {rec.tags &&
                          rec.tags.length > 0 &&
                          rec.tags.map((tag) => (
                            <Badge
                              key={tag}
                              className="bg-purple-50 text-purple-700 border border-purple-100 rounded-xl text-[11px]"
                            >
                              #{tag}
                            </Badge>
                          ))}
                      </div>
                    </div>
                    <span className="text-[11px] text-slate-400 whitespace-nowrap ml-2">
                      {formatTimeAgo(rec.created_at)}
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </Card>

        {/* Micro-feedback poll + Anonymous Feedback */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Micro-feedback quick poll */}
          <Card className="p-8 shadow-lg border-0 rounded-3xl bg-gradient-to-br from-white to-emerald-50">
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <Activity className="w-6 h-6 text-emerald-600" />
                <h3 className="text-xl">Quick Check-in</h3>
              </div>

              <p className="text-sm text-slate-600">
                How was your day overall? This is a tiny signal we use to understand daily sentiment.
              </p>

              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>Very bad</span>
                <span>Okay</span>
                <span>Great</span>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-600 w-8 text-left">1</span>
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={microFeedbackScore ?? 3}
                  onChange={(e) => setMicroFeedbackScore(Number(e.target.value))}
                  className="w-full accent-emerald-600"
                />
                <span className="text-sm text-slate-600 w-8 text-right">5</span>
              </div>

              {/* ⭐ FIXED SAVE BUTTON */}
              <div className="flex justify-end">
                <Button
                  size="sm"
                  className="px-6 py-2 rounded-xl text-white bg-blue-900 hover:bg-blue-950 shadow-md"
                  disabled={microSubmitting}
                  onClick={handleMicroFeedbackSubmit}
                >
                  {microSubmitting
                    ? "Saving..."
                    : microSubmitted
                    ? "Saved ✓"
                    : "Save"}
                </Button>
              </div>

              <span className="text-xs text-slate-500">
                Once a day is enough — no overthinking.
              </span>
            </div>
          </Card>

          {/* Anonymous Feedback */}
          <Card className="p-8 shadow-lg border-0 rounded-3xl bg-gradient-to-br from-white to-purple-50">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <MessageCircle className="w-6 h-6 text-purple-600" />
                <h3 className="text-xl">Share Anonymous Feedback</h3>
              </div>
              <Textarea
                placeholder="Your feedback helps us improve. Share your thoughts, concerns, or suggestions..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                className="min-h-32 rounded-2xl border-slate-200"
              />
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl"
                    onClick={() => setSelectedMood("happy")}
                  >
                    😀
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl"
                    onClick={() => setSelectedMood("neutral")}
                  >
                    😐
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl"
                    onClick={() => setSelectedMood("sad")}
                  >
                    😞
                  </Button>
                </div>
                <Button
                  className="px-8 py-6 rounded-xl bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
                  type="button"
                  onClick={handleSubmitFeedback}
                >
                  Submit Feedback
                </Button>
              </div>
            </div>
            {/* AI CHATBOT – floating button + panel */}
          <div className="fixed bottom-32 right-6 z-50">
            {/* Chat panel */}
            {chatOpen && (
              <Card className="w-80 md:w-96 mb-4 rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[420px]">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-full bg-emerald-50">
                      <Bot className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        ForteHR Assistant
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Calm HR + Career helper
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setChatOpen(false)}
                    className="p-1 rounded-full hover:bg-slate-100"
                  >
                    <X className="w-4 h-4 text-slate-500" />
                  </button>
                </div>

                {/* Messages */}
                <div className="px-4 py-3 space-y-3 overflow-y-auto flex-1">
                  {chatMessages.map((m, idx) => (
                    <div
                      key={idx}
                      className={`flex ${
                        m.role === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                          m.role === "user"
                            ? "bg-emerald-600 text-white rounded-br-none"
                            : "bg-slate-100 text-slate-800 rounded-bl-none"
                        }`}
                      >
                        {m.content}
                      </div>
                    </div>
                  ))}

                  {chatLoading && (
                    <div className="flex justify-start">
                      <div className="bg-slate-100 text-slate-500 rounded-2xl rounded-bl-none px-3 py-2 text-xs">
                        Thinking…
                      </div>
                    </div>
                  )}
                </div>

                {/* Input */}
                <form
                  className="px-3 py-3 border-t border-slate-200 flex items-center gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!chatLoading) handleSendChat();
                  }}
                >
                  <input
                    type="text"
                    className="flex-1 text-sm rounded-2xl border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder="Ask about stress, career, or work..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                  />
                  <Button
                    type="submit"
                    size="icon"
                    className="rounded-full bg-emerald-600 hover:bg-emerald-700"
                    disabled={chatLoading || !chatInput.trim()}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </form>
              </Card>
            )}

            {/* Floating toggle button */}
            <button
              onClick={() => setChatOpen((prev) => !prev)}
              className="flex items-center gap-2 px-4 py-3 rounded-full shadow-lg bg-emerald-600 text-white hover:bg-emerald-700"
            >
              <Bot className="w-4 h-4" />
              <span className="text-xs font-medium hidden sm:inline">
                Ask ForteHR
              </span>
            </button>
          </div>

          </Card>
        </div>
      </main>
      

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-sm border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-around">
            <button className="flex flex-col items-center gap-1 text-[#33C38C]">
              <Home className="w-6 h-6" />
              <span className="text-xs">Home</span>
            </button>
            <button
              onClick={() => onNavigate("employee-recognition")}
              className="flex flex-col items-center gap-1 text-slate-500 hover:text-[#33C38C]"
            >
              <Award className="w-6 h-6" />
              <span className="text-xs">Recognition</span>
            </button>
            <button
              onClick={() => onNavigate("employee-feedback")}
              className="flex flex-col items-center gap-1 text-slate-500 hover:text-[#33C38C]"
            >
              <MessageCircle className="w-6 h-6" />
              <span className="text-xs">Feedback</span>
            </button>
            <button
              onClick={() => onNavigate("profile")}
              className="flex flex-col items-center gap-1 text-slate-500 hover:text-[#33C38C]"
            >
              <Activity className="w-6 h-6" />
              <span className="text-xs">Profile</span>
            </button>
          </div>
        </div>
      </nav>

      {/* FEEDBACK MODAL */}
      <FeedbackModal
        open={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
        user={user}
        mode="employee"
      />

            



    </div>
  );
}
