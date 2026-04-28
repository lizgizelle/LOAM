import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '@/components/BottomNav';
import { supabase } from '@/integrations/supabase/client';
import { Bell, ArrowRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface ActivityCard {
  id: string;
  name: string;
  artwork_url: string | null;
  next_slot: string | null;
}

const ICON_BG = [
  'bg-orange-100',
  'bg-emerald-100',
  'bg-purple-100',
  'bg-pink-100',
  'bg-sky-100',
  'bg-amber-100',
  'bg-rose-100',
  'bg-indigo-100',
];

const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [firstName, setFirstName] = useState<string>('');
  const [activities, setActivities] = useState<ActivityCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      // Greeting name
      if (user?.id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name')
          .eq('id', user.id)
          .maybeSingle();
        setFirstName(profile?.first_name || '');
      }

      // Activities
      const { data: acts } = await supabase
        .from('activities')
        .select('id, name, artwork_url')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      // Build upcoming Wednesday & Thursday dates (starting from tomorrow)
      const upcomingDates: Date[] = [];
      const start = new Date();
      start.setHours(19, 30, 0, 0); // default 7:30 PM
      start.setDate(start.getDate() + 1); // start from tomorrow
      const cursor = new Date(start);
      const baseActs = acts || [];
      // Need enough dates so that dates × activities >= 18
      const datesNeeded = baseActs.length ? Math.ceil(18 / baseActs.length) : 0;
      while (upcomingDates.length < datesNeeded) {
        const day = cursor.getDay(); // 3 = Wed, 4 = Thu
        if (day === 3 || day === 4) {
          upcomingDates.push(new Date(cursor));
        }
        cursor.setDate(cursor.getDate() + 1);
      }

      // Group by date: all activities for Wed, then all activities for Thu, ...
      const enriched: ActivityCard[] = [];
      for (let d = 0; d < upcomingDates.length && enriched.length < 18; d++) {
        for (let j = 0; j < baseActs.length && enriched.length < 18; j++) {
          const a = baseActs[j];
          enriched.push({
            id: `${a.id}-${d}-${j}`,
            name: a.name,
            artwork_url: (a as any).artwork_url ?? null,
            next_slot: upcomingDates[d].toISOString(),
          });
        }
      }
      setActivities(enriched);
      setLoading(false);
    };
    load();
  }, [user?.id]);

  const formatNextSlot = (iso: string | null) => {
    if (!iso) return 'Coming soon';
    const d = new Date(iso);
    const day = d.toLocaleDateString('en-US', { weekday: 'long' });
    const date = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
    return `${day}, ${date}`;
  };

  const formatTime = (iso: string | null) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="px-6 pt-14 pb-2 safe-area-top flex items-start justify-end">
        <button className="w-10 h-10 rounded-full bg-popover flex items-center justify-center shadow-sm relative">
          <Bell className="w-5 h-5 text-foreground" />
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary" />
        </button>
      </div>

      {/* Hero greeting */}
      <div className="px-6 pt-6 pb-10">
        <h1 className="text-4xl font-serif text-foreground leading-tight">
          Meet Faith-Driven
        </h1>
        <h1 className="text-4xl font-serif italic text-muted-foreground leading-tight">
          Singles in Singapore.
        </h1>
      </div>

      {/* Section header */}
      <div className="px-6 mb-4">
        <h2 className="text-2xl font-serif text-foreground">Book your next activity</h2>
      </div>

      {/* Activity list */}
      <div className="px-4 space-y-3">
        {loading ? (
          <p className="text-center text-muted-foreground py-8">Loading...</p>
        ) : activities.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <p className="text-muted-foreground">No activities yet. Check back soon 🌱</p>
          </div>
        ) : (
          activities.map((a, i) => (
            <button
              key={a.id}
              onClick={() => navigate(`/activities/${a.id.replace(/-\d+-\d+$/, '')}`)}
              className="w-full text-left bg-popover rounded-2xl shadow-loam p-4 flex items-center gap-4 hover:shadow-loam-lg transition-all border border-border/40"
            >
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center overflow-hidden shrink-0 ${ICON_BG[i % ICON_BG.length]}`}>
                {a.artwork_url ? (
                  <img src={a.artwork_url} alt={a.name} className="w-full h-full object-contain" loading="lazy" width={56} height={56} />
                ) : (
                  <span className="text-2xl">✨</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base text-foreground">{a.name}</p>
                <p className="text-base font-bold text-foreground">
                  {formatNextSlot(a.next_slot)}
                </p>
                {a.next_slot && (
                  <p className="text-sm text-muted-foreground">{formatTime(a.next_slot)}</p>
                )}
              </div>
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <ArrowRight className="w-5 h-5 text-primary" />
              </div>
            </button>
          ))
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default Home;
