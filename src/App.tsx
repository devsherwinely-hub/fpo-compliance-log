import { MotionConfig } from 'motion/react';
import { Dashboard } from './components/Dashboard';
import { LoginScreen } from './components/LoginScreen';
import { useSession } from './hooks/useSession';
import { isSupabaseConfigured } from './lib/supabase';

export default function App() {
  const { user, loading } = useSession();

  return (
    <MotionConfig reducedMotion="user">
      {loading ? (
        <div className="flex min-h-dvh items-center justify-center bg-paper" aria-busy="true" aria-label="Loading">
          <div className="glass-card h-16 w-16 animate-pulse rounded-3xl" />
        </div>
      ) : user || !isSupabaseConfigured ? (
        <Dashboard user={user} />
      ) : (
        <LoginScreen />
      )}
    </MotionConfig>
  );
}
