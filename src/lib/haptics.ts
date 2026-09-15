// Haptics — Vibration API fired on the causal frame (same event as the
// visual commit), reserved for meaningful moments: toggle flips, saves,
// snaps. Silent when unsupported or when reduced motion is preferred.

function canBuzz(): boolean {
  if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return false;
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    return false;
  }
  return true;
}

/** Light tick — toggle flips, segment changes, tab switches. */
export function tick(): void {
  if (canBuzz()) navigator.vibrate(8);
}

/** Success thud — entry saved, undo committed. */
export function thud(): void {
  if (canBuzz()) navigator.vibrate([12, 30, 18]);
}
