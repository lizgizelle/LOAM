import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { SUBSCRIPTION_PLANS, SubscriptionPlanId } from '@/lib/activities';
import { toast } from 'sonner';

const SubscriptionPaywall = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const returnUrl = params.get('return') || '/activities';
  const { user } = useAuth();
  const [selected, setSelected] = useState<SubscriptionPlanId>('3_months');
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    if (!user?.id) {
      toast.error('Please log in first.');
      return;
    }
    setLoading(true);
    const plan = SUBSCRIPTION_PLANS.find((p) => p.id === selected)!;
    const expires = new Date();
    expires.setMonth(expires.getMonth() + plan.months);

    // Upsert subscription (mock — no real billing)
    const { error } = await supabase
      .from('subscriptions')
      .upsert(
        {
          user_id: user.id,
          plan: plan.id,
          status: 'active',
          started_at: new Date().toISOString(),
          expires_at: expires.toISOString(),
          cancelled_at: null,
        },
        { onConflict: 'user_id' }
      );

    setLoading(false);

    if (error) {
      toast.error('Could not start subscription: ' + error.message);
      return;
    }
    toast.success(`You're subscribed for ${plan.label.toLowerCase()}!`);
    navigate(returnUrl, { replace: true });
  };

  const selectedPlan = SUBSCRIPTION_PLANS.find((p) => p.id === selected)!;

  return (
    <div className="min-h-screen bg-gradient-to-b from-secondary/40 to-background pb-32">
      <div className="px-6 pt-14 safe-area-top flex justify-end">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full hover:bg-secondary/50 flex items-center justify-center"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="px-6 pb-6">
        <h1 className="text-4xl font-bold text-foreground" style={{ fontFamily: 'serif' }}>
          Our plans
        </h1>
      </div>

      {/* Decorative */}
      <div className="px-6 mb-8 flex justify-center">
        <div className="text-7xl">💎</div>
      </div>

      <p className="text-center text-muted-foreground px-8 mb-8 leading-relaxed">
        Members are up to 93% more likely to find long lasting connections
      </p>

      <div className="px-6 space-y-3">
        {SUBSCRIPTION_PLANS.map((plan) => {
          const isSelected = selected === plan.id;
          return (
            <button
              key={plan.id}
              onClick={() => setSelected(plan.id)}
              className={`w-full p-4 rounded-2xl flex items-center text-left transition-all bg-popover ${
                isSelected ? 'border-2 border-foreground' : 'border-2 border-transparent'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mr-3 shrink-0 ${
                  isSelected ? 'border-foreground' : 'border-muted-foreground/40'
                }`}
              >
                {isSelected && <div className="w-3 h-3 rounded-full bg-foreground" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-foreground">{plan.label}</p>
                <p className="text-sm text-muted-foreground">
                  {plan.originalPrice && (
                    <span className="line-through mr-1">SGD {plan.originalPrice.toFixed(2)}</span>
                  )}
                  SGD {plan.price.toFixed(2)}
                </p>
              </div>
              <div className="text-right">
                {plan.badge && (
                  <span className="inline-block bg-green-100 text-green-800 text-xs font-semibold px-2 py-1 rounded-full mb-1">
                    {plan.badge}
                  </span>
                )}
                <p className="font-bold text-foreground">SGD {plan.pricePerWeek.toFixed(2)}/week</p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-background safe-area-bottom">
        <p className="text-center text-foreground font-semibold py-4">
          SGD {selectedPlan.price.toFixed(2)} every {selectedPlan.label.toLowerCase()}
        </p>
        <div className="px-4 pb-4">
          <button
            onClick={handleContinue}
            disabled={loading}
            className="w-full h-14 rounded-full bg-foreground text-background font-semibold text-base disabled:opacity-50"
          >
            {loading ? 'Starting...' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionPaywall;
