const BlockedScreen = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 safe-area-top safe-area-bottom">
      <div className="text-center max-w-sm">
        <h1 className="text-2xl font-bold text-foreground mb-4">
          Your application is being reviewed by the team.
        </h1>
        <p className="text-muted-foreground">
          We'll notify you once a decision has been made.
        </p>
      </div>
    </div>
  );
};

export default BlockedScreen;
