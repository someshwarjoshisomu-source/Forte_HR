// src/pages/RecognitionPage.tsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../utils/supabase/client";

import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
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
  Heart,
  Home,
  LogOut,
  MessageCircle,
  Users,
  ArrowLeft,
  Filter,
  Sparkles,
} from "lucide-react";

import { toast } from "sonner";

interface RecognitionPageProps {
  user: any; // Supabase auth user
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

type FilterType = "all" | "received" | "sent";

export function RecognitionPage({
  user,
  onNavigate,
  onLogout,
}: RecognitionPageProps) {
  const [profile, setProfile] = useState<EmployeeRow | null>(null);
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [recognitions, setRecognitions] = useState<RecognitionRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [filterType, setFilterType] = useState<FilterType>("all");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");

  const [newRecipient, setNewRecipient] = useState<string>("");
  const [newMessage, setNewMessage] = useState<string>("");
  const [newTags, setNewTags] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const currentEmail = (user?.email || "").toLowerCase();

  // Load profile, employees, recognitions
  useEffect(() => {
    if (!currentEmail) return;

    const loadData = async () => {
      try {
        setLoading(true);

        // 1) Load current employee profile
        const { data: profileData, error: profileError } = await supabase
          .from("employees")
          .select("email, firstName, lastName, department, role")
          .eq("email", currentEmail)
          .single();

        if (profileError) {
          console.error("Error loading profile", profileError);
          toast.error("Failed to load profile.");
        } else if (profileData) {
          setProfile(profileData as EmployeeRow);
        }

        // 2) Load all employees (used for name resolution + recipient list)
        const { data: employeesData, error: employeesError } = await supabase
          .from("employees")
          .select("email, firstName, lastName, department, role");

        if (employeesError) {
          console.error("Error loading employees", employeesError);
        } else if (employeesData) {
          setEmployees(
            (employeesData as any[]).map((e) => ({
              email: (e.email || "").toLowerCase(),
              firstName: e.firstName ?? null,
              lastName: e.lastName ?? null,
              department: e.department ?? null,
              role: e.role as UserRole,
            }))
          );
        }

        // 3) Load recognitions
        //    - Employee → only theirs (sent/received)
        //    - Manager/HR → all
        let role: UserRole = "employee";
        if (profileData?.role === "manager" || profileData?.role === "hr") {
          role = profileData.role;
        }

        let recognitionQuery = supabase
          .from("recognition")
          .select("id, from_email, to_email, message, created_at, department, tags")
          .order("created_at", { ascending: false })
          .limit(200);

        if (role === "employee") {
          recognitionQuery = recognitionQuery.or(
            `from_email.eq.${currentEmail},to_email.eq.${currentEmail}`
          );
        }

        const { data: recData, error: recError } = await recognitionQuery;

        if (recError) {
          console.error("Error loading recognition", recError);
          toast.error("Failed to load recognition data.");
        } else if (recData) {
          setRecognitions(
            (recData as any[]).map((r) => ({
              ...r,
              from_email: r.from_email?.toLowerCase() ?? null,
              to_email: r.to_email?.toLowerCase() ?? null,
              department: r.department ?? null,
              tags: r.tags ?? null,
            }))
          );
        }
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [currentEmail]);

  // Map email -> {name, dept, role}
  const employeeLookup = useMemo(() => {
    const map: Record<
      string,
      { name: string; department: string | null; role: UserRole | null }
    > = {};
    employees.forEach((e) => {
      const name =
        `${e.firstName ?? ""} ${e.lastName ?? ""}`.trim() || e.email;
      map[e.email] = {
        name,
        department: e.department ?? null,
        role: e.role ?? null,
      };
    });
    return map;
  }, [employees]);

  // Unique departments for filter
  const departmentOptions = useMemo(() => {
    const set = new Set<string>();
    employees.forEach((e) => {
      if (e.department) set.add(e.department);
    });
    return Array.from(set).sort();
  }, [employees]);

  const userRole: UserRole = profile?.role ?? "employee";

  // Filtered recognitions for UI
  const filteredRecognitions = useMemo(() => {
    return recognitions.filter((rec) => {
      // Filter type (all / sent / received for current user)
      if (filterType === "sent" && rec.from_email !== currentEmail) return false;
      if (filterType === "received" && rec.to_email !== currentEmail)
        return false;

      // Department filter (only for manager/hr)
      if (departmentFilter !== "all") {
        const dept = rec.department || "";
        if (dept.toLowerCase() !== departmentFilter.toLowerCase()) {
          return false;
        }
      }

      return true;
    });
  }, [recognitions, filterType, departmentFilter, currentEmail]);

  // Stats (last 30 days)
  const { myGivenCount, myReceivedCount, last30Total } = useMemo(() => {
    const now = new Date();
    const thirtyAgo = new Date();
    thirtyAgo.setDate(now.getDate() - 30);

    let given = 0;
    let received = 0;
    let total = 0;

    recognitions.forEach((rec) => {
      const created = new Date(rec.created_at);
      if (isNaN(created.getTime())) return;
      if (created < thirtyAgo) return;

      total++;
      if (rec.from_email === currentEmail) given++;
      if (rec.to_email === currentEmail) received++;
    });

    return {
      myGivenCount: given,
      myReceivedCount: received,
      last30Total: total,
    };
  }, [recognitions, currentEmail]);

  const getDisplayName = (email: string | null) => {
    if (!email) return "Unknown";
    const info = employeeLookup[email.toLowerCase()];
    if (!info) return email;
    return info.name;
  };

  const getDisplayDept = (rec: RecognitionRow) => {
    if (rec.department) return rec.department;
    // fallback to recipient dept if available
    const to = rec.to_email ? employeeLookup[rec.to_email] : undefined;
    if (to?.department) return to.department;
    return "General";
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

  const handleCreateRecognition = async () => {
    if (!newRecipient || !newMessage.trim()) {
      toast.error("Please select a recipient and write a message.");
      return;
    }

    if (!profile) {
      toast.error("Profile not loaded yet.");
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
          .filter(Boolean) || [];

      const { data, error } = await supabase
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

      if (error) {
        console.error("Error creating recognition", error);
        toast.error("Could not send recognition.");
        return;
      }

      const inserted: RecognitionRow = {
        ...data,
        from_email: data.from_email?.toLowerCase() ?? null,
        to_email: data.to_email?.toLowerCase() ?? null,
        department: data.department ?? null,
        tags: data.tags ?? null,
      };

      // Prepend to list
      setRecognitions((prev) => [inserted, ...prev]);
      setNewRecipient("");
      setNewMessage("");
      setNewTags("");
      toast.success("Recognition sent ✨");
    } finally {
      setSubmitting(false);
    }
  };

  const goBackToPortal = () => {
    if (!profile) {
      onNavigate("login");
      return;
    }
    if (profile.role === "employee") onNavigate("employee");
    else if (profile.role === "manager") onNavigate("manager");
    else onNavigate("hr");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#E8F1FF] via-white to-slate-50">
      {/* HEADER */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          {/* Left: Brand */}
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-[#33C38C] to-emerald-600 p-2 rounded-xl shadow-md">
              <Award className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">ForteHR</h1>
              <p className="text-xs text-slate-600">
                Recognition Center
                {profile?.firstName ? ` — Hi, ${profile.firstName}` : ""}
              </p>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              className="rounded-xl text-xs hidden md:flex"
              onClick={goBackToPortal}
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Dashboard
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
        {/* Top Intro + Stats */}
        <section className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h2 className="text-2xl md:text-3xl font-semibold">
                Celebrate Wins & Micro-Moments
              </h2>
              <p className="text-sm md:text-base text-slate-600 mt-1">
                Send quick shout-outs, track appreciation, and see how recognition
                flows across your team and organization.
              </p>
            </div>

            {/* Filter type pills */}
            <div className="flex items-center gap-2 bg-white rounded-full px-2 py-1 shadow-sm">
              <button
                className={`px-3 py-1 text-xs md:text-sm rounded-full flex items-center gap-1 ${
                  filterType === "all"
                    ? "bg-[#33C38C] text-white"
                    : "text-slate-600"
                }`}
                onClick={() => setFilterType("all")}
              >
                <Users className="w-3 h-3" />
                All
              </button>
              <button
                className={`px-3 py-1 text-xs md:text-sm rounded-full flex items-center gap-1 ${
                  filterType === "received"
                    ? "bg-[#33C38C] text-white"
                    : "text-slate-600"
                }`}
                onClick={() => setFilterType("received")}
              >
                <Heart className="w-3 h-3" />
                Received
              </button>
              <button
                className={`px-3 py-1 text-xs md:text-sm rounded-full flex items-center gap-1 ${
                  filterType === "sent"
                    ? "bg-[#33C38C] text-white"
                    : "text-slate-600"
                }`}
                onClick={() => setFilterType("sent")}
              >
                <MessageCircle className="w-3 h-3" />
                Sent
              </button>
            </div>
          </div>

          {/* Stats cards */}
          <div className="grid md:grid-cols-3 gap-4">
            <Card className="p-5 rounded-2xl shadow-lg bg-gradient-to-br from-white to-[#E8F1FF]">
              <div className="text-xs text-slate-600 mb-1">
                Recognitions You Sent (Last 30 days)
              </div>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold text-[#33C38C]">
                  {loading ? "…" : myGivenCount}
                </div>
                <div className="text-xs text-slate-500 max-w-[10rem] text-right">
                  Small notes of appreciation compound into trust.
                </div>
              </div>
            </Card>

            <Card className="p-5 rounded-2xl shadow-lg bg-gradient-to-br from-white to-emerald-50">
              <div className="text-xs text-slate-600 mb-1">
                Recognitions You Received (Last 30 days)
              </div>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold text-emerald-600">
                  {loading ? "…" : myReceivedCount}
                </div>
                <div className="text-xs text-slate-500 max-w-[10rem] text-right">
                  A signal that your work is noticed and valued.
                </div>
              </div>
            </Card>

            <Card className="p-5 rounded-2xl shadow-lg bg-gradient-to-br from-white to-purple-50">
              <div className="text-xs text-slate-600 mb-1">
                Total Recognitions (Last 30 days)
                {userRole !== "employee" ? " — Org / Team" : ""}
              </div>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold text-purple-600">
                  {loading ? "…" : last30Total}
                </div>
                <div className="text-xs text-slate-500 max-w-[10rem] text-right">
                  Use this to sense cultural momentum over time.
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* Main Layout: Left = feed, Right = create form */}
        <section className="grid lg:grid-cols-[2fr,1.2fr] gap-6">
          {/* LEFT: Recognition Feed */}
          <div className="space-y-4">
            {/* Filters row */}
            <Card className="p-3 rounded-2xl shadow-sm bg-white flex flex-wrap items-center gap-3 justify-between">
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <Filter className="w-4 h-4" />
                <span>Showing {filteredRecognitions.length} recognitions</span>
              </div>

              {userRole !== "employee" && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Department:</span>
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
              )}
            </Card>

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
                      <p>Try sending the first shout-out from the panel on the right.</p>
                    </div>
                  ) : (
                    filteredRecognitions.map((rec) => (
                      <Card
                        key={rec.id}
                        className="p-4 rounded-2xl border-slate-200 hover:shadow-md transition-all"
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

                          {/* Simple icon bubble */}
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

          {/* RIGHT: Create Recognition */}
          <div className="space-y-4">
            <Card className="p-6 rounded-3xl shadow-lg bg-gradient-to-br from-white to-[#E8F1FF]">
              <div className="flex items-center gap-2 mb-4">
                <Award className="w-5 h-5 text-[#33C38C]" />
                <h3 className="text-lg font-semibold">Send Recognition</h3>
              </div>

              {userRole === "employee" && (
                <p className="text-xs text-slate-600 mb-4">
                  Send a quick appreciation to your teammates or colleagues.
                </p>
              )}
              {userRole === "manager" && (
                <p className="text-xs text-slate-600 mb-4">
                  Call out contributions across your team to boost morale.
                </p>
              )}
              {userRole === "hr" && (
                <p className="text-xs text-slate-600 mb-4">
                  Highlight cultural role models across the organization.
                </p>
              )}

              {/* Recipient */}
              <div className="space-y-2 mb-4">
                <label className="text-xs font-medium text-slate-700">
                  Recipient
                </label>
                <Select
                  value={newRecipient}
                  onValueChange={setNewRecipient}
                >
                  <SelectTrigger className="rounded-xl h-10 text-sm">
                    <SelectValue placeholder="Select a colleague" />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {employees
                      .filter((e) => e.email !== currentEmail)
                      .map((e) => {
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
                  className="min-h-[110px] rounded-2xl text-sm"
                />
              </div>

              {/* Tags */}
              <div className="space-y-2 mb-5">
                <label className="text-xs font-medium text-slate-700 flex items-center justify-between">
                  <span>Tags (optional)</span>
                  <span className="text-[10px] text-slate-400">
                    Separate with commas — e.g. ownership, teamwork, mentoring
                  </span>
                </label>
                <Input
                  value={newTags}
                  onChange={(e) => setNewTags(e.target.value)}
                  placeholder="ownership, teamwork"
                  className="h-10 rounded-xl text-sm"
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
                Recognition is visible to HR and your managers for culture
                insights.
              </p>
            </Card>

            {/* Quick navigation back to role-specific dashboards */}
            <Card className="p-4 rounded-2xl shadow-sm bg-white flex flex-col gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-700">
                <Home className="w-4 h-4 text-[#33C38C]" />
                <span>Jump back to your portal</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full text-xs"
                  onClick={() => onNavigate("employee")}
                >
                  Employee Dashboard
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full text-xs"
                  onClick={() => onNavigate("manager")}
                >
                  Manager Dashboard
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full text-xs"
                  onClick={() => onNavigate("hr")}
                >
                  HR Dashboard
                </Button>
              </div>
            </Card>
          </div>
        </section>
      </main>
    </div>
  );
}
