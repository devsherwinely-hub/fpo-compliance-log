import { useSyncExternalStore } from 'react';

// Appearance: Light / Auto (follows the OS) / Dark. Class strategy —
// `dark` lands on <html>, Tailwind dark: variants + .dark CSS take it.
// Persisted per device; OS changes are picked up live in Auto.
export type ThemeMode = 'light' | 'auto' | 'dark';

const KEY = 'fpo-theme';

function readStored(): ThemeMode {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'light' || v === 'auto' || v === 'dark') return v;
  } catch {
    // private mode etc. — fall through to auto
  }
  return 'auto';
}

let mode: ThemeMode = readStored();
const listeners = new Set<() => void>();

export function resolvedTheme(): 'light' | 'dark' {
  if (mode !== 'auto') return mode;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyTheme(): void {
  document.documentElement.classList.toggle('dark', resolvedTheme() === 'dark');
}

function emit(): void {
  listeners.forEach((l) => l());
}

export function setThemeMode(m: ThemeMode): void {
  mode = m;
  try {
    localStorage.setItem(KEY, m);
  } catch {
    // ignore write failures
  }
  applyTheme();
  emit();
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function getSnapshot(): ThemeMode {
  return mode;
}

export function useTheme(): { mode: ThemeMode; resolved: 'light' | 'dark'; setMode: (m: ThemeMode) => void } {
  const m = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return { mode: m, resolved: m === 'auto' ? resolvedTheme() : m, setMode: setThemeMode };
}

// Apply before first paint; follow the OS while in Auto.
applyTheme();
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  applyTheme();
  emit();
});
