import { useEffect, useRef, useState } from 'react';

// Animated numeral: counts from the live on-screen value to the next over
// ~600ms ease-out. Jumps instantly under reduced motion.
// Purpose: state indication — the numbers visibly arrive with the data.
export function useCountUp(target: number, duration = 600): number {
  const [value, setValue] = useState(0);
  const latest = useRef(0);

  useEffect(() => {
    const from = latest.current;
    if (from === target) {
      setValue(target);
      return;
    }
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      latest.current = target;
      setValue(target);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const v = Math.round(from + (target - from) * eased);
      latest.current = v;
      setValue(v);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
}
