// =============================================================================
// TuniEdu Authentication API: POST /api/auth/login
// Verifies credentials against PostgreSQL (Argon2id) and issues a JWT session.
// There is NO passwordless / demo-role login path.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { createSessionToken } from '@/lib/auth';
import { registerActiveSession } from '@/lib/session-manager';
import { authenticateUser } from '@/lib/account-service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const emailOrPhone: string = body?.emailOrPhone ?? '';
    const password: string = body?.password ?? '';

    if (!emailOrPhone || !password) {
      return NextResponse.json(
        { error: 'Email/téléphone et mot de passe requis.' },
        { status: 400 }
      );
    }

    // 1. Verify credentials against the database (constant behaviour on failure).
    const user = await authenticateUser(emailOrPhone, password);
    if (!user) {
      return NextResponse.json(
        { error: 'Identifiants invalides.' },
        { status: 401 }
      );
    }

    // 2. Hydrate the in-memory registry with the authenticated identity.
    store.upsertUser(user);

    // 3. Issue signed JWT session token
    const token = await createSessionToken({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      roles: user.roles,
      childPublicId: user.childPublicId,
      professorProfile: user.professorProfile
        ? { id: user.professorProfile.id, status: user.professorProfile.status }
        : null,
    });

    // 4. Register single active session (SEC-18)
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';
    await registerActiveSession({
      userId: user.id,
      sessionId: `sess_${Date.now()}`,
      ipAddress: ip,
      userAgent: req.headers.get('user-agent') || 'browser',
    });

    // 5. Build response with secure HTTP-only cookie
    const res = NextResponse.json({ success: true, user });

    res.cookies.set('tuniedu_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 3600, // 7 days
    });

    return res;
  } catch (error: unknown) {
    return NextResponse.json(
      { error: (error instanceof Error ? error.message : '') || 'Erreur lors de la connexion' },
      { status: 500 }
    );
  }
}
