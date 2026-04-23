import { useEffect, useState, useCallback, DragEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { ArrowLeft, Loader2, Plus, Trash2, Users, GripVertical, Move, Church, Mail, Phone, CheckCircle2, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { ensureUserThreadAdmin, postSystemMessage } from '@/lib/chat';
import { formatSlotDate, formatSlotTime } from '@/lib/activities';

interface Slot {
  id: string;
  start_time: string;
  area_name: string;
  status: string;
  duration_minutes: number;
  activity_id: string;
  activity_name: string;
  groups_confirmed_at: string | null;
}

interface Group {
  id: string;
  name: string;
  display_order: number;
}

interface BookingRow {
  id: string;
  status: string;
  group_id: string | null;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone_number: string | null;
  church: string | null;
}

interface OtherSlot {
  id: string;
  start_time: string;
  area_name: string;
  bookedCount: number;
}

const AdminSlotManager = () => {
  const { slotId } = useParams<{ slotId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [slot, setSlot] = useState<Slot | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [newGroupName, setNewGroupName] = useState('');
  const [confirming, setConfirming] = useState(false);

  const [moving, setMoving] = useState<BookingRow | null>(null);
  const [otherSlots, setOtherSlots] = useState<OtherSlot[]>([]);
  const [moveTarget, setMoveTarget] = useState('');
  const [submittingMove, setSubmittingMove] = useState(false);

  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverGroup, setDragOverGroup] = useState<string | 'unassigned' | null>(null);

  const load = useCallback(async () => {
    if (!slotId) return;
    setLoading(true);

    const { data: slotData } = await supabase
      .from('activity_slots')
      .select('id, start_time, area_name, status, duration_minutes, activity_id, groups_confirmed_at, activities:activity_id (name)')
      .eq('id', slotId)
      .maybeSingle<any>();

    if (!slotData) {
      setSlot(null);
      setLoading(false);
      return;
    }

    setSlot({
      id: slotData.id,
      start_time: slotData.start_time,
      area_name: slotData.area_name,
      status: slotData.status,
      duration_minutes: slotData.duration_minutes,
      activity_id: slotData.activity_id,
      activity_name: slotData.activities?.name || 'Activity',
      groups_confirmed_at: slotData.groups_confirmed_at,
    });

    const [{ data: groupsData }, { data: bookingsData }] = await Promise.all([
      supabase.from('activity_groups').select('*').eq('slot_id', slotId).order('display_order'),
      supabase.from('activity_bookings').select('id, status, group_id, user_id').eq('slot_id', slotId),
    ]);

    setGroups(groupsData || []);

    const userIds = (bookingsData || []).map((b: any) => b.user_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email, phone_number, church')
      .in('id', userIds.length ? userIds : ['00000000-0000-0000-0000-000000000000']);
    const profileMap: Record<string, any> = {};
    (profiles || []).forEach((p: any) => { profileMap[p.id] = p; });

    setBookings(
      (bookingsData || []).map((b: any) => {
        const p = profileMap[b.user_id] || {};
        return {
          id: b.id,
          status: b.status,
          group_id: b.group_id,
          user_id: b.user_id,
          first_name: p.first_name,
          last_name: p.last_name,
          email: p.email,
          phone_number: p.phone_number,
          church: p.church,
        };
      })
    );
    setLoading(false);
  }, [slotId]);

  useEffect(() => { load(); }, [load]);

  const addGroup = async () => {
    if (!slotId) return;
    const name = newGroupName.trim() || `Group ${String.fromCharCode(65 + groups.length)}`;
    const { error } = await supabase.from('activity_groups').insert({
      slot_id: slotId,
      name,
      display_order: groups.length,
    });
    if (error) toast.error(error.message);
    else { setNewGroupName(''); load(); }
  };

  const renameGroup = async (g: Group, name: string) => {
    if (!name.trim() || name === g.name) return;
    const { error } = await supabase.from('activity_groups').update({ name: name.trim() }).eq('id', g.id);
    if (error) toast.error(error.message);
    else load();
  };

  const removeGroup = async (g: Group) => {
    if (!confirm(`Delete ${g.name}? Members will become unassigned.`)) return;
    await supabase.from('activity_bookings').update({ group_id: null }).eq('group_id', g.id);
    const { error } = await supabase.from('activity_groups').delete().eq('id', g.id);
    if (error) toast.error(error.message);
    else load();
  };

  const assignToGroup = async (bookingId: string, groupId: string | null) => {
    setBookings((prev) => prev.map((b) => (b.id === bookingId ? { ...b, group_id: groupId } : b)));
    const { error } = await supabase.from('activity_bookings').update({ group_id: groupId }).eq('id', bookingId);
    if (error) {
      toast.error(error.message);
      load();
    }
  };

  const onDragStart = (id: string) => setDragId(id);
  const onDragEnd = () => { setDragId(null); setDragOverGroup(null); };
  const onDragOver = (e: DragEvent, target: string | 'unassigned') => {
    e.preventDefault();
    setDragOverGroup(target);
  };
  const onDrop = (e: DragEvent, target: string | 'unassigned') => {
    e.preventDefault();
    if (!dragId) return;
    assignToGroup(dragId, target === 'unassigned' ? null : target);
    onDragEnd();
  };

  const openMoveSlot = async (b: BookingRow) => {
    if (!slot) return;
    setMoving(b);
    setMoveTarget('');
    const { data } = await supabase
      .from('activity_slots')
      .select('id, start_time, area_name')
      .eq('activity_id', slot.activity_id)
      .neq('id', slot.id)
      .gt('start_time', new Date().toISOString())
      .eq('status', 'open')
      .order('start_time', { ascending: true });

    const arr = (data || []) as any[];
    const counts: Record<string, number> = {};
    await Promise.all(arr.map(async (s) => {
      const { count } = await supabase
        .from('activity_bookings')
        .select('*', { count: 'exact', head: true })
        .eq('slot_id', s.id)
        .eq('status', 'confirmed');
      counts[s.id] = count || 0;
    }));
    setOtherSlots(arr.map((s) => ({
      id: s.id,
      start_time: s.start_time,
      area_name: s.area_name,
      bookedCount: counts[s.id] || 0,
    })));
  };

  const submitMoveSlot = async () => {
    if (!moving || !moveTarget) return;
    setSubmittingMove(true);
    const { error } = await supabase
      .from('activity_bookings')
      .update({ slot_id: moveTarget, group_id: null })
      .eq('id', moving.id);
    setSubmittingMove(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Moved to other slot');
    setMoving(null);
    load();
  };

  const cancelBooking = async (id: string) => {
    if (!confirm('Cancel this booking?')) return;
    const { error } = await supabase.from('activity_bookings').update({ status: 'cancelled', group_id: null }).eq('id', id);
    if (error) toast.error(error.message);
    else load();
  };

  if (loading) {
    return <AdminLayout><div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin" /></div></AdminLayout>;
  }
  if (!slot) {
    return <AdminLayout><p>Slot not found.</p></AdminLayout>;
  }

  const confirmedBookings = bookings.filter((b) => b.status === 'confirmed');
  const unassigned = confirmedBookings.filter((b) => !b.group_id);

  const renderBookingCard = (b: BookingRow) => (
    <div
      key={b.id}
      draggable
      onDragStart={() => onDragStart(b.id)}
      onDragEnd={onDragEnd}
      className={`group flex items-center gap-2 bg-background border border-border rounded-lg p-2.5 cursor-move hover:border-primary/50 transition-colors ${
        dragId === b.id ? 'opacity-40' : ''
      }`}
    >
      <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="font-medium text-sm truncate">{b.first_name || '—'} {b.last_name || ''}</p>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground truncate">
          {b.church && <span className="flex items-center gap-1"><Church className="w-3 h-3" /> {b.church}</span>}
          {b.phone_number && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {b.phone_number}</span>}
        </div>
      </div>
      <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100 transition-opacity h-7 px-2" onClick={() => openMoveSlot(b)}>
        <Move className="w-3 h-3 mr-1" /> Move slot
      </Button>
      <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100 transition-opacity h-7 px-2 text-destructive hover:text-destructive" onClick={() => cancelBooking(b.id)}>
        <Trash2 className="w-3 h-3" />
      </Button>
    </div>
  );

  return (
    <AdminLayout>
      <div className="flex items-center gap-3 mb-2">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/activities/${slot.activity_id}`)}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to {slot.activity_name}
        </Button>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold">{slot.activity_name} · {slot.area_name}</h1>
        <p className="text-muted-foreground">{formatSlotDate(slot.start_time)} · {formatSlotTime(slot.start_time)} · {slot.duration_minutes} min</p>
        <p className="text-sm text-muted-foreground mt-1">
          <Users className="w-3.5 h-3.5 inline mr-1" />
          {confirmedBookings.length} confirmed · drag people into groups (typical sizes 6–8). Create as many groups as you need.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        <div
          onDragOver={(e) => onDragOver(e, 'unassigned')}
          onDrop={(e) => onDrop(e, 'unassigned')}
          className={`bg-card border-2 ${dragOverGroup === 'unassigned' ? 'border-primary' : 'border-dashed border-border'} rounded-xl p-3 transition-colors`}
        >
          <div className="flex items-center justify-between mb-3">
            <p className="font-semibold text-sm">Unassigned</p>
            <Badge variant="secondary">{unassigned.length}</Badge>
          </div>
          <div className="space-y-2">
            {unassigned.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Everyone is in a group 🎉</p>
            ) : (
              unassigned.map(renderBookingCard)
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {groups.map((g) => {
              const members = confirmedBookings.filter((b) => b.group_id === g.id);
              return (
                <div
                  key={g.id}
                  onDragOver={(e) => onDragOver(e, g.id)}
                  onDrop={(e) => onDrop(e, g.id)}
                  className={`bg-card border-2 ${dragOverGroup === g.id ? 'border-primary' : 'border-border'} rounded-xl p-3 transition-colors min-h-[200px]`}
                >
                  <div className="flex items-center justify-between mb-3 gap-2">
                    <Input
                      defaultValue={g.name}
                      onBlur={(e) => renameGroup(g, e.target.value)}
                      className="h-8 text-sm font-semibold border-transparent hover:border-border focus:border-input px-2"
                    />
                    <Badge variant={members.length >= 6 && members.length <= 8 ? 'default' : 'secondary'}>
                      {members.length}
                    </Badge>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removeGroup(g)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {members.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-6 border border-dashed border-border rounded-lg">
                        Drop people here
                      </p>
                    ) : (
                      members.map(renderBookingCard)
                    )}
                  </div>
                </div>
              );
            })}

            <div className="border-2 border-dashed border-border rounded-xl p-3 flex flex-col items-center justify-center min-h-[200px] gap-3">
              <Input
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder={`Group ${String.fromCharCode(65 + groups.length)}`}
                className="text-center"
              />
              <Button onClick={addGroup} variant="outline" size="sm">
                <Plus className="w-4 h-4 mr-1" /> Add group
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={!!moving} onOpenChange={(o) => !o && setMoving(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move to a different slot</DialogTitle>
          </DialogHeader>
          {moving && (
            <div className="space-y-4">
              <div className="text-sm">
                <p><span className="text-muted-foreground">Person:</span> {moving.first_name} {moving.last_name}</p>
                <p><span className="text-muted-foreground">From:</span> {formatSlotDate(slot.start_time)} · {formatSlotTime(slot.start_time)} · {slot.area_name}</p>
              </div>
              <div>
                <Label>Move to</Label>
                {otherSlots.length === 0 ? (
                  <p className="text-sm text-muted-foreground mt-2">No other open future slots for this activity.</p>
                ) : (
                  <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm mt-1" value={moveTarget} onChange={(e) => setMoveTarget(e.target.value)}>
                    <option value="">Select a slot...</option>
                    {otherSlots.map((s) => (
                      <option key={s.id} value={s.id}>
                        {formatSlotDate(s.start_time)} · {formatSlotTime(s.start_time)} · {s.area_name} ({s.bookedCount} booked)
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoving(null)}>Cancel</Button>
            <Button onClick={submitMoveSlot} disabled={!moveTarget || submittingMove}>
              {submittingMove ? 'Moving...' : 'Move'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminSlotManager;
