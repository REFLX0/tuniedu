// =============================================================================
// TuniEdu Production Seed Script (V2)
// Seeds Academic Years, Trimesters (Africa/Tunis), Education Levels (1P -> Bac),
// Subjects, Verified Professors, Published Books, Chapters, and Exercises.
// =============================================================================

import { PrismaClient, EducationStage, UserRole, AccountStatus, ProfessorStatus, BookStatus, ExerciseType } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

const SEED_DEFAULT_PASSWORD = process.env.SEED_DEFAULT_PASSWORD ?? 'TuniEdu@2026';

export const SEED_DATA = {
  academicYears: [
    {
      id: 'ay_2026_2027',
      name: '2026–2027',
      startsAt: new Date('2026-09-15T00:00:00.000Z'),
      endsAt: new Date('2027-06-30T22:59:59.999Z'), // 23:59:59 Africa/Tunis
      timezone: 'Africa/Tunis',
      isActive: true,
      trimesters: [
        {
          id: 'trim_2026_t1',
          number: 1,
          nameFr: '1er Trimestre (Septembre — Décembre 2026)',
          nameAr: 'الثلاثي الأول (سبتمبر — ديسمبر 2026)',
          startsAt: new Date('2026-09-15T00:00:00.000Z'),
          endsAt: new Date('2026-12-31T22:59:59.999Z'),
          timezone: 'Africa/Tunis',
          isActive: true,
          isRegistrationOpen: true,
        },
        {
          id: 'trim_2026_t2',
          number: 2,
          nameFr: '2ème Trimestre (Janvier — Mars 2027)',
          nameAr: 'الثلاثي الثاني (جانفي — مارس 2027)',
          startsAt: new Date('2027-01-01T00:00:00.000Z'),
          endsAt: new Date('2027-03-31T22:59:59.999Z'),
          timezone: 'Africa/Tunis',
          isActive: false,
          isRegistrationOpen: false,
        },
        {
          id: 'trim_2026_t3',
          number: 3,
          nameFr: '3ème Trimestre (Avril — Juin 2027)',
          nameAr: 'الثلاثي الثالث (أفريل — جوان 2027)',
          startsAt: new Date('2027-04-01T00:00:00.000Z'),
          endsAt: new Date('2027-06-30T22:59:59.999Z'),
          timezone: 'Africa/Tunis',
          isActive: false,
          isRegistrationOpen: false,
        },
      ],
    },
    {
      id: 'ay_2025_2026',
      name: '2025–2026',
      startsAt: new Date('2025-09-15T00:00:00.000Z'),
      endsAt: new Date('2026-06-30T22:59:59.999Z'),
      timezone: 'Africa/Tunis',
      isActive: false,
      trimesters: [],
    },
  ],

  educationLevels: [
    // Primaire
    { id: 'lvl_1p', code: '1P', nameFr: '1ère Année Primaire', nameAr: 'السنة الأولى ابتدائي', stage: EducationStage.PRIMAIRE, sortOrder: 1, isConcours: false },
    { id: 'lvl_2p', code: '2P', nameFr: '2ème Année Primaire', nameAr: 'السنة الثانية ابتدائي', stage: EducationStage.PRIMAIRE, sortOrder: 2, isConcours: false },
    { id: 'lvl_3p', code: '3P', nameFr: '3ème Année Primaire', nameAr: 'السنة الثالثة ابتدائي', stage: EducationStage.PRIMAIRE, sortOrder: 3, isConcours: false },
    { id: 'lvl_4p', code: '4P', nameFr: '4ème Année Primaire', nameAr: 'السنة الرابعة ابتدائي', stage: EducationStage.PRIMAIRE, sortOrder: 4, isConcours: false },
    { id: 'lvl_5p', code: '5P', nameFr: '5ème Année Primaire', nameAr: 'السنة الخامسة ابتدائي', stage: EducationStage.PRIMAIRE, sortOrder: 5, isConcours: false },
    { id: 'lvl_6p', code: '6P', nameFr: '6ème Année Primaire (Sixième)', nameAr: 'السنة السادسة ابتدائي (السيزيام)', stage: EducationStage.PRIMAIRE, sortOrder: 6, isConcours: true, concoursName: 'Concours Sixième (Collèges Pilotes)' },
    // Collège
    { id: 'lvl_7b', code: '7B', nameFr: '7ème Année de Base', nameAr: 'السنة السابعة أساسي', stage: EducationStage.COLLEGE, sortOrder: 7, isConcours: false },
    { id: 'lvl_8b', code: '8B', nameFr: '8ème Année de Base', nameAr: 'السنة الثامنة أساسي', stage: EducationStage.COLLEGE, sortOrder: 8, isConcours: false },
    { id: 'lvl_9b', code: '9B', nameFr: '9ème Année de Base (Neufième)', nameAr: 'السنة التاسعة أساسي (النوفيام)', stage: EducationStage.COLLEGE, sortOrder: 9, isConcours: true, concoursName: 'Concours Neufième (Lycées Pilotes)' },
    // Lycée
    { id: 'lvl_s1', code: 'S1', nameFr: '1ère Année Secondaire', nameAr: 'السنة الأولى ثانوي', stage: EducationStage.LYCEE, sortOrder: 10, isConcours: false },
    { id: 'lvl_s2', code: 'S2', nameFr: '2ème Année Secondaire', nameAr: 'السنة الثانية ثانوي', stage: EducationStage.LYCEE, sortOrder: 11, isConcours: false },
    { id: 'lvl_s3', code: 'S3', nameFr: '3ème Année Secondaire', nameAr: 'السنة الثالثة ثانوي', stage: EducationStage.LYCEE, sortOrder: 12, isConcours: false },
    { id: 'lvl_bac_m', code: 'BAC-M', nameFr: 'Baccalauréat Mathématiques', nameAr: 'البكالوريا رياضيات', stage: EducationStage.LYCEE, sortOrder: 13, isConcours: true, concoursName: 'Examen National du Baccalauréat' },
    { id: 'lvl_bac_s', code: 'BAC-S', nameFr: 'Baccalauréat Sciences Expérimentales', nameAr: 'البكالوريا علوم تجريبية', stage: EducationStage.LYCEE, sortOrder: 14, isConcours: true, concoursName: 'Examen National du Baccalauréat' },
    { id: 'lvl_bac_i', code: 'BAC-I', nameFr: 'Baccalauréat Informatique', nameAr: 'البكالوريا إعلامية', stage: EducationStage.LYCEE, sortOrder: 15, isConcours: true, concoursName: 'Examen National du Baccalauréat' },
    { id: 'lvl_bac_l', code: 'BAC-L', nameFr: 'Baccalauréat Lettres', nameAr: 'البكالوريا آداب', stage: EducationStage.LYCEE, sortOrder: 16, isConcours: true, concoursName: 'Examen National du Baccalauréat' },
    { id: 'lvl_bac_e', code: 'BAC-E', nameFr: 'Baccalauréat Économie & Gestion', nameAr: 'البكالوريا اقتصاد وتصرف', stage: EducationStage.LYCEE, sortOrder: 17, isConcours: true, concoursName: 'Examen National du Baccalauréat' },
    // Supérieur
    { id: 'lvl_univ', code: 'UNIV_MATH', nameFr: 'Enseignement Supérieur — Mathématiques', nameAr: 'التعليم العالي - رياضيات', stage: EducationStage.UNIVERSITE, sortOrder: 18, isConcours: false },
  ],

  subjects: [
    { id: 'subj_math', code: 'MATH', nameFr: 'Mathématiques', nameAr: 'الرياضيات', iconSlug: 'calculator' },
    { id: 'subj_phys', code: 'PHYS', nameFr: 'Sciences Physiques', nameAr: 'العلوم الفيزيائية', iconSlug: 'atom' },
    { id: 'subj_svt', code: 'SVT', nameFr: 'Sciences de la Vie et de la Terre', nameAr: 'علوم الحياة والأرض', iconSlug: 'dna' },
    { id: 'subj_ara', code: 'ARA', nameFr: 'Arabe', nameAr: 'اللغة العربية', iconSlug: 'book' },
    { id: 'subj_fra', code: 'FRA', nameFr: 'Français', nameAr: 'اللغة الفرنسية', iconSlug: 'feather' },
    { id: 'subj_eng', code: 'ENG', nameFr: 'Anglais', nameAr: 'اللغة الإنجليزية', iconSlug: 'globe' },
    { id: 'subj_info', code: 'INFO', nameFr: 'Informatique & Algorithmique', nameAr: 'الإعلامية والخوارزميات', iconSlug: 'code' },
    { id: 'subj_eco', code: 'ECO', nameFr: 'Économie', nameAr: 'الاقتصاد', iconSlug: 'trending-up' },
    { id: 'subj_phi', code: 'PHI', nameFr: 'Philosophie', nameAr: 'الفلسفة', iconSlug: 'compass' },
  ],

  professors: [
    {
      userId: 'usr_prof_hichem',
      name: 'Prof. Hichem Ben Salem',
      email: 'hichem.bensalem@tuniedu.tn',
      phone: '+21698111222',
      profile: {
        id: 'prof_hichem_profile',
        displayName: 'Prof. Hichem Ben Salem',
        biography: 'Inspecteur pédagogique & Professeur agrégé de Mathématiques (22 ans d’expérience au Ministère de l’Éducation).',
        specialization: ['MATH'],
        status: ProfessorStatus.VERIFIED,
      },
    },
    {
      userId: 'usr_prof_aida',
      name: 'Prof. Aida Triki',
      email: 'aida.triki@tuniedu.tn',
      phone: '+21698333444',
      profile: {
        id: 'prof_aida_profile',
        displayName: 'Prof. Aida Triki',
        biography: 'Professeure Principale Hors Classe de Sciences Physiques, Sousse.',
        specialization: ['PHYS'],
        status: ProfessorStatus.VERIFIED,
      },
    },
    {
      userId: 'usr_prof_moncef',
      name: 'Prof. Moncef Gharbi',
      email: 'moncef.gharbi@tuniedu.tn',
      phone: '+21698555666',
      profile: {
        id: 'prof_moncef_profile',
        displayName: 'Prof. Moncef Gharbi',
        biography: 'Maître d’application en enseignement primaire, formateur des instituteurs, Sfax.',
        specialization: ['MATH', 'ARA'],
        status: ProfessorStatus.VERIFIED,
      },
    },
  ],

  adminUser: {
    id: 'usr_admin_tuniedu',
    name: 'Super Administrateur TuniEdu',
    email: 'admin@tuniedu.tn',
    phone: '+21671000000',
    status: AccountStatus.ACTIVE,
  },
};

