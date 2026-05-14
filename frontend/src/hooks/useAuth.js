import { useMemo } from 'react';
import { useAuthStore } from '../store/authStore';

export function useAuth() {
  const role = useAuthStore((s) => s.role);
  const getPermissions = useAuthStore((s) => s.getPermissions);
  const getDefaultTab = useAuthStore((s) => s.getDefaultTab);

  const permissions = useMemo(() => getPermissions(), [role, getPermissions]);
  const defaultTab = useMemo(() => getDefaultTab(), [role, getDefaultTab]);

  return {
    role,
    permissions,
    defaultTab,
    canAcceptTasks: permissions.canAcceptTasks,
    canSeeCosts: permissions.canSeeCosts,
    canManageUsers: permissions.canManageUsers,
    availableTabs: permissions.tabs,
  };
}
