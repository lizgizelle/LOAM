import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { SUBSCRIPTION_PLANS } from '@/lib/activities';

interface SubRow {
  id: string;
  user_id: string;
  plan: '1_month' | '3_months' | '6_months';
  status: string;
  started_at: string;
  expires_at: string;
  profile?: { first_name: string | null; last_name: string | null; email: string | null };
}

const AdminSubscriptions = () => {
  const [rows, setRows] = useState<SubRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    const { data: subs } = await supabase
      .from('subscriptions')
      .select('*')
      .order('started_at', { ascending: false });

    if (!subs || subs.length === 0) {
      setRows([]);
      setLoading(false);
      return;
    }
    const ids = subs.map((s) => s.user_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email')
      .in('id', ids);
    const pMap = new Map((profiles || []).map((p) => [p.id, p]));
    setRows(subs.map((s) => ({ ...s, profile: pMap.get(s.user_id) as any })) as SubRow[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const cancel = async (id: string) => {
    if (!confirm('Cancel this subscription?')) return;
    const { error } = await supabase
      .from('subscriptions')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
      .eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success('Cancelled'); load(); }
  };

  const reactivate = async (row: SubRow) => {
    const months = SUBSCRIPTION_PLANS.find((p) => p.id === row.plan)?.months || 1;
    const expires = new Date();
    expires.setMonth(expires.getMonth() + months);
    const { error } = await supabase
      .from('subscriptions')
      .update({ status: 'active', cancelled_at: null, started_at: new Date().toISOString(), expires_at: expires.toISOString() })
      .eq('id', row.id);
    if (error) toast.error(error.message);
    else { toast.success('Reactivated'); load(); }
  };

  const filtered = rows.filter((r) => {
    if (!search.trim()) return true;
    const hay = `${r.profile?.first_name || ''} ${r.profile?.last_name || ''} ${r.profile?.email || ''}`.toLowerCase();
    return hay.includes(search.toLowerCase());
  });

  const activeCount = rows.filter((r) => r.status === 'active' && new Date(r.expires_at) > new Date()).length;

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Subscriptions</h1>
          <p className="text-sm text-muted-foreground">{activeCount} active · {rows.length} total</p>
        </div>
        <Input placeholder="Search by name or email" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground">No subscriptions found.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => {
            const isActive = r.status === 'active' && new Date(r.expires_at) > new Date();
            const planMeta = SUBSCRIPTION_PLANS.find((p) => p.id === r.plan);
            return (
              <div key={r.id} className="bg-card border border-border rounded-lg p-4 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium">
                    {r.profile?.first_name || ''} {r.profile?.last_name || ''}
                    <span className="text-sm text-muted-foreground ml-2">{r.profile?.email}</span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {planMeta?.label} · {isActive ? 'Active' : r.status} · expires {new Date(r.expires_at).toLocaleDateString()}
                  </p>
                </div>
                {isActive ? (
                  <Button size="sm" variant="outline" onClick={() => cancel(r.id)}>Cancel</Button>
                ) : (
                  <Button size="sm" onClick={() => reactivate(r)}>Reactivate</Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminSubscriptions;
