// =============================================================================
// TuniEdu Account Service (server-only)
// Real, database-backed authentication & registration.
//
//   - Credentials live in PostgreSQL (Prisma) with Argon2id password hashes.
//   - No passwordless / demo-role login: a valid passwordHash + verify() is
//     required for every session.
//   - Registered accounts are granted a UserRoleAssignment and, where relevant,
//     a ProfessorProfile / ParentChildLink.
//
// The app's in-memory catalog store is hydrated with a projection of the DB
// user (see `toStoreUser`) so existing UI code keeps working unchanged.
// =============================================================================

import 'server-only';
import argon2 from 'argon2';
import {
  prisma,
  UserRole,
  AccountStatus,
  ProfessorStatus,
  ParentLinkStatus,
  Prisma,
} from '@tuniedu/database';
import type { User as StoreUser } from '@/lib/store';

const ROLE_PRIORITY: UserRole[] = [
  UserRole.ADMIN,
  UserRole.PROFESSOR,
  UserRole.PARENT,
  UserRole.STUDENT,
  UserRole.REVIEWER,
];

const BLOCKED_STATUSES: AccountStatus[] = [
  AccountStatus.BANNED,
  AccountStatus.DELETED,
  AccountStatus.SUSPENDED,
];

type DbUserWithRelations = Prisma.UserGetPayload<{
  include: { roles: true; professor: true };
}>;

// ── Password hashing (Argon2id) ─────────────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}

// ── Mapping DB user -> in-memory store user projection ──────────────────────

function pickPrimaryRole(roles: UserRole[]): StoreUser['role'] {
  for (const role of ROLE_PRIORITY) {
    if (roles.includes(role)) return role as StoreUser['role'];
  }
  return 'STUDENT';
}

export function toStoreUser(user: DbUserWithRelations): StoreUser {
  const roles = user.roles.map((r) => r.role as string);
  const role = pickPrimaryRole(user.roles.map((r) => r.role));

  return {
    id: user.id,
    name: user.name,
    email: user.email ?? '',
    phone: user.phone ?? undefined,
    role,
    roles: roles.length > 0 ? roles : [role],
    childPublicId: user.childPublicId ?? undefined,
    avatar: user.avatarUrl ?? undefined,
    professorProfile: user.professor
      ? {
          id: user.professor.id,
          displayName: user.professor.displayName,
          biography: user.professor.biography ?? '',
          status: user.professor.status as NonNullable<StoreUser['professorProfile']>['status'],
          verifiedAt: user.professor.verifiedAt?.toISOString(),
          payoutReference: user.professor.payoutRibEncrypted ?? undefined,
        }
      : undefined,
  };
}

const USER_INCLUDE = { roles: true, professor: true } as const;

export async function loadStoreUserById(id: string): Promise<StoreUser | null> {
  const user = await prisma.user.findUnique({ where: { id }, include: USER_INCLUDE });
  if (!user || user.deletedAt) return null;
  return toStoreUser(user);
}

// ── Authentication ──────────────────────────────────────────────────────────

/**
 * Verifies credentials against the database. Returns the store projection on
 * success, or null on any failure (unknown account, no password set, blocked
 * status, or wrong password). Never throws for invalid credentials.
 */
export async function authenticateUser(
  identity: string,
  password: string
): Promise<StoreUser | null> {
  const raw = (identity ?? '').trim();
  if (!raw || !password) return null;

  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: raw.toLowerCase() }, { phone: raw }],
      deletedAt: null,
    },
    include: USER_INCLUDE,
  });

  if (!user || !user.passwordHash) return null;
  if (BLOCKED_STATUSES.includes(user.status)) return null;

  const valid = await verifyPassword(user.passwordHash, password);
  if (!valid) return null;

  return toStoreUser(user);
}

// ── Registration ────────────────────────────────────────────────────────────

export type RegisterAccountType = 'STUDENT' | 'PARENT' | 'PROFESSOR';

export class RegistrationError extends Error {
  code: 'EMAIL_TAKEN' | 'PHONE_TAKEN' | 'CHILD_NOT_FOUND' | 'BAD_INPUT';
  constructor(code: RegistrationError['code'], message: string) {
    super(message);
    this.code = code;
    this.name = 'RegistrationError';
  }
}

export interface RegisterAccountInput {
  accountType: RegisterAccountType;
  fullName: string;
  email: string;
  password: string;
  phone?: string;
  childPublicId?: string;
}

function generateChildPublicId(): string {
  const digits = Math.floor(1000 + Math.random() * 9000);
  return `TUN-${digits}`;
}

export async function registerAccount(input: RegisterAccountInput): Promise<StoreUser> {
  const name = input.fullName.trim();
  const email = input.email.trim().toLowerCase();
  const phone = input.phone?.trim() || undefined;

  if (!name || !email || !input.password) {
    throw new RegistrationError('BAD_INPUT', 'Champs obligatoires manquants.');
  }

  const role =
    input.accountType === 'PROFESSOR'
      ? UserRole.PROFESSOR
      : input.accountType === 'PARENT'
      ? UserRole.PARENT
      : UserRole.STUDENT;

  const passwordHash = await hashPassword(input.password);

  // Resolve the linked child BEFORE creating the account (for parent signups).
  let child: { id: string } | null = null;
  if (input.accountType === 'PARENT') {
    const childCode = input.childPublicId?.trim();
    if (!childCode) {
      throw new RegistrationError('BAD_INPUT', 'Identifiant de l\'enfant requis.');
    }
    child = await prisma.user.findUnique({
      where: { childPublicId: childCode.toUpperCase() },
      select: { id: true },
    });
    if (!child) {
      throw new RegistrationError('CHILD_NOT_FOUND', 'Identifiant de l\'enfant introuvable.');
    }
  }

  try {
    const user = await prisma.user.create({
      data: {
        name,
        email,
        phone: phone ?? null,
        passwordHash,
        status: AccountStatus.ACTIVE,
        childPublicId: input.accountType === 'STUDENT' ? generateChildPublicId() : null,
        roles: { create: [{ role }] },
        ...(input.accountType === 'PROFESSOR'
          ? {
              professor: {
                create: {
                  displayName: name,
                  status: ProfessorStatus.PENDING,
                  specialization: [],
                },
              },
            }
          : {}),
        ...(input.accountType === 'PARENT' && child
          ? {
              parentLinks: {
                create: [
                  {
                    childId: child.id,
                    status: ParentLinkStatus.ACTIVE,
                    approvedAt: new Date(),
                  },
                ],
              },
            }
          : {}),
      },
      include: USER_INCLUDE,
    });

    return toStoreUser(user);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      const target = (err.meta?.target as string[] | undefined)?.join(',') ?? '';
      if (target.includes('phone')) {
        throw new RegistrationError('PHONE_TAKEN', 'Ce numéro de téléphone est déjà utilisé.');
      }
      throw new RegistrationError('EMAIL_TAKEN', 'Un compte existe déjà avec cet email.');
    }
    throw err;
  }
}
