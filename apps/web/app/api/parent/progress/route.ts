import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { requireApiSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireApiSession(req);
    if (auth.errorResponse) return auth.errorResponse;
    const user = store.users.find((u) => u.id === auth.user.id);
    if (!user) {
      return NextResponse.json({ error: 'Utilisateur introuvable.' }, { status: 403 });
    }

    // Verification: parent or admin
    if (user.role !== 'PARENT' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Accès restreint à l\'espace parental.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const childId = searchParams.get('childId') || undefined;

    const progress = store.getChildProgress(user.id, childId);

    // List all children linked to this parent
    const links = store.parentLinks.filter((l) => l.parentId === user.id && l.status === 'ACTIVE');
    const linkedChildren = links.map((l) => {
      const child = store.users.find((u) => u.id === l.childId);
      return {
        id: l.childId,
        name: child?.name || 'Élève',
        avatar: child?.avatar || '👨‍🎓',
      };
    });

    return NextResponse.json({
      success: true,
      progress,
      linkedChildren,
      activeChildId: progress.childId,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err instanceof Error ? err.message : '') || 'Erreur lors de la récupération des statistiques parentales' },
      { status: 500 }
    );
  }
}
