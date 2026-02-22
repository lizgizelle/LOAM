import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Upload, Image as ImageIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export default function AdminEventCreate() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    cover_image_url: '',
    location: '',
    hide_location_until_approved: true,
    start_date: '',
    start_time: '',
    end_date: '',
    end_time: '',
    requires_approval: true,
    is_unlimited_capacity: true,
    capacity: '',
    visibility: 'public',
    status: 'draft',
    show_participants: false,
    ticket_price: '',
    currency: 'SGD',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.start_date || !formData.start_time) {
      toast.error('Please fill in required fields');
      return;
    }

    setLoading(true);

    try {
      const startDate = new Date(`${formData.start_date}T${formData.start_time}`);
      let endDate = null;
      if (formData.end_date && formData.end_time) {
        endDate = new Date(`${formData.end_date}T${formData.end_time}`);
      }

      const { error } = await supabase.from('events').insert({
        name: formData.name,
        description: formData.description || null,
        cover_image_url: formData.cover_image_url || null,
        location: formData.location || null,
        hide_location_until_approved: formData.hide_location_until_approved,
        start_date: startDate.toISOString(),
        end_date: endDate?.toISOString() || null,
        requires_approval: formData.requires_approval,
        is_unlimited_capacity: formData.is_unlimited_capacity,
        capacity: formData.is_unlimited_capacity ? null : parseInt(formData.capacity) || null,
        visibility: formData.visibility,
        status: formData.status,
        host_id: user?.id,
        show_participants: formData.show_participants,
        ticket_price: formData.ticket_price ? parseFloat(formData.ticket_price) : null,
        currency: formData.currency,
      });

      if (error) throw error;

      toast.success('Event created successfully');
      navigate('/admin/events');
    } catch (error) {
      console.error('Error creating event:', error);
      toast.error('Failed to create event');
    } finally {
      setLoading(false);
    }
  };

  const updateForm = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <AdminLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/events')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">Create Event</h1>
            <p className="text-muted-foreground mt-1">Add a new event to your platform</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Cover Image */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cover Image</CardTitle>
            </CardHeader>
            <CardContent>
              {formData.cover_image_url ? (
                <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
                  <img
                    src={formData.cover_image_url}
                    alt="Cover"
                    className="w-full h-full object-cover"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="absolute bottom-3 right-3"
                    onClick={() => updateForm('cover_image_url', '')}
                  >
                    Remove
                  </Button>
                </div>
              ) : (
                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <ImageIcon className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">
                    No cover image set
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Event Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Event Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Event Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => updateForm('name', e.target.value)}
                  placeholder="e.g., Coffee & Conversations"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Start Date *</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => updateForm('start_date', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="start_time">Start Time *</Label>
                  <Input
                    id="start_time"
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => updateForm('start_time', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="end_date">End Date</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => updateForm('end_date', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_time">End Time</Label>
                  <Input
                    id="end_time"
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => updateForm('end_time', e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => updateForm('location', e.target.value)}
                  placeholder="e.g., Secret location (shared after approval)"
                />
              </div>

              <div className="flex items-center gap-3 pl-1">
                <Switch
                  id="hide_location"
                  checked={formData.hide_location_until_approved}
                  onCheckedChange={(checked) => updateForm('hide_location_until_approved', checked)}
                />
                <Label htmlFor="hide_location" className="text-sm font-normal cursor-pointer">
                  Location will be shared only after participants are approved
                </Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => updateForm('description', e.target.value)}
                  placeholder="What this event is about, who it's for, what to expect..."
                  rows={5}
                />
              </div>
            </CardContent>
          </Card>

          {/* Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Approval Required</Label>
                  <p className="text-sm text-muted-foreground">
                    Users must be approved before attending
                  </p>
                </div>
                <Switch
                  checked={formData.requires_approval}
                  onCheckedChange={(checked) => updateForm('requires_approval', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Unlimited Capacity</Label>
                  <p className="text-sm text-muted-foreground">
                    No limit on number of attendees
                  </p>
                </div>
                <Switch
                  checked={formData.is_unlimited_capacity}
                  onCheckedChange={(checked) => updateForm('is_unlimited_capacity', checked)}
                />
              </div>

              {!formData.is_unlimited_capacity && (
                <div className="space-y-2">
                  <Label htmlFor="capacity">Maximum Capacity</Label>
                  <Input
                    id="capacity"
                    type="number"
                    min="1"
                    value={formData.capacity}
                    onChange={(e) => updateForm('capacity', e.target.value)}
                    placeholder="e.g., 20"
                  />
                </div>
              )}

              <div className="flex items-center justify-between">
                <div>
                  <Label>Show Participants</Label>
                  <p className="text-sm text-muted-foreground">
                    {formData.show_participants 
                      ? 'Users can see who else is attending' 
                      : 'Participant list is hidden from attendees'}
                  </p>
                </div>
                <Switch
                  checked={formData.show_participants}
                  onCheckedChange={(checked) => updateForm('show_participants', checked)}
                />
              </div>

              <div className="space-y-2">
                <Label>Visibility</Label>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant={formData.visibility === 'public' ? 'default' : 'outline'}
                    onClick={() => updateForm('visibility', 'public')}
                    size="sm"
                  >
                    Public
                  </Button>
                  <Button
                    type="button"
                    variant={formData.visibility === 'hidden' ? 'default' : 'outline'}
                    onClick={() => updateForm('visibility', 'hidden')}
                    size="sm"
                  >
                    Hidden
                  </Button>
                </div>
              </div>

              {/* Ticket Pricing */}
              <div className="space-y-2">
                <Label htmlFor="ticket_price">Ticket Price</Label>
                <div className="flex gap-2">
                  <select
                    className="border border-input rounded-md px-3 py-2 text-sm bg-background"
                    value={formData.currency}
                    onChange={(e) => updateForm('currency', e.target.value)}
                  >
                    <option value="SGD">SGD</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                  </select>
                  <Input
                    id="ticket_price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.ticket_price}
                    onChange={(e) => updateForm('ticket_price', e.target.value)}
                    placeholder="0 = Free"
                    className="flex-1"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Leave empty or 0 for free events</p>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant={formData.status === 'draft' ? 'default' : 'outline'}
                    onClick={() => updateForm('status', 'draft')}
                    size="sm"
                  >
                    Draft
                  </Button>
                  <Button
                    type="button"
                    variant={formData.status === 'published' ? 'default' : 'outline'}
                    onClick={() => updateForm('status', 'published')}
                    size="sm"
                  >
                    Published
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button type="button" variant="outline" className="flex-1" onClick={() => navigate('/admin/events')}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? 'Creating...' : 'Create Event'}
            </Button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}
