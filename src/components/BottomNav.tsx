import { NavLink, useLocation } from 'react-router-dom';
import { Home, Calendar, User, Gamepad2 } from 'lucide-react';

const BottomNav = () => {
  const location = useLocation();

  const tabs = [
    { path: '/home', icon: Home, label: 'Home' },
    { path: '/my-events', icon: Calendar, label: 'My Activities' },
    { path: '/game', icon: Gamepad2, label: 'Game' },
    { path: '/profile', icon: User, label: 'Profile' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border safe-area-bottom z-50">
      <div className="flex items-center justify-around h-16 max-w-md mx-auto">
        {tabs.map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path;
          const iconSize =
            label === 'Game' ? 24 : label === 'My Activities' ? 20 : 22;
          // (Chat tab removed)
          return (
            <NavLink
              key={path}
              to={path}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                isActive ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <div className="w-6 h-6 flex items-center justify-center">
                <Icon style={{ width: iconSize, height: iconSize }} strokeWidth={2} />
              </div>
              <span className="text-xs mt-1 font-medium">{label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
