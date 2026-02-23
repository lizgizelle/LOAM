import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Landing from "./pages/Landing";
import Quiz from "./pages/Quiz";
import AuthChoice from "./pages/AuthChoice";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import VerifyEmail from "./pages/VerifyEmail";
import AlphacodeVerify from "./pages/AlphacodeVerify";
import Onboarding from "./pages/Onboarding";
import Home from "./pages/Home";
import Chat from "./pages/Chat";
import ReportConcern from "./pages/ReportConcern";
import MyEvents from "./pages/MyEvents";
import Profile from "./pages/Profile";
import EditProfile from "./pages/EditProfile";
import EventDetail from "./pages/EventDetail";
import EventParticipants from "./pages/EventParticipants";
import NotificationSettings from "./pages/settings/NotificationSettings";
import LanguageSettings from "./pages/settings/LanguageSettings";
import CitySettings from "./pages/settings/CitySettings";
import BlockedScreen from "./pages/BlockedScreen";
import NotFound from "./pages/NotFound";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminEvents from "./pages/admin/AdminEvents";
import AdminEventCreate from "./pages/admin/AdminEventCreate";
import AdminEventDetail from "./pages/admin/AdminEventDetail";
import AdminEventEdit from "./pages/admin/AdminEventEdit";
import AdminRequests from "./pages/admin/AdminRequests";
import AdminEventRequests from "./pages/admin/AdminEventRequests";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminQuizBuilder from "./pages/admin/AdminQuizBuilder";
import AdminQuizQuestions from "./pages/admin/AdminQuizQuestions";
import AdminQuizResponses from "./pages/admin/AdminQuizResponses";
import AdminGame from "./pages/admin/AdminGame";
import AdminReports from "./pages/admin/AdminReports";
import AdminReportDetail from "./pages/admin/AdminReportDetail";
import AdminEventQuestions from "./pages/admin/AdminEventQuestions";
import Game from "./pages/Game";
const queryClient = new QueryClient();

// Wrapper component to check blocked status and email verification
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, isEmailVerified } = useAuth();
  const [isBlocked, setIsBlocked] = useState<boolean | null>(null);
  const [checkingBlocked, setCheckingBlocked] = useState(true);

  useEffect(() => {
    const checkBlockedStatus = async () => {
      if (!user?.id) {
        setIsBlocked(false);
        setCheckingBlocked(false);
        return;
      }

      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_shadow_blocked')
          .eq('id', user.id)
          .maybeSingle();

        setIsBlocked(profile?.is_shadow_blocked ?? false);
      } catch (error) {
        setIsBlocked(false);
      } finally {
        setCheckingBlocked(false);
      }
    };

    if (!loading) {
      checkBlockedStatus();
    }
  }, [user?.id, loading]);

  if (loading || checkingBlocked) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // If not logged in, redirect to landing
  if (!user) {
    return <Navigate to="/" replace />;
  }

  // If email not verified, redirect to verify screen
  if (!isEmailVerified) {
    return <Navigate to="/verify-email" replace />;
  }

  if (isBlocked) {
    return (
      <div className="max-w-md mx-auto min-h-screen bg-background relative shadow-xl">
        <BlockedScreen />
      </div>
    );
  }

  return <>{children}</>;
};

