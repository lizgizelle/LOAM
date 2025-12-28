export interface Event {
  id: string;
  name: string;
  title?: string;
  subtitle?: string;
  date: string;
  time: string;
  location: string;
  image?: string;
  spots?: number;
  totalSpots?: number;
  category?: string;
  description?: string;
  spotsLeft?: number;
  isPast?: boolean;
}

export interface UserProfile {
  firstName: string;
  phone?: string;
  photo?: string;
  gender?: string;
  relationshipStatus?: string;
  hasChildren?: boolean;
  workIndustry?: string;
  countryOfBirth?: string;
  dateOfBirth?: string;
  defaultAvatarIndex?: number;
  notificationsEnabled?: boolean;
  language?: string;
  city?: string;
}

export interface SurveyAnswers {
  personality?: 'smart' | 'funny';
  socialLevel?: number;
  gender?: 'woman' | 'man';
}