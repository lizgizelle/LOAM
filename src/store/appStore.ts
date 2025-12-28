import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Event, UserProfile, SurveyAnswers } from '@/types';

interface EventParticipation {
  eventId: string;
  status: 'pending' | 'approved' | 'rejected';
}

interface AppState {
  isAuthenticated: boolean;
  isOnboarded: boolean;
  surveyAnswers: SurveyAnswers;
  userProfile: UserProfile | null;
  signedUpEvents: string[];
  eventParticipations: EventParticipation[];
  
  // Actions
  setAuthenticated: (value: boolean) => void;
  setOnboarded: (value: boolean) => void;
  setSurveyAnswers: (answers: Partial<SurveyAnswers>) => void;
  setUserProfile: (profile: Partial<UserProfile>) => void;
  signUpForEvent: (eventId: string) => void;
  setEventParticipations: (participations: EventParticipation[]) => void;
  updateEventStatus: (eventId: string, status: 'pending' | 'approved' | 'rejected') => void;
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
      eventParticipations: [],
      
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
        signedUpEvents: [...state.signedUpEvents, eventId],
        eventParticipations: [...state.eventParticipations, { eventId, status: 'pending' }]
      })),
      setEventParticipations: (participations) => set({ eventParticipations: participations }),
      updateEventStatus: (eventId, status) => set((state) => ({
        eventParticipations: state.eventParticipations.map(p => 
          p.eventId === eventId ? { ...p, status } : p
        )
      })),
      logout: () => set({
        isAuthenticated: false,
        isOnboarded: false,
        surveyAnswers: {},
        userProfile: null,
        signedUpEvents: [],
        eventParticipations: [],
      }),
    }),
    {
      name: 'loam-storage',
    }
  )
);
