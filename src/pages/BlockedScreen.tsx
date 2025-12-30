import { useLocation } from 'react-router-dom';

const BlockedScreen = () => {
  const location = useLocation();
  const isAgeRestricted = location.state?.reason === 'age';

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 safe-area-top safe-area-bottom">
      <div className="text-center max-w-sm">
        <h1 className="text-2xl font-bold font-serif text-foreground mb-4">
          Your application is under review
        </h1>
        <p className="text-muted-foreground leading-relaxed">
          {isAgeRestricted ? (
            <>
              Thank you for your interest in Loam.
              <br /><br />
              Our team is currently reviewing your application and will be in touch if we're able to proceed.
            </>
          ) : (
            "We'll notify you once a decision has been made."
          )}
        </p>
      </div>
    </div>
  );
};

export default BlockedScreen;
