import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Check, X, Calendar, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface PendingRequest {
  id: string;
  created_at: string;
  event: {
    id: string;
    name: string;
    start_date: string;
  };
  profile: {
    first_name: string | null;
    email: string | null;
    gender: string | null;
    avatar_url: string | null;
  } | null;
}

export default function AdminRequests() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('event_participants')
        .select(`
          id,
          created_at,
          event:events!event_participants_event_id_fkey (
            id,
            name,
            start_date
          ),
          profile:profiles!event_participants_user_id_fkey (
            first_name,
            email,
            gender,
            avatar_url
          )
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests((data as unknown as PendingRequest[]) || []);
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast.error('Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (requestId: string, status: 'approved' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('event_participants')
        .update({ status })
        .eq('id', requestId);

      if (error) throw error;

      setRequests(requests.filter(r => r.id !== requestId));
      toast.success(`Request ${status}`);
    } catch (error) {
      console.error('Error updating request:', error);
      toast.error('Failed to update request');
    }
  };

  const approveAll = async () => {
    try {
      const ids = requests.map(r => r.id);
      const { error } = await supabase
        .from('event_participants')
        .update({ status: 'approved' })
        .in('id', ids);

      if (error) throw error;

      setRequests([]);
      toast.success('All requests approved');
    } catch (error) {
      console.error('Error approving all:', error);
      toast.error('Failed to approve all');
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Event Requests</h1>
            <p className="text-muted-foreground mt-1">
              {requests.length} pending requests
            </p>
          </div>
          {requests.length > 0 && (
            <Button onClick={approveAll} className="gap-2">
              <Check className="h-4 w-4" />
              Approve All
            </Button>
          )}
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">
            Loading requests...
          </div>
        ) : requests.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium text-lg">No pending requests</h3>
              <p className="text-muted-foreground mt-1">
                All event requests have been processed
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <Card key={request.id}>
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={request.profile?.avatar_url || undefined} />
                        <AvatarFallback>
                          {request.profile?.first_name?.[0]?.toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{request.profile?.first_name || 'Unknown'}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{request.profile?.email}</span>
                          {request.profile?.gender && (
                            <Badge variant="outline" className="text-xs capitalize">
                              {request.profile.gender}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <button
                        onClick={() => navigate(`/admin/events/${request.event.id}`)}
                        className="text-left hover:underline"
                      >
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{request.event.name}</span>
                        </div>
                        <p className="text-xs text-muted-foreground ml-6">
                          {format(new Date(request.event.start_date), 'MMM d, yyyy')}
                        </p>
                      </button>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => updateStatus(request.id, 'approved')}
                          className="gap-1"
                        >
                          <Check className="h-4 w-4" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateStatus(request.id, 'rejected')}
                          className="gap-1"
                        >
                          <X className="h-4 w-4" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
