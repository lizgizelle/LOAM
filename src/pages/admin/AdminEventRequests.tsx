import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Check, X, Clock, Calendar, MapPin, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { getDefaultAvatar } from '@/lib/avatars';

interface EventDetails {
  id: string;
  name: string;
  start_date: string;
  end_date: string | null;
  location: string | null;
  cover_image_url: string | null;
  hide_location_until_approved: boolean;
}

interface ParticipantRequest {
  id: string;
  user_id: string;
  status: string;
  created_at: string;
  profile: {
    first_name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
}

export default function AdminEventRequests() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<EventDetails | null>(null);
  const [participants, setParticipants] = useState<ParticipantRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchEventAndParticipants();
    }
  }, [id]);

  const fetchEventAndParticipants = async () => {
    try {
      // Fetch event details
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('id, name, start_date, end_date, location, cover_image_url, hide_location_until_approved')
        .eq('id', id)
        .single();

      if (eventError) throw eventError;
      setEvent(eventData);

      // Fetch all participants for this event
      const { data: participantsData, error: participantsError } = await supabase
        .from('event_participants')
        .select(`
          id,
          user_id,
          status,
          created_at,
          profile:profiles!event_participants_user_id_fkey (
            first_name,
            email,
            avatar_url
          )
        `)
        .eq('event_id', id)
        .order('created_at', { ascending: false });

      if (participantsError) throw participantsError;
      setParticipants((participantsData as unknown as ParticipantRequest[]) || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load event data');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (participantId: string, newStatus: 'approved' | 'rejected' | 'waitlisted' | 'pending') => {
    try {
      const { error } = await supabase
        .from('event_participants')
        .update({ status: newStatus })
        .eq('id', participantId);

      if (error) throw error;

      setParticipants(prev =>
        prev.map(p => p.id === participantId ? { ...p, status: newStatus } : p)
      );
      toast.success(`Request ${newStatus}`);
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update request');
    }
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'EEE, d MMM yyyy');
  };

  const formatTime = (dateString: string) => {
    return format(new Date(dateString), 'h:mma').toLowerCase();
  };

  const pendingRequests = participants.filter(p => p.status === 'pending');
  const waitlistedRequests = participants.filter(p => p.status === 'waitlisted');
  const approvedRequests = participants.filter(p => p.status === 'approved');

  const ParticipantRow = ({ participant, showActions = true }: { participant: ParticipantRequest; showActions?: boolean }) => (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-secondary/30 rounded-xl">
      <div className="flex items-center gap-3">
        <Avatar className="w-10 h-10">
          <AvatarImage src={participant.profile?.avatar_url || getDefaultAvatar(participant.profile?.first_name || participant.user_id)} />
          <AvatarFallback className="bg-primary/10 text-primary">
            {participant.profile?.first_name?.[0]?.toUpperCase() || '?'}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium text-foreground">{participant.profile?.first_name || 'Unknown'}</p>
          <p className="text-sm text-muted-foreground">{participant.profile?.email}</p>
        </div>
      </div>
      
      {showActions && participant.status === 'pending' && (
        <div className="flex gap-2 ml-13 sm:ml-0">
          <Button
            size="sm"
            onClick={() => updateStatus(participant.id, 'approved')}
            className="gap-1"
          >
            <Check className="h-4 w-4" />
            Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => updateStatus(participant.id, 'rejected')}
            className="gap-1"
          >
            <X className="h-4 w-4" />
            Reject
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => updateStatus(participant.id, 'waitlisted')}
            className="gap-1"
          >
            <Clock className="h-4 w-4" />
            Waitlist
          </Button>
        </div>
      )}
      
      {showActions && participant.status === 'waitlisted' && (
        <div className="flex gap-2 ml-13 sm:ml-0">
          <Button
            size="sm"
            onClick={() => updateStatus(participant.id, 'approved')}
            className="gap-1"
          >
            <Check className="h-4 w-4" />
            Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => updateStatus(participant.id, 'rejected')}
            className="gap-1"
          >
            <X className="h-4 w-4" />
            Reject
          </Button>
        </div>
      )}
      
      {!showActions && (
        <Badge variant="secondary" className="bg-green-100 text-green-800 ml-13 sm:ml-0 w-fit">
          Approved
        </Badge>
      )}
    </div>
  );

  if (loading) {
    return (
      <AdminLayout>
        <div className="text-center py-12 text-muted-foreground">
          Loading event...
        </div>
      </AdminLayout>
    );
  }

  if (!event) {
    return (
      <AdminLayout>
        <div className="text-center py-12 text-muted-foreground">
          Event not found
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Back button */}
        <button
          onClick={() => navigate('/admin/requests')}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to events</span>
        </button>

        {/* Event header */}
        <div className="bg-popover rounded-2xl shadow-loam overflow-hidden">
          <div className="h-40 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center overflow-hidden">
            {event.cover_image_url ? (
              <img src={event.cover_image_url} alt={event.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-5xl">✨</span>
            )}
          </div>
          <div className="p-6">
            <h1 className="text-2xl font-bold text-foreground mb-3">{event.name}</h1>
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                <span>{formatDate(event.start_date)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                <span>{formatTime(event.start_date)}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                <span>{event.hide_location_until_approved ? 'Secret location' : event.location || 'TBD'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-primary">{pendingRequests.length}</p>
              <p className="text-sm text-muted-foreground">Pending</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-amber-500">{waitlistedRequests.length}</p>
              <p className="text-sm text-muted-foreground">Waitlisted</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{approvedRequests.length}</p>
              <p className="text-sm text-muted-foreground">Approved</p>
            </CardContent>
          </Card>
        </div>

        {/* Pending Requests */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Pending Requests ({pendingRequests.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pendingRequests.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No pending requests</p>
            ) : (
              <div className="space-y-3">
                {pendingRequests.map((participant) => (
                  <ParticipantRow key={participant.id} participant={participant} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Waitlisted */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Waitlisted ({waitlistedRequests.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {waitlistedRequests.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No waitlisted users</p>
            ) : (
              <div className="space-y-3">
                {waitlistedRequests.map((participant) => (
                  <ParticipantRow key={participant.id} participant={participant} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Approved */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Check className="w-5 h-5" />
              Approved ({approvedRequests.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {approvedRequests.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No approved users yet</p>
            ) : (
              <div className="space-y-3">
                {approvedRequests.map((participant) => (
                  <ParticipantRow key={participant.id} participant={participant} showActions={false} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
