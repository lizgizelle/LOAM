import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Event, UserProfile, SurveyAnswers } from '@/types';

interface AppState {
  isAuthenticated: boolean;
  isOnboarded: boolean;
  surveyAnswers: SurveyAnswers;
  userProfile: UserProfile | null;
  signedUpEvents: string[];
  
  // Actions
  setAuthenticated: (value: boolean) => void;
  setOnboarded: (value: boolean) => void;
  setSurveyAnswers: (answers: Partial<SurveyAnswers>) => void;
  setUserProfile: (profile: Partial<UserProfile>) => void;
  signUpForEvent: (eventId: string) => void;
  logout: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      isOnboarded: false,
      surveyAnswers: {},
      userProfile: null,
      signedUpEvents: [],
      
      setAuthenticated: (value) => set({ isAuthenticated: value }),
      setOnboarded: (value) => set({ isOnboarded: value }),
      setSurveyAnswers: (answers) => set((state) => ({ 
        surveyAnswers: { ...state.surveyAnswers, ...answers } 
      })),
      setUserProfile: (profile) => set((state) => ({ 
        userProfile: state.userProfile 
          ? { ...state.userProfile, ...profile }
          : profile as UserProfile
      })),
      signUpForEvent: (eventId) => set((state) => ({
        signedUpEvents: [...state.signedUpEvents, eventId]
      })),
      logout: () => set({
        isAuthenticated: false,
        isOnboarded: false,
        surveyAnswers: {},
        userProfile: null,
        signedUpEvents: [],
      }),
    }),
    {
      name: 'loam-storage',
    }
  )
);
