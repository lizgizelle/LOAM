import { useNavigate } from 'react-router-dom';
import BottomNav from '@/components/BottomNav';
import { useAppStore } from '@/store/appStore';
import { ChevronRight, Bell, Globe, MapPin, LogOut } from 'lucide-react';

const Profile = () => {
  const navigate = useNavigate();
  const { userProfile, logout } = useAppStore();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const settingsItems = [
    { icon: Bell, label: 'Notification preferences', action: () => {} },
    { icon: Globe, label: 'App language', value: 'English', action: () => {} },
    { icon: MapPin, label: 'City', value: 'Singapore', action: () => {} },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="px-6 pt-14 pb-6 safe-area-top">
        <h1 className="text-2xl font-bold text-foreground">
          Profile
        </h1>
      </div>

      {/* Profile card */}
      <div className="px-6 mb-8">
        <div className="flex items-center gap-4 p-4 bg-popover rounded-2xl shadow-loam">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
            {userProfile?.firstName?.[0] || 'L'}
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-foreground">
              {userProfile?.firstName || 'Loam User'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {userProfile?.phone || 'No phone added'}
            </p>
          </div>
          <button 
            onClick={() => navigate('/edit-profile')}
            className="text-primary font-medium text-sm hover:underline"
          >
            Edit profile
          </button>
        </div>
      </div>

      {/* Settings */}
      <div className="px-6">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
          Settings
        </h3>
        <div className="bg-popover rounded-2xl shadow-loam overflow-hidden">
          {settingsItems.map((item, index) => (
            <button
              key={item.label}
              onClick={item.action}
              className={`w-full flex items-center gap-4 p-4 text-left hover:bg-secondary/50 transition-colors ${
                index !== settingsItems.length - 1 ? 'border-b border-border' : ''
              }`}
            >
              <item.icon className="w-5 h-5 text-muted-foreground" />
              <span className="flex-1 font-medium text-foreground">{item.label}</span>
              {item.value && (
                <span className="text-sm text-muted-foreground">{item.value}</span>
              )}
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          ))}
        </div>
      </div>

      {/* Logout */}
      <div className="px-6 mt-8">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-4 p-4 bg-popover rounded-2xl shadow-loam text-left hover:bg-secondary/50 transition-colors"
        >
          <LogOut className="w-5 h-5 text-destructive" />
          <span className="font-medium text-destructive">Log out</span>
        </button>
      </div>

      <BottomNav />
    </div>
  );
};

export default Profile;
