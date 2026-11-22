import { revokeSession } from '@/lib/api/client';
import { clearSession, getRefreshToken } from '@/lib/auth/session-store';
import { queryClient } from '@/lib/query-client';

export async function logout(): Promise<void> {
  const refreshToken = getRefreshToken();
  clearSession();
  queryClient.clear();

  if (!refreshToken) {
    return;
  }

  try {
    const response = await revokeSession(refreshToken);
    if (!response.ok) {
      console.warn('The logout endpoint did not revoke the session.', response.status);
    }
  } catch (error) {
    console.warn('Unable to revoke the session on the server; local data was cleared.', error);
  }
}
