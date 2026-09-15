import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { tick } from '../lib/haptics';

interface TopBarProps {
  onMenuClick: () => void;
  dateLabel: string;
  title?: string;
  onExport: () => void;
  onImportFile: (file: File) => void;
}

// Floating glass toolbar. Gains its uniform scroll-edge treatment once
// content slides underneath (iOS 27 scroll-edge behavior).
export function TopBar({ onMenuClick, dateLabel, title = 'Compliance Overview', onExport, onImportFile }: TopBarProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={`glass-bar sticky top-0 z-20 ${scrolled ? 'scrolled' : ''}`}>
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <motion.button
          type="button"
          onClick={() => { tick(); onMenuClick(); }}
          aria-label="Open navigation"
          whileTap={{ scale: 0.92 }}
          transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-stone-300/70 dark:border-white/20 bg-white/60 dark:bg-white/10 text-stone-700 dark:text-stone-300 lg:hidden"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </motion.button>

        <div className="min-w-0 flex-1">
          <h1 className="display-tight truncate font-sans text-xl font-bold text-stone-900 dark:text-white sm:text-2xl">
            {title}
          </h1>
          <p className="truncate text-xs font-medium text-stone-600 dark:text-stone-400 sm:text-[13px]">
            {dateLabel} · Emergency equipment, medication, and supply checklists
          </p>
        </div>

        <div className="flex items-center gap-2">
          <motion.button
            type="button"
            onClick={() => { tick(); onExport(); }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
            className="h-9 rounded-full border border-stone-300/70 dark:border-white/20 bg-white/60 dark:bg-white/10 px-4 text-[13px] font-semibold text-stone-700 dark:text-stone-300"
          >
            Export
          </motion.button>
          <motion.label
            whileTap={{ scale: 0.95 }}
            transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
            className="flex h-9 cursor-pointer items-center rounded-full bg-stone-900 px-4 text-[13px] font-semibold text-white dark:bg-white dark:text-black"
          >
            Import
            <input
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onImportFile(f);
                e.target.value = '';
              }}
            />
          </motion.label>
        </div>
      </div>
    </header>
  );
}
