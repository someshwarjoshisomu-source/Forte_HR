// src/pages/HRRecognitionPage.tsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../utils/supabase/client";

import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { ScrollArea } from "../components/ui/scroll-area";
import { Badge } from "../components/ui/badge";

import {
  Award,
  Users,
  LogOut,
  ArrowLeft,
  Filter,
  Sparkles,
  Home,
} from "lucide-react";

import { toast } from "sonner";

interface HRRecognitionPageProps {
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

type HRStats = {
  totalLast30: number;
  uniqueSenders: number;
  uniqueRecipients: number;
};

export function HRRecognitionPage({
  user,
  onNavigate,
  onLogout,
}: HRRecognitionPageProps) {
  const currentEmail: string = (user?.email || "").toLowerCase();

  const [profile, setProfile] = useState<EmployeeRow | null>(null);
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [recognitions, setRecognitions] = useState<RecognitionRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [senderFilter, setSenderFilter] = useState<string>("all");
  const [recipientFilter, setRecipientFilter] = useState<string>("all");

  const [stats, setStats] = useState<HRStats>({
    totalLast30: 0,
    uniqueSenders: 0,
    uniqueRecipients: 0,
  });

  // --------- LOAD DATA ----------
  useEffect(() => {
    if (!currentEmail) return;

    const load = async () => {
      try {
        setLoading(true);

        // HR profile
        const profileRes = await supabase
          .from("employees")
          .select("email, firstName, lastName, department, role")
          .eq("email", currentEmail)
          .single();

        const profileData = profileRes.data as EmployeeRow | null;
        if (!profileData || profileData.role !== "hr") {
          toast.error("You must be an HR user to access this page.");
          return;
        }
        setProfile({
          ...profileData,
          email: (profileData.email || "").toLowerCase(),
        });

        // All employees
        const empRes = await supabase
          .from("employees")
          .select("email, firstName, lastName, department, role");

        const empData = (empRes.data || []) as EmployeeRow[];
        const normalizedEmployees = empData.map((e) => ({
          ...e,
          email: (e.email || "").toLowerCase(),
        }));
        setEmployees(normalizedEmployees);

        // Org recognition (last 90 days)
        const recRes = await supabase
          .from("recognition")
          .select(
            "id, from_email, to_email, message, created_at, department, tags"
          )
          .order("created_at", { ascending: false })
          .limit(400);

        const recData = (recRes.data || []) as RecognitionRow[];

        const normalizedRecs: RecognitionRow[] = recData.map((r) => ({
          ...r,
          from_email: r.from_email
            ? r.from_email.toLowerCase()
            : null,
          to_email: r.to_email ? r.to_email.toLowerCase() : null,
          department: r.department ?? null,
          tags: r.tags ?? null,
        }));

        setRecognitions(normalizedRecs);

        // Stats (30 days)
        const now = new Date();
        const thirtyAgo = new Date();
        thirtyAgo.setDate(now.getDate() - 30);

        let total = 0;
        const senders = new Set<string>();
        const recipients = new Set<string>();

        normalizedRecs.forEach((r) => {
          const created = new Date(r.created_at);
          if (isNaN(created.getTime()) || created < thirtyAgo) return;

          total++;
          if (r.from_email) senders.add(r.from_email);
          if (r.to_email) recipients.add(r.to_email);
        });

        setStats({
          totalLast30: total,
          uniqueSenders: senders.size,
          uniqueRecipients: recipients.size,
        });
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [currentEmail]);

  // --------- LOOKUPS ----------
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
    employees.forEach((e) => {
      if (e.department) set.add(e.department);
    });
    return Array.from(set).sort();
  }, [employees]);

  const senderOptions = useMemo(() => {
    const set = new Set<string>();
    recognitions.forEach((r) => {
      if (r.from_email) set.add(r.from_email);
    });
    return Array.from(set);
  }, [recognitions]);

  const recipientOptions = useMemo(() => {
    const set = new Set<string>();
    recognitions.forEach((r) => {
      if (r.to_email) set.add(r.to_email);
    });
    return Array.from(set);
  }, [recognitions]);

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
    return recognitions.filter((rec) => {
      if (departmentFilter !== "all") {
        const dept = getDisplayDept(rec);
        if (dept.toLowerCase() !== departmentFilter.toLowerCase()) {
          return false;
        }
      }

      if (senderFilter !== "all") {
        if (rec.from_email !== senderFilter) return false;
      }

      if (recipientFilter !== "all") {
        if (rec.to_email !== recipientFilter) return false;
      }

      return true;
    });
  }, [recognitions, departmentFilter, senderFilter, recipientFilter]);

  const goBackToHR = () => {
    onNavigate("hr");
  };