export async function seedDatabase() {
  console.log('🚀 Starting TuniEdu V2 database seeding...');

  const seedPasswordHash = await argon2.hash(SEED_DEFAULT_PASSWORD, { type: argon2.argon2id });

  // 1. Seed Academic Years & Trimesters
  console.log('📅 Seeding Academic Years & Trimesters...');
  for (const ay of SEED_DATA.academicYears) {
    const createdAy = await prisma.academicYear.upsert({
      where: { id: ay.id },
      update: {
        name: ay.name,
        startsAt: ay.startsAt,
        endsAt: ay.endsAt,
        timezone: ay.timezone,
        isActive: ay.isActive,
      },
      create: {
        id: ay.id,
        name: ay.name,
        startsAt: ay.startsAt,
        endsAt: ay.endsAt,
        timezone: ay.timezone,
        isActive: ay.isActive,
      },
    });

    for (const trim of ay.trimesters) {
      await prisma.trimester.upsert({
        where: { id: trim.id },
        update: {
          number: trim.number,
          nameFr: trim.nameFr,
          nameAr: trim.nameAr,
          startsAt: trim.startsAt,
          endsAt: trim.endsAt,
          timezone: trim.timezone,
          isActive: trim.isActive,
          isRegistrationOpen: trim.isRegistrationOpen,
        },
        create: {
          id: trim.id,
          academicYearId: createdAy.id,
          number: trim.number,
          nameFr: trim.nameFr,
          nameAr: trim.nameAr,
          startsAt: trim.startsAt,
          endsAt: trim.endsAt,
          timezone: trim.timezone,
          isActive: trim.isActive,
          isRegistrationOpen: trim.isRegistrationOpen,
        },
      });
    }
  }

  // 2. Seed Education Levels
  console.log('🎓 Seeding Education Levels (1P -> BAC -> UNIV)...');
  for (const lvl of SEED_DATA.educationLevels) {
    await prisma.educationLevel.upsert({
      where: { code: lvl.code },
      update: {
        nameFr: lvl.nameFr,
        nameAr: lvl.nameAr,
        stage: lvl.stage,
        sortOrder: lvl.sortOrder,
        isConcours: lvl.isConcours,
        concoursName: lvl.concoursName,
      },
      create: {
        id: lvl.id,
        code: lvl.code,
        nameFr: lvl.nameFr,
        nameAr: lvl.nameAr,
        stage: lvl.stage,
        sortOrder: lvl.sortOrder,
        isConcours: lvl.isConcours,
        concoursName: lvl.concoursName,
      },
    });
  }

  // 3. Seed Subjects
  console.log('📚 Seeding Subjects...');
  for (const subj of SEED_DATA.subjects) {
    await prisma.subject.upsert({
      where: { code: subj.code },
      update: {
        nameFr: subj.nameFr,
        nameAr: subj.nameAr,
        iconSlug: subj.iconSlug,
      },
      create: {
        id: subj.id,
        code: subj.code,
        nameFr: subj.nameFr,
        nameAr: subj.nameAr,
        iconSlug: subj.iconSlug,
      },
    });
  }

  // 4. Seed Admin User
  console.log('🛡️ Seeding Super Admin...');
  await prisma.user.upsert({
    where: { id: SEED_DATA.adminUser.id },
    update: {
      name: SEED_DATA.adminUser.name,
      email: SEED_DATA.adminUser.email,
      phone: SEED_DATA.adminUser.phone,
      status: SEED_DATA.adminUser.status,
      passwordHash: seedPasswordHash,
    },
    create: {
      id: SEED_DATA.adminUser.id,
      name: SEED_DATA.adminUser.name,
      email: SEED_DATA.adminUser.email,
      phone: SEED_DATA.adminUser.phone,
      status: SEED_DATA.adminUser.status,
      passwordHash: seedPasswordHash,
      roles: {
        create: [{ role: UserRole.ADMIN }],
      },
    },
  });

  // 5. Seed Professors and Profiles
  console.log('👨‍🏫 Seeding Professors & Profiles...');
  for (const prof of SEED_DATA.professors) {
    const user = await prisma.user.upsert({
      where: { id: prof.userId },
      update: {
        name: prof.name,
        email: prof.email,
        phone: prof.phone,
        status: AccountStatus.ACTIVE,
        passwordHash: seedPasswordHash,
      },
      create: {
        id: prof.userId,
        name: prof.name,
        email: prof.email,
        phone: prof.phone,
        status: AccountStatus.ACTIVE,
        passwordHash: seedPasswordHash,
        roles: {
          create: [{ role: UserRole.PROFESSOR }],
        },
      },
    });

    await prisma.professorProfile.upsert({
      where: { id: prof.profile.id },
      update: {
        displayName: prof.profile.displayName,
        biography: prof.profile.biography,
        specialization: prof.profile.specialization,
        status: prof.profile.status,
      },
      create: {
        id: prof.profile.id,
        userId: user.id,
        displayName: prof.profile.displayName,
        biography: prof.profile.biography,
        specialization: prof.profile.specialization,
        status: prof.profile.status,
      },
    });
  }

  // 6. Seed Showcase Books & Chapters
  console.log('📖 Seeding Showcase Books, Trimester Pricing & Chapters...');
  const level9B = await prisma.educationLevel.findUnique({ where: { code: '9B' } });
  const subjMath = await prisma.subject.findUnique({ where: { code: 'MATH' } });
  const profHichem = await prisma.professorProfile.findUnique({ where: { id: 'prof_hichem_profile' } });
  const trim1 = await prisma.trimester.findFirst({ where: { number: 1, isActive: true } });

  if (level9B && subjMath && profHichem) {
    const book9B = await prisma.book.upsert({
      where: { slug: 'excellence-mathematiques-9eme-annee' },
      update: {
        title: "L'Excellence en Mathématiques — 9ème Année de Base (Concours Neufième)",
        description: 'Manuel officiel complet avec résumés de cours approfondis, 150 exercices gradués et corrigés détaillés conformes au programme officiel tunisien.',
        priceMillimes: 22000, // 22.000 DT annuel
        status: BookStatus.PUBLISHED,
        publishedAt: new Date(),
      },
      create: {
        id: 'book_math_9b',
        title: "L'Excellence en Mathématiques — 9ème Année de Base (Concours Neufième)",
        titleAr: 'الامتياز في الرياضيات — السنة التاسعة أساسي (مناظرة النوفيام)',
        slug: 'excellence-mathematiques-9eme-annee',
        description: 'Manuel officiel complet avec résumés de cours approfondis, 150 exercices gradués et corrigés détaillés conformes au programme officiel tunisien.',
        priceMillimes: 22000,
        currency: 'TND',
        language: 'fr',
        status: BookStatus.PUBLISHED,
        professorId: profHichem.id,
        educationLevelId: level9B.id,
        subjectId: subjMath.id,
        publishedAt: new Date(),
        tags: ['neufième', 'mathématiques', 'concours', 'collège pilote'],
      },
    });

    // Trimester pricing for book 9B
    if (trim1) {
      await prisma.bookTrimesterPricing.upsert({
        where: { id: 'pricing_9b_t1' },
        update: {
          priceMillimes: 9000, // 9.000 DT per trimester
        },
        create: {
          id: 'pricing_9b_t1',
          bookId: book9B.id,
          trimesterId: trim1.id,
          priceMillimes: 9000,
          isAnnual: false,
        },
      });
    }

    // Book Version for 9B
    const v1 = await prisma.bookVersion.upsert({
      where: { id: 'ver_math_9b_1' },
      update: {},
      create: {
        id: 'ver_math_9b_1',
        book: { connect: { id: book9B.id } },
        versionNumber: 1,
        pageCount: 120,
        originalObjectKey: 'manuscripts/raw/book_math_9b_v1.pdf',
        processingStatus: 'READY',
      },
    });

    // Chapters and Exercises for 9B
    const ch1 = await prisma.bookChapter.upsert({
      where: { id: 'ch_math_9b_1' },
      update: {
        title: 'Chapitre 1 : Les Nombres Réels et Opérations',
        startPage: 1,
        endPage: 32,
        sortOrder: 1,
      },
      create: {
        id: 'ch_math_9b_1',
        book: { connect: { id: book9B.id } },
        version: { connect: { id: v1.id } },
        title: 'Chapitre 1 : Les Nombres Réels et Opérations',
        startPage: 1,
        endPage: 32,
        sortOrder: 1,
      },
    });

    await prisma.exercise.upsert({
      where: { id: 'ex_math_9_1' },
      update: {
        prompt: { fr: 'Soit x un nombre réel tel que x² = 7 et x < 0. Quelle est la valeur exacte de x ?' },
        options: { fr: ['-√7', '√7', '-7/2', 'Impossible'] },
        answerKey: { fr: '-√7' },
        solutionFr: 'Puisque x² = 7, les solutions sont √7 et -√7. La condition x < 0 impose de retenir x = -√7.',
        points: 2,
        difficulty: 1,
        sortOrder: 1,
      },
      create: {
        id: 'ex_math_9_1',
        chapter: { connect: { id: ch1.id } },
        type: ExerciseType.MULTIPLE_CHOICE,
        prompt: { fr: 'Soit x un nombre réel tel que x² = 7 et x < 0. Quelle est la valeur exacte de x ?' },
        options: { fr: ['-√7', '√7', '-7/2', 'Impossible'] },
        answerKey: { fr: '-√7' },
        solutionFr: 'Puisque x² = 7, les solutions sont √7 et -√7. La condition x < 0 impose de retenir x = -√7.',
        points: 2,
        difficulty: 1,
        sortOrder: 1,
        isPublished: true,
      },
    });
  }

  console.log('✅ TuniEdu V2 database successfully seeded.');
}

async function main() {
  try {
    await seedDatabase();
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}
