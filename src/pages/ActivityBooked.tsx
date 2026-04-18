import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Info } from 'lucide-react';

const ActivityBooked = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const [activityName, setActivityName] = useState('');

  useEffect(() => {
    const load = async () => {
      if (!bookingId) return;
      const { data } = await supabase
        .from('activity_bookings')
        .select('slot_id, activity_slots(activity_id, activities(name))')
        .eq('id', bookingId)
        .maybeSingle();
      // @ts-ignore — nested join
      const name = data?.activity_slots?.activities?.name;
      setActivityName(name || 'activity');
    };
    load();
  }, [bookingId]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[hsl(35,40%,90%)] via-background to-background flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-20 pb-8 relative overflow-hidden">
        {/* Confetti shapes */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[15%] left-[10%] w-12 h-12 rounded-full bg-sky-400 opacity-90" />
          <div className="absolute top-[12%] right-[15%] w-10 h-10 rotate-12 bg-yellow-400 rounded-md" />
          <div className="absolute top-[28%] left-[18%] w-8 h-8 rounded-full bg-purple-400" />
          <div className="absolute top-[35%] right-[8%] w-14 h-14 rounded-full bg-orange-400 opacity-80" />
          <div className="absolute top-[55%] left-[8%] w-10 h-10 rounded-full bg-emerald-400 opacity-90" />
          <div className="absolute bottom-[28%] left-[45%] w-12 h-12 rounded-full bg-indigo-400 opacity-80" />
          <div className="absolute bottom-[20%] right-[12%] w-16 h-8 rounded-full bg-pink-400" />
          <div className="absolute top-[45%] right-[35%] w-8 h-8 rotate-45 bg-rose-400" />
          <div className="absolute bottom-[35%] left-[20%] w-6 h-6 rounded-full bg-amber-400" />
        </div>

        {/* Mascot */}
        <div className="relative z-10 mb-6">
          <div className="w-28 h-28 rounded-3xl bg-gradient-to-br from-orange-300 to-pink-400 flex items-center justify-center shadow-xl">
            <div className="flex gap-2">
              <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center">
                <div className="w-2.5 h-2.5 rounded-full bg-foreground" />
              </div>
              <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center">
                <div className="w-2.5 h-2.5 rounded-full bg-foreground" />
              </div>
            </div>
          </div>
        </div>

        {/* Title */}
        <h1 className="relative z-10 text-5xl font-serif text-foreground text-center leading-tight mb-3">
          You're all booked!
        </h1>
        <p className="relative z-10 text-base text-muted-foreground text-center mb-8">
          Enjoy your {activityName}.
        </p>

        {/* Info card */}
        <div className="relative z-10 w-full bg-popover rounded-2xl p-4 flex items-start gap-3 shadow-sm mb-6">
          <div className="w-7 h-7 rounded-full bg-foreground flex items-center justify-center shrink-0 mt-0.5">
            <Info className="w-4 h-4 text-background" />
          </div>
          <p className="text-sm text-foreground leading-relaxed">
            Late cancellations (less than 2 days before the event) and no-shows will be penalized.
          </p>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="px-4 pb-8 safe-area-bottom space-y-2">
        <button
          onClick={() => navigate('/my-events')}
          className="w-full h-14 rounded-full bg-foreground text-background font-semibold text-base"
        >
          See in My Events
        </button>
        <button
          onClick={() => navigate('/home')}
          className="w-full h-12 rounded-full text-foreground font-medium text-sm"
        >
          Back to home
        </button>
      </div>
    </div>
  );
};

export default ActivityBooked;
