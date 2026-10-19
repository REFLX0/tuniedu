import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { requireApiSession } from '@/lib/auth';
import { generateAiTutorResponse } from '@/lib/ai-tutor';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireApiSession(req);
    if (auth.errorResponse) return auth.errorResponse;
    const user = store.users.find((u) => u.id === auth.user.id);
    if (!user) {
      return NextResponse.json({ error: 'Utilisateur introuvable.' }, { status: 403 });
    }

    // Role check: Only professors and admins can view proposal queues
    if (!user.roles.includes('PROFESSOR') && !user.roles.includes('ADMIN')) {
      return NextResponse.json(
        { error: 'Accès restreint: seuls les enseignants vérifiés et administrateurs peuvent consulter la file IA.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || undefined;

    // Professors see ONLY their proposals; Admins see all
    const teacherId = user.roles.includes('ADMIN') ? undefined : (user.professorProfile?.id || user.id);

    const proposals = store.getAiCorrectionProposals(teacherId, status);

    return NextResponse.json({
      success: true,
      proposals,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err instanceof Error ? err.message : '') || 'Erreur lors du chargement des propositions IA' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireApiSession(req);
    if (auth.errorResponse) return auth.errorResponse;
    const user = store.users.find((u) => u.id === auth.user.id);
    if (!user) {
      return NextResponse.json({ error: 'Utilisateur introuvable.' }, { status: 403 });
    }

    const body = await req.json();
    const { exerciseId, bookId, prompt, studentAnswer, expectedAnswer, chapterTitle, levelCode, stage } = body;

    if (!exerciseId || !studentAnswer) {
      return NextResponse.json(
        { error: 'Données manquantes (exerciseId, studentAnswer)' },
        { status: 400 }
      );
    }

    // Call AI Tutor in CORRECT_EXERCISE mode
    const aiResult = await generateAiTutorResponse({
      studentId: user.id,
      studentName: user.name,
      bookId,
      chapterTitle,
      levelStage: stage || 'COLLEGE',
      levelCode,
      mode: 'CORRECT_EXERCISE',
      prompt: `Correction de l'exercice : ${prompt}`,
      exerciseDetails: {
        exerciseId,
        prompt,
        studentAnswer,
        expectedAnswer,
      },
    });

    if (aiResult.correctionProposal) {
      store.addAiCorrectionProposal(aiResult.correctionProposal);
    }

    return NextResponse.json({
      success: true,
      message: aiResult.message,
      proposal: aiResult.correctionProposal,
      teacherValidationRequired: aiResult.teacherValidationRequired,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err instanceof Error ? err.message : '') || 'Erreur lors de la soumission de la correction' },
      { status: 500 }
    );
  }
}
