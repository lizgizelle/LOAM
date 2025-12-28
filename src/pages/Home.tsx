import { useNavigate } from 'react-router-dom';
import BottomNav from '@/components/BottomNav';
import EventCard from '@/components/EventCard';
import { mockEvents } from '@/data/events';
import { useAppStore } from '@/store/appStore';
import { getDefaultAvatar } from '@/lib/avatars';

const Home = () => {
  const navigate = useNavigate();
  const { userProfile } = useAppStore();
  const firstName = userProfile?.firstName || 'Friend';
  const upcomingEvents = mockEvents.filter(e => !e.isPast);

  // Get avatar - use photo if available, otherwise use default based on user identifier
  const avatarSrc = userProfile?.photo || getDefaultAvatar(userProfile?.firstName || 'user');

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="px-6 pt-14 pb-6 safe-area-top flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground animate-fade-in">
            Hey {firstName}
          </h1>
          <p className="text-muted-foreground mt-1 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            A place to meet genuine people, in real life.
          </p>
        </div>
        
        {/* Profile avatar */}
        <button 
          onClick={() => navigate('/profile')}
          className="w-10 h-10 rounded-full overflow-hidden bg-secondary flex-shrink-0 animate-fade-in"
        >
          <img 
            src={avatarSrc} 
            alt="Profile" 
            className="w-full h-full object-cover"
          />
        </button>
      </div>

      {/* Gatherings section */}
      <div className="px-6">
        <h2 
          className="text-lg font-semibold text-foreground mb-4 animate-fade-in"
          style={{ animationDelay: '0.2s' }}
        >
          Upcoming gatherings
        </h2>

        <div className="space-y-4">
          {upcomingEvents.map((event, index) => (
            <div 
              key={event.id} 
              className="animate-fade-in-up"
              style={{ animationDelay: `${0.1 * (index + 1)}s` }}
            >
              <EventCard event={event} />
            </div>
          ))}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Home;