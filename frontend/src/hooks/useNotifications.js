import { useState, useCallback } from 'react';

let _id = 0;

export function useNotifications() {
  const [notifications, setNotifications] = useState([]);

  const add = useCallback((notification) => {
    const id = ++_id;
    const entry = { id, ts: Date.now(), read: false, ...notification };
    setNotifications((prev) => [entry, ...prev].slice(0, 50));

    // Browser Notification API — guard for unsupported environments
    if (typeof window !== 'undefined' && 'Notification' in window &&
        Notification.permission === 'granted' && notification.push) {
      try {
        new Notification(notification.title, { body: notification.body, icon: '/favicon.ico' });
      } catch { /* silent — not all contexts support this */ }
    }
    return id;
  }, []);

  const dismiss = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const markRead = useCallback((id) => {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return { notifications, unreadCount, add, dismiss, markRead, markAllRead };
}
