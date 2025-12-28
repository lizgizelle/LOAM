import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Mail, RefreshCw, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';

const VerifyEmail = () => {
  const navigate = useNavigate();
  const { user, isEmailVerified, signOut, verifyOtp, resendOtp } = useAuth();
  const [otp, setOtp] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState('');

  // Start countdown on mount (OTP was just sent)
  useEffect(() => {
    setCountdown(30);
  }, []);

  // Countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleVerify = async () => {
    if (otp.length !== 6) {
      setError('Please enter the complete 6-digit code');
      return;
    }

    setError('');
    setVerifying(true);

    const { error: verifyError } = await verifyOtp(otp);
    setVerifying(false);

    if (verifyError) {
      setError('Invalid or expired code. Please try again.');
      return;
    }

    toast.success('Email verified!');
    navigate('/onboarding');
  };

  const handleResendOtp = async () => {
    if (countdown > 0) return;

    setResending(true);
    setError('');
    
    const { error: resendError } = await resendOtp();
    setResending(false);

    if (resendError) {
      toast.error(resendError.message);
      return;
    }

    setCountdown(30);
    setOtp('');
    toast.success('New code sent!');
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
          Enter the 6-digit code sent to{' '}
          <span className="font-medium text-foreground">{user?.email}</span>
        </p>

        {/* OTP Input */}
        <div 
          className="w-full max-w-xs animate-fade-in mb-4"
          style={{ animationDelay: '0.3s' }}
        >
          <InputOTP
            maxLength={6}
            value={otp}
            onChange={(value) => {
              setOtp(value);
              setError('');
            }}
          >
            <InputOTPGroup className="gap-2 justify-center w-full">
              <InputOTPSlot index={0} className="w-12 h-14 text-xl" />
              <InputOTPSlot index={1} className="w-12 h-14 text-xl" />
              <InputOTPSlot index={2} className="w-12 h-14 text-xl" />
              <InputOTPSlot index={3} className="w-12 h-14 text-xl" />
              <InputOTPSlot index={4} className="w-12 h-14 text-xl" />
              <InputOTPSlot index={5} className="w-12 h-14 text-xl" />
            </InputOTPGroup>
          </InputOTP>

          {error && (
            <p className="text-sm text-destructive mt-3">{error}</p>
          )}
        </div>

        {/* Actions */}
        <div 
          className="w-full max-w-xs space-y-4 animate-fade-in"
          style={{ animationDelay: '0.4s' }}
        >
          <Button 
            variant="loam" 
            size="lg" 
            className="w-full"
            onClick={handleVerify}
            disabled={verifying || otp.length !== 6}
          >
            {verifying ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Verifying...
              </>
            ) : (
              'Verify email'
            )}
          </Button>

          <button
            onClick={handleResendOtp}
            disabled={countdown > 0 || resending}
            className={`w-full text-center text-sm transition-colors py-2 ${
              countdown > 0 
                ? 'text-muted-foreground cursor-not-allowed' 
                : 'text-primary hover:underline'
            }`}
          >
            {resending 
              ? 'Sending...' 
              : countdown > 0 
                ? `Resend available in 0:${countdown.toString().padStart(2, '0')}` 
                : 'Resend code'
            }
          </button>
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
