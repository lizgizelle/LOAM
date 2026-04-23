import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { formatSlotDate, formatSlotTime } from '@/lib/activities';
import { toast } from 'sonner';

interface Slot {
  id: string;
  start_time: string;
  capacity: number;
  area_name: string;
  booked_count: number;
}

const ActivitySlots = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const area = params.get('area') || '';
  const { user } = useAuth();

  const [activityName, setActivityName] = useState('');
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!id || !area) return;

      const [actRes, slotRes] = await Promise.all([
        supabase.from('activities').select('name').eq('id', id).maybeSingle(),
        supabase
          .from('activity_slots')
          .select('id, start_time, capacity, area_name')
          .eq('activity_id', id)
          .eq('area_name', area)
          .eq('status', 'open')
          .gt('start_time', new Date().toISOString())
          .order('start_time', { ascending: true })
          .limit(2),
      ]);

      setActivityName(actRes.data?.name || '');

      const slotList = slotRes.data || [];
      // No capacity gating — admins manually split groups. We still surface count for context but never hide.
      const enriched = await Promise.all(
        slotList.map(async (s) => {
          const { count } = await supabase
            .from('activity_bookings')
            .select('*', { count: 'exact', head: true })
            .eq('slot_id', s.id)
            .eq('status', 'confirmed');
          return { ...s, booked_count: count || 0 };
        })
      );
      setSlots(enriched);
      setLoading(false);
    };
    load();
  }, [id, area]);

  const handleConfirm = async () => {
    if (!selected || !user?.id) return;
    setBooking(true);
    const { data, error } = await supabase
      .from('activity_bookings')
      .insert({ slot_id: selected, user_id: user.id, status: 'confirmed' })
      .select('id')
      .maybeSingle();
    setBooking(false);

    if (error) {
      if (error.code === '23505') {
        toast.error("You've already booked this slot.");
      } else {
        toast.error('Could not book: ' + error.message);
      }
      return;
    }
    navigate(`/activities/booked/${data?.id}`);
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      <div className="px-6 pt-14 pb-4 safe-area-top flex items-center justify-center relative">
        <button onClick={() => navigate(-1)} className="absolute left-4 p-2 rounded-full hover:bg-secondary/50">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="font-semibold text-foreground">{activityName}</h2>
      </div>

      <div className="px-6 mb-6">
        <div className="h-1 bg-secondary rounded-full overflow-hidden">
          <div className="h-full w-2/3 bg-gradient-to-r from-orange-500 to-pink-400 rounded-full" />
        </div>
      </div>

      <div className="px-6 mb-4">
        <h1 className="text-2xl font-bold text-foreground mb-1">Pick a time</h1>
        <p className="text-muted-foreground text-sm">In {area}</p>
      </div>

      <div className="px-6">
        {loading ? (
          <p className="text-center text-muted-foreground py-8">Loading available times...</p>
        ) : slots.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-2">No upcoming slots in this area yet.</p>
            <p className="text-sm text-muted-foreground">Check back soon!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {slots.map((s) => {
              const isSelected = selected === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setSelected(s.id)}
                  className={`w-full p-4 rounded-xl text-left transition-all ${
                    isSelected
                      ? 'bg-popover border-2 border-foreground'
                      : 'bg-popover border-2 border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-foreground">{formatSlotDate(s.start_time)}</p>
                      <p className="text-sm text-muted-foreground">{formatSlotTime(s.start_time)}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto p-4 bg-background safe-area-bottom space-y-3">
        <p className="text-xs text-muted-foreground text-center leading-relaxed px-2">
          Please only book if you're sure you can make it. A <span className="font-semibold text-foreground">$10 no-show fee</span> applies if you don't turn up — out of respect for your host and the others attending.
        </p>
        <button
          onClick={handleConfirm}
          disabled={!selected || booking}
          className="w-full h-14 rounded-full bg-foreground text-background font-semibold text-base disabled:opacity-50"
        >
          {booking ? 'Booking...' : 'Confirm booking'}
        </button>
      </div>
    </div>
  );
};

export default ActivitySlots;
