import { useNavigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
      <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
        <span className="text-4xl">🌱</span>
      </div>
      <h1 className="text-3xl font-bold text-foreground mb-2">
        Page not found
      </h1>
      <p className="text-muted-foreground mb-8 max-w-xs">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Button 
        variant="loam" 
        size="lg"
        onClick={() => navigate("/")}
      >
        Go back home
      </Button>
    </div>
  );
};

export default NotFound;
