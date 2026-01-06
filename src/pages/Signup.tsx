import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { z } from 'zod';
import { ArrowLeft } from 'lucide-react';

const signupSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match.',
  path: ['confirmPassword'],
});

const Signup = () => {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; confirmPassword?: string }>({});

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate
    const result = signupSchema.safeParse({ email, password, confirmPassword });
    if (!result.success) {
      const fieldErrors: { email?: string; password?: string; confirmPassword?: string } = {};
      result.error.errors.forEach((err) => {
        if (err.path[0] === 'email') fieldErrors.email = err.message;
        if (err.path[0] === 'password') fieldErrors.password = err.message;
        if (err.path[0] === 'confirmPassword') fieldErrors.confirmPassword = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    const { error } = await signUp(email, password);
    setLoading(false);

    if (error) {
      if (error.message.includes('already registered')) {
        toast.error('This email is already registered. Please log in instead.');
      } else {
        toast.error(error.message);
      }
      return;
    }

    // Redirect to verification screen
    navigate('/verify-email');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col px-6 pt-6 pb-10 safe-area-top safe-area-bottom">
      {/* Back button */}
      <button
        onClick={() => navigate('/auth-choice')}
        className="self-start p-2 -ml-2 text-foreground/70 hover:text-foreground transition-colors"
        aria-label="Go back"
      >
        <ArrowLeft className="w-6 h-6" />
      </button>

      <div className="flex-1 pt-8">
        <h1 className="text-3xl font-bold text-foreground mb-2 animate-fade-in">
          Create account
        </h1>
        <p className="text-muted-foreground mb-10 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          Enter your email to get started
        </p>

        <form onSubmit={handleSignup} className="space-y-4 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <div>
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={errors.email ? 'border-destructive' : ''}
            />
            {errors.email && (
              <p className="text-xs text-destructive mt-1">{errors.email}</p>
            )}
          </div>
          <div>
            <Input
              type="password"
              placeholder="Create password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={errors.password ? 'border-destructive' : ''}
            />
            {errors.password && (
              <p className="text-xs text-destructive mt-1">{errors.password}</p>
            )}
          </div>
          <div>
            <Input
              type="password"
              placeholder="Re-enter password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={errors.confirmPassword ? 'border-destructive' : ''}
            />
            {errors.confirmPassword && (
              <p className="text-xs text-destructive mt-1">{errors.confirmPassword}</p>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            By continuing, you agree to our{' '}
            <button type="button" className="text-primary hover:underline">Terms of Service</button>
            {' '}and{' '}
            <button type="button" className="text-primary hover:underline">Privacy Policy</button>
          </p>

          <Button 
            type="submit"
            variant="loam" 
            size="lg" 
            className="w-full mt-6"
            disabled={loading || !email || password.length < 6 || password !== confirmPassword}
          >
            {loading ? 'Creating account...' : 'Continue'}
          </Button>
        </form>
      </div>

      <p className="text-center text-sm text-muted-foreground mt-8">
        Already have an account?{' '}
        <button 
          onClick={() => navigate('/login')}
          className="text-primary font-medium hover:underline"
        >
          Log in
        </button>
      </p>
    </div>
  );
};

export default Signup;
