import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { mockEvents } from '@/data/events';
import { useAppStore } from '@/store/appStore';
import { ArrowLeft, MapPin, Clock, Calendar, Users, Info, Share2, MessageCircle, MoreHorizontal, ExternalLink, Flag, Mail } from 'lucide-react';
import EventRegistrationForm from '@/components/EventRegistrationForm';
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
  ticket_price: number | null;
  currency: string;
  cover_image_url: string | null;
}

const EventDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { signUpForEvent, signedUpEvents } = useAppStore();

  // Handle payment return
  const paymentStatus = searchParams.get('payment');
  
  const isFromMyGatherings = searchParams.get('source') === 'my-gatherings';
  
  // Try to get event from mock data first
  const mockEvent = mockEvents.find(e => e.id === id);
  
  const [supabaseEvent, setSupabaseEvent] = useState<EventDetails | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [showParticipants, setShowParticipants] = useState(false);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [isRejected, setIsRejected] = useState(false);
  const [isSignedUp, setIsSignedUp] = useState(signedUpEvents.includes(id || ''));
  const [moreSheetOpen, setMoreSheetOpen] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);

  useEffect(() => {
    if (paymentStatus === 'success' && id) {
      setIsSignedUp(true);
      signUpForEvent(id);
      setShowConfirmation(true);
    }
  }, [paymentStatus, id]);

  useEffect(() => {
    const fetchEventData = async () => {
      if (!id) return;
      
      try {
        // Fetch event details from Supabase
        const { data: eventData } = await supabase
          .from('events')
          .select('id, name, description, location, start_date, end_date, show_participants, requires_approval, host_id, ticket_price, currency, cover_image_url')
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
            setIsRejected(participation.status === 'rejected');
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

  const handleSignUp = () => {
    if (!id || isSubmitting) return;
    // Show registration form instead of immediately registering
    setShowRegistrationForm(true);
  };

  const handleRegistrationSubmit = async (answers: Record<string, string>) => {
    if (!id || !user?.id) return;
    setIsSubmitting(true);

    try {
      const isPaidEvent = supabaseEvent?.ticket_price && supabaseEvent.ticket_price > 0;

      if (isPaidEvent) {
        // For paid events, create checkout session via edge function
        const { data, error } = await supabase.functions.invoke('create-event-payment', {
          body: { eventId: id, answers },
        });

        if (error) throw error;
        if (data?.url) {
          window.location.href = data.url;
          return;
        }
        throw new Error('No checkout URL returned');
      }

      // Free event flow
      await supabase
        .from('event_participants')
        .insert({ event_id: id, user_id: user.id, status: 'pending' });

      if (Object.keys(answers).length > 0) {
        const rows = Object.entries(answers).map(([questionId, answerValue]) => ({
          event_id: id,
          user_id: user.id,
          question_id: questionId,
          answer_value: answerValue,
        }));
        await supabase.from('event_registration_answers').insert(rows);
      }

      setIsSignedUp(true);
      signUpForEvent(id);
      setShowRegistrationForm(false);
      setShowConfirmation(true);
    } catch (error) {
      console.error('Error signing up:', error);
      toast.error('Could not send request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmationClose = () => {
    setShowConfirmation(false);
    navigate('/home');
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
    if (isRejected) return 'Not available';
    if (isApproved) return 'You\'re confirmed!';
    if (isSignedUp) return 'Pending approval';
    return 'Register';
  };

  const isRegisterDisabled = isPast || isSignedUp || isSubmitting || isRejected;
  const showStickyRegister = !isPast && !isSignedUp && !isRejected;

  // Show confirmation screen if registration was submitted
  if (showConfirmation) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        <div className="text-center max-w-sm">
          {/* Icon */}
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Mail className="w-10 h-10 text-primary" />
          </div>
          
          {/* Primary text */}
          <h1 className="text-2xl font-bold text-foreground mb-3">
            Your registration has been received
          </h1>
          
          {/* Supporting text */}
          <p className="text-muted-foreground mb-8">
            Our team is reviewing your registration and will let you know once you're approved.
          </p>
          
          {/* Action button */}
          <Button
            variant="loam"
            className="w-full"
            onClick={handleConfirmationClose}
          >
            Back to events
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Hero image */}
      <div className="relative h-64 bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center overflow-hidden">
        {supabaseEvent?.cover_image_url ? (
          <img
            src={supabaseEvent.cover_image_url}
            alt={supabaseEvent.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-6xl">✨</span>
        )}
        
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

          {/* Action Buttons - Compact Square Layout */}
          <div className="flex justify-start gap-2 mb-6">
            <button
              disabled={isRegisterDisabled}
              onClick={handleSignUp}
              className={`flex flex-col items-center justify-center w-14 h-14 rounded-lg transition-colors ${
                isRegisterDisabled 
                  ? 'bg-muted text-muted-foreground cursor-not-allowed' 
                  : 'bg-primary text-primary-foreground hover:bg-primary/90'
              }`}
            >
              <Calendar className="w-4 h-4 mb-0.5" />
              <span className="text-[8px] font-medium leading-tight">
                {isPast ? 'Ended' : isRejected ? 'N/A' : isApproved ? 'Joined' : isSignedUp ? 'Pending' : 'Register'}
              </span>
            </button>
            <button
              onClick={handleShare}
              className="flex flex-col items-center justify-center w-14 h-14 rounded-lg border border-border bg-background hover:bg-muted transition-colors"
            >
              <Share2 className="w-4 h-4 mb-0.5 text-foreground" />
              <span className="text-[8px] font-medium text-foreground leading-tight">Share</span>
            </button>
            <button
              onClick={handleContact}
              disabled={!isApproved && !user}
              className={`flex flex-col items-center justify-center w-14 h-14 rounded-lg border border-border transition-colors ${
                !isApproved && !user 
                  ? 'bg-muted text-muted-foreground cursor-not-allowed' 
                  : 'bg-background hover:bg-muted text-foreground'
              }`}
            >
              <MessageCircle className="w-4 h-4 mb-0.5" />
              <span className="text-[8px] font-medium leading-tight">Contact</span>
            </button>
            <button
              onClick={() => setMoreSheetOpen(true)}
              className="flex flex-col items-center justify-center w-14 h-14 rounded-lg border border-border bg-background hover:bg-muted transition-colors"
            >
              <MoreHorizontal className="w-4 h-4 mb-0.5 text-foreground" />
              <span className="text-[8px] font-medium text-foreground leading-tight">More</span>
            </button>
          </div>

          {spotsLeft && !isPast && !isRejected && (
            <div className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              {spotsLeft} spots left
            </div>
          )}

          {/* Rejection message */}
          {isRejected && (
            <div className="bg-muted rounded-xl p-4 mb-6">
              <p className="text-sm text-muted-foreground">
                This event requires approval. You're not able to register for this event.
              </p>
            </div>
          )}

          {/* Requires approval notice for non-registered users */}
          {supabaseEvent?.requires_approval && !isSignedUp && !isRejected && (
            <div className="bg-secondary/50 rounded-xl p-4 mb-6">
              <p className="text-sm text-muted-foreground">
                This event requires approval. After you register, our team will review your request.
              </p>
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

          {/* Who's going section - Stacked avatars with link */}
          {(showParticipants || isApproved) && participants.length > 0 && (
            <div className="border-t border-border pt-6 mb-6">
              <button 
                onClick={() => navigate(`/event/${id}/participants`)}
                className="flex items-center gap-3 w-full text-left group"
              >
                {/* Stacked avatars */}
                <div className="flex -space-x-2">
                  {participants.slice(0, 3).map((participant, index) => (
                    <Avatar 
                      key={participant.id} 
                      className="w-8 h-8 border-2 border-background"
                      style={{ zIndex: 3 - index }}
                    >
                      <AvatarImage src={participant.avatar_url || getDefaultAvatar(participant.first_name || participant.id)} />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {participant.first_name?.charAt(0)?.toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                </div>
                {/* Link text */}
                <span className="text-sm text-foreground underline underline-offset-2 group-hover:text-primary transition-colors">
                  See who's going
                </span>
              </button>
            </div>
          )}

          {/* Description */}
          <div className="border-t border-border pt-6">
            <h2 className="font-semibold text-foreground mb-3">About this gathering</h2>
            <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
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

      {/* Registration Form Sheet */}
      <Sheet open={showRegistrationForm} onOpenChange={setShowRegistrationForm}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto">
          <SheetHeader className="text-left mb-2">
            <SheetTitle>Registration</SheetTitle>
          </SheetHeader>

          {/* Event summary with price */}
          {supabaseEvent && (
            <div className="mb-4 pb-4 border-b border-border">
              <div className="flex items-center gap-3 mb-3">
                {supabaseEvent.cover_image_url && (
                  <img
                    src={supabaseEvent.cover_image_url}
                    alt={supabaseEvent.name}
                    className="w-14 h-14 rounded-lg object-cover"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground text-sm truncate">{supabaseEvent.name}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(supabaseEvent.start_date)} at {formatTime(supabaseEvent.start_date)}</p>
                </div>
              </div>
              {supabaseEvent.ticket_price && supabaseEvent.ticket_price > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total</span>
                  <span className="text-xl font-bold text-foreground">
                    {supabaseEvent.currency} {supabaseEvent.ticket_price.toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          )}

          {user?.id && id && (
            <EventRegistrationForm
              eventId={id}
              userId={user.id}
              onSubmit={handleRegistrationSubmit}
              onCancel={() => setShowRegistrationForm(false)}
              isSubmitting={isSubmitting}
              isPaid={!!(supabaseEvent?.ticket_price && supabaseEvent.ticket_price > 0)}
              requiresApproval={supabaseEvent?.requires_approval ?? false}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* Sticky Bottom Register Button */}
      {showStickyRegister && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-sm border-t border-border safe-area-bottom">
          <div className="max-w-md mx-auto">
            <Button
              variant="loam"
              className="w-full"
              onClick={handleSignUp}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Register'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventDetail;
