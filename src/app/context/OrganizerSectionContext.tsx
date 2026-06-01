import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import {
  LayoutDashboard,
  Plus,
  Calendar,
  UtensilsCrossed,
  DoorOpen,
  UserCheck,
  Mail,
  type LucideIcon,
} from 'lucide-react';

export type OrganizerDashboardSection = 'analytics' | 'create' | 'events' | 'vendors' | 'ushers' | 'invitations';

export type OrganizerNavItem =
  | {
      kind: 'section';
      id: OrganizerDashboardSection;
      labelKey: string;
      icon: LucideIcon;
    }
  | {
      kind: 'route';
      path: string;
      labelKey: string;
      icon: LucideIcon;
      matchPrefix?: boolean;
    };

export const ORGANIZER_NAV_ITEMS: OrganizerNavItem[] = [
  { kind: 'section', id: 'analytics', labelKey: 'creator.nav.analytics', icon: LayoutDashboard },
  { kind: 'section', id: 'create', labelKey: 'creator.nav.create', icon: Plus },
  { kind: 'section', id: 'events', labelKey: 'creator.nav.events', icon: Calendar },
  { kind: 'section', id: 'vendors', labelKey: 'creator.nav.vendors', icon: UtensilsCrossed },
  { kind: 'section', id: 'ushers', labelKey: 'creator.nav.ushers', icon: UserCheck },
  { kind: 'section', id: 'invitations', labelKey: 'creator.nav.invitations', icon: Mail },
  { kind: 'route', path: '/creator/entry', labelKey: 'creator.nav.gateTools', icon: DoorOpen, matchPrefix: true },
];

type OrganizerSectionContextValue = {
  section: OrganizerDashboardSection;
  setSection: (section: OrganizerDashboardSection) => void;
};

const OrganizerSectionContext = createContext<OrganizerSectionContextValue | null>(null);

export function parseOrganizerSection(raw: string | null | undefined): OrganizerDashboardSection {
  if (raw === 'create' || raw === 'events' || raw === 'vendors' || raw === 'ushers' || raw === 'invitations' || raw === 'analytics') return raw;
  return 'analytics';
}

export function OrganizerSectionProvider({
  children,
  initialSection = 'analytics',
}: {
  children: ReactNode;
  initialSection?: OrganizerDashboardSection;
}) {
  const [section, setSection] = useState<OrganizerDashboardSection>(initialSection);
  const value = useMemo(() => ({ section, setSection }), [section]);
  return <OrganizerSectionContext.Provider value={value}>{children}</OrganizerSectionContext.Provider>;
}

export function useOrganizerSection() {
  const ctx = useContext(OrganizerSectionContext);
  if (!ctx) throw new Error('useOrganizerSection must be used within OrganizerSectionProvider');
  return ctx;
}
