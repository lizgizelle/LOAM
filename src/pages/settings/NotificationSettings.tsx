import { useNavigate } from 'react-router-dom';
import { Switch } from '@/components/ui/switch';
import { useAppStore } from '@/store/appStore';
import { ChevronLeft } from 'lucide-react';

const NotificationSettings = () => {
  const navigate = useNavigate();
  const { userProfile, setUserProfile } = useAppStore();

  const notificationsEnabled = userProfile?.notificationsEnabled ?? true;

  const handleToggle = (checked: boolean) => {
    setUserProfile({ notificationsEnabled: checked });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="px-6 pt-14 pb-6 safe-area-top">
        <button 
          onClick={() => navigate('/profile')}
          className="flex items-center gap-2 text-foreground mb-4"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="font-medium">Back</span>
        </button>
        <h1 className="text-2xl font-bold text-foreground">
          Notification preferences
        </h1>
      </div>

      {/* Toggle */}
      <div className="px-6">
        <div className="flex items-center justify-between p-4 rounded-2xl bg-popover shadow-loam">
          <div>
            <p className="font-medium text-foreground">Push notifications</p>
            <p className="text-sm text-muted-foreground">Stay updated on events</p>
          </div>
          <Switch 
            checked={notificationsEnabled} 
            onCheckedChange={handleToggle}
          />
        </div>
      </div>
    </div>
  );
};

export default NotificationSettings;
