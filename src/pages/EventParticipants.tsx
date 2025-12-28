import { useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getDefaultAvatar } from '@/lib/avatars';

interface Participant {
  id: string;
  first_name: string | null;
  avatar_url: string | null;
}

const EventParticipants = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventName, setEventName] = useState<string>('');

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;

      try {
        // Fetch event name
        const { data: eventData } = await supabase
          .from('events')
          .select('name')
          .eq('id', id)
          .maybeSingle();

        if (eventData) {
          setEventName(eventData.name);
        }

        // Fetch approved participants
        const { data: participantData } = await supabase
          .from('event_participants')
          .select('user_id')
          .eq('event_id', id)
          .eq('status', 'approved');

        if (participantData && participantData.length > 0) {
          const userIds = participantData.map(p => p.user_id);
          
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, first_name, avatar_url')
            .in('id', userIds);

          if (profiles) {
            setParticipants(profiles);
          }
        }
      } catch (error) {
        console.error('Error fetching participants:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border z-10">
        <div className="flex items-center gap-3 px-4 py-4 safe-area-top pt-14">
          <button 
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-foreground">Who's going</h1>
            {eventName && (
              <p className="text-sm text-muted-foreground truncate max-w-[250px]">{eventName}</p>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-pulse text-muted-foreground">Loading...</div>
          </div>
        ) : participants.length > 0 ? (
          <div className="space-y-2">
            {participants.map((participant) => (
              <div 
                key={participant.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-popover"
              >
                <Avatar className="w-12 h-12">
                  <AvatarImage src={participant.avatar_url || getDefaultAvatar(participant.first_name || participant.id)} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {participant.first_name?.charAt(0)?.toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium text-foreground">
                  {participant.first_name || 'Guest'}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-muted-foreground">No participants yet</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EventParticipants;
