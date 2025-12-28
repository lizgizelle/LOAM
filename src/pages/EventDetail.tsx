import { useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { mockEvents } from '@/data/events';
import { useAppStore } from '@/store/appStore';
import { ArrowLeft, MapPin, Clock, Calendar, Users } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getDefaultAvatar } from '@/lib/avatars';

interface Participant {
  id: string;
  first_name: string | null;
  avatar_url: string | null;
}

const EventDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { signUpForEvent, signedUpEvents } = useAppStore();
  
  const event = mockEvents.find(e => e.id === id);
  const isSignedUp = signedUpEvents.includes(id || '');
  
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [showParticipants, setShowParticipants] = useState(false);
  const [loadingParticipants, setLoadingParticipants] = useState(false);

  useEffect(() => {
    // Check if this is a real Supabase event and fetch participant visibility
    const fetchEventSettings = async () => {
      if (!id) return;
      
      try {
        const { data: eventData } = await supabase
          .from('events')
          .select('show_participants, requires_approval')
          .eq('id', id)
          .maybeSingle();

        if (eventData?.show_participants) {
          setShowParticipants(true);
          fetchParticipants(eventData.requires_approval);
        }
      } catch (error) {
        // Event might be a mock event, ignore errors
      }
    };

    const fetchParticipants = async (requiresApproval: boolean) => {
      setLoadingParticipants(true);
      try {
        // Get approved participants (or all if no approval required)
        const statusFilter = requiresApproval ? 'approved' : ['approved', 'pending'];
        
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
        setLoadingParticipants(false);
      }
    };

    fetchEventSettings();
  }, [id]);

  if (!event) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Event not found</p>
      </div>
    );
  }

  const handleSignUp = () => {
    if (id) {
      signUpForEvent(id);
      toast.success('Request sent!', {
        description: `We'll confirm your spot at ${event.name}`,
      });
    }
  };

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Hero image */}
      <div className="relative h-64 bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center">
        <span className="text-6xl">✨</span>
        
        {/* Back button */}
        <button 
          onClick={() => navigate(-1)}
          className="absolute top-14 left-4 safe-area-top w-10 h-10 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center shadow-lg hover:bg-background transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="px-6 -mt-8 relative">
        <div className="bg-popover rounded-2xl shadow-loam-lg p-6">
          <h1 className="text-2xl font-bold text-foreground mb-4">
            {event.name}
          </h1>

          {/* Event details */}
          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-3 text-muted-foreground">
              <Calendar className="w-5 h-5 text-primary" />
              <span>{event.date}</span>
            </div>
            <div className="flex items-center gap-3 text-muted-foreground">
              <Clock className="w-5 h-5 text-primary" />
              <span>{event.time}</span>
            </div>
            <div className="flex items-center gap-3 text-muted-foreground">
              <MapPin className="w-5 h-5 text-primary" />
              <span>{event.location}</span>
            </div>
          </div>

          {event.spotsLeft && !event.isPast && (
            <div className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              {event.spotsLeft} spots left
            </div>
          )}

          {/* Who's going section */}
          {showParticipants && participants.length > 0 ? (
            <div className="border-t border-border pt-6 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-4 h-4 text-muted-foreground" />
                <h2 className="font-semibold text-foreground">Who's going</h2>
              </div>
              <div className="flex flex-wrap gap-3">
                {participants.map((participant) => (
                  <div key={participant.id} className="flex flex-col items-center gap-1">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={participant.avatar_url || getDefaultAvatar(participant.first_name || participant.id)} />
                      <AvatarFallback className="bg-primary/10 text-primary text-sm">
                        {participant.first_name?.charAt(0)?.toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-muted-foreground">
                      {participant.first_name || 'Guest'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : showParticipants === false && !loadingParticipants ? (
            <div className="border-t border-border pt-6 mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <h2 className="font-semibold text-foreground">Who's going</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Participants will be introduced at the gathering
              </p>
            </div>
          ) : null}

          {/* Description */}
          <div className="border-t border-border pt-6">
            <h2 className="font-semibold text-foreground mb-3">About this gathering</h2>
            <p className="text-muted-foreground leading-relaxed">
              {event.description}
            </p>
          </div>
        </div>
      </div>

      {/* Sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-background border-t border-border safe-area-bottom">
        <Button 
          variant="loam" 
          size="lg" 
          className="w-full"
          disabled={event.isPast || isSignedUp}
          onClick={handleSignUp}
        >
          {event.isPast 
            ? 'This gathering has passed' 
            : isSignedUp 
              ? 'Request sent' 
              : 'Request to join'
          }
        </Button>
      </div>
    </div>
  );
};

export default EventDetail;