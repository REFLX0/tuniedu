import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const bookId = searchParams.get('bookId');

    const trimesters = store.getTrimesters();
    const activeTrimester = store.getActiveTrimester();

    let pricing = undefined;
    if (bookId) {
      pricing = store.getBookPricing(bookId);
    }

    return NextResponse.json({
      success: true,
      trimesters,
      activeTrimester,
      pricing,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err instanceof Error ? err.message : '') || 'Erreur lors du chargement des trimestres' },
      { status: 500 }
    );
  }
}
