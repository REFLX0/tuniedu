// Strip a non-functional `localStorage` global (some non-browser runtimes expose a
// value stub without `getItem`, which breaks feature-detection). The descriptor is
// inspected directly so we never invoke the accessor getter — on Node >=25 touching
// `globalThis.localStorage` emits a spurious `--localstorage-file` warning.
if (typeof globalThis !== 'undefined') {
  const localStorageDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  if (
    localStorageDescriptor &&
    'value' in localStorageDescriptor &&
    typeof (localStorageDescriptor.value as { getItem?: unknown } | undefined)?.getItem !== 'function'
  ) {
    try {
      delete (globalThis as { localStorage?: unknown }).localStorage;
    } catch {
      // localStorage cleanup is best-effort in non-browser runtimes
    }
  }
}

// In-memory persistent data store for TuniEdu domain services
// Simulates PostgreSQL + Prisma models with full relational integrity

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'STUDENT' | 'PARENT' | 'PROFESSOR' | 'REVIEWER' | 'ADMIN';
  roles: string[];
  childPublicId?: string;
  phone?: string;
  avatar?: string;
  professorProfile?: {
    id: string;
    displayName: string;
    biography: string;
    status: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'SUSPENDED';
    verifiedAt?: string;
    payoutReference?: string;
  };
}

export interface AcademicYear {
  id: string;
  name: string;
  startsAt: string; // ISO UTC
  endsAt: string;   // ISO UTC (Africa/Tunis snapshot)
  timezone: string;
  isActive: boolean;
}

export interface Book {
  id: string;
  professorId: string;
  professorName: string;
  educationLevelId: string;
  levelNameFr: string;
  levelNameAr?: string;
  stage: 'PRIMAIRE' | 'COLLEGE' | 'LYCEE' | 'UNIVERSITE';
  subjectId: string;
  subjectNameFr: string;
  subjectNameAr?: string;
  title: string;
  slug: string;
  description: string;
  language: string;
  currency: string;
  priceMillimes: number; // Stored as integer millimes
  status: 'DRAFT' | 'PROCESSING' | 'IN_REVIEW' | 'PUBLISHED' | 'REJECTED' | 'ARCHIVED';
  coverObjectKey?: string;
  pageCount: number;
  publishedAt?: string;
  chapters: BookChapter[];
}

export interface BookChapter {
  id: string;
  title: string;
  startPage: number;
  endPage: number;
  sortOrder: number;
  exercises: Exercise[];
}

export interface Exercise {
  id: string;
  chapterId: string;
  type: 'MULTIPLE_CHOICE' | 'NUMERIC' | 'SHORT_TEXT';
  prompt: string;
  options?: string[];
  answerKey: string;
  solution: string;
  difficulty: number;
  points: number;
}

// ── PHASE 3 & 4: VIDEO & LIVE STREAMING DOMAIN MODELS ────────────────────────

export interface VideoContent {
  id: string;
  bookId: string;
  chapterId?: string;
  professorId: string;
  professorName: string;
  title: string;
  titleAr?: string;
  description: string;
  durationSeconds: number;
  isFreePreview: boolean;
  thumbnailUrl: string;
  masterPlaylistUrl: string;
  createdAt: string;
}

export interface LiveSession {
  id: string;
  bookId: string;
  bookTitle: string;
  subject: string;
  professorId: string;
  professorName: string;
  title: string;
  titleAr?: string;
  description: string;
  scheduledAt: string; // ISO
  startedAt?: string | null;
  endedAt?: string | null;
  estimatedDurationMinutes: number;
  status: 'SCHEDULED' | 'LIVE' | 'ENDED' | 'CANCELLED';
  priceMillimes: number;
  isFreeForTrimesterStudents: boolean;
  replayVideoId?: string | null;
  viewerCount: number;
  maxParticipants: number;
  currentParticipants: number;
  pinnedMessage?: string | null;
}

export interface LiveChatMessage {
  id: string;
  liveSessionId: string;
  userId: string;
  userName: string;
  userRole: 'STUDENT' | 'PARENT' | 'PROFESSOR' | 'REVIEWER' | 'ADMIN';
  message: string;
  isQuestion: boolean;
  isPinned: boolean;
  createdAt: string;
}

export interface Entitlement {
  id: string;
  userId: string;
  bookId: string;
  academicYearId: string;
  status: 'ACTIVE' | 'EXPIRED' | 'REVOKED';
  startsAt: string;
  expiresAt: string; // Snapshot of academic-year end instant in Africa/Tunis
  grantedAt: string;
  purchaseItemId: string;
}

export interface Purchase {
  id: string;
  userId: string;
  status: 'PENDING' | 'PAID' | 'REFUNDED' | 'FAILED';
  currency: string;
  totalMillimes: number;
  subtotalMillimes: number;
  discountMillimes: number;
  idempotencyKey: string;
  createdAt: string;
  paidAt?: string;
  items: PurchaseItem[];
}

export interface PurchaseItem {
  id: string;
  purchaseId: string;
  bookId: string;
  bookTitleSnapshot: string;
  unitPriceMillimes: number;
  commissionBps: number; // 2000 = 20%
}

export interface FinancialLedgerEntry {
  id: string;
  professorId: string;
  purchaseId?: string;
  type: 'SALE' | 'BOOK_SALE' | 'PLATFORM_COMMISSION' | 'PAYOUT' | 'REFUND';
  amountMillimes: number;
  currency: string;
  reference: string;
  description: string;
  createdAt: string;
}

export interface ParentChildLink {
  id: string;
  parentId: string;
  childId: string;
  status: 'PENDING' | 'ACTIVE' | 'REVOKED';
  invitationCode: string;
  createdAt: string;
}

export interface ExerciseAttempt {
  id: string;
  userId: string;
  exerciseId: string;
  submittedAnswer: string;
  isCorrect: boolean;
  score: number;
  submittedAt: string;
}

export interface StudySession {
  id: string;
  userId: string;
  bookId: string;
  activeSeconds: number;
  lastActivityAt: string;
}

// ── PHASE 5, 6 & 7: AI TUTOR, TRIMESTER QUOTAS & PROGRESS MODELS ──────────────

export interface Trimester {
  id: string;
  code: 'T1' | 'T2' | 'T3' | 'ANNUAL';
  nameFr: string;
  nameAr: string;
  academicYearId: string;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
}

export interface BookTrimesterPricing {
  bookId: string;
  trimesterCode: 'T1' | 'T2' | 'T3' | 'ANNUAL';
  bookOnlyPriceMillimes: number;
  bundlePriceMillimes: number;
  annualPassPriceMillimes: number;
}

export interface AiChatMessage {
  id: string;
  userId: string;
  bookId?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  pedagogicalRationale?: string | null;
  suggestedQuestions?: string[];
  createdAt: string;
}

export interface AiCorrectionProposal {
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
  aiConfidence: number;
  curriculumMethodWarning?: string | null;
  status: 'PENDING_REVIEW' | 'APPROVED' | 'EDITED' | 'REJECTED';
  teacherId?: string | null;
  teacherNotes?: string | null;
  teacherEditedSolution?: string | null;
  createdAt: string;
  reviewedAt?: string | null;
}

// ── REVERSE-ENGINEERED MODULES: D17, PREPAID CARDS, COMMUNITY & AI CONFIG ────

export interface D17Transaction {
  id: string;
  reference: string;
  userId: string;
  userName: string;
  bookId: string;
  bookTitle: string;
  planType: 'BOOK_ONLY' | 'TRIMESTER_BUNDLE' | 'ANNUAL_PASS';
  amountMillimes: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  submittedAt: string;
  reviewedAt?: string;
  receiptNote?: string;
}

export interface PrepaidCard {
  id: string;
  code: string;
  planType: 'BOOK_ONLY' | 'TRIMESTER_BUNDLE' | 'ANNUAL_PASS';
  targetBookId?: string;
  status: 'ACTIVE' | 'USED' | 'EXPIRED';
  usedByUserId?: string;
  usedAt?: string;
  expiresAt: string;
}

export interface CommunityPost {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: 'STUDENT' | 'PARENT' | 'PROFESSOR';
  authorAvatar?: string;
  level: string;
  subject: string;
  category: 'EXERCICE' | 'QUESTION' | 'METHODE' | 'ORIENTATION';
  title: string;
  content: string;
  likesCount: number;
  likedByCurrentUser?: boolean;
  commentsCount: number;
  createdAt: string;
  hasCertifiedAnswer: boolean;
  certifiedAnswer?: {
    teacherName: string;
    teacherBadge: string;
    content: string;
    answeredAt: string;
  };
}

export interface CommunityGroup {
  id: string;
  title: string;
  description: string;
  membersCount: number;
  level: string;
  subject: string;
  icon: string;
}

export interface AiPlatformConfig {
  provider: 'ANTHROPIC' | 'OPENAI' | 'DEEPSEEK' | 'GEMINI';
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  ocrPipelineEnabled: boolean;
  cnpSyncStatus: 'SYNCED' | 'SYNCING' | 'PENDING';
  lastOcrSyncAt: string;
  indexedPagesCount: number;
}

