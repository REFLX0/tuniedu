import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { requireApiSession } from '@/lib/auth';
import { generateAiTutorResponse } from '@/lib/ai-tutor';
import { checkRateLimit } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  try {
    // 1. Layer 04/05 Rate limit: 20 AI prompts per minute per IP
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const rateCheck = await checkRateLimit(`ai_chat:${ip}`, 20, 60);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Trop de requêtes au Tuteur IA. Veuillez patienter une minute.' },
        { status: 429 }
      );
    }

    // 2. Resolve Authenticated User — fail closed
    const auth = await requireApiSession(req);
    if (auth.errorResponse) return auth.errorResponse;
    const user = store.users.find((u) => u.id === auth.user.id);
    if (!user) {
      return NextResponse.json({ error: 'Utilisateur introuvable.' }, { status: 403 });
    }

    const body = await req.json();
    const { prompt, bookId, chapterTitle, levelStage, levelCode, mode, language } = body;

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json({ error: 'La question ne peut pas être vide.' }, { status: 400 });
    }

    // Entitlement verification: If asking about a specific book, verify the user has access
    if (bookId && !user.roles.includes('ADMIN') && !user.roles.includes('PROFESSOR')) {
      const hasAccess = store.hasActiveEntitlement(user.id, bookId);
      if (!hasAccess) {
        return NextResponse.json(
          {
            error: 'Accès réservé: un abonnement actif à ce manuel est requis pour solliciter le tuteur pédagogique IA.',
            code: 'ENTITLEMENT_REQUIRED',
          },
          { status: 403 }
        );
      }
    }

    // 3. Persist Student's Prompt
    store.addAiMessage({
      userId: user.id,
      bookId,
      role: 'user',
      content: prompt,
    });

    // 4. Generate Pedagogical AI Response with INPDP compliance
    const aiResult = await generateAiTutorResponse({
      studentId: user.id,
      studentName: user.name,
      bookId,
      chapterTitle,
      levelStage: levelStage || 'COLLEGE',
      levelCode,
      mode: mode || 'EXPLAIN',
      prompt,
      language: language || 'fr',
    });

    // 5. Persist AI Assistant Response
    store.addAiMessage({
      userId: user.id,
      bookId,
      role: 'assistant',
      content: aiResult.message.content,
      pedagogicalRationale: aiResult.message.pedagogicalRationale,
      suggestedQuestions: aiResult.message.suggestedQuestions,
    });

    // 6. If teacher review is required, persist the proposal
    if (aiResult.correctionProposal) {
      store.addAiCorrectionProposal(aiResult.correctionProposal);
    }

    return NextResponse.json({
      success: true,
      message: aiResult.message,
      sanitization: {
        piiRedacted: aiResult.sanitization.piiRedacted,
        redactedTypes: aiResult.sanitization.redactedTypes,
      },
      teacherValidationRequired: aiResult.teacherValidationRequired,
      generation: aiResult.generation,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err instanceof Error ? err.message : '') || 'Erreur lors de la génération de la réponse IA' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireApiSession(req);
    if (auth.errorResponse) return auth.errorResponse;
    const userId = auth.user.id;
    const { searchParams } = new URL(req.url);
    const bookId = searchParams.get('bookId') || undefined;

    const messages = store.getAiMessages(userId, bookId);
    return NextResponse.json({ success: true, messages });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err instanceof Error ? err.message : '') || 'Erreur lors du chargement des messages' },
      { status: 500 }
    );
  }
}
