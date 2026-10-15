export type UserRole = 'STUDENT' | 'PARENT' | 'PROFESSOR' | 'REVIEWER' | 'ADMIN';

export type AccountStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'DELETED';

export type ProfessorStatus = 'PENDING' | 'VERIFIED' | 'REJECTED' | 'SUSPENDED';

export type BookStatus = 'DRAFT' | 'PROCESSING' | 'IN_REVIEW' | 'PUBLISHED' | 'REJECTED' | 'ARCHIVED';

export type ProcessingStatus = 'QUEUED' | 'PROCESSING' | 'READY' | 'FAILED';

export type PurchaseStatus = 'PENDING' | 'PAID' | 'PARTIALLY_REFUNDED' | 'REFUNDED' | 'FAILED' | 'CANCELLED' | 'DISPUTED';

export type PaymentStatus = 'CREATED' | 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED' | 'EXPIRED' | 'REFUNDED' | 'DISPUTED';

export type EntitlementStatus = 'ACTIVE' | 'EXPIRED' | 'REVOKED';

export type ParentLinkStatus = 'PENDING' | 'ACTIVE' | 'REVOKED' | 'EXPIRED';

export type ExerciseType = 'MULTIPLE_CHOICE' | 'NUMERIC' | 'SHORT_TEXT' | 'LONG_TEXT' | 'FILE_UPLOAD';

export type AttemptStatus = 'IN_PROGRESS' | 'SUBMITTED' | 'GRADED';

export type ReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type PayoutStatus = 'PENDING' | 'APPROVED' | 'PROCESSING' | 'PAID' | 'FAILED' | 'ON_HOLD';

export type LedgerEntryType = 
  | 'SALE'
  | 'PLATFORM_COMMISSION'
  | 'PAYMENT_FEE'
  | 'REFUND'
  | 'COMMISSION_REVERSAL'
  | 'PAYOUT'
  | 'PAYOUT_REVERSAL'
  | 'ADJUSTMENT';

export interface EducationLevelDTO {
  id: string;
  code: string;
  nameFr: string;
  nameAr?: string | null;
  stage: 'PRIMAIRE' | 'COLLEGE' | 'LYCEE' | 'UNIVERSITE';
  sortOrder: number;
  isActive: boolean;
}

export interface SubjectDTO {
  id: string;
  code: string;
  nameFr: string;
  nameAr?: string | null;
  isActive: boolean;
}

export interface AcademicYearDTO {
  id: string;
  name: string;
  startsAt: string; // ISO UTC
  endsAt: string;   // ISO UTC (Africa/Tunis snapshot)
  timezone: string;
  isActive: boolean;
}

export interface BookSummaryDTO {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  language: string;
  priceMillimes: number; // Stored as integer millimes (e.g., 25000 = 25.000 DT)
  currency: string;
  status: BookStatus;
  coverUrl?: string | null;
  pageCount?: number;
  professor: {
    id: string;
    displayName: string;
    verified: boolean;
  };
  level: {
    id: string;
    code: string;
    nameFr: string;
    stage: string;
  };
  subject: {
    id: string;
    code: string;
    nameFr: string;
  };
}

export interface EntitlementDTO {
  id: string;
  userId: string;
  bookId: string;
  academicYearId: string;
  status: EntitlementStatus;
  startsAt: string;
  expiresAt: string;
  grantedAt: string;
  bookTitle?: string;
  bookSlug?: string;
}

export interface PageDeliveryResponse {
  bookId: string;
  pageNumber: number;
  totalPages: number;
  watermark: {
    accountMask: string;
    transactionRef: string;
    timestamp: string;
  };
  svgDataUri?: string;
  imageUrl?: string;
  expiresAt: string;
}

export interface ExerciseDTO {
  id: string;
  chapterId: string;
  type: ExerciseType;
  prompt: string;
  options?: string[];
  difficulty: number;
  points: number;
  sortOrder: number;
  // answerKey and solution are confidential before purchase
}

export interface ExerciseCorrectionDTO {
  id: string;
  answerKey: any;
  solution: string;
  explanationFr: string;
}

// =============================================================================
// PHASE 3 — VIDEO STREAMING TYPES
// =============================================================================

export type VideoResolution = '1080p' | '720p' | '480p' | '360p';

export interface VideoContentDTO {
  id: string;
  bookId: string;
  chapterId?: string;
  professorId: string;
  professorName?: string;
  title: string;
  titleAr?: string | null;
  description?: string | null;
  durationSeconds: number;
  isFreePreview: boolean;
  thumbnailUrl: string;
  masterPlaylistUrl: string;
  createdAt: string;
}

