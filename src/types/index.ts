export interface Event {
  id: string;
  name: string;
  date: string;
  time: string;
  image: string;
  description: string;
  location: string;
  spotsLeft?: number;
  isPast?: boolean;
}

export interface UserProfile {
  firstName: string;
  phone: string;
  photo?: string;
  relationshipStatus: 'single' | 'attached';
  hasChildren: boolean;
  workIndustry: string;
  countryOfBirth: string;
  dateOfBirth: string;
  gender: 'woman' | 'man';
}

export interface SurveyAnswers {
  personality?: 'smart' | 'funny';
  socialLevel?: number;
  gender?: 'woman' | 'man';
}
