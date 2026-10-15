'use client';

// =============================================================================
// TuniEdu Client Session Provider
// Hydrates the in-memory store with the authenticated user resolved from the
// HTTP-only session cookie, so client components can react to sign-in/out and
// survive hard page reloads.
// =============================================================================

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { store, type User } from '@/lib/store';

interface SessionContextValue {
  user: User | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue>({
  user: null,
  loading: true,
  refresh: async () => {},
  logout: async () => {},
});

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', { cache: 'no-store' });
      const data = await res.json();
      if (data?.authenticated && data.user) {
        store.upsertUser(data.user);
        store.setCurrentUser(data.user.id);
        setUser(data.user);
      } else {
        store.clearCurrentUser();
        setUser(null);
      }
    } catch {
      store.clearCurrentUser();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/me', { method: 'POST' });
    } catch {
      // ignore network errors; clear locally regardless
    }
    store.clearCurrentUser();
    setUser(null);
  }, []);

  return (
    <SessionContext.Provider value={{ user, loading, refresh, logout }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  return useContext(SessionContext);
}
