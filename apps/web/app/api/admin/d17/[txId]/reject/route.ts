import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { requireApiSession } from '@/lib/auth';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ txId: string }> }
) {
  try {
    const auth = await requireApiSession(req);
    if (auth.errorResponse) return auth.errorResponse;
    const user = store.users.find((u) => u.id === auth.user.id);

    if (!user || !user.roles.includes('ADMIN')) {
      return NextResponse.json(
        { error: 'Accès réservé aux administrateurs de la plateforme.' },
        { status: 403 }
      );
    }

    const { txId } = await params;
    const body = await req.json().catch(() => ({}));
    const reason = body?.reason || 'Reçu non conforme aux relevés CCP';

    const result = store.rejectD17Transaction(txId, reason);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Impossible de rejeter cette transaction.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Transaction ${txId} rejetée.`,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: (error instanceof Error ? error.message : '') || 'Erreur rejet D17' },
      { status: 500 }
    );
  }
}
