import { Link, Navigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/button';
import { PageLoader } from './PageLoader';

type RequireRoleProps = {
  children: React.ReactNode;
  allowedRoles: string[];
  /** If true, organizers with organizerApproved === false see a pending screen instead of children. */
  requireOrganizerApproval?: boolean;
};

export function RequireRole({ children, allowedRoles, requireOrganizerApproval }: RequireRoleProps) {
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <PageLoader fullScreen message={t('app.checkingSession')} />;
  }

  if (!user) {
    return <Navigate to="/signin" state={{ from: location.pathname }} replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    if (user.role === 'usher') {
      return <Navigate to="/usher" replace />;
    }
    return <Navigate to="/" replace />;
  }

  if (
    requireOrganizerApproval &&
    user.role === 'organizer' &&
    user.organizerApproved === false
  ) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-muted/30">
        <div className="max-w-lg w-full rounded-2xl border border-border bg-card p-8 shadow-sm text-center space-y-4">
          <h1 className="text-2xl font-bold">Organizer account under review</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            You registered as an <strong className="text-foreground">organization</strong>. An administrator must verify your
            commercial registration and tax documents before you can create events and use the creator portal.
          </p>
          {user.organizationName && (
            <p className="text-sm">
              <span className="text-muted-foreground">Organization:</span>{' '}
              <span className="font-medium">{user.organizationName}</span>
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            We will enable creator tools once your application is approved. You can still browse events and use your attendee
            dashboard.
          </p>
          <div className="flex flex-wrap gap-3 justify-center pt-2">
            <Button asChild variant="default">
              <Link to="/dashboard">Go to my dashboard</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/">Browse events</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
