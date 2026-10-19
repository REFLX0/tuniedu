import { UserRole, EntitlementStatus, ProfessorStatus } from '@tuniedu/shared-types';

export interface AuthUser {
  id: string;
  name: string;
  email?: string | null;
  roles: UserRole[];
  professorProfile?: {
    id: string;
    status: ProfessorStatus;
  } | null;
}

export interface EntitlementCheckContext {
  userId: string;
  bookId: string;
  now?: Date;
  entitlement?: {
    id: string;
    userId: string;
    bookId: string;
    status: EntitlementStatus;
    startsAt: Date | string;
    expiresAt: Date | string;
  } | null;
  linkedParentUserIds?: string[];
}

export interface AuthorizationResult {
  allowed: boolean;
  code: number;
  reason?: string;
}

/**
 * Checks if user is authenticated (SEC-01)
 */
export function requireAuthenticated(user: AuthUser | null | undefined): AuthorizationResult {
  if (!user || !user.id) {
    return { allowed: false, code: 401, reason: 'Authentification requise' };
  }
  return { allowed: true, code: 200 };
}

/**
 * Checks if user has a specific role (SEC-16)
 */
export function requireRole(user: AuthUser | null | undefined, role: UserRole): AuthorizationResult {
  const authCheck = requireAuthenticated(user);
  if (!authCheck.allowed) return authCheck;

  if (!user?.roles.includes(role)) {
    return { allowed: false, code: 403, reason: `Rôle requis non accordé: ${role}` };
  }
  return { allowed: true, code: 200 };
}

/**
 * Checks if user has valid, unexpired entitlement for a book (SEC-02, SEC-12)
 * Critical rule: startsAt <= now < expiresAt
 */
export function checkBookAccess(ctx: EntitlementCheckContext): AuthorizationResult {
  if (!ctx.userId) {
    return { allowed: false, code: 401, reason: 'Authentification requise pour lire ce manuel' };
  }

  if (!ctx.entitlement) {
    return { allowed: false, code: 403, reason: 'Aucun droit d\'accès actif trouvé pour ce manuel' };
  }

  const isOwner =
    ctx.entitlement.userId === ctx.userId ||
    Boolean(ctx.linkedParentUserIds && ctx.linkedParentUserIds.includes(ctx.entitlement.userId));

  if (!isOwner) {
    return { allowed: false, code: 403, reason: 'Ce droit d\'accès appartient à un autre compte' };
  }

  if (ctx.entitlement.bookId !== ctx.bookId) {
    return { allowed: false, code: 403, reason: 'Ce droit d\'accès ne correspond pas au manuel demandé' };
  }

  if (ctx.entitlement.status !== 'ACTIVE') {
    return { allowed: false, code: 403, reason: `Accès révoqué ou inactif (${ctx.entitlement.status})` };
  }

  const now = ctx.now ? ctx.now.getTime() : Date.now();
  const startsAt = new Date(ctx.entitlement.startsAt).getTime();
  const expiresAt = new Date(ctx.entitlement.expiresAt).getTime();

  if (now < startsAt) {
    return { allowed: false, code: 403, reason: 'La période de validité du droit d\'accès n\'a pas encore commencé' };
  }

  if (now >= expiresAt) {
    return { allowed: false, code: 403, reason: 'Votre accès a expiré à la fin de l\'année scolaire tunisienne' };
  }

  return { allowed: true, code: 200 };
}

/**
 * Checks if professor can access or edit book draft (SEC-09)
 */
export function checkProfessorBookOwnership(
  user: AuthUser | null | undefined,
  bookProfessorId: string
): AuthorizationResult {
  const authCheck = requireRole(user, 'PROFESSOR');
  if (!authCheck.allowed) return authCheck;

  if (user?.roles.includes('ADMIN')) {
    return { allowed: true, code: 200 };
  }

  if (!user?.professorProfile || user.professorProfile.id !== bookProfessorId) {
    return { allowed: false, code: 403, reason: 'Vous ne pouvez pas modifier le brouillon d\'un autre professeur' };
  }

  return { allowed: true, code: 200 };
}

/**
 * Checks if professor can publish book (SEC-10)
 * Only VERIFIED professors can publish.
 */
export function checkProfessorPublishPermission(user: AuthUser | null | undefined): AuthorizationResult {
  const authCheck = requireRole(user, 'PROFESSOR');
  if (!authCheck.allowed) return authCheck;

  if (user?.professorProfile?.status !== 'VERIFIED') {
    return {
      allowed: false,
      code: 403,
      reason: 'Votre profil professeur doit être vérifié par l\'administration avant publication',
    };
  }

  return { allowed: true, code: 200 };
}

/**
 * Checks parent-child link authorization (SEC-11)
 */
export function checkParentChildAccess(
  user: AuthUser | null | undefined,
  childId: string,
  activeChildIds: string[]
): AuthorizationResult {
  const authCheck = requireRole(user, 'PARENT');
  if (!authCheck.allowed) return authCheck;

  if (!activeChildIds.includes(childId)) {
    return {
      allowed: false,
      code: 403,
      reason: 'Accès refusé: cet élève n\'est pas lié à votre compte parent vérifié',
    };
  }

  return { allowed: true, code: 200 };
}
