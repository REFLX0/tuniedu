// =============================================================================
// TuniEdu Live Chat API: GET & POST /api/lives/[liveId]/chat
// Moderated real-time live session chat with rate limiting and professor announcements
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { requireApiSession } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';
import type { UserRole } from '@/lib/authorization';
import { createChatMessage, listChatMessages } from '@/lib/media-service';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ liveId: string }> }
) {
  const { liveId } = await params;
  // Chat retrieval is a protected read: require a valid session (fail closed)
  const auth = await requireApiSession(req);
  if (auth.errorResponse) return auth.errorResponse;
    const messages = (await listChatMessages(liveId, 200)) as unknown as ReturnType<typeof store.getLiveChatMessages>;
    return NextResponse.json({
      messages,
      count: messages.length,
    });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ liveId: string }> }
) {
  try {
    const { liveId } = await params;
    const auth = await requireApiSession(req);
    if (auth.errorResponse) return auth.errorResponse;
    const user = store.users.find((u) => u.id === auth.user.id);

    if (!user) {
      return NextResponse.json({ error: 'Authentification requise pour chatter.' }, { status: 401 });
    }

    // Rate limiting: 10 chat messages per minute per user
    const rate = await rateLimit(`chat:${user.id}`, { maxRequests: 10, windowSeconds: 60 });
    if (!rate.success) {
      return NextResponse.json(
        { error: 'Veuillez patienter quelques secondes avant d’envoyer un nouveau message.' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { message, isQuestion } = body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ error: 'Le message ne peut pas être vide.' }, { status: 400 });
    }

    if (message.length > 500) {
      return NextResponse.json({ error: 'Le message ne doit pas dépasser 500 caractères.' }, { status: 400 });
    }

    const isProfessor = user.roles.includes('PROFESSOR') || user.roles.includes('ADMIN');

    const created = await createChatMessage({
      liveSessionId: liveId,
      userId: user.id,
      userName: user.name,
      userRole: (user.roles[0] as UserRole) || 'STUDENT',
      message: message.trim(),
      isQuestion: Boolean(isQuestion),
      isPinned: Boolean(isProfessor && body.pinMessage),
    });

    return NextResponse.json({
      success: true,
      message: created,
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error instanceof Error ? error.message : '') || 'Erreur chat' }, { status: 500 });
  }
}
