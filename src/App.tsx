import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
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
              <div className="max-w-md mx-auto min-h-screen bg-background relative shadow-xl">
                <Home />
              </div>
            } />
            <Route path="/chat" element={
              <div className="max-w-md mx-auto min-h-screen bg-background relative shadow-xl">
                <Chat />
              </div>
            } />
            <Route path="/my-events" element={
              <div className="max-w-md mx-auto min-h-screen bg-background relative shadow-xl">
                <MyEvents />
              </div>
            } />
            <Route path="/profile" element={
              <div className="max-w-md mx-auto min-h-screen bg-background relative shadow-xl">
                <Profile />
              </div>
            } />
            <Route path="/edit-profile" element={
              <div className="max-w-md mx-auto min-h-screen bg-background relative shadow-xl">
                <EditProfile />
              </div>
            } />
            <Route path="/event/:id" element={
              <div className="max-w-md mx-auto min-h-screen bg-background relative shadow-xl">
                <EventDetail />
              </div>
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

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
