/**
 * TuniEdu AI Personal Tutor & Pedagogical Engine (Layer 06 Application Runtime, Layer 14 Governance & INPDP)
 * 
 * Complies with:
 * - INPDP (Instance Nationale de Protection des Données Personnelles): Automatic PII sanitization.
 * - Ministry of Education Tunisian Curriculum Scopes (Primary 1P-6P, Collège 7B-9B, Lycée 1S-3ème, Baccalauréat).
 * - Teacher-in-the-Loop decision requirement: Flags out-of-syllabus methods (e.g. L'Hôpital, CPGE tricks)
 *   and automatically routes correction proposals to the teacher's approval queue.
 */

import { AiChatMessageDTO, AiCorrectionProposalDTO, AiMessageRole } from '@tuniedu/shared-types';
import {
  AiCompletionResult,
  AiUsage,
  createChatCompletion,
  isAiProviderConfigured,
} from './ai-provider';

// =============================================================================
// LAYER 14: INPDP PII SANITIZATION
// =============================================================================

export interface SanitizationResult {
  sanitizedText: string;
  piiRedacted: boolean;
  redactedTypes: string[];
}

/**
 * Strips email addresses, Tunisian telephone numbers (+216 / 8-digit mobile),
 * Tunisian CIN (8 digits), and personal identification markers before AI ingestion.
 */
