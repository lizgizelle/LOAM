import { useEffect, useState, useCallback, useMemo } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, Church, Move } from 'lucide-react';
import { toast } from 'sonner';
import { formatSlotDate, formatSlotTime } from '@/lib/activities';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface BookingRow {
  id: string;
  status: string;
  slot_id: string;
  user_id: string;
  // joined
  slot_start: string;
  slot_area: string;
  slot_capacity: number;
  slot_status: string;
  activity_id: string;
  activity_name: string;
  activity_artwork: string | null;
  // profile
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone_number: string | null;
  church: string | null;
}

interface SlotOption {
  id: string;
  start_time: string;
  area_name: string;
  activity_id: string;
  activity_name: string;
  capacity: number;
  status: string;
  bookedCount: number;
}

const AdminBookings = () => {
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [activities, setActivities] = useState<{ id: string; name: string }[]>([]);
  const [activityFilter, setActivityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('confirmed');
  const [search, setSearch] = useState('');
  const [moving, setMoving] = useState<BookingRow | null>(null);
  const [moveOptions, setMoveOptions] = useState<SlotOption[]>([]);
  const [moveTargetId, setMoveTargetId] = useState<string>('');
  const [submittingMove, setSubmittingMove] = useState(false);
  const [cancelling, setCancelling] = useState<BookingRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('activity_bookings')
      .select(`
        id, status, slot_id, user_id,
        activity_slots:slot_id (
          start_time, area_name, capacity, status, activity_id,
          activities:activity_id ( name, artwork_url )
        )
      `)
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    const userIds = Array.from(new Set((data || []).map((b: any) => b.user_id)));
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email, phone_number, church')
      .in('id', userIds.length ? userIds : ['00000000-0000-0000-0000-000000000000']);
    const profileMap: Record<string, any> = {};
    (profilesData || []).forEach((p: any) => { profileMap[p.id] = p; });

    const rows: BookingRow[] = (data || []).map((b: any) => {
      const p = profileMap[b.user_id] || {};
      return {
        id: b.id,
        status: b.status,
        slot_id: b.slot_id,
        user_id: b.user_id,
        slot_start: b.activity_slots?.start_time || '',
        slot_area: b.activity_slots?.area_name || '',
        slot_capacity: b.activity_slots?.capacity || 0,
        slot_status: b.activity_slots?.status || '',
        activity_id: b.activity_slots?.activity_id || '',
        activity_name: b.activity_slots?.activities?.name || 'Activity',
        activity_artwork: b.activity_slots?.activities?.artwork_url ?? null,
        first_name: p.first_name,
        last_name: p.last_name,
        email: p.email,
        phone_number: p.phone_number,
        church: p.church,
      };
    });
    setBookings(rows);

    const { data: acts } = await supabase
      .from('activities')
      .select('id, name')
      .order('name');
    setActivities(acts || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    return bookings.filter((b) => {
      if (activityFilter !== 'all' && b.activity_id !== activityFilter) return false;
      if (statusFilter !== 'all' && b.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const fullName = `${b.first_name || ''} ${b.last_name || ''}`.toLowerCase();
        if (!fullName.includes(q) && !(b.email || '').toLowerCase().includes(q) && !(b.church || '').toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [bookings, activityFilter, statusFilter, search]);

  // Group by slot for cleaner overview
  const grouped = useMemo(() => {
    const map = new Map<string, { slot_id: string; slot_start: string; slot_area: string; slot_capacity: number; activity_name: string; activity_artwork: string | null; rows: BookingRow[] }>();
    filtered.forEach((b) => {
      if (!map.has(b.slot_id)) {
        map.set(b.slot_id, {
          slot_id: b.slot_id,
          slot_start: b.slot_start,
          slot_area: b.slot_area,
          slot_capacity: b.slot_capacity,
          activity_name: b.activity_name,
          activity_artwork: b.activity_artwork,
          rows: [],
        });
      }
      map.get(b.slot_id)!.rows.push(b);
    });
    return Array.from(map.values()).sort((a, b) => new Date(a.slot_start).getTime() - new Date(b.slot_start).getTime());
  }, [filtered]);

  const openMove = async (b: BookingRow) => {
    setMoving(b);
    setMoveTargetId('');
    // Fetch other future slots for the same activity
    const { data: slots } = await supabase
      .from('activity_slots')
      .select('id, start_time, area_name, activity_id, capacity, status, activities:activity_id (name)')
      .eq('activity_id', b.activity_id)
      .gt('start_time', new Date().toISOString())
      .order('start_time', { ascending: true });

    const slotsArr = (slots || []) as any[];
    // Booking counts for those slots
    const counts: Record<string, number> = {};
    await Promise.all(
      slotsArr.map(async (s) => {
        const { count } = await supabase
          .from('activity_bookings')
          .select('*', { count: 'exact', head: true })
          .eq('slot_id', s.id)
          .eq('status', 'confirmed');
        counts[s.id] = count || 0;
      })
    );
    setMoveOptions(
      slotsArr
        .filter((s) => s.id !== b.slot_id)
        .map((s) => ({
          id: s.id,
          start_time: s.start_time,
          area_name: s.area_name,
          activity_id: s.activity_id,
          activity_name: s.activities?.name || '',
          capacity: s.capacity,
          status: s.status,
          bookedCount: counts[s.id] || 0,
        }))
    );
  };

  const submitMove = async () => {
    if (!moving || !moveTargetId) return;
    setSubmittingMove(true);
    const { error } = await supabase
      .from('activity_bookings')
      .update({ slot_id: moveTargetId })
      .eq('id', moving.id);
    setSubmittingMove(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Booking moved');
    setMoving(null);
    load();
  };

  const setBookingStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('activity_bookings').update({ status }).eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success('Booking updated'); load(); }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Bookings</h1>
          <p className="text-sm text-muted-foreground mt-1">View, group, and manually arrange attendees across slots.</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <Label className="text-xs">Search</Label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Name, email, church..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
          <div>
            <Label className="text-xs">Activity</Label>
            <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={activityFilter} onChange={(e) => setActivityFilter(e.target.value)}>
              <option value="all">All activities</option>
              {activities.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div>
            <Label className="text-xs">Status</Label>
            <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All</option>
              <option value="confirmed">Confirmed</option>
              <option value="cancelled">Cancelled</option>
              <option value="waitlist">Waitlist</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : grouped.length === 0 ? (
          <p className="text-muted-foreground text-center py-12">No bookings match these filters.</p>
        ) : (
          <div className="space-y-5">
            {grouped.map((g) => (
              <div key={g.slot_id} className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="p-4 border-b border-border bg-muted/30 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    {g.activity_artwork ? (
                      <img src={g.activity_artwork} alt="" className="w-10 h-10 rounded-lg object-cover" />
                    ) : (
                      <span className="text-2xl" aria-hidden>✨</span>
                    )}
                    <div>
                      <p className="font-semibold">{g.activity_name} · {g.slot_area}</p>
                      <p className="text-sm text-muted-foreground">{formatSlotDate(g.slot_start)} · {formatSlotTime(g.slot_start)}</p>
                    </div>
                  </div>
                  <Badge variant="secondary">{g.rows.length}/{g.slot_capacity} booked</Badge>
                </div>
                <div className="divide-y divide-border">
                  {g.rows.map((b) => (
                    <div key={b.id} className="p-4 flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{b.first_name || '—'} {b.last_name || ''}</p>
                        <p className="text-xs text-muted-foreground truncate">{b.email}{b.phone_number ? ` · ${b.phone_number}` : ''}</p>
                        <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                          <Church className="w-3 h-3" />
                          <span>{b.church || 'No church set'}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={b.status === 'confirmed' ? 'default' : b.status === 'cancelled' ? 'destructive' : 'secondary'}>
                          {b.status}
                        </Badge>
                        <Button size="sm" variant="outline" onClick={() => openMove(b)}>
                          <Move className="w-3.5 h-3.5 mr-1" /> Move
                        </Button>
                        {b.status !== 'cancelled' ? (
                          <Button size="sm" variant="ghost" onClick={() => setCancelling(b)}>Cancel</Button>
                        ) : (
                          <Button size="sm" variant="ghost" onClick={() => setBookingStatus(b.id, 'confirmed')}>Reactivate</Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Move dialog */}
      <Dialog open={!!moving} onOpenChange={(o) => !o && setMoving(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move booking</DialogTitle>
          </DialogHeader>
          {moving && (
            <div className="space-y-4">
              <div className="text-sm">
                <p><span className="text-muted-foreground">Person:</span> {moving.first_name} {moving.last_name}</p>
                <p><span className="text-muted-foreground">From:</span> {formatSlotDate(moving.slot_start)} · {formatSlotTime(moving.slot_start)} · {moving.slot_area}</p>
              </div>
              <div>
                <Label>Move to slot</Label>
                {moveOptions.length === 0 ? (
                  <p className="text-sm text-muted-foreground mt-2">No other future slots for this activity.</p>
                ) : (
                  <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm mt-1" value={moveTargetId} onChange={(e) => setMoveTargetId(e.target.value)}>
                    <option value="">Select a slot...</option>
                    {moveOptions.map((s) => (
                      <option key={s.id} value={s.id} disabled={s.bookedCount >= s.capacity || s.status !== 'open'}>
                        {formatSlotDate(s.start_time)} · {formatSlotTime(s.start_time)} · {s.area_name} ({s.bookedCount}/{s.capacity}{s.status !== 'open' ? ` · ${s.status}` : ''})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoving(null)}>Cancel</Button>
            <Button onClick={submitMove} disabled={!moveTargetId || submittingMove}>
              {submittingMove ? 'Moving...' : 'Move booking'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminBookings;
