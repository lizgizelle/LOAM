import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { getDefaultAvatar } from '@/lib/avatars';
import { formatSlotDate, formatSlotTime } from '@/lib/activities';
import { Calendar, MapPin } from 'lucide-react';

const ActivityBooked = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [activityName, setActivityName] = useState('');
  const [areaName, setAreaName] = useState('');
  const [startTime, setStartTime] = useState<string>('');
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [firstName, setFirstName] = useState<string>('');

  useEffect(() => {
    const load = async () => {
      if (!bookingId) return;

      const [bookingRes, profileRes] = await Promise.all([
        supabase
          .from('activity_bookings')
          .select('slot_id, activity_slots(start_time, area_name, activity_id, activities(name))')
          .eq('id', bookingId)
          .maybeSingle(),
        user?.id
          ? supabase.from('profiles').select('first_name, avatar_url').eq('id', user.id).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      // @ts-ignore — nested join
      const slot = bookingRes.data?.activity_slots;
      // @ts-ignore
      setActivityName(slot?.activities?.name || 'your activity');
      setAreaName(slot?.area_name || '');
      setStartTime(slot?.start_time || '');

      const profile = profileRes.data as any;
      setFirstName(profile?.first_name || 'friend');
      setAvatarUrl(profile?.avatar_url || getDefaultAvatar(user?.id || 'guest'));
    };
    load();
  }, [bookingId, user?.id]);

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      {/* Soft organic blobs — Loam earthy palette */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Coral blobs */}
        <div
          className="absolute top-[8%] left-[-10%] w-48 h-48 rounded-full opacity-40 blur-2xl"
          style={{ background: 'hsl(var(--primary) / 0.5)' }}
        />
        <div
          className="absolute top-[35%] right-[-15%] w-56 h-56 rounded-full opacity-30 blur-3xl"
          style={{ background: 'hsl(var(--primary) / 0.4)' }}
        />
        <div
          className="absolute bottom-[20%] left-[-5%] w-40 h-40 rounded-full opacity-30 blur-2xl"
          style={{ background: 'hsl(35 80% 70% / 0.5)' }}
        />

        {/* Hand-drawn blob shapes (organic, not geometric) */}
        <svg className="absolute top-[10%] right-[12%] w-10 h-10 animate-fade-in" viewBox="0 0 100 100" style={{ animationDelay: '0.1s' }}>
          <path d="M50,5 Q80,15 90,45 Q95,75 65,90 Q35,95 15,70 Q5,40 25,15 Q35,5 50,5 Z" fill="hsl(var(--primary))" opacity="0.7" />
        </svg>
        <svg className="absolute top-[18%] left-[8%] w-8 h-8 animate-fade-in" viewBox="0 0 100 100" style={{ animationDelay: '0.2s' }}>
          <path d="M50,5 Q85,20 85,50 Q80,85 50,90 Q15,85 15,50 Q20,15 50,5 Z" fill="hsl(35 90% 65%)" opacity="0.8" />
        </svg>
        <svg className="absolute top-[42%] left-[5%] w-12 h-12 animate-fade-in" viewBox="0 0 100 100" style={{ animationDelay: '0.3s' }}>
          <path d="M50,10 Q85,25 80,55 Q75,90 45,85 Q10,75 15,45 Q25,10 50,10 Z" fill="hsl(155 50% 65%)" opacity="0.7" />
        </svg>
        <svg className="absolute top-[55%] right-[10%] w-10 h-10 animate-fade-in" viewBox="0 0 100 100" style={{ animationDelay: '0.4s' }}>
          <path d="M50,8 Q88,18 88,50 Q82,88 48,90 Q12,82 12,50 Q22,8 50,8 Z" fill="hsl(var(--primary))" opacity="0.6" />
        </svg>
        <svg className="absolute bottom-[35%] right-[20%] w-7 h-7 animate-fade-in" viewBox="0 0 100 100" style={{ animationDelay: '0.5s' }}>
          <path d="M50,5 Q85,20 85,50 Q80,85 50,90 Q15,85 15,50 Q20,15 50,5 Z" fill="hsl(280 50% 70%)" opacity="0.7" />
        </svg>
        <svg className="absolute top-[28%] right-[35%] w-6 h-6 animate-fade-in" viewBox="0 0 100 100" style={{ animationDelay: '0.6s' }}>
          <path d="M50,10 Q80,15 85,50 Q85,80 50,88 Q15,80 15,50 Q20,15 50,10 Z" fill="hsl(35 90% 65%)" opacity="0.8" />
        </svg>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-20 pb-8 relative z-10">
        {/* Mascot — user's own avatar with celebration ring */}
        <div className="relative mb-8 animate-scale-in">
          {/* Soft glow halo */}
          <div className="absolute inset-0 -m-6 rounded-full blur-2xl opacity-40" style={{ background: 'hsl(var(--primary))' }} />
          {/* Hand-drawn dotted circle around mascot */}
          <svg className="absolute inset-0 -m-4 w-[calc(100%+2rem)] h-[calc(100%+2rem)] animate-spin" style={{ animationDuration: '20s' }} viewBox="0 0 200 200" fill="none">
            <circle cx="100" cy="100" r="95" stroke="hsl(var(--primary))" strokeWidth="2" strokeDasharray="3 8" opacity="0.4" />
          </svg>
          {/* Avatar */}
          <div className="relative w-32 h-32 rounded-full overflow-hidden bg-popover shadow-xl ring-4 ring-background">
            {avatarUrl && (
              <img src={avatarUrl} alt={firstName} className="w-full h-full object-cover" />
            )}
          </div>
          {/* Little sparkle accents */}
          <span className="absolute -top-2 -right-2 text-2xl animate-fade-in" style={{ animationDelay: '0.3s' }}>✨</span>
          <span className="absolute -bottom-1 -left-3 text-xl animate-fade-in" style={{ animationDelay: '0.5s' }}>🌱</span>
        </div>

        {/* Title — Loam serif voice */}
        <h1 className="text-5xl font-serif text-foreground text-center leading-[1.05] mb-3 animate-fade-in">
          You're in,
          <br />
          <span className="italic" style={{ color: 'hsl(var(--primary))' }}>{firstName}</span>.
        </h1>
        <p className="text-base text-muted-foreground text-center mb-8 max-w-xs font-sans animate-fade-in" style={{ animationDelay: '0.15s' }}>
          A spot is held for you. We can't wait to see who you'll meet.
        </p>

        {/* Booking detail card — soft, hosted feel */}
        <div className="w-full max-w-sm bg-popover rounded-3xl p-5 shadow-loam animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <p className="text-xs font-semibold uppercase tracking-wider mb-3 font-sans" style={{ color: 'hsl(var(--primary))' }}>
            {activityName}
          </p>
          {startTime && (
            <div className="flex items-start gap-3 mb-3">
              <Calendar className="w-5 h-5 text-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-base font-semibold text-foreground font-sans">
                  {formatSlotDate(startTime)}
                </p>
                <p className="text-sm text-muted-foreground font-sans">
                  {formatSlotTime(startTime)}
                </p>
              </div>
            </div>
          )}
          {areaName && (
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-foreground mt-0.5 shrink-0" />
              <p className="text-sm text-foreground font-sans">{areaName}</p>
            </div>
          )}
        </div>

        {/* Gentle reminder — softer than Timeleft's penalty warning */}
        <p className="text-xs text-muted-foreground text-center mt-6 max-w-xs font-sans leading-relaxed animate-fade-in" style={{ animationDelay: '0.45s' }}>
          Plans change — just give us 48 hours' notice if you can't make it 🌿
        </p>
      </div>

      {/* Bottom CTAs */}
      <div className="px-4 pb-8 safe-area-bottom space-y-2 relative z-10">
        <button
          onClick={() => navigate('/my-events')}
          className="w-full h-14 rounded-full bg-foreground text-background font-semibold text-base font-sans hover:opacity-90 transition-opacity"
        >
          See in My Activities
        </button>
        <button
          onClick={() => navigate('/home')}
          className="w-full h-12 rounded-full text-foreground font-medium text-sm font-sans"
        >
          Back to home
        </button>
      </div>
    </div>
  );
};

export default ActivityBooked;
