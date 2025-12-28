import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { mockEvents } from '@/data/events';
import { useAppStore } from '@/store/appStore';
import { ArrowLeft, MapPin, Clock, Calendar, Users, Info, Share2, MessageCircle, MoreHorizontal, ExternalLink, Flag } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getDefaultAvatar } from '@/lib/avatars';
import { useAuth } from '@/hooks/useAuth';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Participant {
  id: string;
  first_name: string | null;
  avatar_url: string | null;
}

interface EventDetails {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  start_date: string;
  end_date: string | null;
  show_participants: boolean;
  requires_approval: boolean;
  host_id: string | null;
}

const EventDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { signUpForEvent, signedUpEvents } = useAppStore();
  
  const isFromMyGatherings = searchParams.get('source') === 'my-gatherings';
  
  // Try to get event from mock data first
  const mockEvent = mockEvents.find(e => e.id === id);
  
  const [supabaseEvent, setSupabaseEvent] = useState<EventDetails | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [showParticipants, setShowParticipants] = useState(false);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [isSignedUp, setIsSignedUp] = useState(signedUpEvents.includes(id || ''));
  const [moreSheetOpen, setMoreSheetOpen] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportSubmitted, setReportSubmitted] = useState(false);

  useEffect(() => {
    const fetchEventData = async () => {
      if (!id) return;
      
      try {
        // Fetch event details from Supabase
        const { data: eventData } = await supabase
          .from('events')
          .select('id, name, description, location, start_date, end_date, show_participants, requires_approval, host_id')
          .eq('id', id)
          .maybeSingle();

        if (eventData) {
          setSupabaseEvent(eventData);
          
          if (eventData.show_participants) {
            setShowParticipants(true);
            fetchParticipants(eventData.requires_approval);
          }
        }

        // Check if user is approved for this event
        if (user?.id) {
          const { data: participation } = await supabase
            .from('event_participants')
            .select('status')
            .eq('event_id', id)
            .eq('user_id', user.id)
            .maybeSingle();

          if (participation) {
            setIsSignedUp(true);
            setIsApproved(participation.status === 'approved');
          }
        }
      } catch (error) {
        console.error('Error fetching event:', error);
      }
    };

    const fetchParticipants = async (requiresApproval: boolean) => {
      setLoadingParticipants(true);
      try {
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

    fetchEventData();
  }, [id, user?.id]);

  // Use Supabase event if available, otherwise fall back to mock
  const event = supabaseEvent || mockEvent;

  if (!event) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Event not found</p>
      </div>
    );
  }

  const handleSignUp = async () => {
    if (!id) return;
    
    if (user?.id) {
      try {
        await supabase
          .from('event_participants')
          .insert({ event_id: id, user_id: user.id, status: 'pending' });
        
        setIsSignedUp(true);
        signUpForEvent(id);
        toast.success('Request sent!', {
          description: `We'll confirm your spot at ${event.name}`,
        });
      } catch (error) {
        console.error('Error signing up:', error);
        toast.error('Could not send request. Please try again.');
      }
    } else {
      signUpForEvent(id);
      toast.success('Request sent!', {
        description: `We'll confirm your spot at ${event.name}`,
      });
    }
  };

  const handleShare = async () => {
    const eventUrl = window.location.href;
    const shareData = {
      title: event.name,
      text: `${event.name} - ${displayDate} at ${displayTime}`,
      url: eventUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        // User cancelled or share failed
        if ((error as Error).name !== 'AbortError') {
          // Fallback to clipboard
          await navigator.clipboard.writeText(eventUrl);
          toast.success('Link copied to clipboard');
        }
      }
    } else {
      // Fallback for browsers without native share
      await navigator.clipboard.writeText(eventUrl);
      toast.success('Link copied to clipboard');
    }
  };

  const handleContact = () => {
    // Navigate to chat with event host
    if (supabaseEvent?.host_id) {
      navigate(`/chat?eventId=${id}&hostId=${supabaseEvent.host_id}`);
    } else {
      toast.info('Chat with organiser coming soon');
    }
  };

  const handleOpenInBrowser = () => {
    setMoreSheetOpen(false);
    window.open(window.location.href, '_blank');
  };

  const handleReportEvent = async () => {
    setMoreSheetOpen(false);
    
    if (!user?.id || !id) {
      toast.error('Please log in to report an event');
      return;
    }

    try {
      await supabase.from('event_reports').insert({
        user_id: user.id,
        event_id: id,
      });
      
      setReportSubmitted(true);
      setReportDialogOpen(true);
    } catch (error) {
      console.error('Error reporting event:', error);
      toast.error('Could not submit report. Please try again.');
    }
  };

  // Format dates for Supabase events
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const displayDate = supabaseEvent ? formatDate(supabaseEvent.start_date) : mockEvent?.date;
  const displayTime = supabaseEvent ? formatTime(supabaseEvent.start_date) : mockEvent?.time;
  const displayLocation = event.location;
  const displayDescription = supabaseEvent?.description || mockEvent?.description;
  const isPast = mockEvent?.isPast;
  const spotsLeft = mockEvent?.spotsLeft;

  // Button states
  const getRegisterButtonText = () => {
    if (isPast) return 'This gathering has passed';
    if (isApproved) return 'You\'re confirmed!';
    if (isSignedUp) return 'Pending approval';
    return 'Register';
  };

  const isRegisterDisabled = isPast || isSignedUp;

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
              <span>{displayDate}</span>
            </div>
            <div className="flex items-center gap-3 text-muted-foreground">
              <Clock className="w-5 h-5 text-primary" />
              <span>{displayTime}</span>
            </div>
            <div className="flex items-center gap-3 text-muted-foreground">
              <MapPin className="w-5 h-5 text-primary" />
              <span>{displayLocation}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 mb-6">
            <Button
              variant="loam"
              size="sm"
              className="flex-1 min-w-[120px]"
              disabled={isRegisterDisabled}
              onClick={handleSignUp}
            >
              {getRegisterButtonText()}
            </Button>
            <Button
              variant="loam-outline"
              size="sm"
              onClick={handleShare}
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
            <Button
              variant="loam-outline"
              size="sm"
              onClick={handleContact}
              disabled={!isApproved && !user}
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Contact
            </Button>
            <Button
              variant="loam-outline"
              size="sm"
              onClick={() => setMoreSheetOpen(true)}
            >
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </div>

          {spotsLeft && !isPast && (
            <div className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              {spotsLeft} spots left
            </div>
          )}

          {/* Private details - only shown for approved participants from My Gatherings */}
          {isFromMyGatherings && isApproved && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Info className="w-4 h-4 text-green-700" />
                <h2 className="font-semibold text-green-800">Your Gathering Details</h2>
              </div>
              <div className="space-y-2 text-sm text-green-700">
                <p><strong>Meeting Point:</strong> {displayLocation}</p>
                <p><strong>What to bring:</strong> Just yourself and an open heart!</p>
                <p className="text-xs mt-3 text-green-600">
                  These details are only visible to confirmed participants.
                </p>
              </div>
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
              {displayDescription}
            </p>
          </div>
        </div>
      </div>

      {/* More Options Sheet */}
      <Sheet open={moreSheetOpen} onOpenChange={setMoreSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader className="text-left mb-4">
            <SheetTitle>More options</SheetTitle>
          </SheetHeader>
          <div className="space-y-2">
            <button
              onClick={handleOpenInBrowser}
              className="w-full flex items-center gap-3 p-4 rounded-xl hover:bg-muted transition-colors text-left"
            >
              <ExternalLink className="w-5 h-5 text-muted-foreground" />
              <span>Open in browser</span>
            </button>
            <button
              onClick={handleReportEvent}
              className="w-full flex items-center gap-3 p-4 rounded-xl hover:bg-muted transition-colors text-left text-destructive"
            >
              <Flag className="w-5 h-5" />
              <span>Report event</span>
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Report Confirmation Dialog */}
      <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Thanks for letting us know</DialogTitle>
            <DialogDescription>
              Our team will review this event.
            </DialogDescription>
          </DialogHeader>
          <Button
            variant="loam"
            onClick={() => setReportDialogOpen(false)}
            className="mt-4"
          >
            Done
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EventDetail;
