// src/pages/EmployeeRecognitionPage.tsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../utils/supabase/client";

import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "../components/ui/select";
import { ScrollArea } from "../components/ui/scroll-area";
import { Badge } from "../components/ui/badge";

import { Award, Heart, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

type PageType =
  | "login"
  | "login-credentials"
  | "employee"
  | "manager"
  | "hr"
  | "profile"
  | "employee-feedback"
  | "manager-feedback"
  | "employee-recognition"
  | "manager-recognition"
  | "hr-recognition";

interface EmployeeRecognitionPageProps {
  user: any; // Supabase auth user
  onNavigate: (page: PageType) => void;
  onLogout: () => void;
}

type EmployeeRow = {
  email: string;
  firstName: string | null;
  lastName: string | null;
  department: string | null;
};

type RecognitionRow = {
  id: string;
  from_email: string;
  to_email: string;
  message: string;
  created_at: string;
  department: string | null;
  tags: string[] | null;
};

type FilterType = "all" | "sent" | "received";

export function EmployeeRecognitionPage({
  user,
  onNavigate,
  onLogout,
}: EmployeeRecognitionPageProps) {
  const email = (user?.email || "").toLowerCase();

  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [profile, setProfile] = useState<EmployeeRow | null>(null);

  const [recognitions, setRecognitions] = useState<RecognitionRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [filter, setFilter] = useState<FilterType>("all");
  const [newRecipient, setRecipient] = useState<string>("");
  const [newMessage, setMessage] = useState<string>("");
  const [newTags, setTags] = useState<string>("");

  // -----------------------------
  // Load profile + employees + recognitions
  // -----------------------------
  useEffect(() => {
    if (!email) return;

    const loadAll = async () => {
      setLoading(true);

      // profile
      const {
        data: p,
      }: { data: EmployeeRow | null } = await supabase
        .from("employees")
        .select("email, firstName, lastName, department")
        .eq("email", email)
        .single();

      if (p) setProfile(p);

      // employees (recipient list)
      const {
        data: allEmployees,
      }: { data: EmployeeRow[] | null } = await supabase
        .from("employees")
        .select("email, firstName, lastName, department")
        .neq("email", email);

      setEmployees(allEmployees ?? []);

      // recognitions for this employee (sent or received)
      const {
        data: rec,
      }: { data: RecognitionRow[] | null } = await supabase
        .from("recognition")
        .select(
          "id, from_email, to_email, message, created_at, department, tags"
        )
        .or(`from_email.eq.${email},to_email.eq.${email}`)
        .order("created_at", { ascending: false });

      setRecognitions(
        (rec ?? []).map((r) => ({
          ...r,
          from_email: r.from_email.toLowerCase(),
          to_email: r.to_email.toLowerCase(),
        }))
      );

      setLoading(false);
    };

    loadAll();
  }, [email]);

  const nameOf = (e: EmployeeRow): string =>
    `${e.firstName ?? ""} ${e.lastName ?? ""}`.trim() || e.email;

  const filtered: RecognitionRow[] = useMemo(() => {
    if (filter === "sent") {
      return recognitions.filter(
        (r: RecognitionRow) => r.from_email === email
      );
    }
    if (filter === "received") {
      return recognitions.filter(
        (r: RecognitionRow) => r.to_email === email
      );
    }
    return recognitions;
  }, [filter, recognitions, email]);

  // -----------------------------
  // Send new recognition
  // -----------------------------
  async function sendRecognition() {
    if (!newRecipient || !newMessage.trim()) {
      toast.error("Please select a recipient and write a message.");
      return;
    }

    const tags: string[] =
      newTags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean) || [];

    const { data, error }: { data: RecognitionRow | null; error: any } =
      await supabase
        .from("recognition")
        .insert({
          from_email: email,
          to_email: newRecipient,
          message: newMessage.trim(),
          department: profile?.department || "General",
          tags: tags.length ? tags : null,
        })
        .select(
          "id, from_email, to_email, message, created_at, department, tags"
        )
        .single();

    if (error || !data) {
      toast.error("Could not send recognition.");
      return;
    }

    const normalized: RecognitionRow = {
      ...data,
      from_email: data.from_email.toLowerCase(),
      to_email: data.to_email.toLowerCase(),
    };

    setRecognitions((prev) => [normalized, ...prev]);
    setRecipient("");
    setMessage("");
    setTags("");
    toast.success("Recognition sent ✨");
  }

  const formatDate = (iso: string): string => {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#E8F1FF] via-white to-slate-50">
      {/* HEADER */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-[#33C38C] to-emerald-600 p-2 rounded-xl">
              <Award className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">ForteHR Recognition</h1>
              <p className="text-xs text-slate-600">
                Employee Shout-outs{" "}
                {profile?.firstName ? `— Hi, ${profile.firstName}` : ""}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              className="rounded-xl text-xs flex items-center gap-2"
              onClick={() => onNavigate("employee")}
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Employee Dashboard</span>
            </Button>

            <Button onClick={onLogout} variant="outline" className="rounded-xl">
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* MAIN */}
      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* Filter Pills */}
        <div className="flex flex-wrap gap-2 bg-white rounded-full px-2 py-1 shadow-sm w-fit">
          <button
            className={`px-4 py-1 text-xs md:text-sm rounded-full ${
              filter === "all"
                ? "bg-[#33C38C] text-white"
                : "text-slate-600"
            }`}
            onClick={() => setFilter("all")}
          >
            All
          </button>
          <button
            className={`px-4 py-1 text-xs md:text-sm rounded-full ${
              filter === "sent"
                ? "bg-[#33C38C] text-white"
                : "text-slate-600"
            }`}
            onClick={() => setFilter("sent")}
          >
            Sent
          </button>
          <button
            className={`px-4 py-1 text-xs md:text-sm rounded-full ${
              filter === "received"
                ? "bg-[#33C38C] text-white"
                : "text-slate-600"
            }`}
            onClick={() => setFilter("received")}
          >
            Received
          </button>
        </div>

        {/* Layout: Feed + Form */}
        <div className="grid md:grid-cols-[2fr,1.1fr] gap-6">
          {/* FEED */}
          <Card className="p-4 rounded-3xl shadow-lg bg-white">
            <ScrollArea className="h-[520px] pr-2">
              <div className="space-y-3">
                {loading ? (
                  <p className="text-sm text-slate-500">Loading…</p>
                ) : filtered.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No recognition to show yet.
                  </p>
                ) : (
                  filtered.map((rec: RecognitionRow) => (
                    <Card
                      key={rec.id}
                      className="p-4 rounded-2xl border border-slate-200 hover:shadow-md transition-all"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-2">
                          <div className="text-xs text-slate-500">
                            From{" "}
                            <span className="font-medium text-slate-800">
                              {rec.from_email}
                            </span>{" "}
                            to{" "}
                            <span className="font-medium text-slate-800">
                              {rec.to_email}
                            </span>
                          </div>
                          <p className="text-sm text-slate-800">
                            {rec.message}
                          </p>
                          <div className="flex flex-wrap gap-2 text-[11px] text-slate-500">
                            {rec.department && (
                              <span className="px-2 py-1 bg-slate-100 rounded-full">
                                {rec.department}
                              </span>
                            )}
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

          {/* SEND RECOGNITION */}
          <Card className="p-6 rounded-3xl shadow-lg bg-gradient-to-br from-white to-[#E8F1FF]">
            <h3 className="text-lg font-semibold mb-3">Send Recognition</h3>
            <p className="text-xs text-slate-600 mb-4">
              Appreciate a teammate for something they did well today.
            </p>

            {/* Recipient */}
            <div className="space-y-2 mb-4">
              <label className="text-xs font-medium text-slate-700">
                Recipient
              </label>
              <Select value={newRecipient} onValueChange={setRecipient}>
                <SelectTrigger className="rounded-xl h-10 text-sm">
                  <SelectValue placeholder="Select a colleague" />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {employees.map((e: EmployeeRow) => (
                    <SelectItem key={e.email} value={e.email}>
                      {nameOf(e)}
                      {e.department ? ` — ${e.department}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Message */}
            <div className="space-y-2 mb-4">
              <label className="text-xs font-medium text-slate-700">
                Message
              </label>
              <Textarea
                className="min-h-[110px] rounded-2xl text-sm"
                placeholder="Example: Great job helping debug the client issue—your patience made a big difference."
                value={newMessage}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>

            {/* Tags */}
            <div className="space-y-2 mb-5">
              <label className="text-xs font-medium text-slate-700 flex justify-between">
                <span>Tags (optional)</span>
                <span className="text-[10px] text-slate-400">
                  Example: teamwork, ownership
                </span>
              </label>
              <Input
                className="h-9 rounded-xl text-sm"
                placeholder="teamwork, ownership"
                value={newTags}
                onChange={(e) => setTags(e.target.value)}
              />
            </div>

            <Button
              className="w-full h-10 rounded-xl bg-gradient-to-r from-[#33C38C] to-emerald-600 hover:from-emerald-600 hover:to-[#33C38C] text-sm"
              onClick={sendRecognition}
            >
              Send Recognition
            </Button>

            <p className="mt-3 text-[10px] text-slate-500 text-center">
              Recognitions are visible to HR and managers for culture insights.
            </p>
          </Card>
        </div>
      </main>
    </div>
  );
}
