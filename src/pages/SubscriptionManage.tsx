import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSubscription } from '@/hooks/useSubscription';
import { SUBSCRIPTION_PLANS } from '@/lib/activities';
import { toast } from 'sonner';
import { useState } from 'react';

const SubscriptionManage = () => {
  const navigate = useNavigate();
  const { subscription, isActive, loading, refetch } = useSubscription();
  const [cancelling, setCancelling] = useState(false);

  const handleCancel = async () => {
    if (!subscription) return;
    if (!confirm('Cancel your subscription? You can re-subscribe anytime.')) return;
    setCancelling(true);
    const { error } = await supabase
      .from('subscriptions')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
      .eq('id', subscription.id);
    setCancelling(false);
    if (error) {
      toast.error('Could not cancel: ' + error.message);
      return;
    }
    toast.success('Subscription cancelled.');
    refetch();
  };

  const planMeta = subscription
    ? SUBSCRIPTION_PLANS.find((p) => p.id === subscription.plan)
    : null;

  return (
    <div className="min-h-screen bg-background pb-12">
      <div className="px-6 pt-14 pb-4 safe-area-top flex items-center gap-3">
        <button onClick={() => navigate('/profile')} className="p-2 -ml-2 rounded-full hover:bg-secondary/50">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold">Subscription</h1>
      </div>

      <div className="px-6">
        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : isActive && planMeta ? (
          <>
            <div className="bg-popover rounded-2xl shadow-loam p-6 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                  <Check className="w-4 h-4 text-green-700" />
                </div>
                <span className="text-sm font-semibold text-green-700">Active</span>
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-1">{planMeta.label}</h2>
              <p className="text-muted-foreground text-sm mb-4">
                SGD {planMeta.price.toFixed(2)} · SGD {planMeta.pricePerWeek.toFixed(2)}/week
              </p>
              <div className="border-t border-border pt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Started</span>
                  <span className="font-medium">
                    {new Date(subscription!.started_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Renews</span>
                  <span className="font-medium">
                    {new Date(subscription!.expires_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="w-full p-4 rounded-2xl bg-popover shadow-loam text-destructive font-medium hover:bg-secondary/50"
            >
              {cancelling ? 'Cancelling...' : 'Cancel subscription'}
            </button>
          </>
        ) : (
          <>
            <div className="bg-popover rounded-2xl shadow-loam p-6 mb-6 text-center">
              <div className="text-5xl mb-3">💎</div>
              <h2 className="text-xl font-bold text-foreground mb-2">No active subscription</h2>
              <p className="text-muted-foreground text-sm mb-6">
                Subscribe to book small group activities and meet new people in Singapore.
              </p>
              <button
                onClick={() => navigate('/subscription/paywall?return=/profile/subscription')}
                className="w-full h-12 rounded-full bg-foreground text-background font-semibold"
              >
                See plans
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SubscriptionManage;
