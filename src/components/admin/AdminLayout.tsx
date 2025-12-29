import { ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  ClipboardList, 
  Settings,
  Menu,
  X,
  LogOut,
  FileQuestion,
  MessageSquare,
  Sparkles,
  Heart
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface AdminLayoutProps {
  children: ReactNode;
}

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/admin' },
  { icon: Users, label: 'Users', path: '/admin/users' },
  { icon: Calendar, label: 'Events', path: '/admin/events' },
  { icon: ClipboardList, label: 'Event Requests', path: '/admin/requests' },
  { icon: FileQuestion, label: 'Quiz Builder', path: '/admin/quiz-builder' },
  { icon: MessageSquare, label: 'Quiz Responses', path: '/admin/quiz-responses' },
  { icon: Sparkles, label: 'Matchmaker', path: '/admin/matchmaker-builder' },
  { icon: MessageSquare, label: 'Matchmaker Responses', path: '/admin/matchmaker-responses' },
  { icon: Heart, label: 'Matchmaking', path: '/admin/matchmaking' },
  { icon: Settings, label: 'Settings', path: '/admin/settings' },
];

export const AdminLayout = ({ children }: AdminLayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-card border-b border-border flex items-center justify-between px-4 z-50">
        <button onClick={() => setSidebarOpen(true)}>
          <Menu className="h-6 w-6" />
        </button>
        <span className="font-semibold text-lg">Loam Admin</span>
        <div className="w-6" />
      </div>

      {/* Sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed lg:static inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transform transition-transform duration-200 ease-in-out",
        sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <div className="h-full flex flex-col">
          <div className="h-14 lg:h-16 flex items-center justify-between px-4 border-b border-border">
            <span className="font-semibold text-lg">Loam Admin</span>
            <button className="lg:hidden" onClick={() => setSidebarOpen(false)}>
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="flex-1 p-4 space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    isActive 
                      ? "bg-primary text-primary-foreground" 
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-border">
            <Button 
              variant="ghost" 
              className="w-full justify-start gap-3"
              onClick={handleSignOut}
            >
              <LogOut className="h-5 w-5" />
              Sign out
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 lg:pt-0 pt-14">
        <div className="p-4 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
};