// =============================================================================
// PHASE 4 — LIVE STREAMING TYPES
// =============================================================================

export type LiveStatus = 'SCHEDULED' | 'LIVE' | 'ENDED' | 'CANCELLED';

export interface LiveSessionDTO {
  id: string;
  bookId: string;
  bookTitle?: string;
  professorId: string;
  professorName: string;
  title: string;
  titleAr?: string | null;
  description?: string | null;
  scheduledAt: string; // ISO UTC (Africa/Tunis time)
  startedAt?: string | null;
  endedAt?: string | null;
  estimatedDurationMinutes: number;
  status: LiveStatus;
  priceMillimes: number; // Single session ticket (or free if trimester purchased)
  isFreeForTrimesterStudents: boolean;
  replayVideoId?: string | null;
  viewerCount?: number;
}

export interface LiveChatMessageDTO {
  id: string;
  liveSessionId: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  message: string;
  isQuestion: boolean;
  isPinned: boolean;
  createdAt: string;
}

// =============================================================================
// PHASE 5 — AI PERSONAL TUTOR & TEACHER VALIDATION TYPES
// =============================================================================

export type AiMessageRole = 'user' | 'assistant' | 'system';

export type AiCorrectionStatus = 'PENDING_REVIEW' | 'APPROVED' | 'EDITED' | 'REJECTED';

export interface AiChatMessageDTO {
  id: string;
  role: AiMessageRole;
  content: string;
  pedagogicalRationale?: string | null; // "Why are we learning this?" contextual explanation
  suggestedQuestions?: string[];
  simplifiedLevel?: 'PRIMAIRE' | 'COLLEGE' | 'LYCEE' | 'BAC';
  language?: 'fr' | 'ar' | 'bilingual';
  createdAt: string;
}

export interface AiCorrectionProposalDTO {
  id: string;
  exerciseId: string;
  exercisePrompt: string;
  chapterTitle: string;
  bookTitle: string;
  studentId: string;
  studentName: string;
  studentAnswer: string;
  aiProposedSolution: string;
  aiExplanation: string;
  aiConfidence: number; // 0.0 - 1.0
  curriculumMethodWarning?: string | null; // e.g. "AI used matrices not in 3ème Math official syllabus"
  status: AiCorrectionStatus;
  teacherId?: string | null;
  teacherNotes?: string | null;
  teacherEditedSolution?: string | null;
  createdAt: string;
  reviewedAt?: string | null;
}

// =============================================================================
// PHASE 6 — TRIMESTER QUOTAS & MODULAR PRICING TYPES
// =============================================================================

export type TrimesterCode = 'T1' | 'T2' | 'T3' | 'ANNUAL';

export interface TrimesterDTO {
  id: string;
  code: TrimesterCode;
  nameFr: string;
  nameAr?: string | null;
  academicYearId: string;
  startsAt: string; // ISO UTC
  endsAt: string;   // ISO UTC (Africa/Tunis snapshot)
  isActive: boolean;
}

export type BookPurchaseOption = 'BOOK_ONLY' | 'TRIMESTER_BUNDLE' | 'ANNUAL_PASS';

export interface BookTrimesterPricingDTO {
  bookId: string;
  trimesterCode: TrimesterCode;
  bookOnlyPriceMillimes: number;      // e.g. 15,000 DT
  bundlePriceMillimes: number;        // Includes book + videos + lives (e.g. 35,000 DT)
  annualPassPriceMillimes: number;    // All 3 trimesters discounted (e.g. 85,000 DT)
}

// =============================================================================
// PHASE 7 — PARENTAL SPACE & STUDENT ANALYTICS TYPES
// =============================================================================

export interface ChildProgressSummaryDTO {
  childId: string;
  childName: string;
  avatar?: string;
  levelCode: string;
  levelNameFr: string;
  totalStudyMinutes: number;
  exercisesCompleted: number;
  exerciseAccuracyPercentage: number;
  activeBooksCount: number;
  liveSessionsAttended: number;
  aiTutorQuestionsAsked: number;
  strengths: string[];
  areasForImprovement: string[];
  recentActivities: Array<{
    id: string;
    date: string;
    type: 'EXERCISE' | 'VIDEO' | 'LIVE' | 'READING' | 'AI_SESSION';
    title: string;
    subject: string;
    score?: number;
    details?: string;
  }>;
}

