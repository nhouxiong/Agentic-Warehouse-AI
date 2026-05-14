import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const ROLE_PERMISSIONS = {
  supervisor: { tabs: ['live'], canAcceptTasks: true, canSeeCosts: false, canManageUsers: false },
  manager:    { tabs: ['live', 'planning'], canAcceptTasks: true, canSeeCosts: true, canManageUsers: false },
  executive:  { tabs: ['analytics'], canAcceptTasks: false, canSeeCosts: true, canManageUsers: false },
  admin:      { tabs: ['live', 'planning', 'analytics'], canAcceptTasks: true, canSeeCosts: true, canManageUsers: true },
};

const DEFAULT_TAB = {
  supervisor: '/live',
  manager: '/planning',
  executive: '/analytics',
  admin: '/live',
};

export const useAuthStore = create(
  persist(
    (set, get) => ({
      role: 'admin',
      warehouseId: 'WH-001',
      warehouses: [
        { id: 'WH-001', name: 'Chicago Distribution Center' },
        { id: 'WH-002', name: 'Dallas Fulfillment Hub' },
        { id: 'WH-003', name: 'Atlanta Regional Warehouse' },
      ],
      setRole: (role) => set({ role }),
      setWarehouse: (warehouseId) => set({ warehouseId }),
      getPermissions: () => ROLE_PERMISSIONS[get().role] || ROLE_PERMISSIONS.admin,
      getDefaultTab: () => DEFAULT_TAB[get().role] || '/live',
      hasTab: (tab) => {
        const perms = ROLE_PERMISSIONS[get().role];
        return perms ? perms.tabs.includes(tab) : true;
      },
    }),
    { name: 'dockops-auth' }
  )
);
