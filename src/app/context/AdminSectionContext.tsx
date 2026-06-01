import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import {
  LayoutDashboard,
  Users,
  Building2,
  Ticket,
  Plus,
  History,
  ShoppingBag,
  Shield,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react';

export type AdminSection =
  | 'overview'
  | 'users'
  | 'organizers'
  | 'create-event'
  | 'events'
  | 'ticket-history'
  | 'resale'
  | 'security'
  | 'venue-food';

export type AdminNavItem = {
  id: AdminSection;
  label: string;
  icon: LucideIcon;
};

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'users', label: 'User Management', icon: Users },
  { id: 'organizers', label: 'Organizer applications', icon: Building2 },
  { id: 'create-event', label: 'Create Event', icon: Plus },
  { id: 'events', label: 'Event Approvals', icon: Ticket },
  { id: 'ticket-history', label: 'Ticket history', icon: History },
  { id: 'resale', label: 'Resale (monitoring)', icon: ShoppingBag },
  { id: 'security', label: 'Security & Fraud', icon: Shield },
  { id: 'venue-food', label: 'Venue F&B', icon: UtensilsCrossed },
];

type AdminSectionContextValue = {
  section: AdminSection;
  setSection: (section: AdminSection) => void;
};

const AdminSectionContext = createContext<AdminSectionContextValue | null>(null);

export function AdminSectionProvider({ children }: { children: ReactNode }) {
  const [section, setSection] = useState<AdminSection>('overview');
  const value = useMemo(() => ({ section, setSection }), [section]);
  return <AdminSectionContext.Provider value={value}>{children}</AdminSectionContext.Provider>;
}

export function useAdminSection() {
  const ctx = useContext(AdminSectionContext);
  if (!ctx) throw new Error('useAdminSection must be used within AdminSectionProvider');
  return ctx;
}
