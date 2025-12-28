import seedAvatar1 from '@/assets/avatars/seed-avatar-1.png';
import seedAvatar2 from '@/assets/avatars/seed-avatar-2.png';
import seedAvatar3 from '@/assets/avatars/seed-avatar-3.png';
import seedAvatar4 from '@/assets/avatars/seed-avatar-4.png';
import seedAvatar5 from '@/assets/avatars/seed-avatar-5.png';
import seedAvatar6 from '@/assets/avatars/seed-avatar-6.png';

export const DEFAULT_AVATARS = [
  seedAvatar1,
  seedAvatar2,
  seedAvatar3,
  seedAvatar4,
  seedAvatar5,
  seedAvatar6,
];

/**
 * Get a consistent default avatar for a user based on their ID or name
 * Uses a simple hash to ensure the same user always gets the same avatar
 */
export function getDefaultAvatar(identifier: string): string {
  if (!identifier) {
    return DEFAULT_AVATARS[0];
  }
  
  // Simple hash function to get a consistent index
  let hash = 0;
  for (let i = 0; i < identifier.length; i++) {
    const char = identifier.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  const index = Math.abs(hash) % DEFAULT_AVATARS.length;
  return DEFAULT_AVATARS[index];
}

/**
 * Get a random default avatar (for new account creation)
 */
export function getRandomAvatar(): string {
  const index = Math.floor(Math.random() * DEFAULT_AVATARS.length);
  return DEFAULT_AVATARS[index];
}