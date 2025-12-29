import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { getDefaultAvatar } from '@/lib/avatars';
import { useAuth } from '@/hooks/useAuth';

interface UserProfile {
  id: string;
  first_name: string | null;
  email: string | null;
  avatar_url: string | null;
  gender: string | null;
  work_industry: string | null;
}

interface Match {
  id: string;
  matched_user_id: string;
  matched_profile: UserProfile | null;
  created_at: string;
}

export default function AdminMatchmakingDetail() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user: adminUser } = useAuth();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [currentMatch, setCurrentMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [matchInput, setMatchInput] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (userId) {
      fetchUserData();
    }
  }, [userId]);

  const fetchUserData = async () => {
    try {
      // Get user profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, first_name, email, avatar_url, gender, work_industry')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      // Get current active match
      const { data: matchData, error: matchError } = await supabase
        .from('matches')
        .select('id, user_1_id, user_2_id, created_at')
        .eq('status', 'active')
        .or(`user_1_id.eq.${userId},user_2_id.eq.${userId}`)
        .maybeSingle();

      if (matchError) throw matchError;

      if (matchData) {
        const matchedUserId = matchData.user_1_id === userId ? matchData.user_2_id : matchData.user_1_id;

        // Get matched user profile
        const { data: matchedProfile, error: matchedProfileError } = await supabase
          .from('profiles')
          .select('id, first_name, email, avatar_url, gender, work_industry')
          .eq('id', matchedUserId)
          .single();

        if (matchedProfileError) throw matchedProfileError;

        setCurrentMatch({
          id: matchData.id,
          matched_user_id: matchedUserId,
          matched_profile: matchedProfile,
          created_at: matchData.created_at,
        });
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      toast.error('Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignMatch = async () => {
    if (!matchInput.trim() || !userId || !adminUser) {
      toast.error('Please enter a user email or ID');
      return;
    }

    setSaving(true);

    try {
      // Find user by email or ID
      const { data: matchedUsers, error: searchError } = await supabase
        .from('profiles')
        .select('id, first_name, email')
        .or(`email.eq.${matchInput.trim()},id.eq.${matchInput.trim()}`)
        .limit(1);

      if (searchError) throw searchError;

      if (!matchedUsers || matchedUsers.length === 0) {
        toast.error('User not found. Check the email or ID.');
        setSaving(false);
        return;
      }

      const matchedUser = matchedUsers[0];

      if (matchedUser.id === userId) {
        toast.error('Cannot match a user with themselves');
        setSaving(false);
        return;
      }

      // Remove any existing active matches for both users
      await supabase
        .from('matches')
        .update({ status: 'removed' })
        .eq('status', 'active')
        .or(`user_1_id.eq.${userId},user_2_id.eq.${userId}`);

      await supabase
        .from('matches')
        .update({ status: 'removed' })
        .eq('status', 'active')
        .or(`user_1_id.eq.${matchedUser.id},user_2_id.eq.${matchedUser.id}`);

      // Create new match
      const { error: createError } = await supabase
        .from('matches')
        .insert({
          user_1_id: userId,
          user_2_id: matchedUser.id,
          created_by: adminUser.id,
          status: 'active',
        });

      if (createError) throw createError;

      toast.success(`Matched with ${matchedUser.first_name || matchedUser.email}`);
      setMatchInput('');
      fetchUserData();
    } catch (error) {
      console.error('Error assigning match:', error);
      toast.error('Failed to assign match');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMatch = async () => {
    if (!currentMatch) return;

    if (!confirm('Remove this match? Both users will return to "waiting" status.')) return;

    try {
      const { error } = await supabase
        .from('matches')
        .update({ status: 'removed' })
        .eq('id', currentMatch.id);

      if (error) throw error;

      toast.success('Match removed');
      setCurrentMatch(null);
    } catch (error) {
      console.error('Error removing match:', error);
      toast.error('Failed to remove match');
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/matchmaking')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-semibold">Matchmaking Detail</h1>
            <p className="text-muted-foreground mt-1">Manage match for this user</p>
          </div>
        </div>

        {/* User Profile Card */}
        <Card>
          <CardHeader>
            <CardTitle>User Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={profile?.avatar_url || getDefaultAvatar(profile?.id || '')} />
                <AvatarFallback>{profile?.first_name?.charAt(0) || 'U'}</AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-lg font-semibold">{profile?.first_name || 'Unknown User'}</h3>
                <p className="text-sm text-muted-foreground">{profile?.email}</p>
                <div className="flex gap-2 mt-2">
                  {profile?.gender && (
                    <Badge variant="outline">{profile.gender}</Badge>
                  )}
                  {profile?.work_industry && (
                    <Badge variant="outline">{profile.work_industry}</Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Current Match */}
        {currentMatch && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Current Match</CardTitle>
              <Button variant="ghost" size="icon" onClick={handleRemoveMatch}>
                <X className="h-4 w-4 text-destructive" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Avatar className="h-14 w-14">
                  <AvatarImage src={currentMatch.matched_profile?.avatar_url || getDefaultAvatar(currentMatch.matched_user_id)} />
                  <AvatarFallback>{currentMatch.matched_profile?.first_name?.charAt(0) || 'U'}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="font-semibold">
                    {currentMatch.matched_profile?.first_name || 'Unknown User'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {currentMatch.matched_profile?.email}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Matched on {format(new Date(currentMatch.created_at), 'PPp')}
                  </p>
                </div>
                <Badge className="bg-green-600 text-white hover:bg-green-600 border-0">
                  Active
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Assign Match */}
        <Card>
          <CardHeader>
            <CardTitle>{currentMatch ? 'Reassign Match' : 'Assign a Match'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="matchInput">Matched with (User ID or Email)</Label>
              <Input
                id="matchInput"
                value={matchInput}
                onChange={(e) => setMatchInput(e.target.value)}
                placeholder="Enter user email or ID"
              />
              <p className="text-xs text-muted-foreground">
                Enter the email address or UUID of the user to match with
              </p>
            </div>
            <Button onClick={handleAssignMatch} disabled={saving || !matchInput.trim()}>
              {saving ? 'Saving...' : 'Confirm Match'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