export const INITIAL_D17_TRANSACTIONS: D17Transaction[] = [
  {
    id: 'd17_tx_001',
    reference: 'D17-98421045',
    userId: 'user_student_1',
    userName: 'Elyes Mansour',
    bookId: 'book_math_9b',
    bookTitle: 'Mathématiques 9ème — Préparation Concours Pilote',
    planType: 'TRIMESTER_BUNDLE',
    amountMillimes: 39600,
    status: 'PENDING',
    submittedAt: '2026-10-14T01:30:00Z',
    receiptNote: "Virement postal D17 effectué vers CCP 17 000 842 190",
  },
  {
    id: 'd17_tx_002',
    reference: 'D17-44019283',
    userId: 'user_student_1',
    userName: 'Yasmine Mansour',
    bookId: 'book_prim_1p',
    bookTitle: "Mon Premier Cahier d'Éveil & Découverte — 1ère Primaire",
    planType: 'BOOK_ONLY',
    amountMillimes: 12000,
    status: 'APPROVED',
    submittedAt: '2026-10-12T16:15:00Z',
    reviewedAt: '2026-10-12T17:00:00Z',
    receiptNote: 'Reçu guichet bureau de poste Tunis Belvédère validé',
  },
  {
    id: 'd17_tx_003',
    reference: 'D17-11029471',
    userId: 'user_student_2',
    userName: 'Sarra Ben Ahmed',
    bookId: 'book_bac_math',
    bookTitle: 'Mathématiques Baccalauréat — Nombres Complexes & Analyse',
    planType: 'ANNUAL_PASS',
    amountMillimes: 95000,
    status: 'PENDING',
    submittedAt: '2026-10-13T20:45:00Z',
    receiptNote: 'Mandat postal mobile D17',
  },
];

export const INITIAL_PREPAID_CARDS: PrepaidCard[] = [
  {
    id: 'card_001',
    code: 'ABA-2026-9812-4410',
    planType: 'TRIMESTER_BUNDLE',
    targetBookId: 'book_math_9b',
    status: 'ACTIVE',
    expiresAt: '2027-06-30T23:59:59Z',
  },
  {
    id: 'card_002',
    code: 'ABA-2026-5519-7723',
    planType: 'ANNUAL_PASS',
    status: 'ACTIVE',
    expiresAt: '2027-06-30T23:59:59Z',
  },
  {
    id: 'card_003',
    code: 'ABA-2026-1122-3344',
    planType: 'BOOK_ONLY',
    status: 'USED',
    usedByUserId: 'user_student_1',
    usedAt: '2026-10-01T10:00:00Z',
    expiresAt: '2027-06-30T23:59:59Z',
  },
];

export const INITIAL_COMMUNITY_GROUPS: CommunityGroup[] = [
  {
    id: 'grp_bac_math',
    title: 'Baccalauréat Mathématiques 2027',
    description: 'Entraide, fiches de révision, exercices de synthèse et sujets types pour les bacheliers section Math.',
    membersCount: 3840,
    level: '4ème Année Secondaire',
    subject: 'Mathématiques',
    icon: '📐',
  },
  {
    id: 'grp_9eme_pilote',
    title: '9ème Année de Base — Concours Pilote',
    description: "Préparation intensive au concours d'accès aux collèges et lycées pilotes (Math, Sciences, Arabe, Français).",
    membersCount: 5120,
    level: '9ème Année de Base',
    subject: 'Toutes matières',
    icon: '🏆',
  },
  {
    id: 'grp_primaire_parents',
    title: "Primaire & Parents d'Élèves (1ère à 6ème)",
    description: 'Échanges pédagogiques, conseils méthodologiques et accompagnement des devoirs à la maison.',
    membersCount: 4290,
    level: 'Primaire',
    subject: 'Pédagogie & Éveil',
    icon: '🎒',
  },
  {
    id: 'grp_physique_chimie',
    title: 'Physique-Chimie & Travaux Pratiques',
    description: 'Discussions autour des circuits RLC, titrages acido-basiques et lois de Newton avec vidéos explicatives.',
    membersCount: 2950,
    level: 'Secondaire',
    subject: 'Sciences Physiques',
    icon: '⚡',
  },
];

export const INITIAL_COMMUNITY_POSTS: CommunityPost[] = [
  {
    id: 'post_001',
    authorId: 'user_student_1',
    authorName: 'Elyes Mansour',
    authorRole: 'STUDENT',
    authorAvatar: '👨‍🎓',
    level: '9ème Année de Base',
    subject: 'Mathématiques',
    category: 'EXERCICE',
    title: 'Comment justifier la réciproque du théorème de Thalès au concours pilote ?',
    content: "Bonjour à tous, dans un exercice du concours 2024, on a des points alignés mais je perds souvent des points sur la rédaction. Faut-il mentionner explicitement que les points sont alignés dans le même ordre sur les deux droites sécantes ?",
    likesCount: 18,
    commentsCount: 4,
    createdAt: '2026-10-13T19:20:00Z',
    hasCertifiedAnswer: true,
    certifiedAnswer: {
      teacherName: 'Prof. Hichem Ben Salem',
      teacherBadge: 'Enseignant Agréé · Lycée Pilote Bourguiba',
      content: 'Oui, absolument Elyes ! C\'est une exigence formelle du barème national officiel : vous devez écrire impérativement : "Puisque les points A, M, B d\'une part et A, N, C d\'autre part sont alignés dans le même ordre, et comme AM/AB = AN/AC, alors d\'après la réciproque du théorème de Thalès, (MN) est parallèle à (BC)". Sans cette mention d\'ordre, l\'inspecteur retire 0.5 point sur la barème /20.',
      answeredAt: '2026-10-13T20:05:00Z',
    },
  },
  {
    id: 'post_002',
    authorId: 'user_student_2',
    authorName: 'Sarra Ben Ahmed',
    authorRole: 'STUDENT',
    authorAvatar: '👩‍🎓',
    level: '4ème Année Bac',
    subject: 'Sciences Physiques',
    category: 'QUESTION',
    title: 'Circuit RLC libre amorti : différence entre régime pseudopériodique et apériodique critique',
    content: "Est-ce que dans l'épreuve nationale du Bac Sciences, la formule de la résistance critique Rc = 2√(L/C) doit être démontrée ou peut-on l'utiliser directement comme résultat de cours ?",
    likesCount: 24,
    commentsCount: 6,
    createdAt: '2026-10-12T14:10:00Z',
    hasCertifiedAnswer: true,
    certifiedAnswer: {
      teacherName: 'Prof. Aida Triki',
      teacherBadge: 'Inspectrice Pédagogique Agréée · CNP',
      content: "Dans le programme officiel tunisien de 4ème Sciences, la relation Rc = 2√(L/C) est admise, mais il est vivement conseillé de rappeler la condition de discriminant nul Δ = 0 de l'équation différentielle pour garantir le maximum de points à la sous-question.",
      answeredAt: '2026-10-12T15:30:00Z',
    },
  },
  {
    id: 'post_003',
    authorId: 'user_parent_1',
    authorName: 'Mounir Mansour',
    authorRole: 'PARENT',
    authorAvatar: '👨‍💼',
    level: '6ème Année Primaire',
    subject: 'Orientation & Concours',
    category: 'ORIENTATION',
    title: "Rythme de préparation pour le concours d'entrée au collège pilote (Sixième)",
    content: "En tant que parent, je me demande combien d'heures par semaine un élève de 6ème doit consacrer aux séries d'exercices sans risquer le surmenage scolaire ? Des retours d'expérience de parents ou enseignants ?",
    likesCount: 31,
    commentsCount: 9,
    createdAt: '2026-10-11T10:00:00Z',
    hasCertifiedAnswer: false,
  },
];

export const INITIAL_AI_CONFIG: AiPlatformConfig = {
  provider: 'ANTHROPIC',
  model: 'claude-3-5-sonnet-20241022',
  temperature: 0.2,
  maxTokens: 4096,
  systemPrompt: `Vous êtes le Tuteur Pédagogique Officiel TuniEdu, conçu pour le système éducatif tunisien sous l'égide du Centre National Pédagogique (CNP) et du Ministère de l'Éducation.
Règles strictes :
1. Adhérez rigoureusement aux programmes officiels tunisiens (Réforme 2026).
2. Utilisez les notations officielles : barème sur 20 points, virgule décimale, terminologie bilingue (arabe/français).
3. Ne donnez jamais la solution brute directement sans étapes socratiques et explications méthodologiques.
4. Pour toute question de géométrie ou d'analyse, insistez sur la rédaction et la justification des théorèmes.`,
  ocrPipelineEnabled: true,
  cnpSyncStatus: 'SYNCED',
  lastOcrSyncAt: '2026-10-14T02:00:00Z',
  indexedPagesCount: 1420,
};

// Initial Seed Dataset
const INITIAL_ACADEMIC_YEARS: AcademicYear[] = [
  {
    id: 'ay_2026_2027',
    name: '2026–2027',
    startsAt: '2026-09-15T00:00:00.000Z',
    endsAt: '2027-06-30T22:59:59.000Z', // 23:59:59 Africa/Tunis
    timezone: 'Africa/Tunis',
    isActive: true,
  },
  {
    id: 'ay_2025_2026',
    name: '2025–2026',
    startsAt: '2025-09-15T00:00:00.000Z',
    endsAt: '2026-06-30T22:59:59.000Z',
    timezone: 'Africa/Tunis',
    isActive: false,
  },
];

export const INITIAL_TRIMESTERS: Trimester[] = [
  {
    id: 'trim_2026_t1',
    code: 'T1',
    nameFr: '1er Trimestre (Septembre – Décembre)',
    nameAr: 'الثلاثي الأول (سبتمبر – ديسمبر)',
    academicYearId: 'ay_2026_2027',
    startsAt: '2026-09-15T00:00:00.000Z',
    endsAt: '2026-12-15T22:59:59.000Z',
    isActive: true,
  },
  {
    id: 'trim_2026_t2',
    code: 'T2',
    nameFr: '2ème Trimestre (Janvier – Mars)',
    nameAr: 'الثلاثي الثاني (جانفي – مارس)',
    academicYearId: 'ay_2026_2027',
    startsAt: '2027-01-02T00:00:00.000Z',
    endsAt: '2027-03-15T22:59:59.000Z',
    isActive: false,
  },
  {
    id: 'trim_2026_t3',
    code: 'T3',
    nameFr: '3ème Trimestre (Avril – Juin)',
    nameAr: 'الثلاثي الثالث (أفريل – جوان)',
    academicYearId: 'ay_2026_2027',
    startsAt: '2027-03-25T00:00:00.000Z',
    endsAt: '2027-06-30T22:59:59.000Z',
    isActive: false,
  },
];

