import BottomNav from '@/components/BottomNav';
import EventCard from '@/components/EventCard';
import { mockEvents } from '@/data/events';
import { useAppStore } from '@/store/appStore';
import { Calendar } from 'lucide-react';

const MyEvents = () => {
  const { signedUpEvents } = useAppStore();
  const userEvents = mockEvents.filter(e => signedUpEvents.includes(e.id));

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="px-6 pt-14 pb-6 safe-area-top">
        <h1 className="text-2xl font-bold text-foreground">
          My Gatherings
        </h1>
      </div>

      {/* Events list */}
      <div className="px-6">
        {userEvents.length > 0 ? (
          <div className="space-y-4">
            {userEvents.map((event, index) => (
              <div 
                key={event.id} 
                className="animate-fade-in-up"
                style={{ animationDelay: `${0.1 * (index + 1)}s` }}
              >
                <EventCard event={event} isCompact />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
              <Calendar className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">
              No gatherings yet
            </h2>
            <p className="text-muted-foreground text-center max-w-xs">
              When you request to join a gathering, it will appear here
            </p>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default MyEvents;
