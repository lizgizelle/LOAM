import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowLeft, Lock } from 'lucide-react';

const AlphacodeVerify = () => {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingSettings, setCheckingSettings] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    checkAlphacodeRequired();
  }, []);

  const checkAlphacodeRequired = async () => {
    try {
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'alphacode_settings')
        .maybeSingle();

      if (data) {
        const settings = data.value as { enabled: boolean; code: string };
        if (!settings.enabled) {
          // Alphacode not required, skip to onboarding
          navigate('/onboarding', { replace: true });
          return;
        }
      } else {
        // No settings found, skip to onboarding
        navigate('/onboarding', { replace: true });
        return;
      }
    } catch (error) {
      console.error('Error checking alphacode settings:', error);
      // On error, allow proceeding to onboarding
      navigate('/onboarding', { replace: true });
      return;
    } finally {
      setCheckingSettings(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'alphacode_settings')
        .maybeSingle();

      if (data) {
        const settings = data.value as { enabled: boolean; code: string };
        
        if (code.trim().toLowerCase() === settings.code.toLowerCase()) {
          toast.success('Code verified!');
          navigate('/onboarding', { replace: true });
        } else {
          setError('Invalid code. Please try again.');
        }
      }
    } catch (error) {
      console.error('Error verifying code:', error);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (checkingSettings) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col px-6 pt-6 pb-10 safe-area-top safe-area-bottom">
      {/* Back button */}
      <button
        onClick={() => navigate('/verify-email')}
        className="self-start p-2 -ml-2 text-foreground/70 hover:text-foreground transition-colors"
        aria-label="Go back"
      >
        <ArrowLeft className="w-6 h-6" />
      </button>

      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-6">
          <Lock className="w-8 h-8 text-primary" />
        </div>

        <h1 className="text-3xl font-bold text-foreground mb-2 text-center animate-fade-in">
          Enter Access Code
        </h1>
        <p className="text-muted-foreground mb-8 text-center animate-fade-in max-w-xs" style={{ animationDelay: '0.1s' }}>
          Please enter the access code provided to you to continue with your account setup.
        </p>

        <form onSubmit={handleVerify} className="w-full max-w-sm space-y-4 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <div>
            <Input
              type="text"
              placeholder="Enter access code"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setError('');
              }}
              className={`text-center text-lg tracking-wider ${error ? 'border-destructive' : ''}`}
              autoFocus
            />
            {error && (
              <p className="text-xs text-destructive mt-2 text-center">{error}</p>
            )}
          </div>

          <Button 
            type="submit"
            variant="loam" 
            size="lg" 
            className="w-full"
            disabled={loading || !code.trim()}
          >
            {loading ? 'Verifying...' : 'Continue'}
          </Button>
        </form>

        <p className="text-xs text-muted-foreground mt-8 text-center max-w-xs">
          Don't have an access code? Contact the app administrator for an invitation.
        </p>
      </div>
    </div>
  );
};

export default AlphacodeVerify;
