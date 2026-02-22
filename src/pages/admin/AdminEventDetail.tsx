import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Calendar, MapPin, Users, Pencil, Check, X, ClipboardList } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { getDefaultAvatar } from '@/lib/avatars';

interface Event {
  id: string;
  name: string;
  description: string | null;
  cover_image_url: string | null;
  location: string | null;
  start_date: string;
  end_date: string | null;
  capacity: number | null;
  is_unlimited_capacity: boolean;
  requires_approval: boolean;
  visibility: string;
  status: string;
}

interface Participant {
  id: string;
  user_id: string;
  status: string;
  created_at: string;
  profile: {
    first_name: string | null;
    email: string | null;
    gender: string | null;
    avatar_url: string | null;
  } | null;
}

export default function AdminEventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchEvent();
      fetchParticipants();
    }
  }, [id]);

  const fetchEvent = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      setEvent(data);
    } catch (error) {
      console.error('Error fetching event:', error);
      toast.error('Failed to load event');
    } finally {
      setLoading(false);
    }
  };

  const fetchParticipants = async () => {
    try {
      const { data, error } = await supabase
        .from('event_participants')
        .select(`
          id,
          user_id,
          status,
          created_at,
          profile:profiles!event_participants_user_id_fkey (
            first_name,
            email,
            gender,
            avatar_url
          )
        `)
        .eq('event_id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setParticipants((data as unknown as Participant[]) || []);
    } catch (error) {
      console.error('Error fetching participants:', error);
    }
  };

  const updateParticipantStatus = async (participantId: string, status: 'approved' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('event_participants')
        .update({ status })
        .eq('id', participantId);

      if (error) throw error;

      setParticipants(participants.map(p => 
        p.id === participantId ? { ...p, status } : p
      ));

      toast.success(`Participant ${status}`);
    } catch (error) {
      console.error('Error updating participant:', error);
      toast.error('Failed to update participant');
    }
  };

  const pendingParticipants = participants.filter(p => p.status === 'pending');
  const approvedParticipants = participants.filter(p => p.status === 'approved');
  const rejectedParticipants = participants.filter(p => p.status === 'rejected');

  if (loading) {
    return (
      <AdminLayout>
        <div className="text-center py-12">Loading...</div>
      </AdminLayout>
    );
  }

  if (!event) {
    return (
      <AdminLayout>
        <div className="text-center py-12">Event not found</div>
      </AdminLayout>
    );
  }

  const ParticipantRow = ({ participant, showActions = false }: { participant: Participant; showActions?: boolean }) => (
    <div className="flex items-center justify-between py-3 border-b last:border-0">
      <div className="flex items-center gap-3">
        <Avatar>
          <AvatarImage src={participant.profile?.avatar_url || getDefaultAvatar(participant.user_id)} />
          <AvatarFallback className="bg-primary/10 text-primary">
            {participant.profile?.first_name?.[0]?.toUpperCase() || '?'}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium">{participant.profile?.first_name || 'Unknown'}</p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{participant.profile?.email}</span>
            {participant.profile?.gender && (
              <Badge variant="outline" className="text-xs capitalize">
                {participant.profile.gender}
              </Badge>
            )}
          </div>
        </div>
      </div>
      {showActions && (
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => updateParticipantStatus(participant.id, 'approved')}
            className="gap-1"
          >
            <Check className="h-4 w-4" />
            Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => updateParticipantStatus(participant.id, 'rejected')}
            className="gap-1"
          >
            <X className="h-4 w-4" />
            Reject
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/events')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">{event.name}</h1>
            <Badge variant={event.status === 'published' ? 'default' : 'secondary'}>
              {event.status}
            </Badge>
          </div>
        </div>

        <div className="flex flex-col gap-6 max-w-3xl">
          {event.cover_image_url && (
            <div className="aspect-video rounded-lg overflow-hidden">
              <img
                src={event.cover_image_url}
                alt={event.name}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={() => navigate(`/admin/events/${id}/questions`)} variant="outline" className="gap-2">
              <ClipboardList className="h-4 w-4" />
              Registration Questions
            </Button>
            <Button onClick={() => navigate(`/admin/events/${id}/edit`)} variant="outline" className="gap-2">
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
          </div>

          <Card className="bg-[#FFF7F2] border-none shadow-none">
            <CardHeader>
              <CardTitle className="font-serif text-foreground">Event Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 text-foreground">
                <Calendar className="h-5 w-5" />
                <span>{format(new Date(event.start_date), 'EEEE, MMMM d, yyyy • h:mm a')}</span>
              </div>
              {event.location && (
                <div className="flex items-center gap-3 text-foreground">
                  <MapPin className="h-5 w-5" />
                  <span>{event.location}</span>
                </div>
              )}
              <div className="flex items-center gap-3 text-foreground">
                <Users className="h-5 w-5" />
                <span>
                  {approvedParticipants.length} approved
                  {!event.is_unlimited_capacity && event.capacity && ` / ${event.capacity} capacity`}
                </span>
              </div>
              {event.description && (
                <div className="pt-4 border-t border-foreground/10">
                  <p className="whitespace-pre-wrap text-foreground">{event.description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-[#FFF7F2] border-none shadow-none">
            <CardHeader>
              <CardTitle className="font-serif text-foreground">Participants</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Tabs defaultValue="pending">
                <TabsList className="w-full justify-start rounded-none border-b border-foreground/10 px-4 bg-transparent">
                  <TabsTrigger value="pending" className="relative">
                    Pending
                    {pendingParticipants.length > 0 && (
                      <Badge className="ml-2 h-5 px-1.5" variant="destructive">
                        {pendingParticipants.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="approved">
                    Approved ({approvedParticipants.length})
                  </TabsTrigger>
                  <TabsTrigger value="rejected">
                    Rejected ({rejectedParticipants.length})
                  </TabsTrigger>
                </TabsList>

                <div className="p-4">
                  <TabsContent value="pending" className="m-0">
                    {pendingParticipants.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No pending requests
                      </p>
                    ) : (
                      pendingParticipants.map(p => (
                        <ParticipantRow key={p.id} participant={p} showActions />
                      ))
                    )}
                  </TabsContent>

                  <TabsContent value="approved" className="m-0">
                    {approvedParticipants.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No approved participants
                      </p>
                    ) : (
                      approvedParticipants.map(p => (
                        <ParticipantRow key={p.id} participant={p} />
                      ))
                    )}
                  </TabsContent>

                  <TabsContent value="rejected" className="m-0">
                    {rejectedParticipants.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No rejected participants
                      </p>
                    ) : (
                      rejectedParticipants.map(p => (
                        <ParticipantRow key={p.id} participant={p} />
                      ))
                    )}
                  </TabsContent>
                </div>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
