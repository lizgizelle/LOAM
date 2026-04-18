import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Plus, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';

interface Activity {
  id: string;
  name: string;
  description: string | null;
  cover_image_url: string | null;
  icon_emoji: string | null;
  is_active: boolean;
  display_order: number;
}

const AdminActivities = () => {
  const navigate = useNavigate();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', icon_emoji: '✨', cover_image_url: '' });

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('activities')
      .select('*')
      .order('display_order', { ascending: true });
    setActivities(data || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    if (!form.name.trim()) {
      toast.error('Name is required');
      return;
    }
    setCreating(true);
    const { data, error } = await supabase
      .from('activities')
      .insert({
        name: form.name.trim(),
        description: form.description.trim() || null,
        icon_emoji: form.icon_emoji || '✨',
        cover_image_url: form.cover_image_url.trim() || null,
        display_order: activities.length + 1,
      })
      .select()
      .single();
    setCreating(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Activity created');
    setOpen(false);
    setForm({ name: '', description: '', icon_emoji: '✨', cover_image_url: '' });
    if (data) navigate(`/admin/activities/${data.id}`);
  };

  const toggleActive = async (a: Activity) => {
    const { error } = await supabase
      .from('activities')
      .update({ is_active: !a.is_active })
      .eq('id', a.id);
    if (error) toast.error(error.message);
    else load();
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Activities</h1>
          <p className="text-sm text-muted-foreground">Manage small group activities (Climbing, Bowling, etc.)</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" /> New activity</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create activity</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Yoga in the park" />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What is this activity about?" rows={4} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Icon (emoji)</Label>
                  <Input value={form.icon_emoji} onChange={(e) => setForm({ ...form, icon_emoji: e.target.value })} placeholder="✨" maxLength={4} />
                </div>
                <div>
                  <Label>Cover image URL (optional)</Label>
                  <Input value={form.cover_image_url} onChange={(e) => setForm({ ...form, cover_image_url: e.target.value })} placeholder="https://..." />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={create} disabled={creating}>{creating ? 'Creating...' : 'Create'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : activities.length === 0 ? (
        <p className="text-muted-foreground">No activities yet. Create one above.</p>
      ) : (
        <div className="space-y-3">
          {activities.map((a) => (
            <div key={a.id} className="bg-card border border-border rounded-lg p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-2xl">
                {a.icon_emoji || '✨'}
              </div>
              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/admin/activities/${a.id}`)}>
                <p className="font-semibold">{a.name}</p>
                <p className="text-sm text-muted-foreground line-clamp-1">{a.description || '—'}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{a.is_active ? 'Active' : 'Hidden'}</span>
                <Switch checked={a.is_active} onCheckedChange={() => toggleActive(a)} />
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate(`/admin/activities/${a.id}`)}>Manage</Button>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminActivities;
