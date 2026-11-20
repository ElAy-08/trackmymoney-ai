import { useSyncExternalStore } from 'react';
import {
  getSession,
  subscribeToSession,
  type SessionState,
} from '@/lib/auth/session-store';

export function useSession(): SessionState {
  return useSyncExternalStore(subscribeToSession, getSession, getSession);
}
