import { NavLink, useLocation } from 'react-router-dom';
import { Home, MessageCircle, Calendar, User, Gamepad2 } from 'lucide-react';

const BottomNav = () => {
  const location = useLocation();

  const tabs = [
    { path: '/home', icon: Home, label: 'Home', highlight: false },
    { path: '/my-events', icon: Calendar, label: 'My Events', highlight: false },
    { path: '/game', icon: Gamepad2, label: 'Game', highlight: true },
    { path: '/chat', icon: MessageCircle, label: 'Chat', highlight: false },
    { path: '/profile', icon: User, label: 'Profile', highlight: false },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border safe-area-bottom z-50">
      <div className="flex items-center justify-around h-16 max-w-md mx-auto">
        {tabs.map(({ path, icon: Icon, label, highlight }) => {
          const isActive = location.pathname === path;
          return (
            <NavLink
              key={path}
              to={path}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                isActive ? 'text-primary' : highlight ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              {highlight ? (
                <div className={`w-11 h-11 -mt-5 rounded-full flex items-center justify-center shadow-lg transition-all ${
                  isActive ? 'bg-primary text-primary-foreground scale-110' : 'bg-primary/90 text-primary-foreground'
                }`}>
                  <Icon className="w-6 h-6" strokeWidth={2.5} />
                </div>
              ) : (
                <Icon className="w-6 h-6" strokeWidth={isActive ? 2.5 : 2} />
              )}
              <span className={`text-xs mt-1 font-semibold ${highlight ? '' : 'font-medium'}`}>{label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
