import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sparkles, Clock, MessageCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { getDefaultAvatar } from '@/lib/avatars';
import BottomNav from '@/components/BottomNav';

interface MatchedUser {
  id: string;
  first_name: string | null;
  email: string | null;
  avatar_url: string | null;
}

type MatchmakeState = 'not_started' | 'submitted' | 'matched';

const Matchmake = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [state, setState] = useState<MatchmakeState>('not_started');
  const [matchedUser, setMatchedUser] = useState<MatchedUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      checkMatchmakeStatus();
    }
  }, [user]);

  const checkMatchmakeStatus = async () => {
    if (!user) return;

    try {
      // Check for active match first
      const { data: matchData, error: matchError } = await supabase
        .from('matches')
        .select('id, user_1_id, user_2_id')
        .eq('status', 'active')
        .or(`user_1_id.eq.${user.id},user_2_id.eq.${user.id}`)
        .maybeSingle();

      if (matchError) throw matchError;

      if (matchData) {
        // User has a match
        const matchedUserId = matchData.user_1_id === user.id ? matchData.user_2_id : matchData.user_1_id;

        // Get matched user profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, first_name, email, avatar_url')
          .eq('id', matchedUserId)
          .single();

        if (profileError) throw profileError;

        setMatchedUser(profileData);
        setState('matched');
        setLoading(false);
        return;
      }

      // Check if user has submitted matchmaker
      const { data: sessionData, error: sessionError } = await supabase
        .from('matchmaker_sessions')
        .select('status')
        .eq('user_id', user.id)
        .in('status', ['submitted', 'completed'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (sessionError && sessionError.code !== 'PGRST116') throw sessionError;

      if (sessionData) {
        setState('submitted');
      } else {
        setState('not_started');
      }
    } catch (error) {
      console.error('Error checking matchmake status:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
        <BottomNav />
      </div>
    );
  }

  // State: User has a match
  if (state === 'matched' && matchedUser) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center px-6 pb-24">
          <Card className="max-w-sm w-full border-border/50 shadow-lg">
            <CardContent className="pt-8 pb-6 px-6 text-center space-y-6">
              <div className="space-y-4">
                <Avatar className="h-24 w-24 mx-auto ring-4 ring-primary/20">
                  <AvatarImage src={matchedUser.avatar_url || getDefaultAvatar(matchedUser.id)} />
                  <AvatarFallback className="text-2xl">
                    {matchedUser.first_name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                
                <div className="space-y-1">
                  <h2 className="text-xl font-serif font-semibold text-foreground">
                    {matchedUser.first_name || 'Your Match'}
                  </h2>
                  <p className="text-sm text-muted-foreground font-serif">
                    Matched via Loam
                  </p>
                </div>
              </div>
              
              <Button
                variant="loam"
                size="lg"
                className="w-full"
                onClick={() => navigate('/chat')}
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Start chatting
              </Button>
            </CardContent>
          </Card>
        </div>
        <BottomNav />
      </div>
    );
  }

  // State: User has submitted, waiting for match
  if (state === 'submitted') {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center px-6 pb-24">
          <Card className="max-w-sm w-full border-border/50 shadow-lg">
            <CardContent className="pt-8 pb-6 px-6 text-center space-y-6">
              <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <Clock className="w-7 h-7 text-primary" />
              </div>
              
              <div className="space-y-3">
                <h2 className="text-xl font-serif font-semibold text-foreground">
                  Thanks for your input
                </h2>
                <p className="text-muted-foreground font-serif leading-relaxed">
                  Give us 48 hours to review, and we'll pass you a match.
                </p>
              </div>
              
              <Button
                variant="outline"
                size="lg"
                className="w-full"
                onClick={() => navigate('/home')}
              >
                Back to Home
              </Button>
            </CardContent>
          </Card>
        </div>
        <BottomNav />
      </div>
    );
  }

  // State: Not started
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-24">
        <div className="text-center space-y-6">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
          
          <div className="space-y-3">
            <h1 className="text-2xl font-serif font-semibold text-foreground">
              Matchmake
            </h1>
            <p className="text-muted-foreground max-w-xs mx-auto font-serif">
              Answer a few questions and we'll suggest gatherings that fit you.
            </p>
          </div>
          
          <Button
            variant="loam"
            size="lg"
            className="w-full max-w-xs"
            onClick={() => navigate('/matchmake/chat')}
          >
            Start
          </Button>
        </div>
      </div>
      <BottomNav />
    </div>
  );
};

export default Matchmake;