const AppRoutes = () => (
  <Routes>
    {/* Public routes */}
    <Route path="/" element={
      <div className="max-w-md mx-auto min-h-screen bg-background relative shadow-xl">
        <Landing />
      </div>
    } />
    <Route path="/quiz" element={
      <div className="max-w-md mx-auto min-h-screen bg-background relative shadow-xl">
        <Quiz />
      </div>
    } />
    {/* Keep old route for backwards compatibility */}
    <Route path="/survey" element={<Navigate to="/quiz" replace />} />
    <Route path="/auth-choice" element={
      <div className="max-w-md mx-auto min-h-screen bg-background relative shadow-xl">
        <AuthChoice />
      </div>
    } />
    <Route path="/login" element={
      <div className="max-w-md mx-auto min-h-screen bg-background relative shadow-xl">
        <Login />
      </div>
    } />
    <Route path="/signup" element={
      <div className="max-w-md mx-auto min-h-screen bg-background relative shadow-xl">
        <Signup />
      </div>
    } />
    <Route path="/verify-email" element={
      <div className="max-w-md mx-auto min-h-screen bg-background relative shadow-xl">
        <VerifyEmail />
      </div>
    } />
    <Route path="/alphacode" element={
      <div className="max-w-md mx-auto min-h-screen bg-background relative shadow-xl">
        <AlphacodeVerify />
      </div>
    } />
    <Route path="/onboarding" element={
      <div className="max-w-md mx-auto min-h-screen bg-background relative shadow-xl">
        <Onboarding />
      </div>
    } />
    
    {/* Protected routes */}
    <Route path="/home" element={
      <ProtectedRoute>
        <div className="max-w-md mx-auto min-h-screen bg-background relative shadow-xl">
          <Home />
        </div>
      </ProtectedRoute>
    } />
    <Route path="/chat" element={<Navigate to="/report" replace />} />
    <Route path="/report" element={
      <ProtectedRoute>
        <div className="max-w-md mx-auto min-h-screen bg-background relative shadow-xl">
          <ReportConcern />
        </div>
      </ProtectedRoute>
    } />
    <Route path="/my-events" element={
      <ProtectedRoute>
        <div className="max-w-md mx-auto min-h-screen bg-background relative shadow-xl">
          <MyEvents />
        </div>
      </ProtectedRoute>
    } />
    <Route path="/profile" element={
      <ProtectedRoute>
        <div className="max-w-md mx-auto min-h-screen bg-background relative shadow-xl">
          <Profile />
        </div>
      </ProtectedRoute>
    } />
    <Route path="/edit-profile" element={
      <ProtectedRoute>
        <div className="max-w-md mx-auto min-h-screen bg-background relative shadow-xl">
          <EditProfile />
        </div>
      </ProtectedRoute>
    } />
    <Route path="/event/:id" element={
      <ProtectedRoute>
        <div className="max-w-md mx-auto min-h-screen bg-background relative shadow-xl">
          <EventDetail />
        </div>
      </ProtectedRoute>
    } />
    <Route path="/event/:id/participants" element={
      <ProtectedRoute>
        <div className="max-w-md mx-auto min-h-screen bg-background relative shadow-xl">
          <EventParticipants />
        </div>
      </ProtectedRoute>
    } />
    <Route path="/game" element={
      <ProtectedRoute>
        <div className="max-w-md mx-auto min-h-screen bg-background relative shadow-xl">
          <Game />
        </div>
      </ProtectedRoute>
    } />
    <Route path="/settings/notifications" element={
      <ProtectedRoute>
        <div className="max-w-md mx-auto min-h-screen bg-background relative shadow-xl">
          <NotificationSettings />
        </div>
      </ProtectedRoute>
    } />
    <Route path="/settings/language" element={
      <ProtectedRoute>
        <div className="max-w-md mx-auto min-h-screen bg-background relative shadow-xl">
          <LanguageSettings />
        </div>
      </ProtectedRoute>
    } />
    <Route path="/settings/city" element={
      <ProtectedRoute>
        <div className="max-w-md mx-auto min-h-screen bg-background relative shadow-xl">
          <CitySettings />
        </div>
      </ProtectedRoute>
    } />

    {/* Admin routes */}
    <Route path="/admin/login" element={<AdminLogin />} />
    <Route path="/admin" element={<AdminDashboard />} />
    <Route path="/admin/users" element={<AdminUsers />} />
    <Route path="/admin/events" element={<AdminEvents />} />
    <Route path="/admin/events/new" element={<AdminEventCreate />} />
    <Route path="/admin/events/:id" element={<AdminEventDetail />} />
    <Route path="/admin/events/:id/edit" element={<AdminEventEdit />} />
    <Route path="/admin/requests" element={<Navigate to="/admin/events" replace />} />
    <Route path="/admin/events/:id/requests" element={<AdminEventRequests />} />
    <Route path="/admin/events/:id/questions" element={<AdminEventQuestions />} />
    <Route path="/admin/settings" element={<AdminSettings />} />
    <Route path="/admin/quiz-builder" element={<AdminQuizBuilder />} />
    <Route path="/admin/quiz-builder/:quizId" element={<AdminQuizQuestions />} />
    <Route path="/admin/quiz-responses" element={<AdminQuizResponses />} />
    <Route path="/admin/game" element={<AdminGame />} />
    <Route path="/admin/reports" element={<AdminReports />} />
    <Route path="/admin/reports/:id" element={<AdminReportDetail />} />
    {/* Keep old routes for backwards compatibility */}
    <Route path="/admin/survey-builder" element={<Navigate to="/admin/quiz-builder" replace />} />
    <Route path="/admin/survey-responses" element={<Navigate to="/admin/quiz-responses" replace />} />

    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
