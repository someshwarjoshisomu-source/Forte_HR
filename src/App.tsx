import { useState } from "react";
import { LoginPage } from "./components/LoginPage";
import { LoginCredentialsPage } from "./components/LoginCredentialsPage";

import { EmployeeDashboard } from "./components/EmployeeDashboard";
import { ManagerDashboard } from "./components/ManagerDashboard";
import { HRDashboard } from "./components/HRDashboard";
import { ProfilePage } from "./components/ProfilePage";

import { EmployeeFeedbackPage } from "./pages/EmployeeFeedbackPage";
import { ManagerFeedbackPage } from "./pages/ManagerFeedbackPage";

import { EmployeeRecognitionPage } from "./pages/EmployeeRecognitionPage";
import { ManagerRecognitionPage } from "./pages/ManagerRecognitionPage";
import { HRRecognitionPage } from "./pages/HRRecognitionPage";

import { Toaster } from "./components/ui/sonner";
import { supabase } from "./utils/supabase/client";

type UserRole = "employee" | "manager" | "hr" | null;

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

export default function App() {
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [currentPage, setCurrentPage] = useState<PageType>("login");
  const [user, setUser] = useState<any>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole>(null);

  const handleRoleSelection = (role: "employee" | "manager" | "hr") => {
    setSelectedRole(role);
    setCurrentPage("login-credentials");
  };

  const handleCredentialsLogin = async () => {
    const { data: authData } = await supabase.auth.getUser();

    if (!authData?.user) {
      alert("Authentication failed");
      return;
    }

    const email = authData.user.email;
    setUser(authData.user);

    const { data: profile } = await supabase
      .from("employees")
      .select("*")
      .eq("email", email)
      .single();

    if (!profile) {
      alert("User profile not found");
      return;
    }

    setUserRole(profile.role);
    setCurrentPage(profile.role as PageType);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setUserRole(null);
    setCurrentPage("login");
  };

  const handleNavigation = (page: string) => {
    setCurrentPage(page as PageType);
  };

  return (
    <>
      {/* LOGIN PAGES */}
      {currentPage === "login" && (
        <LoginPage onRoleSelect={handleRoleSelection} />
      )}

      {currentPage === "login-credentials" && (
        <LoginCredentialsPage
          role={selectedRole}
          onLogin={handleCredentialsLogin}
          onBack={() => {
            setSelectedRole(null);
            setCurrentPage("login");
          }}
        />
      )}

      {/* DASHBOARDS */}
      {currentPage === "employee" && (
        <EmployeeDashboard
          user={user}
          onLogout={handleLogout}
          onNavigate={handleNavigation}
        />
      )}

      {currentPage === "manager" && (
        <ManagerDashboard
          user={user}
          onLogout={handleLogout}
          onNavigate={handleNavigation}
        />
      )}

      {currentPage === "hr" && (
        <HRDashboard
          user={user}
          onLogout={handleLogout}
          onNavigate={handleNavigation}
        />
      )}

      {/* FEEDBACK PAGES */}
      {currentPage === "employee-feedback" && (
        <EmployeeFeedbackPage
          user={user}
          onNavigate={handleNavigation}
          onLogout={handleLogout}
        />
      )}

      {currentPage === "manager-feedback" && (
        <ManagerFeedbackPage
          user={user}
          onNavigate={handleNavigation}
          onLogout={handleLogout}
        />
      )}

      {/* RECOGNITION PAGES */}
      {currentPage === "employee-recognition" && (
        <EmployeeRecognitionPage
          user={user}
          onNavigate={handleNavigation}
          onLogout={handleLogout}
        />
      )}

      {currentPage === "manager-recognition" && (
        <ManagerRecognitionPage
          user={user}
          onNavigate={handleNavigation}
          onLogout={handleLogout}
        />
      )}

      {currentPage === "hr-recognition" && (
        <HRRecognitionPage
          user={user}
          onNavigate={handleNavigation}
          onLogout={handleLogout}
        />
      )}

      {/* PROFILE */}
      {currentPage === "profile" && (
        <ProfilePage
          user={user}
          onLogout={handleLogout}
          onNavigate={handleNavigation}
        />
      )}

      <Toaster />
    </>
  );
}
