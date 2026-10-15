// =============================================================================
// TuniEdu Authentication API: GET /api/auth/me & POST /api/auth/logout
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { store } from '@/lib/store';

export async function GET(req: NextRequest) {
  const sessionUser = await getSessionUser(req);
  if (!sessionUser) {
    // Fail closed: never leak an identity for unauthenticated requests
    return NextResponse.json({
      authenticated: false,
      user: null,
    });
  }

  // getSessionUser hydrates the store; return the full projection when present.
  const storeUser = store.users.find((u) => u.id === sessionUser.id) ?? null;

  return NextResponse.json({
    authenticated: true,
    user: storeUser ?? sessionUser,
  });
}

export async function POST() {
  const res = NextResponse.json({ success: true, message: 'Déconnexion réussie' });
  res.cookies.delete('tuniedu_session');
  return res;
}
