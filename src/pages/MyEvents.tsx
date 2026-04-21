import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '@/components/BottomNav';
import { Calendar, MapPin, Clock, ChevronRight, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ApprovedEvent {
  kind: 'event';
  id: string;
  name: string;
  start_date: string;
  end_date: string | null;
  location: string | null;
}

interface ActivityBookingRow {
  kind: 'activity';
  id: string; // booking id
  name: string; // activity name
  start_date: string;
  end_date: string;
  location: string; // area
  icon_emoji: string | null;
  activity_id: string;
  has_feedback: boolean;
}

type Item = ApprovedEvent | ActivityBookingRow;

const MyEvents = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        // Approved event participations
        const { data: parts } = await supabase
          .from('event_participants')
          .select('event_id, status')
          .eq('user_id', user.id)
          .eq('status', 'approved');

        let eventItems: ApprovedEvent[] = [];
        if (parts && parts.length > 0) {
          const ids = parts.map((p) => p.event_id);
          const { data: events } = await supabase
            .from('events')
            .select('id, name, start_date, end_date, location')
            .in('id', ids);
          eventItems = (events || []).map((e) => ({ kind: 'event' as const, ...e }));
        }

        // Activity bookings
        const { data: bookings } = await supabase
          .from('activity_bookings')
          .select('id, slot_id, status')
          .eq('user_id', user.id)
          .eq('status', 'confirmed');

        let activityItems: ActivityBookingRow[] = [];
        if (bookings && bookings.length > 0) {
          const slotIds = bookings.map((b) => b.slot_id);
          const { data: slots } = await supabase
            .from('activity_slots')
            .select('id, activity_id, start_time, duration_minutes, area_name')
            .in('id', slotIds);

          const actIds = Array.from(new Set((slots || []).map((s) => s.activity_id)));
          const { data: acts } = await supabase
            .from('activities')
            .select('id, name, icon_emoji')
            .in('id', actIds);
          const actMap = new Map((acts || []).map((a) => [a.id, a]));

          // Fetch existing feedback for these bookings
          const bookingIds = bookings.map((b) => b.id);
          const { data: feedbacks } = await supabase
            .from('activity_feedback')
            .select('booking_id')
            .in('booking_id', bookingIds);
          const feedbackSet = new Set((feedbacks || []).map((f) => f.booking_id));

          activityItems = (slots || []).map((s) => {
            const a = actMap.get(s.activity_id);
            const booking = bookings.find((b) => b.slot_id === s.id)!;
            const end = new Date(new Date(s.start_time).getTime() + s.duration_minutes * 60000);
            return {
              kind: 'activity' as const,
              id: booking.id,
              name: a?.name || 'Activity',
              start_date: s.start_time,
              end_date: end.toISOString(),
              location: s.area_name,
              icon_emoji: a?.icon_emoji ?? null,
              activity_id: s.activity_id,
              has_feedback: feedbackSet.has(booking.id),
            };
          });
        }

        setItems([...eventItems, ...activityItems]);
      } catch (err) {
        console.error('Error fetching my items:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [user?.id]);

  const formatDate = (s: string) =>
    new Date(s).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const formatTime = (s: string) =>
    new Date(s).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  const now = new Date();
  const upcoming = items
    .filter((i) => new Date(i.end_date || i.start_date) >= now)
    .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
  const past = items
    .filter((i) => new Date(i.end_date || i.start_date) < now)
    .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());

  const ItemCard = ({ item, isPast = false }: { item: Item; isPast?: boolean }) => {
    const needsFeedback =
      isPast && item.kind === 'activity' && !item.has_feedback;

    const onClick = () => {
      if (item.kind === 'event') {
        navigate(`/event/${item.id}?source=my-gatherings`);
      } else if (needsFeedback) {
        navigate(`/my-events/activity/${item.id}/feedback`);
      } else {
        navigate(`/my-events/activity/${item.id}`);
      }
    };
    return (
      <button
        onClick={onClick}
        className={`relative w-full bg-popover rounded-2xl shadow-loam p-4 text-left transition-colors ${
          isPast && !needsFeedback ? 'opacity-60 hover:opacity-80' : 'hover:bg-secondary/30'
        }`}
      >
        {needsFeedback && (
          <span className="absolute top-3 right-3 flex items-center justify-center">
            <span className="absolute w-3 h-3 rounded-full bg-destructive/40 animate-ping" />
            <span className="relative w-2.5 h-2.5 rounded-full bg-destructive" />
          </span>
        )}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {item.kind === 'activity' && (
                <span className="text-lg" aria-hidden>
                  {item.icon_emoji || '✨'}
                </span>
              )}
              <h3 className="font-semibold text-foreground truncate">{item.name}</h3>
              <Badge
                variant="secondary"
                className={`text-xs shrink-0 ${
                  isPast
                    ? 'bg-muted text-muted-foreground'
                    : item.kind === 'activity'
                    ? 'bg-primary/15 text-primary'
                    : 'bg-green-100 text-green-800'
                }`}
              >
                {isPast ? 'Past' : item.kind === 'activity' ? 'Activity' : 'Confirmed'}
              </Badge>
              {needsFeedback && (
                <Badge className="text-xs shrink-0 bg-destructive/10 text-destructive border-0">
                  Feedback needed
                </Badge>
              )}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4 text-primary shrink-0" />
                <span>{formatDate(item.start_date)}</span>
                <Clock className="w-4 h-4 text-primary shrink-0 ml-2" />
                <span>{formatTime(item.start_date)}</span>
              </div>
              {item.location && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4 text-primary shrink-0" />
                  <span className="truncate">{item.location}</span>
                </div>
              )}
              {needsFeedback && (
                <p className="text-xs text-destructive font-medium pt-1">
                  Tap to share how it went →
                </p>
              )}
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0 mt-1" />
        </div>
      </button>
    );
  };

  const EmptyState = ({ type }: { type: 'upcoming' | 'past' }) => (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
        {type === 'upcoming' ? (
          <Sparkles className="w-10 h-10 text-primary" />
        ) : (
          <Calendar className="w-10 h-10 text-primary" />
        )}
      </div>
      <h2 className="text-xl font-semibold text-foreground mb-2">No {type} bookings</h2>
      <p className="text-muted-foreground text-center max-w-xs mb-6">
        {type === 'upcoming'
          ? "You don't have any upcoming activities yet."
          : "You don't have any past activities yet."}
      </p>
      {type === 'upcoming' && (
        <button
          onClick={() => navigate('/home')}
          className="px-5 h-11 rounded-full bg-foreground text-background font-semibold text-sm"
        >
          Browse activities
        </button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="px-6 pt-14 pb-4 safe-area-top">
        <h1 className="text-2xl font-bold text-foreground">My Activities</h1>
      </div>

      <div className="px-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-pulse text-muted-foreground">Loading...</div>
          </div>
        ) : (
          <Tabs defaultValue="upcoming" className="w-full">
            <TabsList className="w-full mb-4">
              <TabsTrigger value="upcoming" className="flex-1">Upcoming</TabsTrigger>
              <TabsTrigger value="past" className="flex-1">Past</TabsTrigger>
            </TabsList>

            <TabsContent value="upcoming" className="mt-0">
              {upcoming.length > 0 ? (
                <div className="space-y-4">
                  {upcoming.map((item, i) => (
                    <div
                      key={`${item.kind}-${item.id}`}
                      className="animate-fade-in-up"
                      style={{ animationDelay: `${0.05 * (i + 1)}s` }}
                    >
                      <ItemCard item={item} />
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState type="upcoming" />
              )}
            </TabsContent>

            <TabsContent value="past" className="mt-0">
              {past.length > 0 ? (
                <div className="space-y-4">
                  {past.map((item, i) => (
                    <div
                      key={`${item.kind}-${item.id}`}
                      className="animate-fade-in-up"
                      style={{ animationDelay: `${0.05 * (i + 1)}s` }}
                    >
                      <ItemCard item={item} isPast />
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
