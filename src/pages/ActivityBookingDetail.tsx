import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, MapPin, Users, Lock, Church, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getDefaultAvatar, DEFAULT_AVATARS } from '@/lib/avatars';
import { formatSlotDate, formatSlotTime } from '@/lib/activities';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';

interface MockMascot {
  id: string;
  name: string;
  avatar: string;
  tint: string; // hsl ring color
  church: string;
}

const MOCK_CHURCHES = [
  'Cornerstone Community Church',
  'Heart of God Church',
  'Faith Community Baptist',
  'St. Andrew\'s Cathedral',
  'Hope Singapore',
  'Bethesda Bedok-Tampines',
];

const RING_TINTS = [
  'hsl(8 80% 70%)',     // coral
  'hsl(35 85% 70%)',    // peach
  'hsl(155 50% 65%)',   // sage
  'hsl(220 60% 72%)',   // sky
  'hsl(280 50% 72%)',   // lilac
  'hsl(45 80% 65%)',    // gold
];

const ADDRESS = 'Climb Central, Funan Singapore 530291';

const ActivityBookingDetail = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [activityName, setActivityName] = useState('');
  const [iconEmoji, setIconEmoji] = useState<string | null>(null);
  const [areaName, setAreaName] = useState('');
  const [startTime, setStartTime] = useState('');
  const [durationMin, setDurationMin] = useState(90);
  const [openMascot, setOpenMascot] = useState<MockMascot | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const handleCancel = async () => {
    if (!bookingId) return;
    setCancelling(true);
    const { error } = await supabase
      .from('activity_bookings')
      .update({ status: 'cancelled' })
      .eq('id', bookingId);
    setCancelling(false);
    if (error) {
      toast({ title: 'Could not cancel', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Booking cancelled', description: 'Hope to see you at another one 🌿' });
    navigate('/my-events');
  };

  useEffect(() => {
    const load = async () => {
      if (!bookingId) return;
      const { data } = await supabase
        .from('activity_bookings')
        .select('slot_id, activity_slots(start_time, area_name, duration_minutes, activity_id, activities(name, icon_emoji))')
        .eq('id', bookingId)
        .maybeSingle();

      // @ts-ignore — nested join
      const slot = data?.activity_slots;
      setStartTime(slot?.start_time || '');
      setAreaName(slot?.area_name || '');
      setDurationMin(slot?.duration_minutes || 90);
      // @ts-ignore
      setActivityName(slot?.activities?.name || 'Activity');
      // @ts-ignore
      setIconEmoji(slot?.activities?.icon_emoji ?? null);
      setLoading(false);
    };
    load();
  }, [bookingId]);

  // Reveal location only if event starts within 24 hours
  const locationRevealed = (() => {
    if (!startTime) return false;
    const ms = new Date(startTime).getTime() - Date.now();
    return ms <= 24 * 60 * 60 * 1000;
  })();

  // Build 6 placeholder mascots
  const mascots: MockMascot[] = DEFAULT_AVATARS.slice(0, 6).map((avatar, i) => ({
    id: `m-${i}`,
    name: ['Ava', 'Ben', 'Cara', 'Daniel', 'Eliza', 'Felix'][i],
    avatar,
    tint: RING_TINTS[i % RING_TINTS.length],
    church: MOCK_CHURCHES[i % MOCK_CHURCHES.length],
  }));

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-12">
      {/* Header */}
      <div className="relative h-48 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
        <span className="text-7xl" aria-hidden>{iconEmoji || '✨'}</span>
        <button
          onClick={() => navigate('/my-events')}
          className="absolute top-12 left-4 w-10 h-10 rounded-full bg-background/90 backdrop-blur-sm flex items-center justify-center safe-area-top"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
      </div>

      <div className="px-6 pt-6">
        <h1 className="text-3xl font-serif text-foreground mb-1">{activityName}</h1>
        <p className="text-sm text-muted-foreground mb-6">Your seat is held — see you soon 🌿</p>

        {/* Detail card */}
        <div className="bg-popover rounded-2xl shadow-loam p-5 space-y-4 mb-6">
          {startTime && (
            <>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Calendar className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-0.5">Date</p>
                  <p className="text-base font-semibold text-foreground">{formatSlotDate(startTime)}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-0.5">Time</p>
                  <p className="text-base font-semibold text-foreground">
                    {formatSlotTime(startTime)} · {durationMin} min
                  </p>
                </div>
              </div>
            </>
          )}

          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              {locationRevealed ? (
                <MapPin className="w-5 h-5 text-primary" />
              ) : (
                <Lock className="w-5 h-5 text-primary" />
              )}
            </div>
            <div className="flex-1">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-0.5">Location</p>
              {locationRevealed ? (
                <>
                  <p className="text-base font-semibold text-foreground">{ADDRESS}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{areaName}</p>
                </>
              ) : (
                <>
                  <p className="text-base font-semibold text-foreground">To be revealed</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Exact address shared 24 hours before · {areaName}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Mascots going */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-primary" />
            <h2 className="text-base font-semibold text-foreground">Who's going</h2>
            <span className="text-xs text-muted-foreground">({mascots.length})</span>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            {locationRevealed
              ? 'Tap a mascot to see which church they go to 🙏'
              : 'Churches revealed 24 hours before — final groups confirmed by our team 🌿'}
          </p>

          <div className="grid grid-cols-3 gap-3">
            {mascots.map((m) => {
              const inner = (
                <div className="w-16 h-16 rounded-full overflow-hidden">
                  <img src={m.avatar} alt="Attendee" className="w-full h-full object-cover" />
                </div>
              );
              return locationRevealed ? (
                <button
                  key={m.id}
                  onClick={() => setOpenMascot(m)}
                  className="flex items-center justify-center p-3 rounded-2xl bg-popover shadow-loam hover:scale-105 transition-transform"
                >
                  {inner}
                </button>
              ) : (
                <div
                  key={m.id}
                  className="flex items-center justify-center p-3 rounded-2xl bg-popover shadow-loam"
                >
                  {inner}
                </div>
              );
            })}
          </div>
        </div>

        {/* Gentle reminder */}
        <p className="text-xs text-muted-foreground text-center max-w-xs mx-auto leading-relaxed mb-6">
          Plans change — just give us 48 hours' notice if you can't make it 🌿
        </p>

        {/* Cancel button */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button className="w-full py-4 rounded-2xl border border-destructive/30 text-destructive font-medium hover:bg-destructive/5 transition-colors">
              Cancel booking
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent className="rounded-3xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel this booking?</AlertDialogTitle>
              <AlertDialogDescription>
                Your seat will be released so someone else can join. You can always book another activity.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep booking</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleCancel}
                disabled={cancelling}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {cancelling ? 'Cancelling...' : 'Yes, cancel'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Mascot church dialog */}
      <Dialog open={!!openMascot} onOpenChange={(o) => !o && setOpenMascot(null)}>
        <DialogContent className="max-w-xs rounded-3xl">
          <DialogHeader>
            <DialogTitle className="sr-only">Attendee's church</DialogTitle>
          </DialogHeader>
          {openMascot && (
            <div className="flex flex-col items-center text-center py-2">
              <div className="w-24 h-24 rounded-full overflow-hidden mb-4">
                <img src={openMascot.avatar} alt="Attendee" className="w-full h-full object-cover" />
              </div>
              <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">
                <Church className="w-3.5 h-3.5" />
                <span>Church</span>
              </div>
              <p className="text-base font-semibold text-foreground">{openMascot.church}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ActivityBookingDetail;
