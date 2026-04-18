import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface Subscription {
  id: string;
  user_id: string;
  plan: '1_month' | '3_months' | '6_months';
  status: 'active' | 'cancelled' | 'expired';
  started_at: string;
  expires_at: string;
  cancelled_at: string | null;
}

export const useSubscription = () => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSub = useCallback(async () => {
    if (!user?.id) {
      setSubscription(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    setSubscription(data as Subscription | null);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    fetchSub();
  }, [fetchSub]);

  const isActive = !!(
    subscription &&
    subscription.status === 'active' &&
    new Date(subscription.expires_at) > new Date()
  );

  return { subscription, loading, isActive, refetch: fetchSub };
};
