import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import BottomNav from '@/components/BottomNav';

interface Activity {
  id: string;
  name: string;
  description: string | null;
  cover_image_url: string | null;
  icon_emoji: string | null;
  display_order: number;
}

const Activities = () => {
  const navigate = useNavigate();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('activities')
        .select('id, name, description, cover_image_url, icon_emoji, display_order')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      setActivities(data || []);
      setLoading(false);
    };
    load();
  }, []);

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="px-6 pt-14 pb-2 safe-area-top flex items-center gap-3">
        <button onClick={() => navigate('/home')} className="p-2 -ml-2 rounded-full hover:bg-secondary/50">
          <ArrowLeft className="w-5 h-5" />
        </button>
      </div>
      <div className="px-6 pb-6">
        <h1 className="text-3xl font-bold text-foreground" style={{ fontFamily: 'serif' }}>
          Meet people in
        </h1>
        <h1 className="text-3xl font-bold text-muted-foreground" style={{ fontFamily: 'serif' }}>
          Singapore
        </h1>
      </div>

      <div className="px-6">
        <h2 className="text-xl font-bold text-foreground mb-4">Book your next activity</h2>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-pulse text-muted-foreground">Loading...</div>
          </div>
        ) : activities.length === 0 ? (
          <p className="text-muted-foreground text-center py-12">No activities available yet.</p>
        ) : (
          <div className="space-y-3">
            {activities.map((act) => (
              <button
                key={act.id}
                onClick={() => navigate(`/activities/${act.id}`)}
                className="w-full bg-popover rounded-2xl shadow-loam p-4 flex items-center gap-4 text-left hover:bg-secondary/30 transition-colors"
              >
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center text-2xl shrink-0 overflow-hidden">
                  {act.cover_image_url ? (
                    <img src={act.cover_image_url} alt={act.name} className="w-full h-full object-cover" />
                  ) : (
                    <span>{act.icon_emoji || '✨'}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground">{act.name}</h3>
                  {act.description && (
                    <p className="text-sm text-muted-foreground line-clamp-1">{act.description}</p>
                  )}
                </div>
                <div className="w-9 h-9 rounded-full bg-foreground flex items-center justify-center shrink-0">
                  <ChevronRight className="w-4 h-4 text-background" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default Activities;
