import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Search, Eye, Ban, Undo, Download, MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { getDefaultAvatar } from '@/lib/avatars';

interface UserProfile {
  id: string;
  first_name: string | null;
  phone_number: string | null;
  email: string | null;
  gender: string | null;
  relationship_status: string | null;
  avatar_url: string | null;
  is_shadow_blocked: boolean;
  admin_notes: string | null;
  created_at: string;
  game_bucket_id: string | null;
  accepted_community_agreement: boolean;
  accepted_community_agreement_at: string | null;
}

interface QuizResponse {
  question_text_snapshot: string;
  question_type_snapshot: string;
  answer_value: string;
}

interface GameBucket {
  id: string;
  name: string;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [quizResponses, setQuizResponses] = useState<QuizResponse[]>([]);
  const [gameBucket, setGameBucket] = useState<GameBucket | null>(null);
  const [loadingQuiz, setLoadingQuiz] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const toggleShadowBlock = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_shadow_blocked: !currentStatus })
        .eq('id', userId);

      if (error) throw error;

      setUsers(users.map(u => 
        u.id === userId ? { ...u, is_shadow_blocked: !currentStatus } : u
      ));

      toast.success(currentStatus ? 'User unblocked' : 'User shadow blocked');
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Failed to update user');
    }
  };

  const updateAdminNotes = async () => {
    if (!selectedUser) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ admin_notes: adminNotes })
        .eq('id', selectedUser.id);

      if (error) throw error;

      setUsers(users.map(u => 
        u.id === selectedUser.id ? { ...u, admin_notes: adminNotes } : u
      ));

      toast.success('Notes saved');
    } catch (error) {
      console.error('Error saving notes:', error);
      toast.error('Failed to save notes');
    }
  };

  const exportToCsv = () => {
    const headers = ['First Name', 'Phone', 'Email', 'Gender', 'Status', 'Joined'];
    const rows = users.map(u => [
      u.first_name || '',
      u.phone_number || '',
      u.email || '',
      u.gender || '',
      u.relationship_status || '',
      format(new Date(u.created_at), 'yyyy-MM-dd'),
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `loam-users-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredUsers = users.filter(u => {
    const query = searchQuery.toLowerCase();
    return (
      u.first_name?.toLowerCase().includes(query) ||
      u.email?.toLowerCase().includes(query) ||
      u.phone_number?.includes(query)
    );
  });

  const viewProfile = async (user: UserProfile) => {
    setSelectedUser(user);
    setAdminNotes(user.admin_notes || '');
    setShowProfileDialog(true);
    setQuizResponses([]);
    setGameBucket(null);
    setLoadingQuiz(true);

    try {
      // Fetch quiz responses
      const { data: responses } = await supabase
        .from('survey_responses')
        .select('question_text_snapshot, question_type_snapshot, answer_value')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      setQuizResponses(responses || []);

      // Fetch game bucket if assigned
      if (user.game_bucket_id) {
        const { data: bucket } = await supabase
          .from('game_buckets')
          .select('id, name')
          .eq('id', user.game_bucket_id)
          .single();

        setGameBucket(bucket);
      }
    } catch (error) {
      console.error('Error fetching quiz data:', error);
    } finally {
      setLoadingQuiz(false);
    }
  };

  const formatAnswer = (response: QuizResponse) => {
    if (response.question_type_snapshot === 'rating') {
      return `${response.answer_value}/10`;
    }
    return response.answer_value;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Users</h1>
            <p className="text-muted-foreground mt-1">
              {users.length} total users
            </p>
          </div>
          <Button onClick={exportToCsv} variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead className="hidden sm:table-cell">Phone</TableHead>
                <TableHead className="hidden md:table-cell">Gender</TableHead>
                <TableHead className="hidden lg:table-cell">Status</TableHead>
                <TableHead className="hidden lg:table-cell">Joined</TableHead>
                <TableHead>State</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    Loading users...
                  </TableCell>
                </TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={user.avatar_url || getDefaultAvatar(user.id)} />
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {user.first_name?.[0]?.toUpperCase() || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{user.first_name || 'Unknown'}</div>
                          <div className="text-sm text-muted-foreground">{user.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {user.phone_number || '—'}
                    </TableCell>
                    <TableCell className="hidden md:table-cell capitalize">
                      {user.gender || '—'}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell capitalize">
                      {user.relationship_status || '—'}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {format(new Date(user.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      {user.is_shadow_blocked ? (
                        <Badge variant="destructive">Blocked</Badge>
                      ) : (
                        <Badge variant="secondary">Active</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => viewProfile(user)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View profile
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => toggleShadowBlock(user.id, user.is_shadow_blocked)}
                          >
                            {user.is_shadow_blocked ? (
                              <>
                                <Undo className="h-4 w-4 mr-2" />
                                Unblock
                              </>
                            ) : (
                              <>
                                <Ban className="h-4 w-4 mr-2" />
                                Shadow block
                              </>
                            )}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>User Profile</DialogTitle>
              <DialogDescription>View and manage user details</DialogDescription>
            </DialogHeader>
            
            {selectedUser && (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={selectedUser.avatar_url || getDefaultAvatar(selectedUser.id)} />
                    <AvatarFallback className="text-xl bg-primary/10 text-primary">
                      {selectedUser.first_name?.[0]?.toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-lg">{selectedUser.first_name || 'Unknown'}</h3>
                    <p className="text-muted-foreground">{selectedUser.email}</p>
                    {selectedUser.is_shadow_blocked && (
                      <Badge variant="destructive" className="mt-1">Shadow Blocked</Badge>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Phone</span>
                    <p className="font-medium">{selectedUser.phone_number || '—'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Gender</span>
                    <p className="font-medium capitalize">{selectedUser.gender || '—'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Relationship</span>
                    <p className="font-medium capitalize">{selectedUser.relationship_status || '—'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Joined</span>
                    <p className="font-medium">{format(new Date(selectedUser.created_at), 'MMM d, yyyy')}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Community Agreement</span>
                    <p className="font-medium">
                      {selectedUser.accepted_community_agreement ? (
                        <span className="text-green-600">
                          ✓ Agreed {selectedUser.accepted_community_agreement_at ? `on ${format(new Date(selectedUser.accepted_community_agreement_at), 'MMM d, yyyy')}` : ''}
                        </span>
                      ) : (
                        <span className="text-destructive">✗ Not agreed</span>
                      )}
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Quiz Responses</h4>
                  
                  {gameBucket && (
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm text-muted-foreground">Game Bucket:</span>
                      <Badge variant="outline">{gameBucket.name}</Badge>
                    </div>
                  )}

                  {loadingQuiz ? (
                    <p className="text-sm text-muted-foreground">Loading quiz responses...</p>
                  ) : quizResponses.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">This user has not completed the onboarding quiz yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {quizResponses.map((r, i) => (
                        <div key={i} className="text-sm">
                          <p className="text-muted-foreground">Q: {r.question_text_snapshot}</p>
                          <p className="font-medium">A: {formatAnswer(r)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Separator />

                <div className="space-y-2">
                  <label className="text-sm font-medium">Admin Notes</label>
                  <Textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Internal notes about this user..."
                    rows={3}
                  />
                  <Button onClick={updateAdminNotes} size="sm">
                    Save Notes
                  </Button>
                </div>

                <div className="pt-4 border-t">
                  <Button
                    variant={selectedUser.is_shadow_blocked ? 'outline' : 'destructive'}
                    onClick={() => {
                      toggleShadowBlock(selectedUser.id, selectedUser.is_shadow_blocked);
                      setSelectedUser({ ...selectedUser, is_shadow_blocked: !selectedUser.is_shadow_blocked });
                    }}
                    className="w-full gap-2"
                  >
                    {selectedUser.is_shadow_blocked ? (
                      <>
                        <Undo className="h-4 w-4" />
                        Unblock User
                      </>
                    ) : (
                      <>
                        <Ban className="h-4 w-4" />
                        Shadow Block User
                      </>
                    )}
                  </Button>
                  {selectedUser.is_shadow_blocked && (
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                      User cannot see events or sign up for new ones
                    </p>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
