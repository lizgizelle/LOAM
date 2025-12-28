import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { mockEvents } from '@/data/events';
import { useAppStore } from '@/store/appStore';
import { ArrowLeft, MapPin, Clock, Calendar } from 'lucide-react';
import { toast } from 'sonner';

const EventDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { signUpForEvent, signedUpEvents } = useAppStore();
  
  const event = mockEvents.find(e => e.id === id);
  const isSignedUp = signedUpEvents.includes(id || '');

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

          {/* Description */}
          <div className="border-t border-border pt-6">
            <h2 className="font-semibold text-foreground mb-3">About this event</h2>
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
