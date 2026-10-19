// =============================================================================
// TuniEdu Input Validation Schemas
// SEC-04, SEC-05, SEC-08: Strict input sanitization and boundary checking
// =============================================================================

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

export function validateCreateBook(input: unknown): ValidationResult<CreateBookInput> {
  const errors: Record<string, string> = {};
  const data = (input ?? {}) as Record<string, unknown>;
  if (!data.title || typeof data.title !== 'string' || data.title.trim().length < 3) {
    errors.title = 'Le titre doit comporter au moins 3 caractères';
  }
  if (!data.educationLevelId || typeof data.educationLevelId !== 'string') {
    errors.educationLevelId = 'Niveau scolaire obligatoire';
  }
  if (!data.subjectId || typeof data.subjectId !== 'string') {
    errors.subjectId = 'Matière obligatoire';
  }
  const price = Number(data.priceMillimes);
  if (isNaN(price) || !Number.isInteger(price) || price <= 0) {
    errors.priceMillimes = 'Le prix doit être un entier positif en millimes (ex: 20000 = 20 DT)';
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, error: 'Validation échouée', fieldErrors: errors };
  }
  return {
    success: true,
    data: {
      title: (data.title as string).trim(),
      educationLevelId: data.educationLevelId as string,
      subjectId: data.subjectId as string,
      priceMillimes: price,
      description: typeof data.description === 'string' ? data.description.trim() : undefined,
      language: typeof data.language === 'string' ? data.language : 'fr',
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

export function validateCheckout(input: unknown): ValidationResult<CheckoutInput> {
  const errors: Record<string, string> = {};
  const data = (input ?? {}) as Record<string, unknown>;
  if (!data.bookIds || !Array.isArray(data.bookIds) || data.bookIds.length === 0) {
    errors.bookIds = 'Au moins un manuel doit être sélectionné pour le panier';
  }
  if (!data.paymentProvider || !['FLOUCI', 'KONNECT', 'GPG'].includes(data.paymentProvider as string)) {
    errors.paymentProvider = 'Fournisseur de paiement invalide (options: FLOUCI, KONNECT, GPG)';
  }
  if (!data.idempotencyKey || typeof data.idempotencyKey !== 'string') {
    errors.idempotencyKey = 'Clé d\'idempotence obligatoire';
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, error: 'Données de paiement invalides', fieldErrors: errors };
  }
  return {
    success: true,
    data: {
      bookIds: data.bookIds as string[],
      paymentProvider: data.paymentProvider as CheckoutInput['paymentProvider'],
      idempotencyKey: data.idempotencyKey as string,
      childId: typeof data.childId === 'string' ? data.childId.trim() : undefined,
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

export function validateAcademicYearConfig(input: unknown): ValidationResult<AcademicYearConfigInput> {
  const errors: Record<string, string> = {};
  const data = (input ?? {}) as Record<string, unknown>;
  if (!data.name || typeof data.name !== 'string') {
    errors.name = 'Le libellé de l\'année scolaire est obligatoire (ex: 2026-2027)';
  }
  const startDate = new Date(data.startsAt as string);
  const endDate = new Date(data.endsAt as string);
  if (isNaN(startDate.getTime())) {
    errors.startsAt = 'Date de rentrée invalide (format ISO requis)';
  }
  if (isNaN(endDate.getTime())) {
    errors.endsAt = 'Date de clôture invalide (format ISO requis)';
  }
  if (startDate >= endDate) {
    errors.dates = 'La date de rentrée doit précéder strictement la date de clôture de l\'année scolaire';
  }
  if (!data.timezone || data.timezone !== 'Africa/Tunis') {
    errors.timezone = 'Le fuseau horaire légal doit être Africa/Tunis';
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, error: 'Configuration d\'année scolaire invalide', fieldErrors: errors };
  }
  return {
    success: true,
    data: {
      name: (data.name as string).trim(),
      startsAt: data.startsAt as string,
      endsAt: data.endsAt as string,
      timezone: data.timezone as string,
      isActive: Boolean(data.isActive),
    },
  };
}