// Demo/mock user accounts removed. Real accounts are created via registration
// and persisted in PostgreSQL; this in-memory registry is populated at runtime
// from the verified session (see lib/account-service.ts).
const INITIAL_USERS: User[] = [];

const INITIAL_BOOKS: Book[] = [
  {
    id: 'book_math_9b',
    professorId: 'prof_hichem_profile',
    professorName: 'Prof. Hichem Ben Salem',
    educationLevelId: 'lvl_9b',
    levelNameFr: '9ème Année de Base (Neufième)',
    levelNameAr: 'السنة التاسعة أساسي (مناظرة النوفيام)',
    stage: 'COLLEGE',
    subjectId: 'subj_math',
    subjectNameFr: 'Mathématiques',
    subjectNameAr: 'الرياضيات',
    title: "L'Excellence en Mathématiques — 9ème Année de Base",
    slug: 'excellence-mathematiques-9eme-annee',
    description: 'Le manuel de référence pour réussir l\'examen national du concours d\'accès aux lycées pilotes. 120 pages de résumés clairs, théorèmes expliqués et 150 exercices avec corrigés types.',
    language: 'fr',
    currency: 'TND',
    priceMillimes: 22000, // 22.000 DT
    status: 'PUBLISHED',
    pageCount: 120,
    publishedAt: '2026-09-16T08:00:00Z',
    chapters: [
      {
        id: 'chap_1',
        title: 'Chapitre 1 : Les Nombres Réels et Racines Carrées',
        startPage: 1,
        endPage: 38,
        sortOrder: 1,
        exercises: [
          {
            id: 'ex_1',
            chapterId: 'chap_1',
            type: 'MULTIPLE_CHOICE',
            prompt: 'Soit x un nombre réel négatif tel que x² = 7. Quelle est la valeur de x ?',
            options: ['-√7', '√7', '-7/2', 'Impossible'],
            answerKey: '-√7',
            solution: 'L\'équation x² = 7 admet deux solutions réelles distinctes : √7 et -√7. La condition imposée x < 0 implique immédiatement que x = -√7.',
            points: 2,
            difficulty: 1,
          },
          {
            id: 'ex_2',
            chapterId: 'chap_1',
            type: 'NUMERIC',
            prompt: 'Calculer la valeur décimale exacte de l\'expression : A = √(36) + √(64) - √(25)',
            answerKey: '9',
            solution: 'On calcule successivement chaque racine carrée : √36 = 6, √64 = 8, et √25 = 5. Donc A = 6 + 8 - 5 = 14 - 5 = 9.',
            points: 3,
            difficulty: 1,
          },
          {
            id: 'ex_3',
            chapterId: 'chap_1',
            type: 'MULTIPLE_CHOICE',
            prompt: 'L\'expression développée et réduite de (2x - 3)² est :',
            options: ['4x² - 12x + 9', '4x² - 9', '4x² + 12x + 9', '2x² - 6x + 9'],
            answerKey: '4x² - 12x + 9',
            solution: 'On applique l\'identité remarquable (a - b)² = a² - 2ab + b² avec a = 2x et b = 3. On obtient (2x)² - 2*(2x)*3 + 3² = 4x² - 12x + 9.',
            points: 3,
            difficulty: 2,
          },
        ],
      },
      {
        id: 'chap_2',
        title: 'Chapitre 2 : Théorème de Thalès et Trigonométrie',
        startPage: 39,
        endPage: 82,
        sortOrder: 2,
        exercises: [
          {
            id: 'ex_4',
            chapterId: 'chap_2',
            type: 'MULTIPLE_CHOICE',
            prompt: 'Dans un triangle ABC rectangle en A, si AB = 3 et AC = 4, que vaut le cosinus de l\'angle B (cos ABC) ?',
            options: ['3/5', '4/5', '3/4', '5/3'],
            answerKey: '3/5',
            solution: 'Par le théorème de Pythagore, l\'hypoténuse BC = √(3² + 4²) = 5. Par définition, cos(ABC) = Côté adjacent / Hypoténuse = AB / BC = 3/5.',
            points: 4,
            difficulty: 2,
          },
        ],
      },
    ],
  },
  {
    id: 'book_phys_8b',
    professorId: 'prof_aida_profile',
    professorName: 'Prof. Aida Triki',
    educationLevelId: 'lvl_8b',
    levelNameFr: '8ème Année de Base',
    levelNameAr: 'السنة الثامنة أساسي',
    stage: 'COLLEGE',
    subjectId: 'subj_phys',
    subjectNameFr: 'Sciences Physiques',
    subjectNameAr: 'العلوم الفيزيائية',
    title: 'Physique & Chimie — Guide Méthodique 8ème Année',
    slug: 'physique-chimie-8eme-annee',
    description: 'Comprendre l\'électricité, la pression, la structure atomique et les réactions chimiques avec des schémas d\'expériences interactifs.',
    language: 'fr',
    currency: 'TND',
    priceMillimes: 18500, // 18.500 DT
    status: 'PUBLISHED',
    pageCount: 96,
    publishedAt: '2026-09-20T11:00:00Z',
    chapters: [],
  },
  {
    id: 'book_math_7b',
    professorId: 'prof_hichem_profile',
    professorName: 'Prof. Hichem Ben Salem',
    educationLevelId: 'lvl_7b',
    levelNameFr: '7ème Année de Base',
    levelNameAr: 'السنة السابعة أساسي',
    stage: 'COLLEGE',
    subjectId: 'subj_math',
    subjectNameFr: 'Mathématiques',
    subjectNameAr: 'الرياضيات',
    title: 'Fondations Mathématiques — 7ème Année de Base',
    slug: 'fondations-mathematiques-7eme-annee',
    description: 'Une passerelle rassurante pour maîtriser les décimaux, les fractions, les médiatrices et angles au collège.',
    language: 'fr',
    currency: 'TND',
    priceMillimes: 19000, // 19.000 DT
    status: 'PUBLISHED',
    pageCount: 110,
    publishedAt: '2026-09-18T14:00:00Z',
    chapters: [],
  },
  {
    id: 'book_sixieme_6p',
    professorId: 'prof_hichem_profile',
    professorName: 'Prof. Hichem Ben Salem',
    educationLevelId: 'lvl_6p',
    levelNameFr: '6ème Année Primaire (Sixième)',
    levelNameAr: 'السنة السادسة ابتدائي (السيزيام)',
    stage: 'PRIMAIRE',
    subjectId: 'subj_math',
    subjectNameFr: 'Mathématiques',
    subjectNameAr: 'الرياضيات',
    title: 'Le Passeport Sixième — Concours Pilote Primaire',
    slug: 'passeport-sixieme-concours-pilote',
    description: '200 problèmes de logique, calcul mental et géométrie pour préparer les enfants au concours d\'entrée aux collèges pilotes.',
    language: 'fr',
    currency: 'TND',
    priceMillimes: 16000, // 16.000 DT
    status: 'PUBLISHED',
    pageCount: 88,
    publishedAt: '2026-09-12T09:00:00Z',
    chapters: [],
  },
  {
    id: 'book_prim_1p',
    professorId: 'prof_aida_profile',
    professorName: 'Prof. Aida Triki',
    educationLevelId: 'lvl_1p',
    levelNameFr: '1ère Année Primaire',
    levelNameAr: 'السنة الأولى ابتدائي',
    stage: 'PRIMAIRE',
    subjectId: 'subj_eveil',
    subjectNameFr: 'Éveil Scientifique & Lecture',
    subjectNameAr: 'الإيقاظ العلمي والقراءة',
    title: 'Mon Premier Cahier d\'Éveil & Découverte — 1ère Primaire',
    slug: 'premier-cahier-eveil-1ere-primaire',
    description: 'Apprendre à observer les animaux, les sens, les couleurs et les premiers chiffres à travers des histoires illustrées et des jeux ludiques.',
    language: 'fr',
    currency: 'TND',
    priceMillimes: 12000, // 12.000 DT
    status: 'PUBLISHED',
    pageCount: 64,
    publishedAt: '2026-09-10T08:00:00Z',
    chapters: [
      {
        id: 'chap_1p_1',
        title: 'Chapitre 1 : Les Cinq Sens & Notre Corps',
        startPage: 1,
        endPage: 24,
        sortOrder: 1,
        exercises: [
          {
            id: 'ex_1p_1',
            chapterId: 'chap_1p_1',
            type: 'MULTIPLE_CHOICE',
            prompt: 'Quel organe nous permet d\'écouter de la musique ou la voix de la maîtresse ?',
            options: ['Les oreilles 👂', 'Les yeux 👀', 'La bouche 👄', 'Le nez 👃'],
            answerKey: 'Les oreilles 👂',
            solution: 'C\'est grâce à nos deux oreilles et au sens de l\'ouïe que nous pouvons entendre les sons et la musique !',
            points: 1,
            difficulty: 1,
          },
        ],
      },
    ],
  },
  {
    id: 'book_prim_3p',
    professorId: 'prof_hichem_profile',
    professorName: 'Prof. Hichem Ben Salem',
    educationLevelId: 'lvl_3p',
    levelNameFr: '3ème Année Primaire',
    levelNameAr: 'السنة الثالثة ابتدائي',
    stage: 'PRIMAIRE',
    subjectId: 'subj_math',
    subjectNameFr: 'Mathématiques',
    subjectNameAr: 'الرياضيات',
    title: 'Calcul Rapide & Géométrie — 3ème Année Primaire',
    slug: 'calcul-geometrie-3eme-primaire',
    description: 'Maîtriser les tables de multiplication, les additions à retenue et les solides géométriques (cube, pavé, cylindre).',
    language: 'fr',
    currency: 'TND',
    priceMillimes: 14000, // 14.000 DT
    status: 'PUBLISHED',
    pageCount: 76,
    publishedAt: '2026-09-11T09:00:00Z',
    chapters: [],
  },
  {
    id: 'book_prim_5p',
    professorId: 'prof_aida_profile',
    professorName: 'Prof. Aida Triki',
    educationLevelId: 'lvl_5p',
    levelNameFr: '5ème Année Primaire',
    levelNameAr: 'السنة الخامسة ابتدائي',
    stage: 'PRIMAIRE',
    subjectId: 'subj_francais',
    subjectNameFr: 'Français & Grammaire',
    subjectNameAr: 'اللغة الفرنسية وقواعد اللغة',
    title: 'Français Facile : Grammaire, Orthographe & Récits — 5ème Primaire',
    slug: 'francais-facile-5eme-primaire',
    description: 'Les temps du récit (présent, imparfait, passé composé), les accords dans le groupe nominal et la rédaction de paragraphes cohérents.',
    language: 'fr',
    currency: 'TND',
    priceMillimes: 15000,
    status: 'PUBLISHED',
    pageCount: 84,
    publishedAt: '2026-09-12T10:00:00Z',
    chapters: [],
  },
  {
    id: 'book_sec_1s',
    professorId: 'prof_hichem_profile',
    professorName: 'Prof. Hichem Ben Salem',
    educationLevelId: 'lvl_1s',
    levelNameFr: '1ère Année Secondaire (Tronc Commun)',
    levelNameAr: 'السنة الأولى ثانوي (جذع مشترك)',
    stage: 'LYCEE',
    subjectId: 'subj_math',
    subjectNameFr: 'Mathématiques & Physique',
    subjectNameAr: 'الرياضيات والعلوم الفيزيائية',
    title: 'Sciences & Mathématiques — Le Cap du Lycée (1ère Secondaire)',
    slug: 'sciences-mathematiques-1ere-secondaire',
    description: 'Fonctions affines, calcul vectoriel, forces en équilibre et transformations chimiques. Le manuel de transition parfait après le collège.',
    language: 'fr',
    currency: 'TND',
    priceMillimes: 24000,
    status: 'PUBLISHED',
    pageCount: 140,
    publishedAt: '2026-09-18T10:00:00Z',
    chapters: [],
  },
  {
    id: 'book_sec_2sc',
    professorId: 'prof_aida_profile',
    professorName: 'Prof. Aida Triki',
    educationLevelId: 'lvl_2sc',
    levelNameFr: '2ème Année Sciences',
    levelNameAr: 'السنة الثانية ثانوي علوم',
    stage: 'LYCEE',
    subjectId: 'subj_phys',
    subjectNameFr: 'Sciences Expérimentales',
    subjectNameAr: 'العلوم التجريبية',
    title: 'Physique-Chimie & SVT — 2ème Année Sciences',
    slug: 'physique-chimie-svt-2eme-sciences',
    description: 'Optique géométrique, mouvements et forces de gravitation, biochimie cellulaire et physiologie végétale.',
    language: 'fr',
    currency: 'TND',
    priceMillimes: 25000,
    status: 'PUBLISHED',
    pageCount: 156,
    publishedAt: '2026-09-20T11:00:00Z',
    chapters: [],
  },
  {
    id: 'book_sec_3m',
    professorId: 'prof_hichem_profile',
    professorName: 'Prof. Hichem Ben Salem',
    educationLevelId: 'lvl_3m',
    levelNameFr: '3ème Année Mathématiques',
    levelNameAr: 'السنة الثالثة ثانوي رياضيات',
    stage: 'LYCEE',
    subjectId: 'subj_math',
    subjectNameFr: 'Mathématiques',
    subjectNameAr: 'الرياضيات',
    title: 'Analyse & Algèbre — 3ème Année Mathématiques',
    slug: 'analyse-algebre-3eme-math',
    description: 'Limites, continuité, dérivation, barycentres et produit scalaire. Préparation intensive au passage en terminale Bac.',
    language: 'fr',
    currency: 'TND',
    priceMillimes: 27000,
    status: 'PUBLISHED',
    pageCount: 168,
    publishedAt: '2026-09-21T09:00:00Z',
    chapters: [],
  },
  {
    id: 'book_bac_math',
    professorId: 'prof_hichem_profile',
    professorName: 'Prof. Hichem Ben Salem',
    educationLevelId: 'lvl_bac_math',
    levelNameFr: 'Baccalauréat Mathématiques',
    levelNameAr: 'بكالوريا رياضيات',
    stage: 'LYCEE',
    subjectId: 'subj_math',
    subjectNameFr: 'Mathématiques',
    subjectNameAr: 'الرياضيات',
    title: 'L\'Étoile du Bac Math : Nombres Complexes, Intégrales & Équations Différentielles',
    slug: 'etoile-bac-math-complexes-integrales',
    description: 'Le recueil ultime pour les candidats au Bac Math tunisien. 20 sujets d\'annales nationaux décortiqués, barèmes officiels et méthodes de rédaction des majors.',
    language: 'fr',
    currency: 'TND',
    priceMillimes: 29000,
    status: 'PUBLISHED',
    pageCount: 198,
    publishedAt: '2026-09-15T08:00:00Z',
    chapters: [
      {
        id: 'chap_bac_math_1',
        title: 'Chapitre 1 : Nombres Complexes & Trigonométrie',
        startPage: 1,
        endPage: 45,
        sortOrder: 1,
        exercises: [
          {
            id: 'ex_bac_m1',
            chapterId: 'chap_bac_math_1',
            type: 'MULTIPLE_CHOICE',
            prompt: 'Soit z = 1 + i√3. Quelle est la forme exponentielle de z ?',
            options: ['2 e^(iπ/3)', '2 e^(iπ/6)', '√3 e^(iπ/3)', 'e^(iπ/3)'],
            answerKey: '2 e^(iπ/3)',
            solution: '|z| = √(1² + (√3)²) = √4 = 2. cos(θ) = 1/2 et sin(θ) = √3/2, d\'où θ ≡ π/3 [2π]. Donc z = 2 e^(iπ/3).',
            points: 4,
            difficulty: 3,
          },
        ],
      },
    ],
  },
  {
    id: 'book_bac_sc',
    professorId: 'prof_aida_profile',
    professorName: 'Prof. Aida Triki',
    educationLevelId: 'lvl_bac_sc',
    levelNameFr: 'Baccalauréat Sciences Expérimentales',
    levelNameAr: 'بكالوريا علوم تجريبية',
    stage: 'LYCEE',
    subjectId: 'subj_svt',
    subjectNameFr: 'Sciences de la Vie et de la Terre',
    subjectNameAr: 'علوم الحياة والأرض',
    title: 'SVT Bac Sciences : Génétique des Diploïdes & Neurophysiologie',
    slug: 'svt-bac-sciences-genetique-neuro',
    description: 'Tout le programme de SVT avec schémas anatomiques annotés, protocoles expérimentaux et analyses de documents pour l\'épreuve nationale.',
    language: 'fr',
    currency: 'TND',
    priceMillimes: 28000,
    status: 'PUBLISHED',
    pageCount: 180,
    publishedAt: '2026-09-17T10:00:00Z',
    chapters: [],
  },
  {
    id: 'book_bac_info',
    professorId: 'prof_hichem_profile',
    professorName: 'Prof. Hichem Ben Salem',
    educationLevelId: 'lvl_bac_info',
    levelNameFr: 'Baccalauréat Sciences de l\'Informatique',
    levelNameAr: 'بكالوريا علوم الإعلامية',
    stage: 'LYCEE',
    subjectId: 'subj_info',
    subjectNameFr: 'Algorithmique & Bases de Données',
    subjectNameAr: 'الخوارزميات وقواعد البيانات',
    title: 'Bac Info : Algorithmique Avancée, Python & SQL',
    slug: 'bac-info-algorithmique-python-sql',
    description: 'Tri fusion, récursivité, programmation modulaire en Python et requêtes SQL complexes pour l\'épreuve pratique et théorique.',
    language: 'fr',
    currency: 'TND',
    priceMillimes: 26000,
    status: 'PUBLISHED',
    pageCount: 160,
    publishedAt: '2026-09-22T14:00:00Z',
    chapters: [],
  },
  {
    id: 'book_bac_eco',
    professorId: 'prof_aida_profile',
    professorName: 'Prof. Aida Triki',
    educationLevelId: 'lvl_bac_eco',
    levelNameFr: 'Baccalauréat Économie & Gestion',
    levelNameAr: 'بكالوريا اقتصاد وتصرف',
    stage: 'LYCEE',
    subjectId: 'subj_eco',
    subjectNameFr: 'Économie & Gestion',
    subjectNameAr: 'الاقتصاد والتصرف',
    title: 'Bac Éco-Gestion : Microéconomie, Marchés & Analyse Financière',
    slug: 'bac-eco-gestion-microeconomie-finance',
    description: 'Théorie du consommateur, élasticités, bilan comptable et gestion prévisionnelle de la trésorerie.',
    language: 'fr',
    currency: 'TND',
    priceMillimes: 25000,
    status: 'PUBLISHED',
    pageCount: 150,
    publishedAt: '2026-09-24T11:00:00Z',
    chapters: [],
  },
  {
    id: 'book_bac_lettres',
    professorId: 'prof_aida_profile',
    professorName: 'Prof. Aida Triki',
    educationLevelId: 'lvl_bac_lettres',
    levelNameFr: 'Baccalauréat Lettres',
    levelNameAr: 'بكالوريا آداب',
    stage: 'LYCEE',
    subjectId: 'subj_philo',
    subjectNameFr: 'Philosophie & Pensée Critique',
    subjectNameAr: 'الفلسفة والتفكير النقدي',
    title: 'Bac Lettres : Philosophie & Dissertation Méthodique',
    slug: 'bac-lettres-philosophie-dissertation',
    description: 'Le pouvoir, l\'histoire, l\'art et la science. Méthodologie rigoureuse de la dissertation philosophique et du commentaire de texte.',
    language: 'fr',
    currency: 'TND',
    priceMillimes: 23000,
    status: 'PUBLISHED',
    pageCount: 140,
    publishedAt: '2026-09-25T15:00:00Z',
    chapters: [],
  },
  {
    id: 'book_univ_math',
    professorId: 'prof_hichem_profile',
    professorName: 'Prof. Hichem Ben Salem',
    educationLevelId: 'lvl_univ',
    levelNameFr: 'Université — Mathématiques',
    levelNameAr: 'التعليم العالي — رياضيات عامة',
    stage: 'UNIVERSITE',
    subjectId: 'subj_math',
    subjectNameFr: 'Mathématiques',
    subjectNameAr: 'الرياضيات',
    title: 'Algèbre Linéaire & Calcul Différentiel — Université',
    slug: 'algebre-lineaire-calcul-differentiel',
    description: 'Espaces vectoriels de dimension finie, diagonalisation et intégrales multiples pour étudiants en licence universitaire et prépa.',
    language: 'fr',
    currency: 'TND',
    priceMillimes: 35000, // 35.000 DT
    status: 'PUBLISHED',
    pageCount: 220,
    publishedAt: '2026-10-01T10:00:00Z',
    chapters: [],
  },
];