  // --------- RENDER ----------
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#E8F1FF] via-white to-slate-50">
      {/* HEADER */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-purple-600 to-purple-700 p-2 rounded-xl shadow-sm">
              <Award className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">ForteHR</h1>
              <p className="text-xs text-slate-600">
                HR Recognition Analytics
                {profile?.firstName ? ` — Hi, ${profile.firstName}` : ""}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              className="rounded-xl text-xs flex items-center gap-2"
              onClick={goBackToHR}
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to HR Dashboard</span>
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
        {/* HERO + KPI */}
        <section className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-2xl md:text-3xl font-semibold">
              Organization-Wide Recognition Flow
            </h2>
            <p className="text-sm md:text-base text-slate-600 max-w-3xl">
              Track how appreciation flows across departments, managers, and
              employees to understand your culture in action. This view is
              read-only — recognition can be initiated by employees and
              managers.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {/* Green: Total */}
            <Card className="p-6 rounded-3xl shadow-2xl bg-gradient-to-br from-white to-emerald-50 border border-emerald-100">
              <div className="text-xs text-slate-600 mb-2">Total Recognitions (Last 30 days)</div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center shadow-inner">
                    <Award className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <div className="text-3xl font-extrabold text-emerald-700">
                      {loading ? "…" : stats.totalLast30}
                    </div>
                    <p className="text-xs text-slate-500">Overall recognition volume</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Pink: Senders */}
            <Card className="p-6 rounded-3xl shadow-2xl bg-gradient-to-br from-white to-pink-50 border border-pink-100">
              <div className="text-xs text-slate-600 mb-2">Unique Senders (Last 30 days)</div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-pink-100 flex items-center justify-center shadow-inner">
                    <Users className="w-6 h-6 text-pink-600" />
                  </div>
                  <div>
                    <div className="text-3xl font-extrabold text-pink-700">
                      {loading ? "…" : stats.uniqueSenders}
                    </div>
                    <p className="text-xs text-slate-500">How broadly recognition is shared</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Green & Pink mix: Recipients */}
            <Card className="p-6 rounded-3xl shadow-2xl bg-gradient-to-br from-white to-rose-50 border border-rose-100">
              <div className="text-xs text-slate-600 mb-2">Unique Recipients (Last 30 days)</div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-rose-100 flex items-center justify-center shadow-inner">
                    <Sparkles className="w-6 h-6 text-rose-600" />
                  </div>
                  <div>
                    <div className="text-3xl font-extrabold text-rose-700">
                      {loading ? "…" : stats.uniqueRecipients}
                    </div>
                    <p className="text-xs text-slate-500">Distribution of recognized employees</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* FILTER BAR */}
        <section className="space-y-4">
          <Card className="p-3 rounded-2xl shadow-sm bg-white flex flex-wrap items-center gap-3 justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <Filter className="w-4 h-4" />
              <span>
                Showing {filteredRecognitions.length} recognitions
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">
                  Department:
                </span>
                <Select
                  value={departmentFilter}
                  onValueChange={setDepartmentFilter}
                >
                  <SelectTrigger className="h-8 w-40 rounded-full text-xs">
                    <SelectValue placeholder="All Departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {departmentOptions.map((dept) => (
                      <SelectItem key={dept} value={dept}>
                        {dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Sender:</span>
                <Select
                  value={senderFilter}
                  onValueChange={setSenderFilter}
                >
                  <SelectTrigger className="h-8 w-40 rounded-full text-xs">
                    <SelectValue placeholder="All Senders" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Senders</SelectItem>
                    {senderOptions.map((email) => (
                      <SelectItem key={email} value={email}>
                        {getDisplayName(email)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">
                  Recipient:
                </span>
                <Select
                  value={recipientFilter}
                  onValueChange={setRecipientFilter}
                >
                  <SelectTrigger className="h-8 w-44 rounded-full text-xs">
                    <SelectValue placeholder="All Recipients" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Recipients</SelectItem>
                    {recipientOptions.map((email) => (
                      <SelectItem key={email} value={email}>
                        {getDisplayName(email)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>

          {/* FEED */}
          <Card className="p-0 rounded-3xl shadow-lg bg-white">
            <ScrollArea className="h-[520px]">
              <div className="p-4 space-y-3">
                {loading ? (
                  <p className="text-sm text-slate-500">
                    Loading recognition stream…
                  </p>
                ) : filteredRecognitions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center text-sm text-slate-500">
                    <Sparkles className="w-6 h-6 mb-2 text-purple-500" />
                    <p>No recognition matches the current filters.</p>
                    <p>Try broadening your selection to see more data.</p>
                  </div>
                ) : (
                  filteredRecognitions.map((rec) => (
                    <Card
                      key={rec.id}
                      className="p-4 rounded-2xl border border-slate-200/70 bg-slate-50/40 hover:bg-white hover:shadow-md transition-all"
                    >
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
                                className="text-[10px] rounded-full bg-purple-50 text-purple-700 border-purple-200"
                              >
                                #{tag}
                              </Badge>
                            ))}
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </Card>
        </section>

        {/* HOW HR CAN USE THIS */}
        <Card className="p-8 rounded-3xl shadow-lg bg-gradient-to-r from-purple-50 to-white border border-purple-100">
          <h3 className="text-lg font-semibold mb-2">
            How HR Can Use This
          </h3>
          <ul className="text-sm text-slate-700 space-y-1 list-disc list-inside">
            <li>Spot managers who consistently recognize their teams.</li>
            <li>
              Identify departments with low or highly concentrated
              recognition.
            </li>
            <li>
              Combine with engagement and attrition data for richer
              insights.
            </li>
            <li>
              Use tags to see what behaviours are most frequently
              celebrated.
            </li>
          </ul>
          <p className="mt-3 text-xs text-slate-500">
            This view is read-only. Recognition can be initiated by
            employees and managers.
          </p>
        </Card>
      </main>
    </div>
  );
}
