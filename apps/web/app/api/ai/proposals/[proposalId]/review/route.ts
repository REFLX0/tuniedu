import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { requireApiSession } from '@/lib/auth';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ proposalId: string }> }
) {
  try {
    const auth = await requireApiSession(req);
    if (auth.errorResponse) return auth.errorResponse;
    const user = store.users.find((u) => u.id === auth.user.id);
    if (!user) {
      return NextResponse.json({ error: 'Utilisateur introuvable.' }, { status: 403 });
    }

    // SEC-09/10: Only verified professors or admins can review educational corrections
    if (user.role !== 'PROFESSOR' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Seuls les enseignants vérifiés ou administrateurs peuvent valider les corrections IA.' },
        { status: 403 }
      );
    }

    const { proposalId } = await params;
    const body = await req.json();
    const { status, notes, editedSolution } = body;

    if (!status || !['APPROVED', 'EDITED', 'REJECTED'].includes(status)) {
      return NextResponse.json(
        { error: 'Statut de validation invalide (APPROVED, EDITED, REJECTED attendu).' },
        { status: 400 }
      );
    }

    const teacherId = user.professorProfile?.id || user.id;
    const reviewed = store.reviewAiCorrectionProposal(
      proposalId,
      teacherId,
      status,
      notes,
      editedSolution
    );

    if (!reviewed) {
      return NextResponse.json(
        { error: 'Proposition de correction introuvable.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      proposal: reviewed,
      message: `Correction ${status === 'APPROVED' ? 'approuvée' : status === 'EDITED' ? 'modifiée et approuvée' : 'rejetée'} avec succès.`,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err instanceof Error ? err.message : '') || 'Erreur lors de la validation enseignant' },
      { status: 500 }
    );
  }
}