export const INITIAL_BOOK_PRICING: BookTrimesterPricing[] = [
  {
    bookId: 'book_math_9b',
    trimesterCode: 'T1',
    bookOnlyPriceMillimes: 22000,      // 22 DT
    bundlePriceMillimes: 45000,        // 45 DT (Book + Live Concours + Videos)
    annualPassPriceMillimes: 98000,    // 98 DT (Full year -15%)
  },
  {
    bookId: 'book_bac_math',
    trimesterCode: 'T1',
    bookOnlyPriceMillimes: 29000,
    bundlePriceMillimes: 58000,
    annualPassPriceMillimes: 125000,
  },
  {
    bookId: 'book_sixieme_6p',
    trimesterCode: 'T1',
    bookOnlyPriceMillimes: 16000,
    bundlePriceMillimes: 32000,
    annualPassPriceMillimes: 69000,
  },
];

export const INITIAL_AI_MESSAGES: AiChatMessage[] = [
  {
    id: 'ai_msg_init_1',
    userId: 'user_student_1',
    bookId: 'book_math_9b',
    role: 'user',
    content: 'À quoi sert le théorème de Thalès dans la vraie vie en Tunisie ?',
    createdAt: '2026-10-12T14:00:00Z',
  },
  {
    id: 'ai_msg_init_2',
    userId: 'user_student_1',
    bookId: 'book_math_9b',
    role: 'assistant',
    content: "Le théorème de Thalès permet de mesurer des hauteurs inaccessibles sans devoir grimper dessus, simplement en comparant les ombres ! Les ingénieurs du pont Radès-La Goulette et les architectes tunisiens l'utilisent quotidiennement pour vérifier les proportions et l'alignement des structures.",
    pedagogicalRationale: "Mesure de structures réelles et trigonométrie pratique en génie civil.",
    suggestedQuestions: [
      "Comment l'appliquer avec une ombre ?",
      "Quelle est la différence avec le théorème de Pythagore ?",
    ],
    createdAt: '2026-10-12T14:00:05Z',
  },
];

