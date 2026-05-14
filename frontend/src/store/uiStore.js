import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useUiStore = create(
  persist(
    (set) => ({
      darkMode: false,
      sidebarOpen: false,
      searchOpen: false,
      notificationsOpen: false,
      toggleDarkMode: () => set((s) => {
        const next = !s.darkMode;
        document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
        return { darkMode: next };
      }),
      setSearchOpen: (v) => set({ searchOpen: v }),
      setNotificationsOpen: (v) => set({ notificationsOpen: v }),
      setSidebarOpen: (v) => set({ sidebarOpen: v }),
    }),
    { name: 'dockops-ui' }
  )
);
