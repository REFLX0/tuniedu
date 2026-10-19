// =============================================================================
// TuniEdu Account Registration API: POST /api/auth/register
// Creates a real, database-backed account (Argon2id password), grants the
// appropriate role, then issues a JWT session (auto-login).
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { store } from '@/lib/store';
import { createSessionToken } from '@/lib/auth';
import { registerActiveSession } from '@/lib/session-manager';
import { registerAccount, RegistrationError } from '@/lib/account-service';

const RegisterSchema = z.object({
  accountType: z.enum(['STUDENT', 'PARENT', 'PROFESSOR']),
  fullName: z.string().trim().min(2, 'Nom complet requis.'),
  email: z.string().trim().email('Email invalide.'),
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères.'),
  phone: z.string().trim().optional(),
  childPublicId: z.string().trim().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const parsed = RegisterSchema.safeParse(body);

    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return NextResponse.json(
        { error: first?.message ?? 'Données d\'inscription invalides.' },
        { status: 400 }
      );
    }

    const input = parsed.data;
    if (input.accountType === 'PARENT' && !input.childPublicId) {
      return NextResponse.json(
        { error: 'Identifiant de l\'enfant requis pour un compte parent.' },
        { status: 400 }
      );
    }

    const user = await registerAccount(input);

    store.upsertUser(user);

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

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';
    await registerActiveSession({
      userId: user.id,
      sessionId: `sess_${Date.now()}`,
      ipAddress: ip,
      userAgent: req.headers.get('user-agent') || 'browser',
    });

    const res = NextResponse.json({ success: true, user }, { status: 201 });
    res.cookies.set('tuniedu_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 3600,
    });
    return res;
  } catch (error: unknown) {
    if (error instanceof RegistrationError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 409 });
    }
    return NextResponse.json(
      { error: (error instanceof Error ? error.message : '') || 'Erreur lors de l\'inscription.' },
      { status: 500 }
    );
  }
}
