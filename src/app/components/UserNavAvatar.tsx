import type { AuthUser } from '../lib/api';
import { profileInitials, resolveProfilePhotoSrc } from '../lib/profileImage';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { cn } from './ui/utils';

type UserNavAvatarProps = {
  user: AuthUser;
  className?: string;
  size?: 'sm' | 'md';
};

const SIZE_CLASS = {
  sm: 'h-6 w-6',
  md: 'h-8 w-8',
} as const;

export function UserNavAvatar({ user, className, size = 'sm' }: UserNavAvatarProps) {
  const photoSrc = resolveProfilePhotoSrc(user.profilePhotoUrl);
  const initials = profileInitials(user.firstName, user.lastName, user.username);

  return (
    <Avatar className={cn(SIZE_CLASS[size], 'shrink-0 overflow-hidden border border-white/20', className)}>
      {photoSrc ? <AvatarImage src={photoSrc} alt="" className="object-cover" /> : null}
      <AvatarFallback
        className={cn(
          'font-bold text-white bg-gradient-to-br from-primary to-secondary',
          size === 'sm' ? 'text-[10px]' : 'text-xs',
        )}
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