export const INITIAL_AI_PROPOSALS: AiCorrectionProposal[] = [
  {
    id: 'prop_init_1',
    exerciseId: 'ex_3',
    exercisePrompt: 'L\'expression développée et réduite de (2x - 3)² est :',
    chapterTitle: 'Chapitre 1 : Les Nombres Réels',
    bookTitle: "L'Excellence en Mathématiques — 9ème Année de Base",
    studentId: 'user_student_1',
    studentName: 'Elyes Mansour',
    studentAnswer: '4x² - 12x + 9',
    aiProposedSolution: 'Identité remarquable (a - b)² = a² - 2ab + b² avec a=2x et b=3.',
    aiExplanation: 'Démarche rigoureuse et conforme au programme de la 9ème année de base.',
    aiConfidence: 0.98,
    curriculumMethodWarning: null,
    status: 'APPROVED',
    teacherId: 'prof_hichem_profile',
    teacherNotes: 'Réponse modèle excellente, rien à modifier.',
    createdAt: '2026-10-10T14:30:00Z',
    reviewedAt: '2026-10-10T15:00:00Z',
  },
  {
    id: 'prop_init_2',
    exerciseId: 'ex_lim_3m',
    exercisePrompt: 'Calculer la limite quand x tend vers 0 de (sin(3x))/x',
    chapterTitle: 'Chapitre 2 : Limites & Continuité',
    bookTitle: 'Analyse & Algèbre — 3ème Année Mathématiques',
    studentId: 'user_student_1',
    studentName: 'Elyes Mansour',
    studentAnswer: '3 par la règle de L\'Hôpital',
    aiProposedSolution: 'On multiplie et divise par 3 : 3 * (sin(3x)/(3x)) = 3 * 1 = 3.',
    aiExplanation: 'Attention : L\'élève a invoqué la règle de L\'Hôpital qui n\'est pas au programme du secondaire tunisien.',
    aiConfidence: 0.74,
    curriculumMethodWarning: "Règle de L'Hôpital détectée (Hors-programme secondaire tunisien : exiger la limite remarquable lim(sin(u)/u)=1 avec u=3x).",
    status: 'PENDING_REVIEW',
    teacherId: 'prof_hichem_profile',
    createdAt: '2026-10-13T16:00:00Z',
  },
];

// Seeded Initial Entitlement for Student Elyes on 9ème Math book!
const INITIAL_ENTITLEMENTS: Entitlement[] = [
  {
    id: 'ent_elyes_math9',
    userId: 'user_student_1',
    bookId: 'book_math_9b',
    academicYearId: 'ay_2026_2027',
    status: 'ACTIVE',
    startsAt: '2026-09-16T09:00:00.000Z',
    expiresAt: '2027-06-30T22:59:59.000Z', // Snapshot of academic year end
    grantedAt: '2026-09-16T09:00:00.000Z',
    purchaseItemId: 'item_init_1',
  },
];

const INITIAL_PARENT_LINKS: ParentChildLink[] = [
  {
    id: 'link_sihem_elyes',
    parentId: 'user_parent_1',
    childId: 'user_student_1',
    status: 'ACTIVE',
    invitationCode: 'TUN-9842',
    createdAt: '2026-09-17T10:00:00Z',
  },
];

const INITIAL_STUDY_SESSIONS: StudySession[] = [
  {
    id: 'sess_1',
    userId: 'user_student_1',
    bookId: 'book_math_9b',
    activeSeconds: 5400, // 1h 30m
    lastActivityAt: '2026-10-11T17:30:00Z',
  },
];

const INITIAL_ATTEMPTS: ExerciseAttempt[] = [
  {
    id: 'att_1',
    userId: 'user_student_1',
    exerciseId: 'ex_1',
    submittedAnswer: '-√7',
    isCorrect: true,
    score: 2,
    submittedAt: '2026-10-10T14:20:00Z',
  },
  {
    id: 'att_2',
    userId: 'user_student_1',
    exerciseId: 'ex_2',
    submittedAnswer: '9',
    isCorrect: true,
    score: 3,
    submittedAt: '2026-10-10T14:25:00Z',
  },
];

const INITIAL_LEDGER: FinancialLedgerEntry[] = [
  {
    id: 'led_1',
    professorId: 'prof_hichem_profile',
    type: 'SALE',
    amountMillimes: 22000,
    currency: 'TND',
    reference: 'SALE-2026-0001',
    description: 'Vente: L\'Excellence en Mathématiques — 9ème Année',
    createdAt: '2026-09-16T09:00:00Z',
  },
  {
    id: 'led_2',
    professorId: 'prof_hichem_profile',
    type: 'PLATFORM_COMMISSION',
    amountMillimes: 4400, // 20% of 22000 = 4400 millimes
    currency: 'TND',
    reference: 'COMM-2026-0001',
    description: 'Commission TuniEdu (2000 bps = 20%)',
    createdAt: '2026-09-16T09:00:00Z',
  },
];

