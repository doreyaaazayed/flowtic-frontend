type AdminStatCardProps = {
  label: string;
  value: string;
  accent?: 'rose' | 'violet' | 'sky' | 'amber';
  onClick?: () => void;
  className?: string;
};

const ACCENT_CLASS: Record<NonNullable<AdminStatCardProps['accent']>, string> = {
  rose: 'admin-stat-card__value--rose',
  violet: 'admin-stat-card__value--violet',
  sky: 'admin-stat-card__value--sky',
  amber: 'admin-stat-card__value--amber',
};

export function AdminStatCard({ label, value, accent = 'violet', onClick, className = '' }: AdminStatCardProps) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`admin-stat-card lg-card p-5 sm:p-6 text-left w-full ${className}`}
    >
      <p className="text-sm font-medium text-muted-foreground mb-2">{label}</p>
      <p className={`admin-stat-card__value text-3xl sm:text-4xl font-bold tracking-tight ${ACCENT_CLASS[accent]}`}>
        {value}
      </p>
    </Tag>
  );
}
