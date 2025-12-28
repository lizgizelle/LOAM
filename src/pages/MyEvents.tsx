import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '@/components/BottomNav';
import { useAppStore } from '@/store/appStore';
import { Calendar, MapPin, Clock, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ApprovedEvent {
  id: string;
  name: string;
  start_date: string;
  end_date: string | null;
  location: string | null;
  status: string;
  participationStatus: 'pending' | 'approved';
}

const MyEvents = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { eventParticipations } = useAppStore();
  const [approvedEvents, setApprovedEvents] = useState<ApprovedEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMyEvents = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        // Fetch user's event participations
        const { data: participations } = await supabase
          .from('event_participants')
          .select('event_id, status')
          .eq('user_id', user.id);

        if (participations && participations.length > 0) {
          const eventIds = participations.map(p => p.event_id);
          
          const { data: events } = await supabase
            .from('events')
            .select('id, name, start_date, end_date, location, status')
            .in('id', eventIds);

          if (events) {
            const eventsWithStatus = events.map(event => {
              const participation = participations.find(p => p.event_id === event.id);
              return {
                ...event,
                participationStatus: participation?.status === 'approved' ? 'approved' : 'pending'
              } as ApprovedEvent;
            });
            setApprovedEvents(eventsWithStatus);
          }
        }
      } catch (error) {
        console.error('Error fetching events:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMyEvents();
  }, [user?.id]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  // Filter to only show approved events in My Gatherings
  const myApprovedEvents = approvedEvents.filter(e => e.participationStatus === 'approved');

  // Separate into upcoming and past events
  const now = new Date();
  const upcomingEvents = myApprovedEvents.filter(event => {
    const eventEnd = event.end_date ? new Date(event.end_date) : new Date(event.start_date);
    return eventEnd >= now;
  });

  const pastEvents = myApprovedEvents.filter(event => {
    const eventEnd = event.end_date ? new Date(event.end_date) : new Date(event.start_date);
    return eventEnd < now;
  });

  const EventCard = ({ event, isPast = false }: { event: ApprovedEvent; isPast?: boolean }) => (
    <button
      onClick={() => navigate(`/event/${event.id}?source=my-gatherings`)}
      className={`w-full bg-popover rounded-2xl shadow-loam p-4 text-left transition-colors ${
        isPast ? 'opacity-60 hover:opacity-80' : 'hover:bg-secondary/30'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-semibold text-foreground truncate">{event.name}</h3>
            <Badge 
              variant="secondary" 
              className={`text-xs shrink-0 ${
                isPast ? 'bg-muted text-muted-foreground' : 'bg-green-100 text-green-800'
              }`}
            >
              {isPast ? 'Past' : 'Confirmed'}
            </Badge>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4 text-primary shrink-0" />
              <span>{formatDate(event.start_date)}</span>
              <Clock className="w-4 h-4 text-primary shrink-0 ml-2" />
              <span>{formatTime(event.start_date)}</span>
            </div>
            {event.location && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4 text-primary shrink-0" />
                <span className="truncate">{event.location}</span>
              </div>
            )}
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0 mt-1" />
      </div>
    </button>
  );

  const EmptyState = ({ type }: { type: 'upcoming' | 'past' }) => (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
        <Calendar className="w-10 h-10 text-primary" />
      </div>
      <h2 className="text-xl font-semibold text-foreground mb-2">
        No {type} events
      </h2>
      <p className="text-muted-foreground text-center max-w-xs">
        {type === 'upcoming' 
          ? "You don't have any upcoming events yet." 
          : "You don't have any past events yet."
        }
      </p>
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="px-6 pt-14 pb-4 safe-area-top">
        <h1 className="text-2xl font-bold text-foreground">
          My Events
        </h1>
      </div>

      {/* Tabs */}
      <div className="px-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-pulse text-muted-foreground">Loading...</div>
          </div>
        ) : (
          <Tabs defaultValue="upcoming" className="w-full">
            <TabsList className="w-full mb-4">
              <TabsTrigger value="upcoming" className="flex-1">
                Upcoming
              </TabsTrigger>
              <TabsTrigger value="past" className="flex-1">
                Past
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upcoming" className="mt-0">
              {upcomingEvents.length > 0 ? (
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
              ) : (
                <EmptyState type="upcoming" />
              )}
            </TabsContent>

            <TabsContent value="past" className="mt-0">
              {pastEvents.length > 0 ? (
                <div className="space-y-4">
                  {pastEvents.map((event, index) => (
                    <div 
                      key={event.id}
                      className="animate-fade-in-up"
                      style={{ animationDelay: `${0.1 * (index + 1)}s` }}
                    >
                      <EventCard event={event} isPast />
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState type="past" />
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default MyEvents;
