import { useNavigate } from 'react-router-dom';
import { ChevronRight, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Event } from '@/types';

interface EventCardProps {
  event: Event;
  isCompact?: boolean;
}

const EventCard = ({ event, isCompact = false }: EventCardProps) => {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(`/event/${event.id}`)}
      className={`w-full bg-popover rounded-2xl shadow-loam overflow-hidden text-left transition-all duration-200 hover:shadow-loam-lg active:scale-[0.98] ${
        event.isPast ? 'opacity-50' : ''
      }`}
    >
      {!isCompact && (
        <div className="h-32 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center relative">
          <span className="text-4xl">✨</span>
          {/* Requires approval badge */}
          {event.requiresApproval && (
            <Badge 
              variant="secondary" 
              className="absolute top-3 right-3 bg-background/90 text-foreground text-xs gap-1"
            >
              <ShieldCheck className="w-3 h-3" />
              Requires approval
            </Badge>
          )}
        </div>
      )}
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-foreground text-lg leading-tight mb-1">
              {event.name}
            </h3>
            <p className="text-sm text-muted-foreground">
              {event.date} · {event.time}
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Hosted by Loam
            </p>
            {event.spotsLeft && !event.isPast && (
              <p className="text-xs text-primary font-medium mt-2">
                {event.spotsLeft} spots left
              </p>
            )}
            {event.isPast && (
              <p className="text-xs text-muted-foreground font-medium mt-2">
                Past gathering
              </p>
            )}
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground mt-1 flex-shrink-0" />
        </div>
      </div>
    </button>
  );
};

export default EventCard;
