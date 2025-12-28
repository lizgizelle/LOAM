import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
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
        <div className="h-32 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
          <span className="text-4xl">✨</span>
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
