import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Star, Lock } from 'lucide-react';
import { toast } from 'sonner';
import BottomNav from '@/components/BottomNav';
import { cn } from '@/lib/utils';

const CARD_COLORS = [
  { bg: 'hsl(340, 82%, 76%)', text: 'hsl(340, 60%, 20%)' },   // Pink
  { bg: 'hsl(210, 80%, 75%)', text: 'hsl(210, 60%, 20%)' },   // Blue
  { bg: 'hsl(48, 95%, 76%)', text: 'hsl(48, 60%, 20%)' },     // Yellow
  { bg: 'hsl(140, 60%, 72%)', text: 'hsl(140, 50%, 18%)' },   // Green
  { bg: 'hsl(16, 90%, 75%)', text: 'hsl(16, 60%, 20%)' },     // Coral/Orange
  { bg: 'hsl(270, 60%, 80%)', text: 'hsl(270, 50%, 20%)' },   // Lavender
  { bg: 'hsl(160, 55%, 78%)', text: 'hsl(160, 50%, 18%)' },   // Mint
  { bg: 'hsl(20, 80%, 85%)', text: 'hsl(20, 50%, 22%)' },     // Peach
];

interface GameQuestion {
  id: string;
  question_text: string;
}

export default function Game() {
  const { user } = useAuth();
  const [isUnlocked, setIsUnlocked] = useState<boolean | null>(null);
  const [code, setCode] = useState('');
  const [checking, setChecking] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Game state
  const [questions, setQuestions] = useState<GameQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [colorIndex, setColorIndex] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (user?.id) checkUnlockStatus();
  }, [user?.id]);

  const checkUnlockStatus = async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from('game_unlocks')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();
    
    setIsUnlocked(!!data);
    setChecking(false);

    if (data) {
      loadQuestions();
    }
  };

  const loadQuestions = async () => {
    if (!user?.id) return;
    setLoadingQuestions(true);

    // Get user's bucket
    const { data: profile } = await supabase
      .from('profiles')
      .select('game_bucket_id')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile?.game_bucket_id) {
      // No bucket assigned — show all questions as fallback
      const { data } = await supabase
        .from('game_questions')
        .select('id, question_text')
        .eq('is_active', true);
      
      if (data) {
        setQuestions(shuffleArray(data));
      }
    } else {
      const { data } = await supabase
        .from('game_questions')
        .select('id, question_text')
        .eq('bucket_id', profile.game_bucket_id)
        .eq('is_active', true);
      
      if (data) {
        setQuestions(shuffleArray(data));
      }
    }

    // Randomize starting color
    setColorIndex(Math.floor(Math.random() * CARD_COLORS.length));
    setLoadingQuestions(false);
  };

  const shuffleArray = <T,>(arr: T[]): T[] => {
    const shuffled = [...arr];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const handleUnlock = async () => {
    if (!user?.id || !code.trim()) return;
    setSubmitting(true);

    // Check if code is valid
    const { data: validCode } = await supabase
      .from('game_access_codes')
      .select('id')
      .eq('code', code.trim())
      .eq('is_active', true)
      .maybeSingle();

    if (!validCode) {
      toast.error('Invalid code. Please try again.');
      setSubmitting(false);
      return;
    }

    // Unlock
    const { error } = await supabase
      .from('game_unlocks')
      .insert({ user_id: user.id });

    if (error) {
      toast.error('Something went wrong');
    } else {
      setIsUnlocked(true);
      loadQuestions();
      toast.success('Game unlocked! 🎉');
    }
    setSubmitting(false);
  };

  const handleRate = async (rating: number) => {
    if (!user?.id || animating) return;
    const question = questions[currentIndex];
    if (!question) return;

    setAnimating(true);

    // Save rating (upsert)
    await supabase
      .from('game_ratings')
      .upsert(
        { user_id: user.id, question_id: question.id, rating },
        { onConflict: 'user_id,question_id' }
      );

    // Move to next card
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % questions.length);
      setColorIndex((prev) => (prev + 1) % CARD_COLORS.length);
      setHoveredStar(0);
      setAnimating(false);
    }, 300);
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center pb-20">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
        <BottomNav />
      </div>
    );
  }

  // Lock screen
  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-background flex flex-col px-6 pb-24">
        <div className="flex-1 flex flex-col items-center justify-center max-w-sm mx-auto w-full">
          <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mb-6">
            <Lock className="w-8 h-8 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2 text-center">Game Locked</h1>
          <p className="text-muted-foreground text-center mb-8">
            Enter your access code to unlock the game
          </p>
          <div className="w-full space-y-4">
            <Input
              placeholder="Enter code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="text-center text-lg"
              onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
            />
            <Button
              variant="loam"
              size="lg"
              className="w-full"
              onClick={handleUnlock}
              disabled={submitting || !code.trim()}
            >
              {submitting ? 'Checking...' : 'Unlock'}
            </Button>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  // No questions
  if (!loadingQuestions && questions.length === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 pb-24">
        <p className="text-muted-foreground text-center">No questions available yet. Check back later!</p>
        <BottomNav />
      </div>
    );
  }

  if (loadingQuestions) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center pb-20">
        <div className="animate-pulse text-muted-foreground">Loading questions...</div>
        <BottomNav />
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const currentColor = CARD_COLORS[colorIndex];

  return (
    <div className="min-h-screen bg-background flex flex-col px-6 pt-8 pb-28">
      <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full">
        {/* Flashcard */}
        <div
          className={cn(
            "w-full aspect-[4/5] rounded-3xl flex items-center justify-center p-8 shadow-xl transition-all duration-300",
            animating ? "opacity-0 scale-95" : "opacity-100 scale-100"
          )}
          style={{
            backgroundColor: currentColor.bg,
            color: currentColor.text,
          }}
        >
          <p className="text-2xl font-bold text-center leading-relaxed" style={{ color: currentColor.text }}>
            {currentQuestion?.question_text}
          </p>
        </div>

        {/* Star Rating */}
        <div className="mt-8 flex flex-col items-center gap-3">
          <p className="text-sm text-muted-foreground text-center">
            How good is this question? Help us improve 👇
          </p>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => handleRate(star)}
                onMouseEnter={() => setHoveredStar(star)}
                onMouseLeave={() => setHoveredStar(0)}
                className="p-1 transition-transform duration-150 hover:scale-110 active:scale-95"
                disabled={animating}
              >
                <Star
                  className={cn(
                    "w-9 h-9 transition-colors duration-150",
                    star <= hoveredStar
                      ? "fill-amber-400 text-amber-400"
                      : "fill-none text-border"
                  )}
                />
              </button>
            ))}
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
