import type { User } from '@shared/schema';

export function getCurrentProfileImage(user: User | any): string | undefined {
  if (!user) return undefined;
  
  // If user has chosen to use custom image and has a custom image URL
  if (user.useCustomProfileImage && user.customProfileImageUrl) {
    return user.customProfileImageUrl;
  }
  
  // Otherwise use Google profile image
  return user.profileImageUrl;
}

export function getDisplayName(user: User | any): string {
  if (!user) return 'User';
  
  if (user.firstName && user.lastName) {
    return `${user.firstName} ${user.lastName}`;
  }
  
  if (user.email) {
    return user.email.split('@')[0];
  }
  
  return 'User';
}