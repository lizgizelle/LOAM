import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Apple, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

const Login = () => {
  const navigate = useNavigate();
  const { signIn, isEmailVerified } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate
    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      const fieldErrors: { email?: string; password?: string } = {};
      result.error.errors.forEach((err) => {
        if (err.path[0] === 'email') fieldErrors.email = err.message;
        if (err.path[0] === 'password') fieldErrors.password = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        toast.error('Invalid email or password');
      } else {
        toast.error(error.message);
      }
      return;
    }

    // Check if email is verified after login
    // The navigation will be handled by the App component based on verification status
    navigate('/home');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col px-6 pt-6 pb-10 safe-area-top safe-area-bottom">
      {/* Back button */}
      <button
        onClick={() => navigate('/')}
        className="self-start p-2 -ml-2 text-foreground/70 hover:text-foreground transition-colors"
        aria-label="Go back"
      >
        <ArrowLeft className="w-6 h-6" />
      </button>

      <div className="flex-1 pt-8">
        <h1 className="text-3xl font-bold text-foreground mb-2 animate-fade-in">
          Welcome back
        </h1>
        <p className="text-muted-foreground mb-10 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          Sign in to continue
        </p>

        <form onSubmit={handleLogin} className="space-y-4 animate-fade-in" style={{ animationDelay: '0.2s' }}>
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
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={errors.password ? 'border-destructive' : ''}
            />
            {errors.password && (
              <p className="text-xs text-destructive mt-1">{errors.password}</p>
            )}
          </div>

          <button 
            type="button"
            className="text-sm text-primary font-medium hover:underline"
          >
            Forgot your password?
          </button>

          <Button 
            type="submit"
            variant="loam" 
            size="lg" 
            className="w-full mt-6"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Log in'}
          </Button>
        </form>

        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-background text-muted-foreground">or</span>
          </div>
        </div>

        <div className="space-y-3 animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <Button 
            variant="loam-social" 
            size="lg" 
            className="w-full"
          >
            <Apple className="w-5 h-5" />
            Continue with Apple
          </Button>
          
          <Button 
            variant="loam-social" 
            size="lg" 
            className="w-full"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </Button>
        </div>
      </div>

      <p className="text-center text-sm text-muted-foreground mt-8">
        Don't have an account?{' '}
        <button 
          onClick={() => navigate('/quiz')}
          className="text-primary font-medium hover:underline"
        >
          Sign up
        </button>
      </p>
    </div>
  );
};

export default Login;
