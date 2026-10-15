import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { checkBookAccess } from '@/lib/authorization';
import { requireApiSession } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ bookId: string; pageNumber: string }> }
) {
  const { bookId, pageNumber } = await params;
  const pageNum = parseInt(pageNumber, 10);

  // Authenticate user securely (SEC-01) — fail closed
  const auth = await requireApiSession(req);
  if (auth.errorResponse) return auth.errorResponse;
  const user = store.users.find((u) => u.id === auth.user.id);

  if (!user) {
    // SEC-01
    return NextResponse.json(
      { error: 'Non authentifié. Veuillez vous connecter.' },
      { status: 401 }
    );
  }

  // Find entitlement
  const entitlement = store.getEntitlement(user.id, bookId);

  // Authorization check (SEC-02, SEC-03, SEC-12)
  const authCheck = checkBookAccess({
    userId: user.id,
    bookId,
    entitlement: entitlement
      ? {
          id: entitlement.id,
          userId: entitlement.userId,
          bookId: entitlement.bookId,
          status: entitlement.status,
          startsAt: entitlement.startsAt,
          expiresAt: entitlement.expiresAt,
        }
      : null,
  });

  if (!authCheck.allowed) {
    return NextResponse.json(
      { error: authCheck.reason, code: 'FORBIDDEN' },
      { status: authCheck.code }
    );
  }

  // Find book
  const book = store.books.find((b) => b.id === bookId);
  if (!book || pageNum < 1 || pageNum > book.pageCount) {
    return NextResponse.json({ error: 'Page introuvable' }, { status: 404 });
  }

  // Mask user ID / email for watermark
  const maskEmail = (email: string) => {
    const [name, domain] = email.split('@');
    return `${name.slice(0, 2)}***@${domain}`;
  };

  // Return authorized page delivery metadata with dynamic watermark
  // Never expose raw PDF object keys or storage credentials!
  return NextResponse.json({
    bookId,
    pageNumber: pageNum,
    totalPages: book.pageCount,
    watermark: {
      accountMask: maskEmail(user.email),
      transactionRef: entitlement?.purchaseItemId || 'ENT-ACTIVE',
      timestamp: new Date().toISOString(),
    },
    expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 min short-lived access
  }, {
    headers: {
      'Cache-Control': 'no-store, private',
    },
  });
}