export const INITIAL_VIDEOS: VideoContent[] = [
  {
    id: 'vid_thal_9b',
    bookId: 'book_math_9b',
    chapterId: 'ch_math_9b_2',
    professorId: 'prof_hichem_profile',
    professorName: 'Prof. Hichem Ben Salem',
    title: 'Théorème de Thalès : Configurations papillon & triangles emboîtés',
    titleAr: 'مبرهنة طاليس : الحالات التطبيقية وحساب الأطوال بدقة',
    description: 'Démonstration détaillée pas à pas des calculs de rapports de projection, pièges fréquents dans les concours des collèges pilotes et astuces de rédaction mathématique.',
    durationSeconds: 840, // 14 min
    isFreePreview: true, // Free preview sample
    thumbnailUrl: '/thumbnails/thales_9b.webp',
    masterPlaylistUrl: '/hls/vid_thal_9b/master.m3u8',
    createdAt: '2026-09-18T10:00:00Z',
  },
  {
    id: 'vid_racines_9b',
    bookId: 'book_math_9b',
    chapterId: 'ch_math_9b_1',
    professorId: 'prof_hichem_profile',
    professorName: 'Prof. Hichem Ben Salem',
    title: 'Racines carrées & Nombres réels : Maîtriser les identités remarquables',
    titleAr: 'الجذور التربيعية والأعداد الحقيقية : توظيف الجداءات المعتبرة',
    description: 'Méthodes de simplification rapide des radicaux imbriqués et factorisations indispensables pour le devoir de synthèse du 1er trimestre.',
    durationSeconds: 1320, // 22 min
    isFreePreview: false,
    thumbnailUrl: '/thumbnails/racines_9b.webp',
    masterPlaylistUrl: '/hls/vid_racines_9b/master.m3u8',
    createdAt: '2026-09-22T14:30:00Z',
  },
  {
    id: 'vid_phys_8b_circuit',
    bookId: 'book_phys_8b',
    professorId: 'prof_aida_profile',
    professorName: 'Prof. Aida Triki',
    title: 'Lois du courant continu & Circuit électrique en série et dérivation',
    titleAr: 'قوانين التيار الكهربائي المستمر والدارات الكهربائية',
    description: 'Expériences réelles de laboratoire filmées en haute définition avec ampèremètres et voltmètres numériques pour visualiser la loi des mailles.',
    durationSeconds: 960, // 16 min
    isFreePreview: true,
    thumbnailUrl: '/thumbnails/circuit_8b.webp',
    masterPlaylistUrl: '/hls/vid_phys_8b_circuit/master.m3u8',
    createdAt: '2026-09-25T16:00:00Z',
  },
];

export const INITIAL_LIVE_SESSIONS: LiveSession[] = [
  {
    id: 'live_math_9b_concours',
    bookId: 'book_math_9b',
    bookTitle: "L'Excellence en Mathématiques — 9ème Année de Base",
    subject: 'Mathématiques',
    professorId: 'prof_hichem_profile',
    professorName: 'Prof. Hichem Ben Salem',
    title: 'Session Live Interactive : Résolution en direct du concours blanc Neufième',
    titleAr: 'حصة تفاعلية مباشرة : حل مناظرة تجريبية نموذجية في الرياضيات',
    description: 'Séance interactive de 90 minutes avec questions-réponses en direct, conseils de gestion du stress pour l\'examen et correction type conforme aux barèmes du Ministère.',
    scheduledAt: '2026-10-18T18:00:00.000Z',
    startedAt: null,
    endedAt: null,
    estimatedDurationMinutes: 90,
    status: 'SCHEDULED',
    priceMillimes: 12000, // 12.000 DT single live ticket
    isFreeForTrimesterStudents: true,
    viewerCount: 142,
    maxParticipants: 500,
    currentParticipants: 142,
    pinnedMessage: 'Bienvenue au Live de Mathématiques ! Posez vos questions dans le chat, le professeur y répondra durant la 2ème moitié.',
  },
  {
    id: 'live_phys_8b_lab',
    bookId: 'book_phys_8b',
    bookTitle: 'Sciences Physiques & Chimie — 8ème Année de Base',
    subject: 'Physique',
    professorId: 'prof_aida_profile',
    professorName: 'Prof. Aida Triki',
    title: 'Live Lab : Réactions chimiques et conservation de la masse',
    titleAr: 'مباشر من المخبر : التفاعلات الكيميائية وانحفاظ الكتلة',
    description: 'Démonstrations expérimentales en direct depuis le laboratoire de sciences physiques.',
    scheduledAt: '2026-10-20T17:00:00.000Z',
    startedAt: null,
    endedAt: null,
    estimatedDurationMinutes: 60,
    status: 'SCHEDULED',
    priceMillimes: 10000,
    isFreeForTrimesterStudents: true,
    viewerCount: 88,
    maxParticipants: 300,
    currentParticipants: 88,
  },
];

export const INITIAL_LIVE_CHAT: LiveChatMessage[] = [
  {
    id: 'msg_1',
    liveSessionId: 'live_math_9b_concours',
    userId: 'user_prof_1',
    userName: 'Prof. Hichem Ben Salem',
    userRole: 'PROFESSOR',
    message: 'Salam alikoum à tous les élèves ! Préparez vos calculatrices et compas pour la démonstration de géométrie.',
    isQuestion: false,
    isPinned: true,
    createdAt: '2026-10-18T17:55:00Z',
  },
  {
    id: 'msg_2',
    liveSessionId: 'live_math_9b_concours',
    userId: 'user_student_1',
    userName: 'Elyes Gharbi',
    userRole: 'STUDENT',
    message: 'Monsieur, est-ce que la réciproque du théorème de Thalès nécessite de préciser l\'alignement des points dans le même ordre ?',
    isQuestion: true,
    isPinned: false,
    createdAt: '2026-10-18T18:02:10Z',
  },
];

// Singleton Store Pattern for dev session persistence
class TuniEduStore {
  users: User[] = [...INITIAL_USERS];
  academicYears: AcademicYear[] = [...INITIAL_ACADEMIC_YEARS];
  books: Book[] = [...INITIAL_BOOKS];
  entitlements: Entitlement[] = [...INITIAL_ENTITLEMENTS];
  purchases: Purchase[] = [];
  ledger: FinancialLedgerEntry[] = [...INITIAL_LEDGER];
  parentLinks: ParentChildLink[] = [...INITIAL_PARENT_LINKS];
  studySessions: StudySession[] = [...INITIAL_STUDY_SESSIONS];
  attempts: ExerciseAttempt[] = [...INITIAL_ATTEMPTS];
  videos: VideoContent[] = [...INITIAL_VIDEOS];
  liveSessions: LiveSession[] = [...INITIAL_LIVE_SESSIONS];
  liveChatMessages: LiveChatMessage[] = [...INITIAL_LIVE_CHAT];
  trimesters: Trimester[] = [...INITIAL_TRIMESTERS];
  bookPricing: BookTrimesterPricing[] = [...INITIAL_BOOK_PRICING];
  aiMessages: AiChatMessage[] = [...INITIAL_AI_MESSAGES];
  aiProposals: AiCorrectionProposal[] = [...INITIAL_AI_PROPOSALS];
  d17Transactions: D17Transaction[] = [...INITIAL_D17_TRANSACTIONS];
  prepaidCards: PrepaidCard[] = [...INITIAL_PREPAID_CARDS];
  communityPosts: CommunityPost[] = [...INITIAL_COMMUNITY_POSTS];
  communityGroups: CommunityGroup[] = [...INITIAL_COMMUNITY_GROUPS];
  aiConfig: AiPlatformConfig = { ...INITIAL_AI_CONFIG };

  // Active authenticated user id. Populated from the verified session.
  currentUserId: string | null = null;

  getCurrentUser(): User | null {
    if (!this.currentUserId) return null;
    return this.users.find((u) => u.id === this.currentUserId) ?? null;
  }

  setCurrentUser(userId: string) {
    const found = this.users.find((u) => u.id === userId);
    if (found) {
      this.currentUserId = userId;
    }
  }

  clearCurrentUser() {
    this.currentUserId = null;
  }

  upsertUser(user: User) {
    const index = this.users.findIndex((u) => u.id === user.id);
    if (index >= 0) {
      this.users[index] = user;
    } else {
      this.users.push(user);
    }
  }

  getActiveAcademicYear(): AcademicYear {
    const active = this.academicYears.find((ay) => ay.isActive);
    if (!active) {
      return this.academicYears[0];
    }
    return active;
  }

  hasActiveEntitlement(userId: string, bookId: string, currentInstant?: string): boolean {
    const now = currentInstant || new Date().toISOString();
    return this.entitlements.some((e) => {
      return (
        e.userId === userId &&
        e.bookId === bookId &&
        e.status === 'ACTIVE' &&
        e.startsAt <= now &&
        now < e.expiresAt
      );
    });
  }

  getEntitlement(userId: string, bookId: string): Entitlement | undefined {
    return this.entitlements.find((e) => e.userId === userId && e.bookId === bookId);
  }

