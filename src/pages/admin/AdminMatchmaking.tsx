import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { getDefaultAvatar } from '@/lib/avatars';

interface MatchmakeUser {
  id: string;
  user_id: string;
  completed_at: string | null;
  profile: {
    id: string;
    first_name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
  match_status: 'waiting' | 'matched';
}

export default function AdminMatchmaking() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<MatchmakeUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMatchmakeUsers();
  }, []);

  const fetchMatchmakeUsers = async () => {
    try {
      // Get all submitted/completed sessions
      const { data: sessions, error: sessionsError } = await supabase
        .from('matchmaker_sessions')
        .select('id, user_id, completed_at, status')
        .in('status', ['submitted', 'completed'])
        .order('completed_at', { ascending: false });

      if (sessionsError) throw sessionsError;

      if (!sessions || sessions.length === 0) {
        setUsers([]);
        setLoading(false);
        return;
      }

      // Get unique user IDs
      const userIds = [...new Set(sessions.map(s => s.user_id))];

      // Get profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, email, avatar_url')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Get active matches
      const { data: matches, error: matchesError } = await supabase
        .from('matches')
        .select('user_1_id, user_2_id')
        .eq('status', 'active');

      if (matchesError) throw matchesError;

      const matchedUserIds = new Set<string>();
      (matches || []).forEach(m => {
        matchedUserIds.add(m.user_1_id);
        matchedUserIds.add(m.user_2_id);
      });

      // Build user list (latest session per user)
      const userSessionMap = new Map<string, typeof sessions[0]>();
      sessions.forEach(s => {
        if (!userSessionMap.has(s.user_id)) {
          userSessionMap.set(s.user_id, s);
        }
      });

      const matchmakeUsers: MatchmakeUser[] = Array.from(userSessionMap.values()).map(session => ({
        id: session.id,
        user_id: session.user_id,
        completed_at: session.completed_at,
        profile: profileMap.get(session.user_id) || null,
        match_status: matchedUserIds.has(session.user_id) ? 'matched' : 'waiting',
      }));

      setUsers(matchmakeUsers);
    } catch (error) {
      console.error('Error fetching matchmake users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: 'waiting' | 'matched') => {
    if (status === 'matched') {
      return (
        <Badge className="bg-green-600 text-white hover:bg-green-600 border-0">
          Matched
        </Badge>
      );
    }
    return <Badge variant="secondary">Waiting for match</Badge>;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Matchmaking</h1>
          <p className="text-muted-foreground mt-1">Review and assign matches for users</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Matchmake Participants ({users.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : users.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No users have completed the matchmaker yet
              </div>
            ) : (
              <div className="space-y-3">
                {users.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => navigate(`/admin/matchmaking/${user.user_id}`)}
                    className="w-full flex items-center gap-4 p-4 border rounded-lg bg-card hover:bg-muted/30 transition-colors text-left"
                  >
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={user.profile?.avatar_url || getDefaultAvatar(user.user_id)} />
                      <AvatarFallback>
                        {user.profile?.first_name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-foreground">
                          {user.profile?.first_name || 'Unknown User'}
                        </span>
                        {getStatusBadge(user.match_status)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {user.profile?.email || user.user_id}
                        {user.completed_at && (
                          <> · Submitted {format(new Date(user.completed_at), 'PP')}</>
                        )}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
