// src/pages/EmployeeFeedbackPage.tsx
import { useEffect, useState } from "react";
import { supabase } from "../utils/supabase/client";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { FeedbackModal } from "../components/FeedbackModal";
import { MessageCircle, LogOut, ArrowLeft } from "lucide-react";

interface EmployeeFeedbackPageProps {
  user: any;
  onNavigate: (page: string) => void;
  onLogout: () => void;
}

type FeedbackRow = {
  id: string;
  sender_email: string;
  receiver_email: string;
  rating: number;
  comments: string;
  created_at: string;
};

export function EmployeeFeedbackPage({
  user,
  onNavigate,
  onLogout,
}: EmployeeFeedbackPageProps) {
  const [tab, setTab] = useState<"received" | "given">("received");
  const [received, setReceived] = useState<FeedbackRow[]>([]);
  const [given, setGiven] = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!user?.email) return;

    const load = async () => {
      setLoading(true);
      try {
        const { data: rec } = await supabase
          .from("feedback")
          .select("*")
          .eq("receiver_email", user.email)
          .order("created_at", { ascending: false });

        const { data: giv } = await supabase
          .from("feedback")
          .select("*")
          .eq("sender_email", user.email)
          .order("created_at", { ascending: false });

        setReceived(rec || []);
        setGiven(giv || []);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user]);

  const list = tab === "received" ? received : given;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#E8F1FF] via-white to-slate-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => onNavigate("employee")}
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-2 rounded-xl">
                <MessageCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl">Your Feedback</h1>
                <p className="text-xs text-slate-600">
                  See feedback you’ve received and shared.
                </p>
              </div>
            </div>
          </div>

          <Button onClick={onLogout} variant="outline" className="rounded-xl">
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        <Card className="p-6 rounded-3xl border-0 shadow-lg bg-white flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Share New Feedback</h2>
            <p className="text-sm text-slate-600">
              Appreciate a teammate or share suggestions with your manager.
            </p>
          </div>
          <Button
            className="rounded-2xl bg-gradient-to-r from-[#33C38C] to-emerald-600 flex items-center gap-2"
            onClick={() => setShowModal(true)}
          >
            <MessageCircle className="w-4 h-4" />
            Give Feedback
          </Button>
        </Card>

        {/* Tabs */}
        <div className="flex gap-3 text-sm">
          <button
            onClick={() => setTab("received")}
            className={`px-4 py-2 rounded-2xl border ${
              tab === "received"
                ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                : "border-slate-200 text-slate-600"
            }`}
          >
            Feedback Received
          </button>
          <button
            onClick={() => setTab("given")}
            className={`px-4 py-2 rounded-2xl border ${
              tab === "given"
                ? "border-blue-500 bg-blue-50 text-blue-700"
                : "border-slate-200 text-slate-600"
            }`}
          >
            Feedback Given
          </button>
        </div>

        {/* List */}
        <Card className="p-6 rounded-3xl border-0 shadow-lg bg-white">
          {loading ? (
            <p className="text-sm text-slate-500">Loading feedback…</p>
          ) : list.length === 0 ? (
            <p className="text-sm text-slate-500">
              No {tab === "received" ? "received" : "given"} feedback yet.
            </p>
          ) : (
            <ul className="space-y-4">
              {list.map((f) => (
                <li
                  key={f.id}
                  className="border border-slate-100 rounded-2xl p-4 flex flex-col gap-1"
                >
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>
                      {tab === "received"
                        ? `From: ${f.sender_email}`
                        : `To: ${f.receiver_email}`}
                    </span>
                    <span>
                      {new Date(f.created_at).toLocaleDateString()} • Rating{" "}
                      {f.rating}/5
                    </span>
                  </div>
                  <p className="text-sm text-slate-800 mt-1">{f.comments}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </main>

      <FeedbackModal
        open={showModal}
        onClose={() => setShowModal(false)}
        user={user}
        mode="employee"
      />
    </div>
  );
}
