import { Routes, Route, Navigate } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { AuthenticateWithRedirectCallback } from "@clerk/clerk-react";
import { ThemeProvider } from "./context/ThemeContext";
import { LocalUserProvider } from "./context/LocalUserContext";
import { PresenceProvider } from "./context/PresenceContext";
import { ToastProvider } from "./context/ToastContext";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import AppLayout from "./layouts/AppLayout";
import { Landing, SignIn, SignUp, ForgotPassword } from "./pages/LandingAuth";
import AboutUs from "./pages/AboutUs";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import Projects from "./pages/Projects";
import Tasks from "./pages/Tasks";
import Settings from "./pages/Settings";
import NotificationsPage from "./pages/Notifications";
import Members from "./pages/Members";
import Comments from "./pages/Comments";

function SsoCallback() {
  return (
    <>
      <AuthenticateWithRedirectCallback />
      <div id="clerk-captcha" />
    </>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <LocalUserProvider>
        <PresenceProvider>
        <ToastProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/about" element={<AboutUs />} />
          <Route path="/sign-in" element={<SignIn />} />
          <Route path="/sign-up" element={<SignUp />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route
            path="/sso-callback"
            element={<SsoCallback />}
          />
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/projects" element={<Projects />} />
                <Route path="/projects/:projectId" element={<Projects />} />
                <Route path="/tasks" element={<Tasks />} />
                <Route path="/members" element={<Members />} />
                <Route path="/comments/:taskId?" element={<Comments />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Route>
            </Route>
          </Routes>
        </ToastProvider>
        </PresenceProvider>
      </LocalUserProvider>
    </ThemeProvider>
    </QueryClientProvider>
  );
}