export function sanitizePromptForInpdp(text: string): SanitizationResult {
  let sanitized = text;
  const redactedTypes: string[] = [];

  // Email regex
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  if (emailRegex.test(sanitized)) {
    sanitized = sanitized.replace(emailRegex, '[EMAIL_PROTÉGÉ_INPDP]');
    redactedTypes.push('EMAIL');
  }

  // Tunisian Phone: (+216) followed by 8 digits, or local 8 digits starting with 2, 4, 5, 7, 9
  const tunisianPhoneRegex = /(?:\+216\s?|00216\s?)?[24579]\d{7}\b/g;
  if (tunisianPhoneRegex.test(sanitized)) {
    sanitized = sanitized.replace(tunisianPhoneRegex, '[TÉL_PROTÉGÉ_INPDP]');
    redactedTypes.push('PHONE_NUMBER');
  }

  // Tunisian CIN (Carte d'Identité Nationale: exactly 8 digits)
  const cinRegex = /\b(?:CIN\s*[:#]?\s*)?(\d{8})\b/gi;
  if (cinRegex.test(sanitized)) {
    sanitized = sanitized.replace(cinRegex, '[CIN_PROTÉGÉ_INPDP]');
    redactedTypes.push('NATIONAL_ID');
  }

  return {
    sanitizedText: sanitized,
    piiRedacted: redactedTypes.length > 0,
    redactedTypes,
  };
}

// =============================================================================
// PEDAGOGICAL "WHY ARE WE LEARNING THIS?" DICTIONARY (TUNISIAN RELEVANCE)
// =============================================================================

interface PedagogicalRationale {
  subject: string;
  topic: string;
  level: string;
  rationaleFr: string;
  rationaleAr: string;
  realWorldApplication: string;
}

const TUNISIAN_PEDAGOGICAL_RATIONALES: Record<string, PedagogicalRationale> = {
  nombres_complexes: {
    subject: 'Mathématiques',
    topic: 'Nombres Complexes',
    level: 'Baccalauréat Mathématiques & Sciences',
    rationaleFr: "Les nombres complexes permettent de transformer des calculs géométriques et trigonométriques complexes en simples additions et multiplications algébriques.",
    rationaleAr: "الأعداد المركبة تحول الحسابات الهندسية والمثلثية المعقدة إلى عمليات جبرية بسيطة ومباشرة.",
    realWorldApplication: "En Tunisie, tous les ingénieurs télécoms (chez Tunisie Telecom, Ooredoo, Orange) utilisent les nombres complexes pour modéliser le signal 4G/5G, l'impédance des circuits électroniques et l'imagerie médicale IRM.",
  },
  theoreme_thales: {
    subject: 'Mathématiques',
    topic: 'Théorème de Thalès & Homothétie',
    level: '9ème Année de Base & 1ère Secondaire',
    rationaleFr: "Thalès permet de mesurer des hauteurs et distances inaccessibles sans avoir besoin de monter dessus, simplement en comparant les ombres et les proportions.",
    rationaleAr: "مبرهنة طاليس تمكن من قيس الارتفاعات والمسافات البعيدة غير القابلة للوصول المباشر عبر مقارنة الظلال والنسب الهندسية.",
    realWorldApplication: "Les architectes et géomètres en Tunisie s'en servent pour construire des ponts (comme le pont Radès-La Goulette), calculer la pente des toits et dresser les plans cadastraux.",
  },
  genetique_mendel: {
    subject: 'Sciences de la Vie et de la Terre',
    topic: 'Génétique des Diploïdes & Lois de Mendel',
    level: 'Baccalauréat Sciences Expérimentales',
    rationaleFr: "Comprendre comment les caractères physiques et les prédispositions génétiques se transmettent de génération en génération avec des probabilités statistiques précises.",
    rationaleAr: "فهم كيفية انتقال الصفات الوراثية من جيل إلى جيل بدقة إحصائية وعلمية.",
    realWorldApplication: "Crucial pour l'Institut Pasteur de Tunis dans le diagnostic des maladies héréditaires, et pour l'INRAT dans l'amélioration de la résistance des oliviers et du blé tunisien face au stress hydrique.",
  },
  calcul_mental_fractions: {
    subject: 'Mathématiques',
    topic: 'Fractions & Proportions',
    level: '6ème Année Primaire (Sixième)',
    rationaleFr: "Les fractions apprennent à diviser une ressource en parts équitables et à comparer des quantités sans faire d'erreur.",
    rationaleAr: "الكسور تعلمنا تقسيم الموارد بالعدل وبشكل متكافئ ومقارنة الكميات بدقة.",
    realWorldApplication: "Pour partager une pizza ou un gâteau en famille, calculer les remises lors des soldes (par exemple 1/3 de réduction), ou mesurer des ingrédients de cuisine (1/4 de litre de lait).",
  },
  complexite_algorithmique: {
    subject: 'Informatique',
    topic: 'Algorithmique & Complexité (Big O)',
    level: 'Baccalauréat Sciences de l\'Informatique',
    rationaleFr: "Distinguer un algorithme efficace qui s'exécute en 2 secondes d'un algorithme inefficace qui bloquerait un serveur pendant des heures.",
    rationaleAr: "التمييز بين خوارزمية ذكية وسريعة تنتهي في ثوان وخوارزمية بطيئة تعطل الخوادم لساعات.",
    realWorldApplication: "Utilisé par les startups fintech tunisiennes (Flouci, Konnect) et les banques pour traiter des millions de transactions bancaires en temps réel sans jamais ralentir.",
  },
};

// =============================================================================
// CURRICULUM SYLLABUS INTEGRITY CHECK (TEACHER DECISION LAYER)
// =============================================================================

// University / out-of-syllabus methods forbidden in Tunisian Secondary/Lycée
const OUT_OF_SYLLABUS_PATTERNS = [
  {
    regex: /r[èe]gle de l'?h[ôo]pital/i,
    flag: "Règle de L'Hôpital (Hors-programme secondaire tunisien : utiliser la factorisation, l'expression conjuguée ou les théorèmes de comparaison).",
  },
  {
    regex: /d[ée]veloppements? limit[ée]s?|formule de taylor/i,
    flag: "Développements Limités / Formule de Taylor (Niveau Université/Prépa : proscrit pour le Bac tunisien).",
  },
  {
    regex: /inversion matricielle|comatrice|matrice inverse/i,
    flag: "Calcul matriciel avancé (Hors-programme pour les sections non-spécialisées ou niveaux inférieurs).",
  },
  {
    regex: /th[ée]or[èe]me de lagrange|accroissements finis g[ée]n[ée]ralis[ée]s/i,
    flag: "Théorème de Lagrange généralisé (Utiliser les fonctions dérivées selon le programme officiel).",
  },
];

/**
 * Validates whether the AI's explanation uses tools outside the official Tunisian program.
 * Returns warnings that mandate a teacher's explicit review.
 */
export function checkCurriculumIntegrity(text: string, levelStage: string): { requiresTeacherReview: boolean; warning?: string } {
  // If primary or college, any advanced university method is strictly invalid
  for (const item of OUT_OF_SYLLABUS_PATTERNS) {
    if (item.regex.test(text)) {
      return {
        requiresTeacherReview: true,
        warning: item.flag,
      };
    }
  }

  // College-specific check: derivatives are strictly Lycée (3ème/Bac)
  if (levelStage === 'COLLEGE' || levelStage === 'PRIMAIRE') {
    if (/d[ée]riv[ée]e|f'\([x]\)|primitive/i.test(text)) {
      return {
        requiresTeacherReview: true,
        warning: "L'IA utilise des notions de dérivées qui ne sont enseignées qu'au Lycée (3ème et Bac). L'élève est au Collège/Primaire.",
      };
    }
  }

  return { requiresTeacherReview: false };
}

// =============================================================================
// AI GENERATION PIPELINE (SOCRATIC PEDAGOGICAL TUTOR)
// =============================================================================

export interface AiTutorRequest {
  studentId: string;
  studentName: string;
  bookId?: string;
  chapterTitle?: string;
  levelStage?: 'PRIMAIRE' | 'COLLEGE' | 'LYCEE' | 'UNIVERSITE';
  levelCode?: string; // e.g. "lvl_9b", "lvl_bac_math"
  mode: 'EXPLAIN' | 'WHY_LEARN' | 'HINT' | 'CORRECT_EXERCISE';
  prompt: string;
  exerciseDetails?: {
    exerciseId: string;
    prompt: string;
    studentAnswer: string;
    expectedAnswer?: string;
  };
  language?: 'fr' | 'ar' | 'bilingual';
}

export interface AiTutorResponse {
  message: AiChatMessageDTO;
  correctionProposal?: AiCorrectionProposalDTO;
  sanitization: SanitizationResult;
  teacherValidationRequired: boolean;
  generation: {
    source: 'LLM' | 'TEMPLATE';
    provider?: string;
    model?: string;
    latencyMs?: number;
    attempts?: number;
    usage?: AiUsage;
  };
}

/**
 * Intelligent AI pedagogical response synthesizer tailored to the Tunisian educational curriculum.
 */
export async function generateAiTutorResponse(request: AiTutorRequest): Promise<AiTutorResponse> {
  // 1. INPDP Sanitization
  const sanitization = sanitizePromptForInpdp(request.prompt);
  const cleanInput = sanitization.sanitizedText;
  const stage = request.levelStage || 'COLLEGE';
  const now = new Date().toISOString();

  // 2. Handle "WHY_LEARN" mode
  if (request.mode === 'WHY_LEARN') {
    const matchedRationale = findPedagogicalRationale(cleanInput, request.chapterTitle);
    
    let content = "";
    if (request.language === 'ar') {
      content = `🌟 **لماذا ندرس هذا المحور في المنهاج التونسي؟**\n\n${matchedRationale.rationaleAr}\n\n**🏢 التطبيق في الحياة الواقعية والمهن في تونس:**\n${matchedRationale.realWorldApplication}`;
    } else {
      content = `🌟 **Pourquoi apprenons-nous cela dans le programme tunisien ?**\n\n${matchedRationale.rationaleFr}\n\n💡 **Application concrète dans la vie réelle et en Tunisie :**\n${matchedRationale.realWorldApplication}`;
    }

    return {
      message: {
        id: `ai_msg_${Date.now()}`,
        role: 'assistant' as AiMessageRole,
        content,
        pedagogicalRationale: matchedRationale.realWorldApplication,
        suggestedQuestions: [
          "Donne-moi un exemple simple avec des chiffres",
          "Comment ce sujet apparaît-il dans les examens nationaux ?",
          "Quel exercice me conseilles-tu pour commencer ?",
        ],
        simplifiedLevel: stage === 'COLLEGE' ? 'COLLEGE' : stage === 'PRIMAIRE' ? 'PRIMAIRE' : 'LYCEE',
        language: request.language || 'fr',
        createdAt: now,
      },
      sanitization,
      teacherValidationRequired: false,
      generation: { source: 'TEMPLATE' },
    };
  }

  // 3. Handle "HINT" (Socratic guidance without giving the direct answer)
  if (request.mode === 'HINT') {
    let hintContent = "";
    if (stage === 'PRIMAIRE') {
      hintContent = `💡 **Indice pour toi :**\n\nRelis bien l'énoncé calmement ! Pense à dessiner la situation sur ton brouillon ou à imaginer des objets réels. Quelle est la première opération dont tu as besoin ? (+ ou -) ?`;
    } else if (stage === 'COLLEGE') {
      hintContent = `💡 **Indice méthodologique (Collège) :**\n\n1. Identifie d'abord les données connues et ce que l'on te demande de calculer.\n2. Rappelle-toi du théorème du cours : est-on dans une configuration de triangle rectangle (Pythagore) ou de droites sécantes avec parallèles (Thalès) ?\n3. Écris la formule générale avant de remplacer par les valeurs numériques.`;
    } else {
      hintContent = `💡 **Piste de réflexion guidée (Lycée / Bac) :**\n\n• Vérifie d'abord le domaine de définition et les conditions d'existence.\n• Si tu fais face à une indétermination (type 0/0 ou ∞/∞), factorise par le terme prépondérant ou multiplie par l'expression conjuguée.\n• Ne saute aucune étape intermédiaire dans ta rédaction pour conserver l'intégralité des points au barème officiel !`;
    }

    return {
      message: {
        id: `ai_msg_${Date.now()}`,
        role: 'assistant',
        content: hintContent,
        suggestedQuestions: [
          "J'ai factorisé mais je bloque encore, que faire ?",
          "Puis-je voir un exercice similaire corrigé ?",
        ],
        simplifiedLevel: stage === 'COLLEGE' ? 'COLLEGE' : stage === 'PRIMAIRE' ? 'PRIMAIRE' : 'LYCEE',
        createdAt: now,
      },
      sanitization,
      teacherValidationRequired: false,
      generation: { source: 'TEMPLATE' },
    };
  }

  // 4. Handle "CORRECT_EXERCISE" (Evaluating student's attempt with Teacher-in-the-Loop check)
  if (request.mode === 'CORRECT_EXERCISE' && request.exerciseDetails) {
    const { exerciseId, prompt, studentAnswer, expectedAnswer } = request.exerciseDetails;

    // Deterministic correctness signal (used as a fallback and sanity anchor).
    const isAnswerMatching = expectedAnswer
      ? studentAnswer.trim().toLowerCase() === expectedAnswer.trim().toLowerCase()
      : false;

    // Prefer a REAL LLM correction grounded in the exercise when configured.
    const llmCorrection = await generateLlmCorrection(request, isAnswerMatching);

    const isCorrect = llmCorrection ? llmCorrection.isCorrect : isAnswerMatching;

    const aiExplanation =
      llmCorrection?.explanation ||
      `Pour résoudre cet exercice conformément au programme tunisien :\n` +
        `1. On identifie la règle fondamentale applicable au niveau ${request.levelCode || stage}.\n` +
        `2. Démarche pas-à-pas : La réponse proposée par l'élève est "${studentAnswer}".\n` +
        `3. Conclusion : ${isAnswerMatching ? 'Le raisonnement est rigoureux et conforme.' : "Il y a une erreur dans l'application de la règle ou le signe numérique."}`;

    // Check if the solution triggers a syllabus warning.
    const syllabusCheck = checkCurriculumIntegrity(cleanInput + ' ' + studentAnswer + ' ' + aiExplanation, stage);

    const proposal: AiCorrectionProposalDTO = {
      id: `prop_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      exerciseId,
      exercisePrompt: prompt,
      chapterTitle: request.chapterTitle || "Chapitre d'exercices",
      bookTitle: request.bookId || 'Manuel TuniEdu',
      studentId: request.studentId,
      studentName: request.studentName,
      studentAnswer,
      aiProposedSolution: expectedAnswer || 'Solution détaillée selon le barème',
      aiExplanation,
      aiConfidence: syllabusCheck.requiresTeacherReview ? 0.72 : llmCorrection ? (isCorrect ? 0.95 : 0.88) : isAnswerMatching ? 0.96 : 0.8,
      curriculumMethodWarning: syllabusCheck.warning || null,
      status: syllabusCheck.requiresTeacherReview ? 'PENDING_REVIEW' : 'APPROVED',
      createdAt: now,
    };

    let responseText = '';
    if (syllabusCheck.requiresTeacherReview) {
      responseText = `⚠️ **Analyse de ton exercice en cours par le Professeur :**\n\n` +
        `J'ai bien analysé ta tentative ! Cependant, la méthode de résolution fait appel à une approche sensible qui doit être validée par ton enseignant pour s'assurer qu'elle respecte exactement le barème officiel du Ministère de l'Éducation.\n\n` +
        `📌 **Statut :** Envoyé au professeur pour validation pédagogique.\n` +
        `🔔 **Remarque notée :** ${syllabusCheck.warning}`;
    } else if (llmCorrection?.feedback) {
      responseText = llmCorrection.feedback;
    } else if (isCorrect) {
      responseText = `🎉 **Bravo ${request.studentName} ! Excellente réponse !**\n\n` +
        `Ta démarche est parfaitement correcte et respecte le barème du programme tunisien. Tu as gagné les points attribués à cet exercice.\n\n` +
        `💡 **Conseil pour l'examen :** Soigne la présentation sur ta feuille d'examen en encadrant toujours le résultat final !`;
    } else {
      responseText = `📝 **Analyse de ta réponse :**\n\n` +
        `Tu as proposé : \`${studentAnswer}\`.\n\n` +
        `Ce n'est pas tout à fait le résultat attendu. Regarde attentivement l'indice suivant :\n` +
        `• Revérifie les priorités opératoires et les signes (- par - donne +).\n` +
        `• La réponse exacte attendue est : **${expectedAnswer}**.\n\n` +
        `Voudrais-tu que je t'explique étape par étape comment y parvenir ?`;
    }

    return {
      message: {
        id: `ai_msg_${Date.now()}`,
        role: 'assistant',
        content: responseText,
        createdAt: now,
      },
      correctionProposal: proposal,
      sanitization,
      teacherValidationRequired: syllabusCheck.requiresTeacherReview,
      generation: llmCorrection
        ? {
            source: 'LLM',
            provider: llmCorrection.provider,
            model: llmCorrection.model,
            latencyMs: llmCorrection.latencyMs,
            attempts: llmCorrection.attempts,
            usage: llmCorrection.usage,
          }
        : { source: 'TEMPLATE' },
    };
  }

  // 5. Default "EXPLAIN" mode — real LLM when configured, curated template otherwise.
  const llmResult = await generateLlmExplanation(cleanInput, stage, request);
  if (llmResult) {
    const syllabusCheck = checkCurriculumIntegrity(`${cleanInput} ${llmResult.content}`, stage);
    const content = syllabusCheck.requiresTeacherReview
      ? `${llmResult.content}\n\n⚠️ **Remarque pédagogique :** ${syllabusCheck.warning}`
      : llmResult.content;

    return {
      message: {
        id: `ai_msg_${Date.now()}`,
        role: 'assistant',
        content,
        suggestedQuestions: [
          "Peux-tu m'expliquer avec un exemple plus simple ?",
          "À quoi cela sert-il dans la vraie vie ?",
          "Donne-moi un petit quiz pour tester si j'ai compris",
        ],
        simplifiedLevel: stage === 'COLLEGE' ? 'COLLEGE' : stage === 'PRIMAIRE' ? 'PRIMAIRE' : 'LYCEE',
        language: request.language || 'fr',
        createdAt: now,
      },
      sanitization,
      teacherValidationRequired: syllabusCheck.requiresTeacherReview,
      generation: {
        source: 'LLM',
        provider: llmResult.provider,
        model: llmResult.model,
        latencyMs: llmResult.latencyMs,
        attempts: llmResult.attempts,
        usage: llmResult.usage,
      },
    };
  }

  const defaultExplanation = generateSyllabusExplanation(cleanInput, stage, request.language);

  return {
    message: {
      id: `ai_msg_${Date.now()}`,
      role: 'assistant',
      content: defaultExplanation,
      suggestedQuestions: [
        "Peux-tu m'expliquer avec un exemple plus simple ?",
        "À quoi cela sert-il dans la vraie vie ?",
        "Donne-moi un petit quiz pour tester si j'ai compris",
      ],
      simplifiedLevel: stage === 'COLLEGE' ? 'COLLEGE' : stage === 'PRIMAIRE' ? 'PRIMAIRE' : 'LYCEE',
      createdAt: now,
    },
    sanitization,
    teacherValidationRequired: false,
    generation: { source: 'TEMPLATE' },
  };
}

// =============================================================================
// INTERNAL HELPERS
// =============================================================================

function findPedagogicalRationale(input: string, chapterTitle?: string): PedagogicalRationale {
  const combined = (input + " " + (chapterTitle || "")).toLowerCase();

  if (combined.includes('complexe') || combined.includes('imaginaire')) {
    return TUNISIAN_PEDAGOGICAL_RATIONALES.nombres_complexes;
  }
  if (combined.includes('thal') || combined.includes('pythagore') || combined.includes('triangle') || combined.includes('cosinus')) {
    return TUNISIAN_PEDAGOGICAL_RATIONALES.theoreme_thales;
  }
  if (combined.includes('genet') || combined.includes('adn') || combined.includes('mendel') || combined.includes('chromosome')) {
    return TUNISIAN_PEDAGOGICAL_RATIONALES.genetique_mendel;
  }
  if (combined.includes('fraction') || combined.includes('partage') || combined.includes('divis')) {
    return TUNISIAN_PEDAGOGICAL_RATIONALES.calcul_mental_fractions;
  }
  if (combined.includes('algo') || combined.includes('python') || combined.includes('tri') || combined.includes('complex')) {
    return TUNISIAN_PEDAGOGICAL_RATIONALES.complexite_algorithmique;
  }

  // Fallback generic rationale
  return {
    subject: 'Général',
    topic: 'Apprentissage fondamental',
    level: 'Programme National Tunisien',
    rationaleFr: "Cette notion développe ta rigueur logique, ta capacité d'analyse et ton esprit critique face à des problèmes complexes.",
    rationaleAr: "هذا المحور ينمي لديك التفكير المنطقي والقدرة على التحليل المنهجي وحل المسائل المعقدة بدقة.",
    realWorldApplication: "Ces méthodes sont à la base des carrières scientifiques, économiques et d'ingénierie les plus demandées en Tunisie et à l'international.",
  };
}

/**
 * Builds the curriculum-grounded prompt and calls the external LLM provider.
 * Returns null when the provider is not configured or the call fails, so the
 * caller falls back to the deterministic template.
 */
async function generateLlmExplanation(
  cleanInput: string,
  stage: string,
  request: AiTutorRequest,
): Promise<AiCompletionResult | null> {
  if (!isAiProviderConfigured()) return null;

  const langLabel = request.language === 'ar' ? 'arabe' : 'français';
  const system = [
    "Tu es le tuteur IA pédagogique de TuniEdu pour le programme officiel tunisien (Ministère de l'Éducation).",
    `Niveau de l'élève : ${stage}.`,
    `Réponds en ${langLabel}.`,
    'Règles strictes :',
    '- Reste dans le programme officiel tunisien du niveau indiqué.',
    "- N'utilise jamais de méthodes hors-programme (règle de L'Hôpital, développements limités/Taylor, calcul matriciel avancé) pour l'enseignement secondaire.",
    '- Adopte une approche socratique : guide l\'élève étape par étape plutôt que de donner directement la réponse.',
    '- Structure la réponse (titre, étapes, exemple concret) et reste concis, orienté préparation aux examens.',
  ].join('\n');

  const userParts = [`Question de l'élève : ${cleanInput}`];
  if (request.chapterTitle) userParts.push(`Chapitre : ${request.chapterTitle}`);
  if (request.levelCode) userParts.push(`Code niveau : ${request.levelCode}`);

  return createChatCompletion(
    [
      { role: 'system', content: system },
      { role: 'user', content: userParts.join('\n') },
    ],
    { temperature: 0.4, maxTokens: 900 },
  );
}

interface LlmCorrection {
  isCorrect: boolean;
  explanation: string;
  feedback: string;
  provider?: string;
  model?: string;
  latencyMs: number;
  attempts: number;
  usage?: AiUsage;
}

/**
 * Uses the LLM to evaluate a student's exercise attempt and produce a real,
 * curriculum-grounded correction. Parses a strict JSON contract; returns null
 * when the provider is unavailable or the output cannot be parsed so the caller
 * falls back to the deterministic template. Teacher-in-the-loop is preserved:
 * the caller still runs the out-of-syllabus integrity check on the result.
 */
async function generateLlmCorrection(
  request: AiTutorRequest,
  deterministicMatch: boolean,
): Promise<LlmCorrection | null> {
  if (!isAiProviderConfigured() || !request.exerciseDetails) return null;

  const stage = request.levelStage || 'COLLEGE';
  const { prompt, studentAnswer, expectedAnswer } = request.exerciseDetails;
  const langLabel = request.language === 'ar' ? 'arabe' : 'français';

  const system = [
    "Tu es le correcteur IA pédagogique de TuniEdu pour le programme officiel tunisien (Ministère de l'Éducation).",
    `Niveau de l'élève : ${stage}. Réponds en ${langLabel}.`,
    'Reste strictement dans le programme officiel du niveau indiqué.',
    "N'utilise jamais de méthodes hors-programme (règle de L'Hôpital, développements limités/Taylor, calcul matriciel avancé).",
    'Réponds UNIQUEMENT par un objet JSON valide, sans texte autour, au format:',
    '{"isCorrect": boolean, "explanation": string, "feedback": string}',
    "- explanation: correction pas-à-pas, rigoureuse et conforme au barème.",
    "- feedback: message bienveillant adressé à l'élève (encourage et guide, explique l'erreur si besoin).",
  ].join('\n');

  const user = [
    `Énoncé: ${prompt}`,
    `Réponse de l'élève: ${studentAnswer}`,
    expectedAnswer ? `Réponse attendue: ${expectedAnswer}` : 'Réponse attendue: (non fournie, évalue la rigueur de la démarche)',
    `Signal de correspondance automatique: ${deterministicMatch ? 'correspondance exacte' : 'pas de correspondance exacte'}`,
  ].join('\n');

  const result: AiCompletionResult | null = await createChatCompletion(
    [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    { temperature: 0.2, maxTokens: 800 },
  );
  if (!result) return null;

  const parsed = parseCorrectionJson(result.content);
  if (!parsed) return null;

  return {
    isCorrect: parsed.isCorrect,
    explanation: parsed.explanation,
    feedback: parsed.feedback,
    provider: result.provider,
    model: result.model,
    latencyMs: result.latencyMs,
    attempts: result.attempts,
    usage: result.usage,
  };
}

function parseCorrectionJson(content: string): { isCorrect: boolean; explanation: string; feedback: string } | null {
  // Tolerate ```json fences and surrounding prose.
  const start = content.indexOf('{');
  const end = content.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    const obj = JSON.parse(content.slice(start, end + 1)) as {
      isCorrect?: unknown;
      explanation?: unknown;
      feedback?: unknown;
    };
    if (typeof obj.isCorrect !== 'boolean') return null;
    const explanation = typeof obj.explanation === 'string' ? obj.explanation.trim() : '';
    const feedback = typeof obj.feedback === 'string' ? obj.feedback.trim() : '';
    if (!explanation && !feedback) return null;
    return { isCorrect: obj.isCorrect, explanation, feedback };
  } catch {
    return null;
  }
}

function generateSyllabusExplanation(input: string, stage: string, lang?: string): string {
  if (lang === 'ar') {
    return `مرحباً بك في المساعد الذكي لتوني إيدو! 🎓\n\n` +
      `بناءً على المنهاج الرسمي لوزارة التربية التونسية (${stage}):\n` +
      `سؤالك: "${input}"\n\n` +
      `💡 **الشرح المبسط:**\n` +
      `في هذا المحور، نركز على فهم المفهوم خطوة بخطوة بالاعتماد على الأمثلة التوضيحية.\n` +
      `هل ترغب في توضيح إضافي أو في حل تمرين تطبيقي معاً؟`;
  }

  if (stage === 'PRIMAIRE') {
    return `Bonjour champion ! 🌟\n\n` +
      `Pour ta question : "${input}"\n\n` +
      `C'est une très bonne question ! Imagine que tu as un panier de pommes 🍎 et que tu veux les distribuer à tes amis. ` +
      `En mathématiques ou en sciences au primaire, tout s'explique avec des choses simples du quotidien.\n\n` +
      `Veux-tu qu'on fasse un petit jeu ou un exemple avec des images pour bien retenir ?`;
  }

  if (stage === 'COLLEGE') {
    return `Bonjour ! 📚\n\n` +
      `Concernant ta question : "${input}"\n\n` +
      `Au Collège (de la 7ème à la 9ème de base), la clé de la réussite pour le concours de la Neufième est la **méthode** :\n` +
      `1. Énoncer clairement la propriété ou le théorème du cours.\n` +
      `2. Vérifier que toutes les hypothèses sont bien réunies dans l'exercice.\n` +
      `3. Rédiger la déduction avec précision (donc, d'où, par conséquent).\n\n` +
      `Quel point précis du cours souhaites-tu éclaircir ?`;
  }

  // Lycée / Bac
  return `Bonjour ! 🎓\n\n` +
    `Analyse pédagogique pour ta question : "${input}"\n\n` +
    `Dans l'épreuve du **Baccalauréat Tunisien**, les correcteurs valorisent particulièrement :\n` +
    `• La rigueur des quantificateurs et l'explicitation des théorèmes clés (Théorème des Valeurs Intermédiaires, Dérivabilité, Continuité).\n` +
    `• La clarté des justifications mathématiques et l'absence de raccourcis non démontrés.\n\n` +
    `Souhaites-tu que nous détaillions le raisonnement type ou que nous regardions un exemple tiré d'une session précédente du Bac ?`;
}
