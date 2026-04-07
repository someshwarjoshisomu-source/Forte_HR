import { useState, useEffect } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Separator } from "./ui/separator";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";

import {
  User,
  Building2,
  Briefcase,
  Bell,
  LogOut,
  Save,
  ArrowLeft,
} from "lucide-react";

import { supabase } from "../utils/supabase/client";

interface ProfilePageProps {
  user: any;                                // from Supabase auth
  onNavigate: (page: string) => void;
  onLogout: () => void;
}

export function ProfilePage({ user, onNavigate, onLogout }: ProfilePageProps) {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [moodReminders, setMoodReminders] = useState(true);
  const [anonymousFeedback, setAnonymousFeedback] = useState(true);

  // Load profile from employees table
  useEffect(() => {
    async function loadProfile() {
      if (!user?.email) return;

      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .eq("email", user.email)
        .single();

      if (error) {
        console.error(error);
      }

      if (data) {
        setProfile(data);

        // load notification settings if stored
        setEmailNotifications(data.emailNotifications ?? true);
        setPushNotifications(data.pushNotifications ?? true);
        setMoodReminders(data.moodReminders ?? true);
        setAnonymousFeedback(data.anonymousFeedback ?? true);
      }

      setLoading(false);
    }

    loadProfile();
  }, [user]);

  // Save updated profile
  const saveProfile = async () => {
    if (!profile) return;

    const { error } = await supabase
  .from("employees")
    .update({
      first_name: profile.firstName,
      last_name: profile.lastName,
      phone: profile.phone,
      email_notifications: emailNotifications,
      push_notifications: pushNotifications,
      mood_reminders: moodReminders,
      anonymous_feedback: anonymousFeedback,
    })
    .eq("email", profile.email);

    if (error) {
      console.error(error);
      alert("Failed to save profile");
    } else {
      alert("Profile updated successfully!");
    }
  };

  // Logout
  const logout = async () => {
    await supabase.auth.signOut();
    onLogout();
  };

  if (loading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-600">
        Loading profile...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#E8F1FF] via-white to-slate-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          
          <Button
            onClick={() => onNavigate(profile.role)}
            variant="outline"
            className="rounded-xl"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>

          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-[#33C38C] to-emerald-600 p-2 rounded-xl">
              <User className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl">Profile & Settings</h1>
              <p className="text-xs text-slate-600">Manage your account</p>
            </div>
          </div>

        </div>
      </header>

      {/* PAGE CONTENT */}
      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">

        {/* Profile Card */}
        <Card className="p-8 shadow-lg border-0 rounded-3xl">
          <div className="flex items-center gap-8">
            <Avatar className="w-32 h-32 border-4 border-[#33C38C]">
              <AvatarImage src={profile.avatar || ""} />
              <AvatarFallback className="text-2xl bg-gradient-to-br from-[#33C38C] to-emerald-600 text-white">
                {profile.firstName?.[0]}{profile.lastName?.[0]}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <h2 className="text-3xl">{profile.firstName} {profile.lastName}</h2>
              <p className="text-slate-600">{profile.roleTitle}</p>

              <div className="flex gap-4 text-sm text-slate-600 mt-4">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  {profile.department}
                </div>
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4" />
                  {profile.tenure} years with ForteHR
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* PERSONAL INFO */}
        <Card className="p-8 shadow-lg border-0 rounded-3xl space-y-6">
          <div className="flex items-center gap-3">
            <User className="w-6 h-6 text-[#33C38C]" />
            <h3 className="text-xl">Personal Information</h3>
          </div>

          <Separator />

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <Label>First Name</Label>
              <Input
                value={profile.firstName}
                onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                className="rounded-xl"
              />
            </div>

            <div>
              <Label>Last Name</Label>
              <Input
                value={profile.lastName}
                onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                className="rounded-xl"
              />
            </div>

            <div>
              <Label>Email</Label>
              <Input
                value={profile.email}
                disabled
                className="rounded-xl bg-slate-100"
              />
            </div>

            <div>
              <Label>Phone</Label>
              <Input
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                className="rounded-xl"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={saveProfile}
              className="rounded-xl bg-gradient-to-r from-[#33C38C] to-emerald-600"
            >
              <Save className="w-4 h-4 mr-2" /> Save Changes
            </Button>
          </div>
        </Card>

        {/* NOTIFICATIONS */}
        <Card className="p-8 shadow-lg border-0 rounded-3xl space-y-6">
          <div className="flex items-center gap-3">
            <Bell className="w-6 h-6 text-[#33C38C]" />
            <h3 className="text-xl">Notification Preferences</h3>
          </div>

          <Separator />

          <SwitchRow
            title="Email Notifications"
            subtitle="Get updates via email"
            checked={emailNotifications}
            onChange={setEmailNotifications}
          />

          <SwitchRow
            title="Push Notifications"
            subtitle="Real-time alerts"
            checked={pushNotifications}
            onChange={setPushNotifications}
          />

          <SwitchRow
            title="Mood Reminders"
            subtitle="Daily reminder to check-in"
            checked={moodReminders}
            onChange={setMoodReminders}
          />

          <SwitchRow
            title="Anonymous Feedback"
            subtitle="Hide your identity when sharing"
            checked={anonymousFeedback}
            onChange={setAnonymousFeedback}
          />
        </Card>

        {/* ACCOUNT SETTINGS */}
        <Card className="p-8 shadow-lg border-0 rounded-3xl border-red-200 bg-red-50">
          <h3 className="text-xl mb-2">Account Management</h3>
          <Separator className="mb-4" />

          <Button
            onClick={() => setShowLogoutDialog(true)}
            variant="outline"
            className="rounded-xl border-red-300 text-red-600"
          >
            <LogOut className="w-4 h-4 mr-2" /> Logout
          </Button>
        </Card>

      </main>

      {/* LOGOUT CONFIRMATION */}
      <Dialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>Confirm Logout</DialogTitle>
            <DialogDescription>You will need to sign in again.</DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLogoutDialog(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button onClick={logout} className="rounded-xl bg-red-600">
              <LogOut className="w-4 h-4 mr-2" /> Logout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SwitchRow({
  title,
  subtitle,
  checked,
  onChange,
}: {
  title: string;
  subtitle: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div>{title}</div>
        <div className="text-sm text-slate-600">{subtitle}</div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
