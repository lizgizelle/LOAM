import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Landing from "./pages/Landing";
import Survey from "./pages/Survey";
import AuthChoice from "./pages/AuthChoice";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Onboarding from "./pages/Onboarding";
import Home from "./pages/Home";
import Chat from "./pages/Chat";
import MyEvents from "./pages/MyEvents";
import Profile from "./pages/Profile";
import EditProfile from "./pages/EditProfile";
import EventDetail from "./pages/EventDetail";
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
import AdminSettings from "./pages/admin/AdminSettings";
import AdminSurveyBuilder from "./pages/admin/AdminSurveyBuilder";
import AdminSurveyQuestions from "./pages/admin/AdminSurveyQuestions";
import AdminSurveyResponses from "./pages/admin/AdminSurveyResponses";

const queryClient = new QueryClient();

// Wrapper component to check blocked status
const BlockedUserCheck = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
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
          .single();

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
    {/* User app routes */}
    <Route path="/" element={
      <div className="max-w-md mx-auto min-h-screen bg-background relative shadow-xl">
        <Landing />
      </div>
    } />
    <Route path="/survey" element={
      <div className="max-w-md mx-auto min-h-screen bg-background relative shadow-xl">
        <Survey />
      </div>
    } />
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
    <Route path="/onboarding" element={
      <div className="max-w-md mx-auto min-h-screen bg-background relative shadow-xl">
        <Onboarding />
      </div>
    } />
    <Route path="/home" element={
      <BlockedUserCheck>
        <div className="max-w-md mx-auto min-h-screen bg-background relative shadow-xl">
          <Home />
        </div>
      </BlockedUserCheck>
    } />
    <Route path="/chat" element={
      <BlockedUserCheck>
        <div className="max-w-md mx-auto min-h-screen bg-background relative shadow-xl">
          <Chat />
        </div>
      </BlockedUserCheck>
    } />
    <Route path="/my-events" element={
      <BlockedUserCheck>
        <div className="max-w-md mx-auto min-h-screen bg-background relative shadow-xl">
          <MyEvents />
        </div>
      </BlockedUserCheck>
    } />
    <Route path="/profile" element={
      <BlockedUserCheck>
        <div className="max-w-md mx-auto min-h-screen bg-background relative shadow-xl">
          <Profile />
        </div>
      </BlockedUserCheck>
    } />
    <Route path="/edit-profile" element={
      <BlockedUserCheck>
        <div className="max-w-md mx-auto min-h-screen bg-background relative shadow-xl">
          <EditProfile />
        </div>
      </BlockedUserCheck>
    } />
    <Route path="/event/:id" element={
      <BlockedUserCheck>
        <div className="max-w-md mx-auto min-h-screen bg-background relative shadow-xl">
          <EventDetail />
        </div>
      </BlockedUserCheck>
    } />
    <Route path="/settings/notifications" element={
      <BlockedUserCheck>
        <div className="max-w-md mx-auto min-h-screen bg-background relative shadow-xl">
          <NotificationSettings />
        </div>
      </BlockedUserCheck>
    } />
    <Route path="/settings/language" element={
      <BlockedUserCheck>
        <div className="max-w-md mx-auto min-h-screen bg-background relative shadow-xl">
          <LanguageSettings />
        </div>
      </BlockedUserCheck>
    } />
    <Route path="/settings/city" element={
      <BlockedUserCheck>
        <div className="max-w-md mx-auto min-h-screen bg-background relative shadow-xl">
          <CitySettings />
        </div>
      </BlockedUserCheck>
    } />

    {/* Admin routes */}
    <Route path="/admin/login" element={<AdminLogin />} />
    <Route path="/admin" element={<AdminDashboard />} />
    <Route path="/admin/users" element={<AdminUsers />} />
    <Route path="/admin/events" element={<AdminEvents />} />
    <Route path="/admin/events/new" element={<AdminEventCreate />} />
    <Route path="/admin/events/:id" element={<AdminEventDetail />} />
    <Route path="/admin/events/:id/edit" element={<AdminEventEdit />} />
    <Route path="/admin/requests" element={<AdminRequests />} />
    <Route path="/admin/settings" element={<AdminSettings />} />
    <Route path="/admin/survey-builder" element={<AdminSurveyBuilder />} />
    <Route path="/admin/survey-builder/:surveyId" element={<AdminSurveyQuestions />} />
    <Route path="/admin/survey-responses" element={<AdminSurveyResponses />} />

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
