// LoginPage.tsx
import { useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Users, TrendingUp, Shield } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface LoginPageProps {
  onRoleSelect: (role: 'employee' | 'manager' | 'hr') => void;
}

export function LoginPage({ onRoleSelect }: LoginPageProps) {
  const [selectedRole, setSelectedRole] =
    useState<'employee' | 'manager' | 'hr' | null>(null);

  const handleContinue = () => {
    if (!selectedRole) return;
    onRoleSelect(selectedRole);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#E8F1FF] via-white to-[#F0FDF4] flex items-center justify-center p-8">
      <div className="max-w-6xl w-full grid md:grid-cols-2 gap-12 items-center">
        {/* LEFT SIDE - BRANDING */}
        <div className="space-y-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-[#33C38C] to-emerald-600 p-3 rounded-2xl shadow-lg">
                <Users className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl">ForteHR</h1>
                <p className="text-slate-600">
                  Understanding People. Retaining Talent.
                </p>
              </div>
            </div>
          </div>

          <div className="relative rounded-3xl overflow-hidden shadow-2xl">
            <ImageWithFallback
              src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080&q=80"
              alt="Team collaboration"
              className="w-full h-80 object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          </div>

          <div className="flex items-center gap-4 text-slate-600 text-sm md:text-base">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#33C38C]" />
              <span>Boost Engagement</span>
            </div>
            <div className="w-1 h-1 rounded-full bg-slate-400" />
            <span>Retain Top Talent</span>
            <div className="w-1 h-1 rounded-full bg-slate-400" />
            <span>Drive Growth</span>
          </div>
        </div>

        {/* RIGHT SIDE - ROLE SELECTION */}
        <Card className="p-10 shadow-2xl border-0 bg-white/80 backdrop-blur-sm rounded-3xl">
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-semibold">Welcome Back</h2>
              <p className="text-slate-600">Select your role to continue</p>
            </div>

            <div className="space-y-4">
              {/* EMPLOYEE */}
              <button
                onClick={() => setSelectedRole('employee')}
                className={`w-full p-6 rounded-2xl border-2 transition-all duration-300 text-left ${
                  selectedRole === 'employee'
                    ? 'border-[#33C38C] bg-[#E8F1FF] shadow-lg scale-105'
                    : 'border-slate-200 hover:border-[#33C38C] hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-4 rounded-xl">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="text-lg font-medium">Employee</div>
                    <div className="text-sm text-slate-600">
                      Access your dashboard and engagement tools
                    </div>
                  </div>
                </div>
              </button>

              {/* MANAGER */}
              <button
                onClick={() => setSelectedRole('manager')}
                className={`w-full p-6 rounded-2xl border-2 transition-all duration-300 text-left ${
                  selectedRole === 'manager'
                    ? 'border-[#33C38C] bg-[#E8F1FF] shadow-lg scale-105'
                    : 'border-slate-200 hover:border-[#33C38C] hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-4 rounded-xl">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="text-lg font-medium">Manager</div>
                    <div className="text-sm text-slate-600">
                      Monitor team health and engagement
                    </div>
                  </div>
                </div>
              </button>

              {/* HR ADMIN */}
              <button
                onClick={() => setSelectedRole('hr')}
                className={`w-full p-6 rounded-2xl border-2 transition-all duration-300 text-left ${
                  selectedRole === 'hr'
                    ? 'border-[#33C38C] bg-[#E8F1FF] shadow-lg scale-105'
                    : 'border-slate-200 hover:border-[#33C38C] hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-4 rounded-xl">
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="text-lg font-medium">HR Administrator</div>
                    <div className="text-sm text-slate-600">
                      Organization-wide analytics and insights
                    </div>
                  </div>
                </div>
              </button>
            </div>

            <Button
              onClick={handleContinue}
              disabled={!selectedRole}
              className="w-full h-14 rounded-xl bg-gradient-to-r from-[#33C38C] to-emerald-600 hover:from-emerald-600 hover:to-[#33C38C] shadow-lg disabled:opacity-50"
            >
              Continue
            </Button>

            <div className="text-center text-sm text-slate-500">
              Secure access powered by ForteHR
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
