import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Plus, Trash2, Calendar, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { DAYS_OF_WEEK, SG_AREAS, formatSlotDate, formatSlotTime } from '@/lib/activities';

interface Activity {
  id: string;
  name: string;
  description: string | null;
  cover_image_url: string | null;
  icon_emoji: string | null;
  is_active: boolean;
}

const AdminActivityDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [areas, setAreas] = useState<{ id: string; area_name: string; is_active: boolean }[]>([]);
  const [rules, setRules] = useState<{ id: string; day_of_week: number; start_time: string; duration_minutes: number; capacity: number; is_active: boolean }[]>([]);
  const [slots, setSlots] = useState<any[]>([]);
  const [bookingCounts, setBookingCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [newRule, setNewRule] = useState({ day_of_week: 3, start_time: '19:30', duration_minutes: 90, capacity: 6 });
  const [newArea, setNewArea] = useState('');
  const [generateWeeks, setGenerateWeeks] = useState(8);
  const [generating, setGenerating] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const [aRes, areaRes, ruleRes, slotRes] = await Promise.all([
      supabase.from('activities').select('*').eq('id', id).maybeSingle(),
      supabase.from('activity_areas').select('id, area_name, is_active').eq('activity_id', id).order('area_name'),
      supabase.from('activity_schedule_rules').select('*').eq('activity_id', id).order('day_of_week'),
      supabase.from('activity_slots').select('*').eq('activity_id', id).order('start_time', { ascending: true }).limit(100),
    ]);
    setActivity(aRes.data);
    setAreas(areaRes.data || []);
    setRules(ruleRes.data || []);
    setSlots(slotRes.data || []);

    if (slotRes.data && slotRes.data.length > 0) {
      const counts: Record<string, number> = {};
      await Promise.all(
        slotRes.data.map(async (s: any) => {
          const { count } = await supabase
            .from('activity_bookings')
            .select('*', { count: 'exact', head: true })
            .eq('slot_id', s.id)
            .eq('status', 'confirmed');
          counts[s.id] = count || 0;
        })
      );
      setBookingCounts(counts);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const saveActivity = async () => {
    if (!activity) return;
    setSaving(true);
    const { error } = await supabase
      .from('activities')
      .update({
        name: activity.name,
        description: activity.description,
        icon_emoji: activity.icon_emoji,
        cover_image_url: activity.cover_image_url,
        is_active: activity.is_active,
      })
      .eq('id', activity.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success('Activity saved');
  };

  const addArea = async (name: string) => {
    if (!id || !name.trim()) return;
    const { error } = await supabase.from('activity_areas').insert({ activity_id: id, area_name: name.trim() });
    if (error) toast.error(error.message);
    else { toast.success('Area added'); setNewArea(''); load(); }
  };
  const removeArea = async (areaId: string) => {
    const { error } = await supabase.from('activity_areas').delete().eq('id', areaId);
    if (error) toast.error(error.message);
    else load();
  };

  const addRule = async () => {
    if (!id) return;
    const { error } = await supabase.from('activity_schedule_rules').insert({ activity_id: id, ...newRule });
    if (error) toast.error(error.message);
    else { toast.success('Schedule rule added'); load(); }
  };
  const removeRule = async (ruleId: string) => {
    const { error } = await supabase.from('activity_schedule_rules').delete().eq('id', ruleId);
    if (error) toast.error(error.message);
    else load();
  };

  // Generate concrete dated slots from active rules + active areas, for the next N weeks
  const generateSlots = async () => {
    if (!id) return;
    if (rules.length === 0 || areas.length === 0) {
      toast.error('Add at least one schedule rule and one area first.');
      return;
    }
    setGenerating(true);
    const activeRules = rules.filter((r) => r.is_active);
    const activeAreas = areas.filter((a) => a.is_active);
    const newRows: any[] = [];
    const now = new Date();
    const end = new Date();
    end.setDate(end.getDate() + generateWeeks * 7);

    for (let d = new Date(now); d <= end; d.setDate(d.getDate() + 1)) {
      const dow = d.getDay();
      for (const rule of activeRules) {
        if (rule.day_of_week !== dow) continue;
        const [hh, mm] = rule.start_time.split(':').map(Number);
        const slotDate = new Date(d);
        slotDate.setHours(hh, mm, 0, 0);
        if (slotDate <= now) continue;
        for (const area of activeAreas) {
          newRows.push({
            activity_id: id,
            area_name: area.area_name,
            start_time: slotDate.toISOString(),
            duration_minutes: rule.duration_minutes,
            capacity: rule.capacity,
            status: 'open',
          });
        }
      }
    }

    if (newRows.length === 0) {
      setGenerating(false);
      toast.info('No slots to generate in the selected window.');
      return;
    }

    // Insert with onConflict (unique on activity_id+area_name+start_time)
    const { error } = await supabase.from('activity_slots').upsert(newRows, {
      onConflict: 'activity_id,area_name,start_time',
      ignoreDuplicates: true,
    });
    setGenerating(false);
    if (error) toast.error(error.message);
    else { toast.success(`Generated up to ${newRows.length} slots`); load(); }
  };

  const cancelSlot = async (slotId: string) => {
    if (!confirm('Cancel this slot? Bookings will remain but admins should follow up.')) return;
    const { error } = await supabase.from('activity_slots').update({ status: 'cancelled' }).eq('id', slotId);
    if (error) toast.error(error.message);
    else load();
  };
  const deleteSlot = async (slotId: string) => {
    if (!confirm('Delete this slot? This will also delete its bookings.')) return;
    const { error } = await supabase.from('activity_slots').delete().eq('id', slotId);
    if (error) toast.error(error.message);
    else load();
  };

  if (loading) {
    return <AdminLayout><div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin" /></div></AdminLayout>;
  }
  if (!activity) {
    return <AdminLayout><p>Activity not found.</p></AdminLayout>;
  }

  const upcomingSlots = slots.filter((s) => new Date(s.start_time) > new Date());

  return (
    <AdminLayout>
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/admin/activities')}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <h1 className="text-2xl font-bold">{activity.name}</h1>
      </div>

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="areas">Areas ({areas.length})</TabsTrigger>
          <TabsTrigger value="schedule">Schedule ({rules.length})</TabsTrigger>
          <TabsTrigger value="slots">Slots ({upcomingSlots.length} upcoming)</TabsTrigger>
        </TabsList>

        {/* Details */}
        <TabsContent value="details" className="space-y-4 max-w-xl">
          <div>
            <Label>Name</Label>
            <Input value={activity.name} onChange={(e) => setActivity({ ...activity, name: e.target.value })} />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea rows={5} value={activity.description || ''} onChange={(e) => setActivity({ ...activity, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Icon emoji</Label>
              <Input value={activity.icon_emoji || ''} onChange={(e) => setActivity({ ...activity, icon_emoji: e.target.value })} maxLength={4} />
            </div>
            <div>
              <Label>Cover image URL</Label>
              <Input value={activity.cover_image_url || ''} onChange={(e) => setActivity({ ...activity, cover_image_url: e.target.value })} />
            </div>
          </div>
          <div className="flex items-center justify-between p-4 border border-border rounded-lg">
            <div>
              <p className="font-medium">Active</p>
              <p className="text-sm text-muted-foreground">When off, users won't see this activity.</p>
            </div>
            <Switch checked={activity.is_active} onCheckedChange={(v) => setActivity({ ...activity, is_active: v })} />
          </div>
          <Button onClick={saveActivity} disabled={saving}>{saving ? 'Saving...' : 'Save changes'}</Button>
        </TabsContent>

        {/* Areas */}
        <TabsContent value="areas" className="space-y-4 max-w-xl">
          <p className="text-sm text-muted-foreground">Singapore areas where this activity is offered. Users can only book slots in these areas.</p>
          <div className="space-y-2">
            {areas.map((a) => (
              <div key={a.id} className="flex items-center justify-between bg-card border border-border rounded-lg p-3">
                <span className="font-medium">{a.area_name}</span>
                <Button variant="ghost" size="icon" onClick={() => removeArea(a.id)}><Trash2 className="w-4 h-4" /></Button>
              </div>
            ))}
          </div>
          <div className="border border-dashed border-border rounded-lg p-4 space-y-3">
            <Label>Add area</Label>
            <div className="flex flex-wrap gap-2">
              {SG_AREAS.filter((sa) => !areas.find((a) => a.area_name === sa)).map((sa) => (
                <Button key={sa} size="sm" variant="outline" onClick={() => addArea(sa)}>+ {sa}</Button>
              ))}
            </div>
            <div className="flex gap-2">
              <Input placeholder="Or type a custom area" value={newArea} onChange={(e) => setNewArea(e.target.value)} />
              <Button onClick={() => addArea(newArea)}>Add</Button>
            </div>
          </div>
        </TabsContent>

        {/* Schedule */}
        <TabsContent value="schedule" className="space-y-4 max-w-2xl">
          <p className="text-sm text-muted-foreground">Recurring weekly slots. e.g. "Every Wednesday at 7:30pm". Slots are generated from these rules.</p>
          <div className="space-y-2">
            {rules.length === 0 && <p className="text-sm text-muted-foreground">No schedule rules yet.</p>}
            {rules.map((r) => (
              <div key={r.id} className="flex items-center justify-between bg-card border border-border rounded-lg p-3">
                <div>
                  <p className="font-medium">{DAYS_OF_WEEK[r.day_of_week].label} at {r.start_time.slice(0, 5)}</p>
                  <p className="text-sm text-muted-foreground">{r.duration_minutes} min · capacity {r.capacity}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => removeRule(r.id)}><Trash2 className="w-4 h-4" /></Button>
              </div>
            ))}
          </div>
          <div className="border border-dashed border-border rounded-lg p-4 space-y-3">
            <Label>Add a recurring slot</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <Label className="text-xs">Day</Label>
                <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={newRule.day_of_week} onChange={(e) => setNewRule({ ...newRule, day_of_week: Number(e.target.value) })}>
                  {DAYS_OF_WEEK.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-xs">Time</Label>
                <Input type="time" value={newRule.start_time} onChange={(e) => setNewRule({ ...newRule, start_time: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Duration (min)</Label>
                <Input type="number" min={15} value={newRule.duration_minutes} onChange={(e) => setNewRule({ ...newRule, duration_minutes: Number(e.target.value) })} />
              </div>
              <div>
                <Label className="text-xs">Capacity</Label>
                <Input type="number" min={1} value={newRule.capacity} onChange={(e) => setNewRule({ ...newRule, capacity: Number(e.target.value) })} />
              </div>
            </div>
            <Button onClick={addRule}><Plus className="w-4 h-4 mr-1" /> Add rule</Button>
          </div>

          <div className="border border-border rounded-lg p-4 bg-secondary/20 space-y-3">
            <div>
              <p className="font-medium flex items-center gap-2"><Calendar className="w-4 h-4" /> Generate slots</p>
              <p className="text-sm text-muted-foreground">Create concrete dated slots for the next N weeks based on the rules above. Safe to re-run — duplicates are skipped.</p>
            </div>
            <div className="flex items-end gap-3">
              <div>
                <Label className="text-xs">Weeks ahead</Label>
                <Input type="number" min={1} max={26} value={generateWeeks} onChange={(e) => setGenerateWeeks(Number(e.target.value))} className="w-32" />
              </div>
              <Button onClick={generateSlots} disabled={generating}>
                {generating ? 'Generating...' : 'Generate slots'}
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Slots */}
        <TabsContent value="slots" className="space-y-3">
          <p className="text-sm text-muted-foreground">All upcoming dated slots, with bookings.</p>
          {upcomingSlots.length === 0 ? (
            <p className="text-muted-foreground">No upcoming slots. Add areas + rules, then click "Generate slots" in the Schedule tab.</p>
          ) : (
            <div className="space-y-2">
              {upcomingSlots.map((s) => (
                <div key={s.id} className="bg-card border border-border rounded-lg p-3 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{formatSlotDate(s.start_time)} · {formatSlotTime(s.start_time)}</p>
                    <p className="text-sm text-muted-foreground">{s.area_name} · {bookingCounts[s.id] || 0}/{s.capacity} booked · {s.status}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => cancelSlot(s.id)} disabled={s.status === 'cancelled'}>Cancel</Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteSlot(s.id)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
};

export default AdminActivityDetail;
