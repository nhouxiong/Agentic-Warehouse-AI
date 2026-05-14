import { useUiStore } from '../store/uiStore';

export function useDarkMode() {
  const darkMode = useUiStore((s) => s.darkMode);
  const toggleDarkMode = useUiStore((s) => s.toggleDarkMode);

  // Note: uiStore.toggleDarkMode already sets document.documentElement data-theme.
  // No duplicate useEffect needed here.

  return { darkMode, toggleDarkMode };
}
