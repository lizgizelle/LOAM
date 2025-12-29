import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Calendar, ChevronRight, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface EventWithRequests {
  id: string;
  name: string;
  start_date: string;
  cover_image_url: string | null;
  requires_approval: boolean;
  pendingCount: number;
}

export default function AdminRequests() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<EventWithRequests[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEventsWithRequests();
  }, []);

  const fetchEventsWithRequests = async () => {
    try {
      // First get all events that require approval
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('id, name, start_date, cover_image_url, requires_approval')
        .eq('requires_approval', true)
        .order('start_date', { ascending: true });

      if (eventsError) throw eventsError;

      // Then get pending counts for each event
      const eventsWithCounts = await Promise.all(
        (eventsData || []).map(async (event) => {
          const { count } = await supabase
            .from('event_participants')
            .select('*', { count: 'exact', head: true })
            .eq('event_id', event.id)
            .eq('status', 'pending');

          return {
            ...event,
            pendingCount: count || 0,
          };
        })
      );

      setEvents(eventsWithCounts);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast.error('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'EEE, d MMM');
  };

  const formatTime = (dateString: string) => {
    return format(new Date(dateString), 'h:mma').toLowerCase();
  };

  const totalPending = events.reduce((sum, e) => sum + e.pendingCount, 0);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Event Requests</h1>
          <p className="text-muted-foreground mt-1">
            {totalPending} pending requests across {events.length} events
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">
            Loading events...
          </div>
        ) : events.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium text-lg">No events requiring approval</h3>
              <p className="text-muted-foreground mt-1">
                Events with approval enabled will appear here
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {events.map((event) => (
              <button
                key={event.id}
                onClick={() => navigate(`/admin/events/${event.id}/requests`)}
                className="w-full bg-popover rounded-2xl shadow-loam overflow-hidden text-left transition-all duration-200 hover:shadow-loam-lg active:scale-[0.99]"
              >
                {/* Cover image */}
                <div className="h-32 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center relative">
                  <span className="text-4xl">✨</span>
                  {/* Requires approval badge */}
                  <Badge 
                    variant="secondary" 
                    className="absolute top-3 right-3 bg-background/90 text-foreground text-xs gap-1"
                  >
                    <ShieldCheck className="w-3 h-3" />
                    Requires approval
                  </Badge>
                </div>
                
                {/* Content */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground text-lg leading-tight mb-1">
                        {event.name}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(event.start_date)}</span>
                        <span>·</span>
                        <span>{formatTime(event.start_date)}</span>
                      </div>
                      {event.pendingCount > 0 && (
                        <p className="text-sm text-primary font-medium mt-2">
                          {event.pendingCount} pending request{event.pendingCount !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground mt-1 flex-shrink-0" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
