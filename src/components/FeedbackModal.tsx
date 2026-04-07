// FeedbackModal.tsx
import { useEffect, useState } from "react";
import { supabase } from "../utils/supabase/client";

import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

type FeedbackModalMode = "manager" | "employee";

interface FeedbackModalProps {
  open: boolean;
  onClose: () => void;
  user: any;
  mode: FeedbackModalMode;
}

type TeamMember = {
  email: string;
  name: string;
};

export function FeedbackModal({ open, onClose, user, mode }: FeedbackModalProps) {
  const [loading, setLoading] = useState(false);
  const [rating, setRating] = useState<number>(5);
  const [comments, setComments] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // manager mode
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [selectedTeamEmail, setSelectedTeamEmail] = useState<string>("");

  // employee mode
  const [feedbackType, setFeedbackType] = useState<"manager" | "peer">(
    "manager"
  );
  const [managerEmail, setManagerEmail] = useState<string | null>(null);
  const [peerEmail, setPeerEmail] = useState("");

  // Load team for managers / manager for employees
  useEffect(() => {
    if (!open || !user?.email) return;

    const load = async () => {
      setError(null);
      setSuccess(null);

      if (mode === "manager") {
        const { data, error } = await supabase
          .from("employees")
          .select("email, firstName, lastName, manager")
          .eq("manager", user.email)
          .eq("role", "employee");
      
        if (error) console.error("Team load error:", error);
      
        const teamList: TeamMember[] = (data || []).map((row: any) => ({
          email: row.email,
          name: `${row.firstName || ""} ${row.lastName || ""}`.trim() || row.email,
        }));
      
        setTeam(teamList);
        setSelectedTeamEmail(teamList[0]?.email || "");
      }
       else {
        // employee → load manager using correct column 'manager_email'
        const { data } = await supabase
          .from("employees")
          .select("manager")
          .eq("email", user.email)
          .single();

        setManagerEmail(data?.manager ?? null);
      }
    };

    load();
  }, [open, user, mode]);

  const resetForm = () => {
    setRating(5);
    setComments("");
    setPeerEmail("");
    setFeedbackType("manager");
  };

  const handleSubmit = async () => {
    if (!user?.email) return;

    setError(null);
    setSuccess(null);

    let receiverEmail: string | null = null;

    if (mode === "manager") {
      if (!selectedTeamEmail) {
        setError("No team member selected.");
        return;
      }
      receiverEmail = selectedTeamEmail;
    } else {
      if (feedbackType === "manager") {
        if (!managerEmail) {
          setError("No manager linked to your profile.");
          return;
        }
        receiverEmail = managerEmail;
      } else {
        if (!peerEmail) {
          setError("Please enter your coworker’s email.");
          return;
        }
        receiverEmail = peerEmail.trim();
      }
    }

    setLoading(true);
    try {
      const { error: insertError } = await supabase.from("feedback").insert({
        sender_email: user.email,
        receiver_email: receiverEmail,
        rating,
        comments,
      });

      if (insertError) {
        console.error(insertError);
        setError("Failed to submit feedback. Try again.");
      } else {
        setSuccess("Feedback submitted!");
        resetForm();

        setTimeout(() => {
          setSuccess(null);
          onClose();
        }, 1200);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen: boolean) => {
        if (!nextOpen) onClose();
      }}
    >
      <DialogContent className="max-w-lg rounded-3xl">
        <DialogHeader>
          <DialogTitle>
            {mode === "manager"
              ? "Give Feedback to a Team Member"
              : "Share Feedback"}
          </DialogTitle>
          <DialogDescription>
            Your feedback helps build a healthier, more supportive workplace.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {mode === "manager" ? (
            <div className="space-y-2">
              <Label>Team member</Label>
              {team.length === 0 ? (
                <p className="text-sm text-slate-500">
                  You don&apos;t have any direct reports yet.
                </p>
              ) : (
                <select
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  value={selectedTeamEmail}
                  onChange={(e) => setSelectedTeamEmail(e.target.value)}
                >
                  {team.map((m) => (
                    <option key={m.email} value={m.email}>
                      {m.name} — {m.email}
                    </option>
                  ))}
                </select>
              )}
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Who is this feedback for?</Label>
                <div className="flex gap-3 text-sm">
                  <button
                    type="button"
                    onClick={() => setFeedbackType("manager")}
                    className={`px-3 py-2 rounded-xl border text-xs ${
                      feedbackType === "manager"
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                        : "border-slate-200 text-slate-600"
                    }`}
                  >
                    My Manager
                  </button>

                  <button
                    type="button"
                    onClick={() => setFeedbackType("peer")}
                    className={`px-3 py-2 rounded-xl border text-xs ${
                      feedbackType === "peer"
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-slate-200 text-slate-600"
                    }`}
                  >
                    Coworker
                  </button>
                </div>
              </div>

              {feedbackType === "manager" ? (
                <div className="space-y-2">
                  <Label>Manager Email</Label>
                  <Input
                    disabled
                    value={managerEmail ?? "No manager linked"}
                    className="rounded-xl bg-slate-100 text-sm"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Coworker Email</Label>
                  <Input
                    placeholder="coworker@test.com"
                    value={peerEmail}
                    onChange={(e) => setPeerEmail(e.target.value)}
                    className="rounded-xl text-sm"
                  />
                </div>
              )}
            </>
          )}

          <div className="space-y-2">
            <Label>Rating (1–5)</Label>
            <select
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={rating}
              onChange={(e) => setRating(Number(e.target.value))}
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label>Comments</Label>
            <Textarea
              rows={4}
              placeholder="Share specific, helpful feedback..."
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              className="rounded-xl text-sm"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {success && <p className="text-sm text-emerald-600">{success}</p>}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            className="rounded-xl"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>

          <Button
            className="rounded-xl bg-gradient-to-r from-[#33C38C] to-emerald-600"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? "Submitting…" : "Submit Feedback"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
