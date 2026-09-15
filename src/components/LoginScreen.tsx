import { useState } from 'react';
import { motion } from 'motion/react';
import { signInWithGoogle } from '../lib/supabase';
import { tick } from '../lib/haptics';

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M23.5 12.3c0-.9-.1-1.5-.3-2.3H12v4.3h6.5c-.1 1.1-.8 2.7-2.4 3.8l-.1.1 3.5 2.7.2.1c2.2-2 3.8-5 3.8-8.7z" />
      <path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.8-2.9c-1 .7-2.4 1.2-4.1 1.2-3.1 0-5.8-2.1-6.8-5l-.1.1-3.6 2.8v.1C3.5 21.3 7.4 24 12 24z" />
      <path fill="#FBBC05" d="M5.2 14.4c-.2-.7-.4-1.5-.4-2.4s.1-1.7.4-2.4l-.1-.1-3.5-2.7-.1.1C.6 8.7 0 10.2 0 12s.6 3.3 1.6 4.8l3.6-2.4z" />
      <path fill="#EA4335" d="M12 4.7c1.8 0 3 .8 3.7 1.4l3.3-3.2C17.9 1.1 15.2 0 12 0 7.4 0 3.5 2.7 1.6 6.8l3.6 2.9c1-2.9 3.7-5 6.8-5z" />
    </svg>
  );
}

export function LoginScreen({ error }: { error?: string | null }) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);

  const go = async () => {
    tick();
    setBusy(true);
    setFailed(null);
    try {
      await signInWithGoogle();
      // Browser leaves for Google; session resumes on redirect.
    } catch (e) {
      setFailed(e instanceof Error ? e.message : 'Sign-in failed');
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-paper px-4 font-sans">
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', bounce: 0, duration: 0.5 }}
        className="glass-card w-full max-w-sm rounded-3xl p-8 text-center"
      >
        <span
          aria-hidden
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-stone-900 text-xl font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]"
        >
          F
        </span>
        <h1 className="display-tight mt-4 text-2xl font-bold text-stone-900">
          FPO Safety &amp; Compliance Log
        </h1>
        <p className="mt-1.5 text-[13px] leading-relaxed text-stone-600">
          Clinical checklist compliance for your practice. Sign in with your Google workspace account to continue.
        </p>

        <motion.button
          type="button"
          onClick={go}
          disabled={busy}
          whileTap={{ scale: 0.97 }}
          transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
          className="mt-6 flex h-12 w-full items-center justify-center gap-3 rounded-full border border-stone-300/70 bg-white/70 text-[15px] font-semibold text-stone-900 shadow-sm disabled:opacity-60"
        >
          <GoogleMark />
          {busy ? 'Redirecting…' : 'Continue with Google'}
        </motion.button>

        {(failed || error) && (
          <p role="alert" className="mt-3 rounded-xl bg-alert-bg px-3 py-2 text-[13px] font-medium text-alert-text">
            {failed || error}
          </p>
        )}

        <p className="mt-5 font-mono text-[11px] leading-relaxed text-stone-600">
          Access is limited to authorized staff.
          <br />
          All entries are audit-logged.
        </p>
      </motion.div>
    </div>
  );
}
