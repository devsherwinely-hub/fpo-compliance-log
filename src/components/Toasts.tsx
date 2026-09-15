import { useCallback, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';

export interface Toast {
  id: number;
  message: string;
  error?: boolean;
}

let nextId = 1;

export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((message: string, error = false) => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, message, error }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const stack = (
    <div aria-live="polite" className="pointer-events-none fixed bottom-5 left-1/2 z-[100] flex w-[min(92vw,420px)] -translate-x-1/2 flex-col gap-2">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ type: 'spring', bounce: 0.15, duration: 0.45 }}
            className={`pointer-events-auto rounded-2xl px-4 py-3 text-[13px] font-medium leading-snug shadow-xl backdrop-blur-xl ${
              t.error ? 'bg-alert-text/95 text-white' : 'bg-stone-900/90 text-white dark:bg-white dark:text-black'
            }`}
          >
            {t.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );

  return { push, stack };
}
