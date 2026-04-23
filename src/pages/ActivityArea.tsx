import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSubscription } from '@/hooks/useSubscription';

const ActivityArea = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isActive: hasSub, loading: subLoading } = useSubscription();
  const [activityName, setActivityName] = useState('');
  const [areas, setAreas] = useState<{ id: string; area_name: string }[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      const [actRes, areaRes] = await Promise.all([
        supabase.from('activities').select('name').eq('id', id).maybeSingle(),
        supabase.from('activity_areas').select('id, area_name').eq('activity_id', id).eq('is_active', true),
      ]);
      setActivityName(actRes.data?.name || '');
      setAreas(areaRes.data || []);
      if (areaRes.data && areaRes.data.length > 0) {
        setSelected(areaRes.data[0].area_name);
      }
      setLoading(false);
    };
    load();
  }, [id]);

  const handleContinue = () => {
    if (!selected) return;
    if (subLoading) return;
    if (!hasSub) {
      navigate(`/subscription/paywall?return=/activities/${id}/slots?area=${encodeURIComponent(selected)}`);
    } else {
      navigate(`/activities/${id}/slots?area=${encodeURIComponent(selected)}`);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      <div className="px-6 pt-14 pb-4 safe-area-top flex items-center justify-center relative">
        <button
          onClick={() => navigate(-1)}
          className="absolute left-4 p-2 rounded-full hover:bg-secondary/50"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="font-semibold text-foreground">{activityName}</h2>
      </div>

      {/* Progress bar */}
      <div className="px-6 mb-6">
        <div className="h-1 bg-secondary rounded-full overflow-hidden">
          <div className="h-full w-1/3 bg-gradient-to-r from-orange-500 to-pink-400 rounded-full" />
        </div>
      </div>

      <div className="px-6">
        <h1 className="text-2xl font-bold text-foreground text-center mb-2">
          Where would you like to have your activity?
        </h1>
        <p className="text-center text-muted-foreground mb-6">In Singapore</p>


        {loading ? (
          <p className="text-center text-muted-foreground py-8">Loading areas...</p>
        ) : (
          <div className="space-y-3">
            {areas.map((a) => {
              const isSelected = selected === a.area_name;
              return (
                <button
                  key={a.id}
                  onClick={() => setSelected(a.area_name)}
                  className={`w-full p-4 rounded-xl flex items-center justify-between text-left transition-all ${
                    isSelected
                      ? 'bg-popover border-2 border-foreground'
                      : 'bg-secondary/60 border-2 border-transparent text-muted-foreground'
                  }`}
                >
                  <span className={`font-semibold ${isSelected ? 'text-foreground' : ''}`}>
                    {a.area_name}
                  </span>
                  <div
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      isSelected ? 'border-foreground' : 'border-muted-foreground/40'
                    }`}
                  >
                    {isSelected && <div className="w-3 h-3 rounded-full bg-foreground" />}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto p-4 bg-background safe-area-bottom">
        <button
          onClick={handleContinue}
          disabled={!selected || subLoading}
          className="w-full h-14 rounded-full bg-foreground text-background font-semibold text-base disabled:opacity-50"
        >
          Continue
        </button>
      </div>
    </div>
  );
};

export default ActivityArea;
