import { useTranslation } from 'react-i18next';
import { OrganizerSectionProvider } from '../../context/OrganizerSectionContext';
import { EventCreatorDashboard } from '../../pages/EventCreatorDashboard';

export function AdminEventCreatePanel() {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xl font-semibold">{t('admin.createEvent.title')}</h3>
        <p className="text-sm text-muted-foreground mt-1">{t('admin.createEvent.subtitle')}</p>
      </div>
      <OrganizerSectionProvider initialSection="create">
        <EventCreatorDashboard embeddedCreateOnly />
      </OrganizerSectionProvider>
    </div>
  );
}
