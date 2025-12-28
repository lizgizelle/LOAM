import BottomNav from '@/components/BottomNav';
import EventCard from '@/components/EventCard';
import { mockEvents } from '@/data/events';
import { useAppStore } from '@/store/appStore';

const Home = () => {
  const { userProfile } = useAppStore();
  const firstName = userProfile?.firstName || 'Friend';
  const upcomingEvents = mockEvents.filter(e => !e.isPast);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="px-6 pt-14 pb-6 safe-area-top">
        <h1 className="text-2xl font-bold text-foreground animate-fade-in">
          Hey {firstName}
        </h1>
        <p className="text-muted-foreground mt-1 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          A place to meet genuine people, in real life.
        </p>
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
