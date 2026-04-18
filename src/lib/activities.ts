// Helpers for the Activities feature
export const SG_AREAS = [
  'Central',
  'Dempsey / Holland Village / Buona Vista',
  'Katong / Marine Parade',
] as const;

export const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday', short: 'Sun' },
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' },
];

export const SUBSCRIPTION_PLANS = [
  {
    id: '1_month' as const,
    label: '1 Month',
    months: 1,
    price: 29.98,
    pricePerWeek: 7.50,
    originalPrice: null as number | null,
    badge: null as string | null,
  },
  {
    id: '3_months' as const,
    label: '3 Months',
    months: 3,
    price: 59.98,
    pricePerWeek: 5.00,
    originalPrice: 89.94,
    badge: 'Save 33%',
  },
  {
    id: '6_months' as const,
    label: '6 Months',
    months: 6,
    price: 89.98,
    pricePerWeek: 3.75,
    originalPrice: 179.88,
    badge: 'Save 50%',
  },
];

export type SubscriptionPlanId = '1_month' | '3_months' | '6_months';

export const formatSlotDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
};

export const formatSlotTime = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
};
