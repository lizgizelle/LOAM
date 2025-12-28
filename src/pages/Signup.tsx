import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAppStore } from '@/store/appStore';

const Signup = () => {
  const navigate = useNavigate();
  const { setAuthenticated } = useAppStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthenticated(true);
    navigate('/onboarding');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col px-6 pt-20 pb-10 safe-area-top safe-area-bottom">
      <div className="flex-1">
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
            />
          </div>
          <div>
            <Input
              type="password"
              placeholder="Create password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
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
          >
            Continue
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
