// LoginCredentialsPage.tsx
import { useState } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Users, Briefcase, Shield, ArrowLeft } from "lucide-react";
import { supabase } from "../utils/supabase/client";
import { toast } from "sonner";

interface LoginCredentialsProps {
  role: "employee" | "manager" | "hr" | null;
  onLogin: () => void;
  onBack: () => void;
}

export function LoginCredentialsPage({
  role,
  onLogin,
  onBack,
}: LoginCredentialsProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const roleLabel =
    role === "employee"
      ? "Employee Login"
      : role === "manager"
      ? "Manager Login"
      : "HR Administrator Login";

  const bgGradients: Record<string, string> = {
    employee: "from-blue-50 via-white to-blue-100",
    manager: "from-emerald-50 via-white to-emerald-100",
    hr: "from-purple-50 via-white to-purple-100",
  };

  const Icons = {
    employee: Users,
    manager: Briefcase,
    hr: Shield,
  };

  const Icon = Icons[role ?? "employee"];

  const handleSubmit = async () => {
    if (!email || !password) {
      toast.error("Please enter both email and password.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Login successful!");
    onLogin();
  };

  return (
    <div
      className={`min-h-screen flex items-center justify-center p-4 md:p-8 bg-gradient-to-br ${
        bgGradients[role ?? "employee"]
      }`}
    >
      <div className="w-full flex justify-center px-4">
        <Card
          className="w-full p-8 md:p-10 shadow-2xl bg-white/90 backdrop-blur-sm rounded-3xl"
          style={{ maxWidth: "420px" }}   // FIXED WIDTH CONTROL
        >
          {/* Icon + Heading */}
          <div className="text-center space-y-2 mb-6">
            <div className="flex justify-center mb-4">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-[#33C38C] to-emerald-600 shadow-lg">
                <Icon className="w-8 h-8 text-white" />
              </div>
            </div>

            <h2 className="text-3xl font-semibold">{roleLabel}</h2>
            <p className="text-slate-600">Enter your credentials to continue</p>
          </div>


          {/* Email */}
          <div className="space-y-2 mb-4">
            <label className="font-medium">Email Address</label>
            <Input
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 rounded-xl"
            />
          </div>

          {/* Password + Show/Hide */}
          <div className="space-y-2 mb-6">
            <label className="font-medium">Password</label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 pr-12 rounded-xl"
              />

              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 translate-y-[-50%] text-slate-500 hover:text-[#33C38C]"
              >
                {showPassword ? (
                  // Eye-off icon
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <path d="M2 2l20 20" />
                    <path d="M9.88 9.88a3 3 0 104.24 4.24" />
                    <path d="M10.73 5.08A10.4 10.4 0 0112 5c7 0 10 7 10 7a17 17 0 01-1.67 2.7" />
                    <path d="M6.42 6.42A10.8 10.8 0 002 12s3 7 10 7a10.8 10.8 0 005.58-1.5" />
                  </svg>
                ) : (
                  // Eye icon
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <circle cx="12" cy="12" r="3" />
                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Sign In Button */}
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full h-14 rounded-xl text-white bg-gradient-to-r 
            from-[#33C38C] to-emerald-600 hover:from-emerald-600 hover:to-[#33C38C] disabled:opacity-60"
          >
            {loading ? "Signing In..." : "Sign In"}
          </Button>

          {/* Back Button */}
          <button
            onClick={onBack}
            className="mt-4 text-sm text-slate-600 hover:text-[#33C38C] flex items-center justify-center gap-1 w-full"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Role Selection
          </button>
        </Card>
      </div>
    </div>
  );
}
