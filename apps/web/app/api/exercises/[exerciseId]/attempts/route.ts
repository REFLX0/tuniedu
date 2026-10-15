import { NextRequest, NextResponse } from 'next/server';
import { store, type Exercise } from '@/lib/store';
import { requireApiSession } from '@/lib/auth';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ exerciseId: string }> }
) {
  try {
    const { exerciseId } = await params;
    const body = await req.json();
    const { answer } = body;

    const auth = await requireApiSession(req);
    if (auth.errorResponse) return auth.errorResponse;
    const userId = auth.user.id;

    // Locate exercise
    let targetEx: Exercise | undefined;
    let targetBookId = '';
    for (const b of store.books) {
      for (const ch of b.chapters) {
        const found = ch.exercises.find((e) => e.id === exerciseId);
        if (found) {
          targetEx = found;
          targetBookId = b.id;
          break;
        }
      }
    }

    if (!targetEx) {
      return NextResponse.json({ error: 'Exercice non trouvé' }, { status: 404 });
    }

    // Submit attempt
    const attempt = store.submitExerciseAttempt(userId, exerciseId, answer || '');

    // Authorization check for confidential answerKey & solution:
    // Only users with active entitlement get the full solution demonstration!
    const hasAccess = store.hasActiveEntitlement(userId, targetBookId);

    return NextResponse.json({
      attemptId: attempt.id,
      isCorrect: attempt.isCorrect,
      score: attempt.score,
      // Confidential fields released ONLY if entitlement is active
      correction: hasAccess
        ? {
            answerKey: targetEx.answerKey,
            solution: targetEx.solution,
          }
        : null,
      accessRequiredToViewSolution: !hasAccess,
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err instanceof Error ? err.message : '') }, { status: 500 });
  }
}
