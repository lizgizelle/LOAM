import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/appStore';
import { ChevronLeft, Check } from 'lucide-react';

const languages = ['English'];

const LanguageSettings = () => {
  const navigate = useNavigate();
  const { userProfile, setUserProfile } = useAppStore();

  const currentLanguage = userProfile?.language ?? 'English';

  const handleSelect = (language: string) => {
    setUserProfile({ language });
    navigate('/profile');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="px-6 pt-14 pb-6 safe-area-top">
        <button 
          onClick={() => navigate('/profile')}
          className="flex items-center gap-2 text-foreground mb-4"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="font-medium">Back</span>
        </button>
        <h1 className="text-2xl font-bold text-foreground">
          App language
        </h1>
      </div>

      {/* Options */}
      <div className="px-6">
        <div className="bg-popover rounded-2xl shadow-loam overflow-hidden">
          {languages.map((language) => (
            <button
              key={language}
              onClick={() => handleSelect(language)}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-secondary/50 transition-colors"
            >
              <span className="font-medium text-foreground">{language}</span>
              {currentLanguage === language && (
                <Check className="w-5 h-5 text-primary" />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LanguageSettings;
