import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { UserX, FileDown, ChevronRight, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface AdminUser {
  id: string;
  user_id: string;
  role: 'super_admin' | 'event_host';
  email: string;
}

interface AdminInvite {
  id: string;
  email: string;
  role: 'super_admin' | 'event_host';
}

export default function AdminSettings() {
  const { user, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [invites, setInvites] = useState<AdminInvite[]>([]);
  const [loading, setLoading] = useState(false);
  const [approvalRequired, setApprovalRequired] = useState(true);
  const [revealLocationAfterApproval, setRevealLocationAfterApproval] = useState(true);

  useEffect(() => {
    fetchAdmins();
    fetchInvites();
  }, []);

  const fetchAdmins = async () => {
    const { data: roles } = await supabase
      .from('user_roles')
      .select('id, user_id, role')
      .in('role', ['super_admin', 'event_host']);

    if (roles) {
      // Fetch profile emails for each admin
      const adminUsers: AdminUser[] = [];
      for (const role of roles) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', role.user_id)
          .maybeSingle();

        adminUsers.push({
          id: role.id,
          user_id: role.user_id,
          role: role.role as 'super_admin' | 'event_host',
          email: profile?.email || 'Unknown'
        });
      }
      setAdmins(adminUsers);
    }
  };

  const fetchInvites = async () => {
    const { data } = await supabase
      .from('admin_invites')
      .select('id, email, role');

    if (data) {
      setInvites(data as AdminInvite[]);
    }
  };

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleAddAdmin = async () => {
    if (!email.trim()) {
      setEmailError('Email is required');
      return;
    }

    if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setEmailError('');

    try {
      const { error } = await supabase
        .from('admin_invites')
        .insert({
          email: email.toLowerCase().trim(),
          role: 'event_host',
          invited_by: user?.id
        });

      if (error) {
        if (error.code === '23505') {
          toast.error('This email has already been invited');
        } else {
          throw error;
        }
      } else {
        toast.success('Admin added');
        setEmail('');
        fetchInvites();
      }
    } catch (error) {
      console.error('Error adding admin:', error);
      toast.error('Failed to add admin');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveAdmin = async (adminId: string, userId: string) => {
    if (userId === user?.id) {
      toast.error('You cannot remove yourself');
      return;
    }

    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('id', adminId);

      if (error) throw error;

      toast.success('Admin removed');
      fetchAdmins();
    } catch (error) {
      console.error('Error removing admin:', error);
      toast.error('Failed to remove admin');
    }
  };

  const handleRemoveInvite = async (inviteId: string) => {
    try {
      const { error } = await supabase
        .from('admin_invites')
        .delete()
        .eq('id', inviteId);

      if (error) throw error;

      toast.success('Invite removed');
      fetchInvites();
    } catch (error) {
      console.error('Error removing invite:', error);
      toast.error('Failed to remove invite');
    }
  };

  const moderationItems = [
    { label: 'Blocked users', action: () => navigate('/admin/users?filter=blocked') },
    { label: 'User exports (CSV)', action: () => toast.info('Export feature coming soon') },
    { label: 'Event exports (CSV)', action: () => toast.info('Export feature coming soon') },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-2xl font-semibold">Admin & Team</h1>
          <p className="text-muted-foreground mt-1">Manage admins and app settings</p>
        </div>

        {/* Invite an Admin */}
        {isSuperAdmin && (
          <Card>
            <CardHeader>
              <CardTitle>Invite an Admin</CardTitle>
              <CardDescription>Add a new admin by email address</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="admin-email">Add admin by email</Label>
                <div className="flex gap-2">
                  <Input
                    id="admin-email"
                    type="email"
                    placeholder="name@email.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setEmailError('');
                    }}
                    className={emailError ? 'border-destructive' : ''}
                  />
                  <Button
                    onClick={handleAddAdmin}
                    disabled={loading}
                    className="bg-primary hover:bg-primary/90"
                  >
                    Add Admin
                  </Button>
                </div>
                {emailError && (
                  <p className="text-sm text-destructive">{emailError}</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Admin List */}
        <Card>
          <CardHeader>
            <CardTitle>Admin List</CardTitle>
            <CardDescription>Current admins with access to the dashboard</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {admins.map((admin) => (
                <div
                  key={admin.id}
                  className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-foreground">{admin.email}</p>
                    <p className="text-sm text-muted-foreground">
                      {admin.role === 'super_admin' ? 'Super Admin' : 'Event Host'} • Active
                    </p>
                  </div>
                  {isSuperAdmin && admin.user_id !== user?.id && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveAdmin(admin.id, admin.user_id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                  {admin.user_id === user?.id && (
                    <span className="text-xs text-muted-foreground">(You)</span>
                  )}
                </div>
              ))}

              {/* Pending Invites */}
              {invites.length > 0 && (
                <>
                  <div className="pt-2 pb-1">
                    <p className="text-sm font-medium text-muted-foreground">Pending Invites</p>
                  </div>
                  {invites.map((invite) => (
                    <div
                      key={invite.id}
                      className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg opacity-70"
                    >
                      <div>
                        <p className="font-medium text-foreground">{invite.email}</p>
                        <p className="text-sm text-muted-foreground">
                          {invite.role === 'super_admin' ? 'Super Admin' : 'Event Host'} • Pending
                        </p>
                      </div>
                      {isSuperAdmin && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveInvite(invite.id)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </>
              )}

              {admins.length === 0 && invites.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No admins found
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Moderation Shortcuts */}
        <Card>
          <CardHeader>
            <CardTitle>Moderation</CardTitle>
            <CardDescription>Quick access to moderation tools</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {moderationItems.map((item, index) => (
              <button
                key={item.label}
                onClick={item.action}
                className={`w-full flex items-center justify-between px-6 py-4 text-left hover:bg-secondary/50 transition-colors ${
                  index !== moderationItems.length - 1 ? 'border-b border-border' : ''
                }`}
              >
                <span className="font-medium text-foreground">{item.label}</span>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Event Defaults */}
        <Card>
          <CardHeader>
            <CardTitle>Event Defaults</CardTitle>
            <CardDescription>Default settings for new events</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Default city</p>
                <p className="text-sm text-muted-foreground">Singapore</p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="approval-toggle" className="font-medium">Approval required</Label>
                <p className="text-sm text-muted-foreground">Require approval for event signups</p>
              </div>
              <Switch
                id="approval-toggle"
                checked={approvalRequired}
                onCheckedChange={setApprovalRequired}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="location-toggle" className="font-medium">Reveal location after approval</Label>
                <p className="text-sm text-muted-foreground">Only show exact location to approved participants</p>
              </div>
              <Switch
                id="location-toggle"
                checked={revealLocationAfterApproval}
                onCheckedChange={setRevealLocationAfterApproval}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
