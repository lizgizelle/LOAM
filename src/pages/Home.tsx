import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '@/components/BottomNav';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, MapPin, Clock, Users, ChevronRight } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getDefaultAvatar } from '@/lib/avatars';

interface EventWithDetails {
  id: string;
  name: string;
  description: string | null;
  cover_image_url: string | null;
  location: string | null;
  start_date: string;
  end_date: string | null;
  capacity: number | null;
  is_unlimited_capacity: boolean;
  status: string;
  ticket_price: number | null;
  currency: string;
  approved_count: number;
  participants: { id: string; first_name: string | null; avatar_url: string | null }[];
}

const Home = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<EventWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const { data: eventsData } = await supabase
        .from('events')
        .select('id, name, description, cover_image_url, location, start_date, end_date, capacity, is_unlimited_capacity, status, ticket_price, currency')
        .eq('status', 'published')
        .eq('visibility', 'public')
        .gte('start_date', new Date().toISOString())
        .order('start_date', { ascending: true });

      if (!eventsData || eventsData.length === 0) {
        setEvents([]);
        setLoading(false);
        return;
      }

      const enriched = await Promise.all(
        eventsData.map(async (event) => {
          const { data: participantData } = await supabase
            .from('event_participants')
            .select('user_id')
            .eq('event_id', event.id)
            .eq('status', 'approved')
            .limit(5);

          const userIds = (participantData || []).map(p => p.user_id);
          let profiles: { id: string; first_name: string | null; avatar_url: string | null }[] = [];

          if (userIds.length > 0) {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('id, first_name, avatar_url')
              .in('id', userIds);
            profiles = profileData || [];
          }

          const { count } = await supabase
            .from('event_participants')
            .select('*', { count: 'exact', head: true })
            .eq('event_id', event.id)
            .eq('status', 'approved');

          return {
            ...event,
            approved_count: count || 0,
            participants: profiles,
          };
        })
      );

      setEvents(enriched);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const formatPrice = (price: number | null, currency: string) => {
    if (!price || price === 0) return 'Free';
    return `${currency} $${price.toFixed(0)}`;
  };

  const featured = events[0];
  const upcoming = events.slice(1);

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-24 flex flex-col">
        <div className="px-6 pt-14 pb-4 safe-area-top">
          <h1 className="text-2xl font-bold text-foreground">Events</h1>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
        <BottomNav />
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="min-h-screen bg-background pb-24 flex flex-col">
        <div className="px-6 pt-14 pb-4 safe-area-top">
          <h1 className="text-2xl font-bold text-foreground">Events</h1>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
            <Calendar className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">No upcoming events</h2>
          <p className="text-muted-foreground text-center max-w-xs">
            Check back soon for new events 🌱
          </p>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="px-6 pt-14 pb-4 safe-area-top">
        <h1 className="text-2xl font-bold text-foreground">Events</h1>
      </div>

      {/* Featured Event Hero */}
      {featured && (
        <button
          onClick={() => navigate(`/event/${featured.id}`)}
          className="w-full text-left px-4 mb-6"
        >
          <div className="rounded-2xl overflow-hidden bg-popover shadow-loam">
            {/* Cover image */}
            <div className="relative h-48 bg-gradient-to-br from-primary/20 to-primary/5">
              {featured.cover_image_url ? (
                <img
                  src={featured.cover_image_url}
                  alt={featured.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-5xl">✨</span>
                </div>
              )}
              {/* Price badge */}
              <div className="absolute top-3 right-3 bg-background/90 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-semibold text-foreground">
                {formatPrice(featured.ticket_price, featured.currency)}
              </div>
            </div>

            {/* Details */}
            <div className="p-4">
              <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-1">
                {formatDate(featured.start_date)} · {formatTime(featured.start_date)}
              </p>
              <h2 className="text-lg font-bold text-foreground mb-1">
                {featured.name}
              </h2>
              {featured.location && (
                <p className="text-sm text-muted-foreground mb-3">{featured.location}</p>
              )}

              {/* Attendees row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {featured.participants.length > 0 && (
                    <div className="flex -space-x-2">
                      {featured.participants.slice(0, 3).map((p, i) => (
                        <Avatar key={p.id} className="w-6 h-6 border-2 border-popover" style={{ zIndex: 3 - i }}>
                          <AvatarImage src={p.avatar_url || getDefaultAvatar(p.first_name || p.id)} />
                          <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                            {p.first_name?.[0]?.toUpperCase() || '?'}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                    </div>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {featured.approved_count} going
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>
          </div>
        </button>
      )}

      {/* Upcoming Events List */}
      {upcoming.length > 0 && (
        <div className="px-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 px-2">
            Upcoming
          </h3>
          <div className="space-y-3">
            {upcoming.map((event) => (
              <button
                key={event.id}
                onClick={() => navigate(`/event/${event.id}`)}
                className="w-full text-left bg-popover rounded-xl shadow-loam p-3 flex gap-3 items-center transition-colors hover:bg-secondary/30"
              >
                {/* Thumbnail */}
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 shrink-0">
                  {event.cover_image_url ? (
                    <img src={event.cover_image_url} alt={event.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">✨</div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold text-primary uppercase tracking-wide">
                    {formatDate(event.start_date)} · {formatTime(event.start_date)}
                  </p>
                  <h4 className="font-semibold text-foreground text-sm truncate">{event.name}</h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground">{event.approved_count} going</span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs font-medium text-foreground">
                      {formatPrice(event.ticket_price, event.currency)}
                    </span>
                  </div>
                </div>

                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default Home;