  /**
   * Executes Checkout & Payment atomic reconciliation
   * SEC-04: Server fetches book prices from database/store, NEVER trusts client-submitted price
   * Rule: Snapshot academic year end into entitlement
   * Rule: 10% platform commission ledger entry (1000 bps)
   */
  processCheckout(params: {
    userId: string;
    bookIds: string[];
    paymentProvider: 'FLOUCI' | 'KONNECT' | 'GPG';
    idempotencyKey: string;
  }): { purchase: Purchase; entitlements: Entitlement[]; error?: string } {
    // Check idempotency
    const existing = this.purchases.find((p) => p.idempotencyKey === params.idempotencyKey);
    if (existing) {
      const userEntitlements = this.entitlements.filter((e) =>
        existing.items.some((item) => item.bookId === e.bookId && e.userId === params.userId)
      );
      return { purchase: existing, entitlements: userEntitlements };
    }

    const activeYear = this.getActiveAcademicYear();
    const purchasedBooks: Book[] = [];

    const purchaseId = `purch_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const nowIso = new Date().toISOString();

    let subtotalMillimes = 0;
    for (const bId of params.bookIds) {
      const book = this.books.find((b) => b.id === bId);
      if (!book) {
        const missing: Purchase = {
          id: purchaseId,
          userId: params.userId,
          status: 'FAILED',
          currency: 'TND',
          totalMillimes: 0,
          subtotalMillimes: 0,
          discountMillimes: 0,
          idempotencyKey: params.idempotencyKey,
          createdAt: nowIso,
          items: [],
        };
        return { purchase: missing, entitlements: [], error: `Manuel introuvable: ${bId}` };
      }
      purchasedBooks.push(book);
      subtotalMillimes += book.priceMillimes; // Price from server only!
    }

    const items: PurchaseItem[] = purchasedBooks.map((b, idx) => ({
      id: `item_${purchaseId}_${idx + 1}`,
      purchaseId,
      bookId: b.id,
      bookTitleSnapshot: b.title,
      unitPriceMillimes: b.priceMillimes,
      commissionBps: 2000, // 20%
    }));

    const newPurchase: Purchase = {
      id: purchaseId,
      userId: params.userId,
      status: 'PAID', // In real sandbox, webhook sets PAID; simulator marks confirmed
      currency: 'TND',
      totalMillimes: subtotalMillimes,
      subtotalMillimes,
      discountMillimes: 0,
      idempotencyKey: params.idempotencyKey,
      createdAt: nowIso,
      paidAt: nowIso,
      items,
    };
    this.purchases.push(newPurchase);

    // Grant Entitlements with explicit snapshot of academic-year end instant
    const createdEntitlements: Entitlement[] = [];
    for (let i = 0; i < purchasedBooks.length; i++) {
      const book = purchasedBooks[i];
      const item = items[i];

      // Remove any prior expired entitlement for clean record
      this.entitlements = this.entitlements.filter(
        (e) => !(e.userId === params.userId && e.bookId === book.id && e.academicYearId === activeYear.id)
      );

      const ent: Entitlement = {
        id: `ent_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        userId: params.userId,
        bookId: book.id,
        academicYearId: activeYear.id,
        status: 'ACTIVE',
        startsAt: nowIso,
        expiresAt: activeYear.endsAt, // CRITICAL: Snapshotted instant in Africa/Tunis!
        grantedAt: nowIso,
        purchaseItemId: item.id,
      };
      this.entitlements.push(ent);
      createdEntitlements.push(ent);

      // Financial Ledger: Gross Sale
      this.ledger.push({
        id: `led_sale_${Date.now()}_${i}`,
        professorId: book.professorId,
        purchaseId: newPurchase.id,
        type: 'SALE',
        amountMillimes: book.priceMillimes,
        currency: 'TND',
        reference: `SALE-${newPurchase.id}-${i + 1}`,
        description: `Vente: ${book.title}`,
        createdAt: nowIso,
      });

