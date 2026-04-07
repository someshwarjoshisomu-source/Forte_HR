// src/pages/ManagerRecognitionPage.tsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../utils/supabase/client";

import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { ScrollArea } from "../components/ui/scroll-area";
import { Badge } from "../components/ui/badge";
import { Textarea } from "../components/ui/textarea";
import { Input } from "../components/ui/input";

import {
  Award,
  Users,
  Heart,
  LogOut,
  ArrowLeft,
  Filter,
  Sparkles,
  Home,
} from "lucide-react";

import { toast } from "sonner";

interface ManagerRecognitionPageProps {
  user: any;
  onNavigate: (page: string) => void;
  onLogout: () => void;
}

type UserRole = "employee" | "manager" | "hr";

type EmployeeRow = {
  email: string;
  firstName: string | null;
  lastName: string | null;
  department: string | null;
  role: UserRole;
  manager: string | null;
};

type RecognitionRow = {
  id: string;
  from_email: string | null;
  to_email: string | null;
  message: string;
  created_at: string;
  department: string | null;
  tags: string[] | null;
};

type FilterTab = "all" | "mySent" | "myTeam";

type ManagerStats = {
  mySentLast30: number;
  teamTotalLast30: number;
  teamMembersRecognized: number;
};

export function ManagerRecognitionPage({
  user,
  onNavigate,
  onLogout,
}: ManagerRecognitionPageProps) {
  const currentEmail: string = (user?.email || "").toLowerCase();

  const [profile, setProfile] = useState<EmployeeRow | null>(null);
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [directReports, setDirectReports] = useState<EmployeeRow[]>([]);
  const [recognitions, setRecognitions] = useState<RecognitionRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");

  const [newRecipient, setNewRecipient] = useState<string>("");
  const [newMessage, setNewMessage] = useState<string>("");
  const [newTags, setNewTags] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);

  const [stats, setStats] = useState<ManagerStats>({
    mySentLast30: 0,
    teamTotalLast30: 0,
    teamMembersRecognized: 0,
  });

  // --------- LOAD PROFILE + EMPLOYEES + RECOGNITION ----------
  useEffect(() => {
    if (!currentEmail) return;

    const load = async () => {
      try {
        setLoading(true);

        // 1) Manager profile
        const profileRes = await supabase
          .from("employees")
          .select(
            "email, firstName, lastName, department, role, manager"
          )
          .eq("email", currentEmail)
          .single();

        const profileData = profileRes.data as EmployeeRow | null;
        if (!profileData || profileData.role !== "manager") {
          toast.error("You must be a manager to access this page.");
          return;
        }
        setProfile(profileData);

        // 2) All employees
        const empRes = await supabase
          .from("employees")
          .select(
            "email, firstName, lastName, department, role, manager"
          );

        const empData = (empRes.data || []) as EmployeeRow[];
        const normalizedEmployees = empData.map((e) => ({
          ...e,
          email: (e.email || "").toLowerCase(),
          manager: e.manager ? e.manager.toLowerCase() : null,
        }));
        setEmployees(normalizedEmployees);

        // Direct reports for this manager
        const myReports = normalizedEmployees.filter(
          (e) => e.manager === currentEmail && e.role === "employee"
        );
        setDirectReports(myReports);

        const allowedEmails = new Set<string>([
          currentEmail,
          ...myReports.map((e) => e.email),
        ]);

        // 3) Recognition (last 90 days, then filtered in memory)
        const recRes = await supabase
          .from("recognition")
          .select(
            "id, from_email, to_email, message, created_at, department, tags"
          )
          .order("created_at", { ascending: false })
          .limit(300);

        const recData = (recRes.data || []) as RecognitionRow[];

        const normalizedRecs: RecognitionRow[] = recData
          .map((r) => ({
            ...r,
            from_email: r.from_email
              ? r.from_email.toLowerCase()
              : null,
            to_email: r.to_email ? r.to_email.toLowerCase() : null,
            department: r.department ?? null,
            tags: r.tags ?? null,
          }))
          .filter((r) => {
            // Manager can see recognitions:
            //  - Sent by them
            //  - Between any of their direct reports
            const fromInTeam = r.from_email
              ? allowedEmails.has(r.from_email)
              : false;
            const toInTeam = r.to_email
              ? allowedEmails.has(r.to_email)
              : false;
            return fromInTeam || toInTeam;
          });

        setRecognitions(normalizedRecs);

        // 4) Stats (last 30 days)
        const now = new Date();
        const thirtyAgo = new Date();
        thirtyAgo.setDate(now.getDate() - 30);

        let mySent = 0;
        let teamTotal = 0;
        const recognizedSet = new Set<string>();

        normalizedRecs.forEach((r) => {
          const created = new Date(r.created_at);
          if (isNaN(created.getTime()) || created < thirtyAgo) return;

          teamTotal++;

          if (r.from_email === currentEmail) {
            mySent++;
          }

          if (r.to_email && allowedEmails.has(r.to_email)) {
            recognizedSet.add(r.to_email);
          }
        });

        setStats({
          mySentLast30: mySent,
          teamTotalLast30: teamTotal,
          teamMembersRecognized: recognizedSet.size,
        });
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [currentEmail]);

  // --------- LOOKUP HELPERS ----------
  const employeeLookup = useMemo(() => {
    const map: Record<
      string,
      { name: string; department: string | null; role: UserRole }
    > = {};
    employees.forEach((e) => {
      const name =
        `${e.firstName ?? ""} ${e.lastName ?? ""}`.trim() || e.email;
      map[e.email] = {
        name,
        department: e.department,
        role: e.role,
      };
    });
    return map;
  }, [employees]);

  const departmentOptions = useMemo(() => {
    const set = new Set<string>();
    directReports.forEach((e) => {
      if (e.department) set.add(e.department);
    });
    return Array.from(set).sort();
  }, [directReports]);

  const getDisplayName = (email: string | null) => {
    if (!email) return "Unknown";
    const info = employeeLookup[email];
    return info?.name ?? email;
  };

  const getDisplayDept = (rec: RecognitionRow) => {
    if (rec.department) return rec.department;
    const toInfo =
      rec.to_email && employeeLookup[rec.to_email]
        ? employeeLookup[rec.to_email]
        : undefined;
    return toInfo?.department ?? "General";
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // --------- FILTERED FEED ----------
  const filteredRecognitions = useMemo(() => {
    const teamEmails = new Set<string>([
      ...directReports.map((e) => e.email),
      currentEmail,
    ]);

    return recognitions.filter((rec) => {
      if (departmentFilter !== "all") {
        const dept = getDisplayDept(rec);
        if (dept.toLowerCase() !== departmentFilter.toLowerCase()) {
          return false;
        }
      }

      if (filterTab === "mySent") {
        return rec.from_email === currentEmail;
      }

      if (filterTab === "myTeam") {
        // Recognitions where either sender or recipient is a direct report
        const fromInTeam = rec.from_email
          ? teamEmails.has(rec.from_email)
          : false;
        const toInTeam = rec.to_email
          ? teamEmails.has(rec.to_email)
          : false;
        return fromInTeam || toInTeam;
      }

      // "all" within manager's scope (already filtered in effect)
      return true;
    });
  }, [recognitions, filterTab, departmentFilter, directReports, currentEmail]);

  // --------- CREATE RECOGNITION (manager -> direct reports only) ----------
  const handleCreateRecognition = async () => {
    if (!newRecipient || !newMessage.trim()) {
      toast.error("Select a team member and write a message.");
      return;
    }

    if (!profile) {
      toast.error("Profile not loaded yet.");
      return;
    }

    const recipientIsReport = directReports.some(
      (r) => r.email === newRecipient
    );
    if (!recipientIsReport) {
      toast.error("You can only recognize your direct reports.");
      return;
    }

    setSubmitting(true);
    try {
      const recipientEmail = newRecipient.toLowerCase();
      const recipientInfo = employeeLookup[recipientEmail];
      const senderInfo = employeeLookup[currentEmail];

      const department =
        recipientInfo?.department ||
        senderInfo?.department ||
        profile.department ||
        "General";

      const tagsArr =
        newTags
          .split(",")
          .map((t) => t.trim())
          .filter((t) => t.length > 0) || [];

      const insertRes = await supabase
        .from("recognition")
        .insert({
          from_email: currentEmail,
          to_email: recipientEmail,
          message: newMessage.trim(),
          department,
          tags: tagsArr.length > 0 ? tagsArr : null,
        })
        .select(
          "id, from_email, to_email, message, created_at, department, tags"
        )
        .single();

      if (insertRes.error) {
        console.error("Error sending recognition", insertRes.error);
        toast.error("Could not send recognition.");
        return;
      }

      const data = insertRes.data as RecognitionRow;

      const inserted: RecognitionRow = {
        ...data,
        from_email: data.from_email
          ? data.from_email.toLowerCase()
          : null,
        to_email: data.to_email ? data.to_email.toLowerCase() : null,
        department: data.department ?? null,
        tags: data.tags ?? null,
      };

      setRecognitions((prev) => [inserted, ...prev]);
      setNewRecipient("");
      setNewMessage("");
      setNewTags("");
      toast.success("Recognition sent ✨");
    } finally {
      setSubmitting(false);
    }
  };

  const goBackToManager = () => {
    onNavigate("manager");
  };

  // --------- RENDER ----------
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#E8F1FF] via-white to-slate-50">
      {/* HEADER */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-[#33C38C] to-emerald-600 p-2 rounded-xl shadow-sm">
              <Award className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">ForteHR</h1>
              <p className="text-xs text-slate-600">
                Manager Recognition Center
                {profile?.firstName ? ` — Hi, ${profile.firstName}` : ""}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              className="rounded-xl text-xs flex items-center gap-2"
              onClick={goBackToManager}
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Manager Dashboard</span>
            </Button>
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={onLogout}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* MAIN */}
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* HERO + TABS */}
        <section className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-2xl md:text-3xl font-semibold">
                Recognize Your Team&apos;s Effort
              </h2>
              <p className="text-sm md:text-base text-slate-600 max-w-2xl">
                Spotlight contributions, celebrate small wins, and keep your
                team motivated. Your recognition sets the tone for the culture.
              </p>
            </div>

            <div className="flex items-center gap-2 bg-white rounded-full px-2 py-1 shadow-sm">
              <button
                className={`px-3 py-1 text-xs md:text-sm rounded-full flex items-center gap-1 ${
                  filterTab === "all"
                    ? "bg-[#33C38C] text-white"
                    : "text-slate-600"
                }`}
                onClick={() => setFilterTab("all")}
              >
                <Users className="w-3 h-3" />
                All Team Activity
              </button>
              <button
                className={`px-3 py-1 text-xs md:text-sm rounded-full flex items-center gap-1 ${
                  filterTab === "mySent"
                    ? "bg-[#33C38C] text-white"
                    : "text-slate-600"
                }`}
                onClick={() => setFilterTab("mySent")}
              >
                <Heart className="w-3 h-3" />
                My Sent
              </button>
              <button
                className={`px-3 py-1 text-xs md:text-sm rounded-full flex items-center gap-1 ${
                  filterTab === "myTeam"
                    ? "bg-[#33C38C] text-white"
                    : "text-slate-600"
                }`}
                onClick={() => setFilterTab("myTeam")}
              >
                <Users className="w-3 h-3" />
                My Team
              </button>
            </div>
          </div>

          {/* KPI CARDS - green / pink palette */}
          <div className="grid md:grid-cols-3 gap-4">
            {/* Green: Sent */}
            <Card className="p-6 rounded-3xl shadow-2xl bg-gradient-to-br from-white to-emerald-50 border border-emerald-100">
              <div className="text-xs text-slate-600 mb-2">Recognitions You Sent (Last 30 days)</div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center shadow-inner">
                    <Award className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <div className="text-3xl font-extrabold text-emerald-700">
                      {loading ? "…" : stats.mySentLast30}
                    </div>
                    <p className="text-xs text-slate-500">Managers who recognize often build stronger teams.</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Pink: Team Volume */}
            <Card className="p-6 rounded-3xl shadow-2xl bg-gradient-to-br from-white to-pink-50 border border-pink-100">
              <div className="text-xs text-slate-600 mb-2">Team Recognitions (Last 30 days)</div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-pink-100 flex items-center justify-center shadow-inner">
                    <Users className="w-6 h-6 text-pink-600" />
                  </div>
                  <div>
                    <div className="text-3xl font-extrabold text-pink-700">
                      {loading ? "…" : stats.teamTotalLast30}
                    </div>
                    <p className="text-xs text-slate-500">Volume of appreciation flowing within your team.</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Mixed: Members Recognized */}
            <Card className="p-6 rounded-3xl shadow-2xl bg-gradient-to-br from-white to-rose-50 border border-rose-100">
              <div className="text-xs text-slate-600 mb-2">Team Members Recognized</div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-rose-100 flex items-center justify-center shadow-inner">
                    <Sparkles className="w-6 h-6 text-rose-600" />
                  </div>
                  <div>
                    <div className="text-3xl font-extrabold text-rose-700">
                      {loading ? "…" : stats.teamMembersRecognized}
                    </div>
                    <p className="text-xs text-slate-500">Aim for recognition to be fairly distributed, not clustered.</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* MAIN GRID: FEED + FORM */}
        <section className="grid lg:grid-cols-[2fr,1.2fr] gap-6">
          {/* FEED */}
          <div className="space-y-4">
            {/* Filter bar */}
            <Card className="p-3 rounded-2xl shadow-sm bg-white flex flex-wrap items-center gap-3 justify-between">
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <Filter className="w-4 h-4" />
                <span>
                  Showing {filteredRecognitions.length} recognitions
                </span>
              </div>

              {departmentOptions.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">
                    Department:
                  </span>
                  <Select
                    value={departmentFilter}
                    onValueChange={setDepartmentFilter}
                  >
                    <SelectTrigger className="h-8 w-44 rounded-full text-xs">
                      <SelectValue placeholder="All Departments" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        All Departments
                      </SelectItem>
                      {departmentOptions.map((dept) => (
                        <SelectItem key={dept} value={dept}>
                          {dept}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </Card>

            {/* Feed card */}
            <Card className="p-0 rounded-3xl shadow-lg bg-white">
              <ScrollArea className="h-[520px]">
                <div className="p-4 space-y-3">
                  {loading ? (
                    <p className="text-sm text-slate-500">
                      Loading recognition feed…
                    </p>
                  ) : filteredRecognitions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center text-sm text-slate-500">
                      <Sparkles className="w-6 h-6 mb-2 text-[#33C38C]" />
                      <p>No recognition to show yet for this view.</p>
                      <p>Try sending the first shout-out to your team.</p>
                    </div>
                  ) : (
                    filteredRecognitions.map((rec) => (
                      <Card
                        key={rec.id}
                        className="p-4 rounded-2xl border border-slate-200/70 bg-slate-50/40 hover:bg-white hover:shadow-md transition-all"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-2">
                            <div className="text-xs text-slate-500">
                              From{" "}
                              <span className="font-medium text-slate-800">
                                {getDisplayName(rec.from_email)}
                              </span>{" "}
                              to{" "}
                              <span className="font-medium text-slate-800">
                                {getDisplayName(rec.to_email)}
                              </span>
                            </div>
                            <p className="text-sm text-slate-800">
                              {rec.message}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                              <span className="px-2 py-1 bg-slate-100 rounded-full">
                                {getDisplayDept(rec)}
                              </span>
                              <span className="text-slate-400">
                                • {formatDate(rec.created_at)}
                              </span>
                              {rec.tags &&
                                rec.tags.map((tag) => (
                                  <Badge
                                    key={tag}
                                    className="text-[10px] rounded-full bg-emerald-50 text-emerald-700 border-emerald-200"
                                  >
                                    #{tag}
                                  </Badge>
                                ))}
                            </div>
                          </div>

                          <div className="hidden sm:flex items-center justify-center w-8 h-8 rounded-full bg-[#E8F1FF]">
                            <Heart className="w-4 h-4 text-[#33C38C]" />
                          </div>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </Card>
          </div>

          {/* FORM */}
          <div className="space-y-4">
            <Card className="p-6 rounded-3xl shadow-lg bg-gradient-to-br from-white via-[#E8F1FF] to-emerald-50">
              <div className="flex items-center gap-2 mb-4">
                <Award className="w-5 h-5 text-[#33C38C]" />
                <h3 className="text-lg font-semibold">
                  Recognize a Team Member
                </h3>
              </div>
              <p className="text-xs text-slate-600 mb-4">
                You can only send recognition to your direct reports. Use
                this to reinforce the behaviours you want to see more of.
              </p>

              {/* Recipient */}
              <div className="space-y-2 mb-4">
                <label className="text-xs font-medium text-slate-700">
                  Recipient (Direct Report)
                </label>
                <Select
                  value={newRecipient}
                  onValueChange={setNewRecipient}
                >
                  <SelectTrigger className="rounded-xl h-10 text-sm bg-slate-50">
                    <SelectValue placeholder="Select a team member" />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {directReports.map((e) => {
                      const name =
                        `${e.firstName ?? ""} ${e.lastName ?? ""}`.trim() ||
                        e.email;
                      return (
                        <SelectItem key={e.email} value={e.email}>
                          {name}
                          {e.department ? ` — ${e.department}` : ""}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Message */}
              <div className="space-y-2 mb-4">
                <label className="text-xs font-medium text-slate-700">
                  Message
                </label>
                <Textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Example: Great job leading the release yesterday — your calm in crisis helped everyone."
                  className="min-h-[110px] rounded-2xl text-sm bg-slate-50"
                />
              </div>

              {/* Tags */}
              <div className="space-y-2 mb-5">
                <label className="text-xs font-medium text-slate-700 flex items-center justify-between">
                  <span>Tags (optional)</span>
                  <span className="text-[10px] text-slate-400">
                    Separate with commas — e.g. ownership, teamwork,
                    mentoring
                  </span>
                </label>
                <Input
                  value={newTags}
                  onChange={(e) => setNewTags(e.target.value)}
                  placeholder="ownership, teamwork"
                  className="h-10 rounded-xl text-sm bg-slate-50"
                />
              </div>

              <Button
                onClick={handleCreateRecognition}
                disabled={submitting}
                className="w-full h-11 rounded-xl bg-gradient-to-r from-[#33C38C] to-emerald-600 hover:from-emerald-600 hover:to-[#33C38C] text-sm"
              >
                {submitting ? "Sending..." : "Send Recognition"}
              </Button>

              <p className="mt-3 text-[10px] text-slate-500 text-center">
                Recognition is visible to HR and used in engagement
                analytics.
              </p>
            </Card>
          </div>
        </section>
      </main>
    </div>
  );
}
