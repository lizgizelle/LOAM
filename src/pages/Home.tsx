import BottomNav from '@/components/BottomNav';
import { Sparkles } from 'lucide-react';

const Home = () => {
  return (
    <div className="min-h-screen bg-background pb-24 flex flex-col">
      {/* Header */}
      <div className="px-6 pt-14 pb-6 safe-area-top">
        <h1 className="text-2xl font-bold text-foreground">
          Home
        </h1>
      </div>

      {/* Coming soon state */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
          <Sparkles className="w-10 h-10 text-primary" />
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-2">
          Coming soon
        </h2>
        <p className="text-muted-foreground text-center max-w-xs">
          Something exciting is growing 🌱
        </p>
      </div>

      <BottomNav />
    </div>
  );
};

export default Home;
