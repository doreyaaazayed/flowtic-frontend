import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { notifications as notificationsApi } from '../lib/api';
import { openNotification } from '../lib/notificationNavigation';
import {
  refreshNotifications,
  subscribeNotifications,
  type NotificationRow,
} from '../lib/notificationStore';
import { Button } from './ui/button';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { cn } from './ui/utils';

export function NotificationBell({ className, enabled }: { className?: string; enabled: boolean }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    return subscribeNotifications((snap) => {
      setRows(snap.rows);
      setUnread(snap.unread);
    });
  }, [enabled]);

  if (!enabled) return null;

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) refreshNotifications();
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn('relative rounded-lg p-2 transition-colors hover:bg-muted', className)}
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5 text-foreground/70" />
          {unread > 0 && (
            <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(100vw-2rem,22rem)] p-0" align="end" sideOffset={8}>
        <div className="border-b border-border px-3 py-2 flex items-center justify-between gap-2">
          <span className="text-sm font-semibold">Notifications</span>
          {unread > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={async () => {
                await notificationsApi.readAll();
                refreshNotifications();
              }}
            >
              Mark all read
            </Button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground px-3 py-6 text-center">No notifications yet.</p>
          ) : (
            <ul>
              {rows.map((n) => (
                <li key={n._id} className="border-b border-border last:border-0">
                  <button
                    type="button"
                    className={cn(
                      'w-full text-left px-3 py-2.5 text-sm hover:bg-muted/60 transition-colors cursor-pointer',
                      !n.read && 'bg-primary/5',
                    )}
                    onClick={() =>
                      openNotification(n, {
                        navigate,
                        markRead: (id) => notificationsApi.markRead(id),
                        refresh: refreshNotifications,
                        onClose: () => setOpen(false),
                      })
                    }
                  >
                    <span className="font-medium block text-foreground">{n.title}</span>
                    <span className="text-muted-foreground text-xs mt-0.5 block line-clamp-3">{n.body}</span>
                    {n.createdAt && (
                      <span className="text-[10px] text-muted-foreground mt-1 block">
                        {new Date(n.createdAt).toLocaleString()}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="border-t border-border px-3 py-2">
          <Link to="/dashboard" className="text-xs font-medium text-primary hover:underline" onClick={() => setOpen(false)}>
            Open dashboard
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