      // Financial Ledger: 20% Platform Commission
      const commissionMillimes = Math.round((book.priceMillimes * 2000) / 10000);
      this.ledger.push({
        id: `led_comm_${Date.now()}_${i}`,
        professorId: book.professorId,
        purchaseId: newPurchase.id,
        type: 'PLATFORM_COMMISSION',
        amountMillimes: commissionMillimes,
        currency: 'TND',
        reference: `COMM-${newPurchase.id}-${i + 1}`,
        description: `Commission plateforme (20%) pour ${book.title}`,
        createdAt: nowIso,
      });
    }

    return { purchase: newPurchase, entitlements: createdEntitlements };
  }

  submitExerciseAttempt(userId: string, exerciseId: string, answer: string): ExerciseAttempt {
    let targetEx: Exercise | undefined;
    for (const b of this.books) {
      for (const ch of b.chapters) {
        const found = ch.exercises.find((e) => e.id === exerciseId);
        if (found) {
          targetEx = found;
          break;
        }
      }
    }

    const isCorrect = targetEx ? targetEx.answerKey.trim().toLowerCase() === answer.trim().toLowerCase() : false;
    const score = isCorrect ? (targetEx?.points || 1) : 0;

    const attempt: ExerciseAttempt = {
      id: `att_${Date.now()}`,
      userId,
      exerciseId,
      submittedAnswer: answer,
      isCorrect,
      score,
      submittedAt: new Date().toISOString(),
    };
    this.attempts.push(attempt);
    return attempt;
  }

  recordPayout(professorId: string, amountMillimes: number, reference?: string): FinancialLedgerEntry {
    const entry: FinancialLedgerEntry = {
      id: `led_payout_${Date.now()}`,
      professorId,
      type: 'PAYOUT',
      amountMillimes,
      currency: 'TND',
      reference: reference || `BCT-VIR-${Date.now().toString().slice(-6)}`,
      description: `Virement bancaire de redevances (${(amountMillimes / 1000).toFixed(3)} DT)`,
      createdAt: new Date().toISOString(),
    };
    this.ledger.push(entry);
    return entry;
  }

  // ── PHASE 3 & 4 METHODS ────────────────────────────────────────────────────

  getVideosForBook(bookId: string): VideoContent[] {
    return this.videos.filter((v) => v.bookId === bookId);
  }

  getVideo(videoId: string): VideoContent | undefined {
    return this.videos.find((v) => v.id === videoId);
  }

  createVideo(video: Omit<VideoContent, 'id' | 'createdAt'>): VideoContent {
    const newVideo: VideoContent = {
      ...video,
      id: `vid_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    this.videos.push(newVideo);
    return newVideo;
  }

  updateBook(
    bookId: string,
    patch: Partial<Pick<Book, 'status' | 'pageCount' | 'coverObjectKey'>>,
  ): Book | undefined {
    const book = this.books.find((b) => b.id === bookId);
    if (!book) return undefined;
    Object.assign(book, patch);
    return book;
  }

  getLiveSessions(): LiveSession[] {
    return this.liveSessions;
  }

  getLiveSession(liveId: string): LiveSession | undefined {
    return this.liveSessions.find((s) => s.id === liveId);
  }

  createLiveSession(session: Omit<LiveSession, 'id' | 'viewerCount' | 'status' | 'subject' | 'maxParticipants' | 'currentParticipants'> & Partial<Pick<LiveSession, 'subject' | 'maxParticipants' | 'currentParticipants'>>): LiveSession {
    const newSession: LiveSession = {
      ...session,
      id: `live_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      status: 'SCHEDULED',
      subject: session.subject || 'Cours en direct',
      viewerCount: 0,
      maxParticipants: session.maxParticipants ?? 500,
      currentParticipants: session.currentParticipants ?? 0,
    };
    this.liveSessions.push(newSession);
    return newSession;
  }

  startLiveSession(liveId: string): LiveSession | undefined {
    const session = this.liveSessions.find((s) => s.id === liveId);
    if (session) {
      session.status = 'LIVE';
      session.startedAt = new Date().toISOString();
    }
    return session;
  }

  endLiveSession(liveId: string, replayVideoId?: string): LiveSession | undefined {
    const session = this.liveSessions.find((s) => s.id === liveId);
    if (session) {
      session.status = 'ENDED';
      session.endedAt = new Date().toISOString();
      if (replayVideoId) {
        session.replayVideoId = replayVideoId;
      }
    }
    return session;
  }

  getLiveChatMessages(liveId: string): LiveChatMessage[] {
    return this.liveChatMessages.filter((m) => m.liveSessionId === liveId);
  }

  addLiveChatMessage(msg: Omit<LiveChatMessage, 'id' | 'createdAt'>): LiveChatMessage {
    const newMsg: LiveChatMessage = {
      ...msg,
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    this.liveChatMessages.push(newMsg);
    return newMsg;
  }

  // ── PHASE 5: AI PERSONAL TUTOR & TEACHER REVIEW METHODS ────────────────────

  getAiMessages(userId: string, bookId?: string): AiChatMessage[] {
    return this.aiMessages.filter(
      (m) => m.userId === userId && (!bookId || m.bookId === bookId)
    );
  }

  addAiMessage(msg: Omit<AiChatMessage, 'id' | 'createdAt'>): AiChatMessage {
    const newMsg: AiChatMessage = {
      ...msg,
      id: `ai_msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    this.aiMessages.push(newMsg);
    return newMsg;
  }

  getAiCorrectionProposals(teacherId?: string, status?: string): AiCorrectionProposal[] {
    return this.aiProposals.filter((p) => {
      const matchTeacher = !teacherId || p.teacherId === teacherId || !p.teacherId;
      const matchStatus = !status || p.status === status;
      return matchTeacher && matchStatus;
    });
  }

  addAiCorrectionProposal(proposal: Omit<AiCorrectionProposal, 'id' | 'createdAt'>): AiCorrectionProposal {
    const newProposal: AiCorrectionProposal = {
      ...proposal,
      id: `prop_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    this.aiProposals.push(newProposal);
    return newProposal;
  }

  reviewAiCorrectionProposal(
    proposalId: string,
    teacherId: string,
    status: 'APPROVED' | 'EDITED' | 'REJECTED',
    notes?: string,
    editedSolution?: string
  ): AiCorrectionProposal | undefined {
    const prop = this.aiProposals.find((p) => p.id === proposalId);
    if (!prop) return undefined;

    prop.status = status;
    prop.teacherId = teacherId;
    prop.reviewedAt = new Date().toISOString();
    if (notes) prop.teacherNotes = notes;
    if (editedSolution) prop.teacherEditedSolution = editedSolution;

    return prop;
  }

  // ── PHASE 6: TRIMESTER QUOTAS & PRICING METHODS ────────────────────────────

  getTrimesters(): Trimester[] {
    return this.trimesters;
  }

  getActiveTrimester(): Trimester | undefined {
    return this.trimesters.find((t) => t.isActive) || this.trimesters[0];
  }

  getBookPricing(bookId: string): BookTrimesterPricing | undefined {
    return this.bookPricing.find((bp) => bp.bookId === bookId);
  }

  // ── PHASE 7: PARENTAL TELEMETRY & PROGRESS METHODS ─────────────────────────

  getChildProgress(parentId: string, explicitChildId?: string) {
    const link = this.parentLinks.find(
      (l) => l.parentId === parentId && (!explicitChildId || l.childId === explicitChildId) && l.status === 'ACTIVE'
    );
    const childId = link ? link.childId : explicitChildId || '';
    const child = this.users.find((u) => u.id === childId);

    const childAttempts = this.attempts.filter((a) => a.userId === childId);
    const completedCount = childAttempts.length;
    const correctCount = childAttempts.filter((a) => a.isCorrect).length;
    const accuracy = completedCount > 0 ? Math.round((correctCount / completedCount) * 100) : 0;

    const childSessions = this.studySessions.filter((s) => s.userId === childId);
    const totalActiveSeconds = childSessions.reduce((acc, s) => acc + s.activeSeconds, 0);

    const childEntitlements = this.entitlements.filter(
      (e) => e.userId === childId && e.status === 'ACTIVE'
    );

    const childAiMessages = this.aiMessages.filter((m) => m.userId === childId && m.role === 'user');

    return {
      childId: child?.id ?? childId,
      childName: child?.name ?? 'Élève',
      avatar: child?.avatar || '👨‍🎓',
      levelCode: 'lvl_9b',
      levelNameFr: '9ème Année de Base (Neufième)',
      totalStudyMinutes: Math.round(totalActiveSeconds / 60),
      exercisesCompleted: completedCount,
      exerciseAccuracyPercentage: accuracy,
      activeBooksCount: childEntitlements.length,
      liveSessionsAttended: 3,
      aiTutorQuestionsAsked: childAiMessages.length,
      strengths: ['Géométrie dans l\'espace', 'Théorème de Thalès', 'Calcul numérique'],
      areasForImprovement: ['Factorisation des radicaux', 'Gestion du temps en examen'],
      recentActivities: [
        {
          id: 'act_1',
          date: '2026-10-12T14:25:00Z',
          type: 'EXERCISE',
          title: 'Exercice 2 : Calcul de racines carrées',
          subject: 'Mathématiques',
          score: 3,
          details: 'Réussi du premier coup (Score: 3/3)',
        },
        {
          id: 'act_2',
          date: '2026-10-12T14:00:00Z',
          type: 'AI_SESSION',
          title: 'Question au Tuteur IA',
          subject: 'Mathématiques',
          details: 'Pourquoi le théorème de Thalès sert-il dans la vraie vie ?',
        },
        {
          id: 'act_3',
          date: '2026-10-11T17:30:00Z',
          type: 'READING',
          title: 'Lecture Chapitre 1 : Les Nombres Réels',
          subject: 'Mathématiques',
          details: '45 minutes de révision active',
        },
      ],
    };
  }

  // ── REVERSE-ENGINEERED METHODS: D17, PREPAID CARDS, COMMUNITY & AI CONFIG ──

  submitD17Transaction(params: {
    userId: string;
    bookId: string;
    planType: 'BOOK_ONLY' | 'TRIMESTER_BUNDLE' | 'ANNUAL_PASS';
    reference: string;
    amountMillimes: number;
    receiptNote?: string;
  }): { transaction: D17Transaction; error?: string } {
    const existing = this.d17Transactions.find((t) => t.reference.trim() === params.reference.trim());
    if (existing) {
      return { transaction: existing, error: 'Cette référence D17 a déjà été soumise et est en cours de traitement.' };
    }
    const user = this.users.find((u) => u.id === params.userId) || this.getCurrentUser();
    const book = this.books.find((b) => b.id === params.bookId) || this.books[0];
    if (!user) {
      throw new Error('Utilisateur introuvable pour cette transaction D17.');
    }

    const tx: D17Transaction = {
      id: `d17_${Date.now()}`,
      reference: params.reference.trim(),
      userId: user.id,
      userName: user.name,
      bookId: book.id,
      bookTitle: book.title,
      planType: params.planType,
      amountMillimes: params.amountMillimes,
      status: 'PENDING',
      submittedAt: new Date().toISOString(),
      receiptNote: params.receiptNote,
    };
    this.d17Transactions.unshift(tx);
    return { transaction: tx };
  }

  approveD17Transaction(txId: string): { success: boolean; entitlement?: Entitlement; error?: string } {
    const tx = this.d17Transactions.find((t) => t.id === txId);
    if (!tx) return { success: false, error: 'Transaction D17 introuvable' };

    tx.status = 'APPROVED';
    tx.reviewedAt = new Date().toISOString();

    const activeYear = this.getActiveAcademicYear();
    const nowIso = new Date().toISOString();
    const ent: Entitlement = {
      id: `ent_d17_${Date.now()}`,
      userId: tx.userId,
      bookId: tx.bookId,
      academicYearId: activeYear.id,
      status: 'ACTIVE',
      startsAt: nowIso,
      expiresAt: activeYear.endsAt,
      grantedAt: nowIso,
      purchaseItemId: `d17_${tx.id}`,
    };
    this.entitlements.push(ent);

    this.ledger.push({
      id: `led_d17_${Date.now()}`,
      professorId: 'prof_hichem_profile',
      type: 'BOOK_SALE',
      amountMillimes: tx.amountMillimes,
      currency: 'TND',
      reference: tx.reference,
      description: `Règlement D17 Validé: ${tx.bookTitle}`,
      createdAt: nowIso,
    });

    return { success: true, entitlement: ent };
  }

  rejectD17Transaction(txId: string, reason?: string): { success: boolean; error?: string } {
    const tx = this.d17Transactions.find((t) => t.id === txId);
    if (!tx) return { success: false, error: 'Transaction D17 introuvable' };
    tx.status = 'REJECTED';
    tx.reviewedAt = new Date().toISOString();
    if (reason) tx.receiptNote = `${tx.receiptNote || ''} [Rejet: ${reason}]`;
    return { success: true };
  }

  redeemPrepaidCard(code: string, userId: string): { success: boolean; card?: PrepaidCard; entitlement?: Entitlement; error?: string } {
    const cleanCode = code.trim().toUpperCase();
    const card = this.prepaidCards.find((c) => c.code.toUpperCase() === cleanCode);
    if (!card) {
      return { success: false, error: 'Code de carte prépayée invalide. Veuillez vérifier le code gratté.' };
    }
    if (card.status === 'USED') {
      return { success: false, error: 'Cette carte prépayée a déjà été utilisée.' };
    }
    if (card.status === 'EXPIRED') {
      return { success: false, error: 'Cette carte prépayée est expirée.' };
    }

    const nowIso = new Date().toISOString();
    card.status = 'USED';
    card.usedByUserId = userId;
    card.usedAt = nowIso;

    const targetBookId = card.targetBookId || 'book_math_9b';
    const activeYear = this.getActiveAcademicYear();

    const ent: Entitlement = {
      id: `ent_prepaid_${Date.now()}`,
      userId,
      bookId: targetBookId,
      academicYearId: activeYear.id,
      status: 'ACTIVE',
      startsAt: nowIso,
      expiresAt: activeYear.endsAt,
      grantedAt: nowIso,
      purchaseItemId: `prepaid_${card.id}`,
    };
    this.entitlements.push(ent);

    return { success: true, card, entitlement: ent };
  }

  addCommunityPost(post: Omit<CommunityPost, 'id' | 'likesCount' | 'commentsCount' | 'createdAt' | 'hasCertifiedAnswer'>): CommunityPost {
    const newPost: CommunityPost = {
      ...post,
      id: `post_${Date.now()}`,
      likesCount: 0,
      commentsCount: 0,
      createdAt: new Date().toISOString(),
      hasCertifiedAnswer: false,
    };
    this.communityPosts.unshift(newPost);
    return newPost;
  }

  toggleLikePost(postId: string): boolean {
    const post = this.communityPosts.find((p) => p.id === postId);
    if (!post) return false;
    if (post.likedByCurrentUser) {
      post.likesCount = Math.max(0, post.likesCount - 1);
      post.likedByCurrentUser = false;
    } else {
      post.likesCount += 1;
      post.likedByCurrentUser = true;
    }
    return true;
  }

  updateAiConfig(updates: Partial<AiPlatformConfig>) {
    this.aiConfig = { ...this.aiConfig, ...updates };
  }

  triggerCnpSync(): { status: string; pagesIndexed: number } {
    this.aiConfig.cnpSyncStatus = 'SYNCING';
    this.aiConfig.lastOcrSyncAt = new Date().toISOString();
    this.aiConfig.indexedPagesCount += 48;
    setTimeout(() => {
      this.aiConfig.cnpSyncStatus = 'SYNCED';
    }, 1500);
    return { status: 'SYNCED', pagesIndexed: this.aiConfig.indexedPagesCount };
  }
}

// Global Singleton to preserve data across HMR in development
const globalForStore = globalThis as unknown as { tunieduStore?: TuniEduStore };

export const store = globalForStore.tunieduStore ?? new TuniEduStore();
if (process.env.NODE_ENV !== 'production') globalForStore.tunieduStore = store;
