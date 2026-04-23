import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Users, Clock, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Activity {
  id: string;
  name: string;
  description: string | null;
  cover_image_url: string | null;
  artwork_url: string | null;
}

const ActivityDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      const { data } = await supabase
        .from('activities')
        .select('id, name, description, cover_image_url, artwork_url')
        .eq('id', id)
        .maybeSingle();
      setActivity(data);
      setLoading(false);
    };
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        <p className="text-muted-foreground mb-4">Activity not found.</p>
        <button onClick={() => navigate('/home')} className="text-primary font-medium">
          Back to activities
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Cover */}
      <div className="relative h-64 bg-white">
        {activity.cover_image_url ? (
          <img src={activity.cover_image_url} alt={activity.name} className="w-full h-full object-cover" />
        ) : activity.artwork_url ? (
          <div className="w-full h-full flex items-center justify-center p-6 bg-white">
            <img src={activity.artwork_url} alt={activity.name} className="max-h-full max-w-full object-contain" />
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-7xl">✨</div>
        )}
        <button
          onClick={() => navigate('/home')}
          className="absolute top-12 left-4 w-10 h-10 rounded-full bg-background/90 backdrop-blur-sm flex items-center justify-center safe-area-top"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
      </div>

      <div className="px-6 pt-6">
        <h1 className="text-2xl font-bold text-foreground mb-2">{activity.name}</h1>
        <p className="text-muted-foreground whitespace-pre-line leading-relaxed mb-6">
          {activity.description || 'A small group activity to meet new people.'}
        </p>

        <div className="bg-popover rounded-2xl shadow-loam p-4 space-y-3 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Small group</p>
              <p className="text-xs text-muted-foreground">Small groups from 4-8 people</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
              <Clock className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">90 minutes</p>
              <p className="text-xs text-muted-foreground">Plus optional bites after</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Flexible schedule</p>
              <p className="text-xs text-muted-foreground">Wed & Thursday evenings</p>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto p-4 bg-background border-t border-border safe-area-bottom">
        <button
          onClick={() => navigate(`/activities/${activity.id}/area`)}
          className="w-full h-14 rounded-full bg-foreground text-background font-semibold text-base hover:bg-foreground/90 transition-colors"
        >
          Continue
        </button>
      </div>
    </div>
  );
};

export default ActivityDetail;
