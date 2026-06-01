import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import {
  Ticket,
  ShoppingBag,
  Crown,
  CreditCard,
  User,
  type LucideIcon,
} from 'lucide-react';

export type UserSection =
  | 'tickets'
  | 'orders'
  | 'loyalty'
  | 'cards'
  | 'profile';

export type UserNavItem = {
  id: UserSection;
  labelKey: string;
  icon: LucideIcon;
};

export const USER_NAV_ITEMS: UserNavItem[] = [
  { id: 'tickets', labelKey: 'dashboard.tabs.tickets', icon: Ticket },
  { id: 'orders', labelKey: 'dashboard.tabs.orders', icon: ShoppingBag },
  { id: 'loyalty', labelKey: 'dashboard.tabs.loyalty', icon: Crown },
  { id: 'cards', labelKey: 'dashboard.tabs.cards', icon: CreditCard },
  { id: 'profile', labelKey: 'dashboard.tabs.profile', icon: User },
];

const VALID_SECTIONS = new Set<string>(USER_NAV_ITEMS.map((i) => i.id));

export function parseUserSection(raw: string | null | undefined): UserSection {
  if (raw && VALID_SECTIONS.has(raw)) return raw as UserSection;
  return 'tickets';
}

type UserSectionContextValue = {
  section: UserSection;
  setSection: (section: UserSection) => void;
};

const UserSectionContext = createContext<UserSectionContextValue | null>(null);

export function UserSectionProvider({
  children,
  initialSection = 'tickets',
}: {
  children: ReactNode;
  initialSection?: UserSection;
}) {
  const [section, setSection] = useState<UserSection>(initialSection);
  const value = useMemo(() => ({ section, setSection }), [section]);
  return <UserSectionContext.Provider value={value}>{children}</UserSectionContext.Provider>;
}

export function useUserSection() {
  const ctx = useContext(UserSectionContext);
  if (!ctx) throw new Error('useUserSection must be used within UserSectionProvider');
  return ctx;
}
