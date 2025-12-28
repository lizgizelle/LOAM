import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Mail, RefreshCw, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const VerifyEmail = () => {
  const navigate = useNavigate();
  const { user, isEmailVerified, resendVerificationEmail, refreshUser, signOut } = useAuth();
  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);
  const [lastResent, setLastResent] = useState<Date | null>(null);

  const handleCheckVerification = async () => {
    setChecking(true);
    await refreshUser();
    setChecking(false);

    // After refresh, check if verified
    // The component will re-render with updated isEmailVerified
    if (isEmailVerified) {
      toast.success('Email verified!');
      navigate('/onboarding');
    } else {
      toast.error('Not verified yet. Please check your inbox.');
    }
  };

  const handleResendEmail = async () => {
    // Cooldown check (60 seconds)
    if (lastResent && Date.now() - lastResent.getTime() < 60000) {
      const remaining = Math.ceil((60000 - (Date.now() - lastResent.getTime())) / 1000);
      toast.error(`Please wait ${remaining} seconds before requesting another email`);
      return;
    }

    setResending(true);
    const { error } = await resendVerificationEmail();
    setResending(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    setLastResent(new Date());
    toast.success('Verification email sent!');
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  // If already verified, redirect
  if (isEmailVerified) {
    navigate('/onboarding');
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col px-6 pt-20 pb-10 safe-area-top safe-area-bottom">
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        {/* Icon */}
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-8 animate-fade-in">
          <Mail className="w-10 h-10 text-primary" />
        </div>

        {/* Title */}
        <h1 
          className="text-3xl font-bold text-foreground mb-4 animate-fade-in"
          style={{ animationDelay: '0.1s' }}
        >
          Verify your email
        </h1>

        {/* Description */}
        <p 
          className="text-muted-foreground max-w-xs mb-8 animate-fade-in"
          style={{ animationDelay: '0.2s' }}
        >
          We sent a verification link to{' '}
          <span className="font-medium text-foreground">{user?.email}</span>.
          <br />
          Please verify your email to continue.
        </p>

        {/* Actions */}
        <div 
          className="w-full max-w-xs space-y-4 animate-fade-in"
          style={{ animationDelay: '0.3s' }}
        >
          <Button 
            variant="loam" 
            size="lg" 
            className="w-full"
            onClick={handleCheckVerification}
            disabled={checking}
          >
            {checking ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Checking...
              </>
            ) : (
              "I've verified, continue"
            )}
          </Button>

          <Button 
            variant="loam-outline" 
            size="lg" 
            className="w-full"
            onClick={handleResendEmail}
            disabled={resending}
          >
            {resending ? 'Sending...' : 'Resend email'}
          </Button>
        </div>
      </div>

      {/* Bottom link */}
      <button 
        onClick={handleLogout}
        className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mt-8"
      >
        <LogOut className="w-4 h-4" />
        Log out
      </button>
    </div>
  );
};

export default VerifyEmail;
