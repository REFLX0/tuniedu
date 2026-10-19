export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string>;
}

// 1. Book Creation & Metadata Schema
export interface CreateBookInput {
  title: string;
  educationLevelId: string;
  subjectId: string;
  priceMillimes: number;
  description?: string;
  language?: string;
}

export function validateCreateBook(input: any): ValidationResult<CreateBookInput> {
  const errors: Record<string, string> = {};
  if (!input.title || typeof input.title !== 'string' || input.title.trim().length < 3) {
    errors.title = 'Le titre doit comporter au moins 3 caractères';
  }
  if (!input.educationLevelId || typeof input.educationLevelId !== 'string') {
    errors.educationLevelId = 'Niveau scolaire obligatoire';
  }
  if (!input.subjectId || typeof input.subjectId !== 'string') {
    errors.subjectId = 'Matière obligatoire';
  }
  const price = Number(input.priceMillimes);
  if (isNaN(price) || !Number.isInteger(price) || price <= 0) {
    errors.priceMillimes = 'Le prix doit être un entier positif en millimes (ex: 20000 = 20 DT)';
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, error: 'Validation échouée', fieldErrors: errors };
  }
  return {
    success: true,
    data: {
      title: input.title.trim(),
      educationLevelId: input.educationLevelId,
      subjectId: input.subjectId,
      priceMillimes: price,
      description: input.description?.trim(),
      language: input.language || 'fr',
    },
  };
}

// 2. Checkout & Cart Schema
// CRITICAL SECURITY RULE: SEC-04 - Server MUST ignore client priceMillimes!
export interface CheckoutInput {
  bookIds: string[];
  paymentProvider: 'FLOUCI' | 'KONNECT' | 'GPG';
  idempotencyKey: string;
  childId?: string;
}

export function validateCheckout(input: any): ValidationResult<CheckoutInput> {
  const errors: Record<string, string> = {};
  if (!input.bookIds || !Array.isArray(input.bookIds) || input.bookIds.length === 0) {
    errors.bookIds = 'Au moins un manuel doit être sélectionné pour le panier';
  }
  if (!input.paymentProvider || !['FLOUCI', 'KONNECT', 'GPG'].includes(input.paymentProvider)) {
    errors.paymentProvider = 'Fournisseur de paiement invalide (options: FLOUCI, KONNECT, GPG)';
  }
  if (!input.idempotencyKey || typeof input.idempotencyKey !== 'string') {
    errors.idempotencyKey = 'Clé d\'idempotence obligatoire';
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, error: 'Données de paiement invalides', fieldErrors: errors };
  }
  return {
    success: true,
    data: {
      bookIds: input.bookIds,
      paymentProvider: input.paymentProvider,
      idempotencyKey: input.idempotencyKey,
      childId: typeof input.childId === 'string' ? input.childId.trim() : undefined,
    },
  };
}

// 3. Academic Year Configuration
// CRITICAL RULE: Configurable academic-year records with explicit start and end instants in Africa/Tunis
export interface AcademicYearConfigInput {
  name: string;
  startsAt: string; // ISO
  endsAt: string;   // ISO
  timezone: string;
  isActive: boolean;
}

export function validateAcademicYearConfig(input: any): ValidationResult<AcademicYearConfigInput> {
  const errors: Record<string, string> = {};
  if (!input.name || typeof input.name !== 'string') {
    errors.name = 'Le libellé de l\'année scolaire est obligatoire (ex: 2026-2027)';
  }
  const startDate = new Date(input.startsAt);
  const endDate = new Date(input.endsAt);
  if (isNaN(startDate.getTime())) {
    errors.startsAt = 'Date de début invalide';
  }
  if (isNaN(endDate.getTime())) {
    errors.endsAt = 'Date de fin invalide';
  }
  if (startDate >= endDate) {
    errors.endsAt = 'La date de fin doit être postérieure à la date de début';
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, error: 'Configuration calendrier invalide', fieldErrors: errors };
  }
  return {
    success: true,
    data: {
      name: input.name,
      startsAt: startDate.toISOString(),
      endsAt: endDate.toISOString(),
      timezone: input.timezone || 'Africa/Tunis',
      isActive: Boolean(input.isActive),
    },
  };
}

// 4. Parent Invitation & Child Linking
export interface ParentInviteInput {
  childEmailOrPhone: string;
  relationship: string;
}

export function validateParentInvite(input: any): ValidationResult<ParentInviteInput> {
  const errors: Record<string, string> = {};
  if (!input.childEmailOrPhone || typeof input.childEmailOrPhone !== 'string') {
    errors.childEmailOrPhone = 'Email ou numéro de téléphone de l\'élève obligatoire';
  }
  if (Object.keys(errors).length > 0) {
    return { success: false, error: 'Invitation invalide', fieldErrors: errors };
  }
  return {
    success: true,
    data: {
      childEmailOrPhone: input.childEmailOrPhone.trim(),
      relationship: input.relationship || 'PARENT',
    },
  };
}
