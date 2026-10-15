'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { store, CommunityPost } from '@/lib/store';
import { useLanguage } from '@/lib/language-context';
import { useSession } from '@/components/providers/SessionProvider';
import { Icons } from '@/components/ui/icons';

type ActiveCommunityTab = 'FEED' | 'GROUPS' | 'WEBINARS' | 'PROFILE';

export default function CommunityPage() {
  const { lang } = useLanguage();
  const { user: currentUser } = useSession();

  const [activeTab, setActiveTab] = useState<ActiveCommunityTab>('FEED');
  const [selectedFilter, setSelectedFilter] = useState<string>('ALL');
  const [posts, setPosts] = useState<CommunityPost[]>([...store.communityPosts]);

  // Post composer state
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newSubject, setNewSubject] = useState('Mathématiques');
  const [newLevel, setNewLevel] = useState('9ème Année de Base');
  const [newCategory, setNewCategory] = useState<'EXERCICE' | 'QUESTION' | 'METHODE' | 'ORIENTATION'>('EXERCICE');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter posts
  const filteredPosts = posts.filter((p) => {
    if (selectedFilter === 'ALL') return true;
    if (selectedFilter === 'BAC') return p.level.toLowerCase().includes('bac');
    if (selectedFilter === '9EME') return p.level.toLowerCase().includes('9ème') || p.level.toLowerCase().includes('neuf');
    if (selectedFilter === 'PRIMAIRE') return p.level.toLowerCase().includes('primaire') || p.level.toLowerCase().includes('6ème');
    if (selectedFilter === 'CERTIFIED') return p.hasCertifiedAnswer;
    return true;
  });

  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;
    if (!currentUser) return;

    setIsSubmitting(true);
    const created = store.addCommunityPost({
      authorId: currentUser.id,
      authorName: currentUser.name,
      authorRole: currentUser.role === 'ADMIN' ? 'PROFESSOR' : (currentUser.role as CommunityPost['authorRole']),
      authorAvatar: currentUser.role === 'PROFESSOR' ? '👨‍🏫' : currentUser.role === 'PARENT' ? '👨‍💼' : '👨‍🎓',
      level: newLevel,
      subject: newSubject,
      category: newCategory,
      title: newTitle.trim(),
      content: newContent.trim(),
    });

    setPosts([created, ...posts]);
    setNewTitle('');
    setNewContent('');
    setIsComposerOpen(false);
    setIsSubmitting(false);
  };

  const handleLike = (postId: string) => {
    store.toggleLikePost(postId);
    setPosts([...store.communityPosts]);
  };

  const handleRefreshFeed = () => {
    setPosts([...store.communityPosts]);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="relative rounded-3xl bg-gradient-to-r from-slate-950 via-[#0F2942] to-slate-900 text-white p-8 sm:p-10 overflow-hidden shadow-xl border border-slate-800">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
              {lang === 'ar' ? 'فضاء التواصل البيداغوجي المعتمد' : 'Communauté Nationale TuniEdu'}
            </span>
            <span className="text-[10px] font-semibold text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>380+ Enseignants Agréés Connectés</span>
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-bold font-serif tracking-tight leading-tight">
            {lang === 'ar'
              ? 'ملتقى التلاميذ، الأولياء والمدرسين التونسيين'
              : 'Échangez, posez vos questions & révisez ensemble'}
          </h1>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            {lang === 'ar'
              ? 'مساحة رسمية للأسئلة المنهجية، مشاركة التمارين النموذجية، وتلقي إجابات موثوقة ومصادق عليها من طرف مفتشين وأساتذة معتمدين.'
              : 'Posez vos questions sur les exercices, obtenez des réponses certifiées par des enseignants de lycées pilotes et participez aux webinaires de révision.'}
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={() => setIsComposerOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition flex items-center gap-2"
            >
              <Icons.Plus className="w-4 h-4" />
              <span>{lang === 'ar' ? 'طرح سؤال أو موضوع جديد' : 'Poser une question / Nouveau sujet'}</span>
            </button>
            <div className="flex items-center gap-4 text-xs text-slate-400 pl-2">
              <span><strong>14,200+</strong> Membres</span>
              <span>•</span>
              <span><strong>1,840+</strong> Réponses validées</span>
            </div>
          </div>
        </div>
      </div>

      {/* Community Top Navigation Tabs (Section 2.3) */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2 overflow-x-auto gap-2">
        <div className="flex items-center gap-1 sm:gap-2">
          {[
            { id: 'FEED', labelAr: 'المنشورات والأسئلة', labelFr: 'Fil d\'Actualité & Questions', icon: Icons.MessageSquare },
            { id: 'GROUPS', labelAr: 'مجموعات المراجعة', labelFr: 'Groupes d\'Entraide Pédagogique', icon: Icons.Users },
            { id: 'WEBINARS', labelAr: 'الندوات والمراجعات المباشرة', labelFr: 'Webinaires & Directs', icon: Icons.Video },
            { id: 'PROFILE', labelAr: 'ملفي والإشعارات', labelFr: 'Mon Profil & Badges', icon: Icons.GraduationCap },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as ActiveCommunityTab)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  isActive
                    ? 'bg-blue-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{lang === 'ar' ? tab.labelAr : tab.labelFr}</span>
              </button>
            );
          })}
        </div>

        <button
          onClick={handleRefreshFeed}
          className="p-2 text-slate-500 hover:text-blue-700 rounded-xl hover:bg-slate-100 transition shrink-0"
          title="Actualiser le flux"
        >
          <Icons.Refresh className="w-4 h-4" />
        </button>
      </div>

      {/* ── TAB 1: POST FEED ─────────────────────────────────────────────── */}
      {activeTab === 'FEED' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Feed Column */}
          <div className="lg:col-span-8 space-y-6">
            {/* Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {[
                { id: 'ALL', label: 'Toutes les discussions' },
                { id: 'BAC', label: '🎓 Baccalauréat 2027' },
                { id: '9EME', label: '🏆 9ème Année (Concours Pilote)' },
                { id: 'PRIMAIRE', label: '🎒 Primaire (1ère à 6ème)' },
                { id: 'CERTIFIED', label: '✨ Réponses Certifiées Enseignants' },
              ].map((pill) => (
                <button
                  key={pill.id}
                  onClick={() => setSelectedFilter(pill.id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${
                    selectedFilter === pill.id
                      ? 'bg-blue-100 text-blue-900 border border-blue-300 shadow-2xs font-bold'
                      : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>

            {/* Post Composer Modal / Box */}
            {isComposerOpen && (
              <form
                onSubmit={handleCreatePost}
                className="bg-white rounded-3xl border border-blue-300 p-6 shadow-md space-y-4 animate-in slide-in-from-top-4"
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="font-bold text-sm text-slate-900 font-serif flex items-center gap-2">
                    <Icons.FileText className="w-4 h-4 text-blue-600" />
                    <span>Poser une Question à la Communauté Pédagogique</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsComposerOpen(false)}
                    className="text-slate-400 hover:text-slate-700 text-sm font-bold"
                  >
                    ×
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Niveau scolaire :</label>
                    <select
                      value={newLevel}
                      onChange={(e) => setNewLevel(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                    >
                      <option>4ème Année Secondaire (Bac)</option>
                      <option>3ème Année Secondaire</option>
                      <option>9ème Année de Base</option>
                      <option>8ème Année de Base</option>
                      <option>7ème Année de Base</option>
                      <option>6ème Année Primaire (Sixième)</option>
                      <option>Primaire Général</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Matière :</label>
                    <select
                      value={newSubject}
                      onChange={(e) => setNewSubject(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                    >
                      <option>Mathématiques</option>
                      <option>Sciences Physiques</option>
                      <option>Sciences de la Vie et de la Terre (SVT)</option>
                      <option>Arabe (اللغة العربية)</option>
                      <option>Français</option>
                      <option>Informatique & Algorithmique</option>
                      <option>Éveil Scientifique</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Type de sujet :</label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value as 'EXERCICE' | 'QUESTION' | 'METHODE' | 'ORIENTATION')}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                    >
                      <option value="EXERCICE">Exercice / Corrigé</option>
                      <option value="QUESTION">Question de cours</option>
                      <option value="METHODE">Méthodologie d&apos;examen</option>
                      <option value="ORIENTATION">Orientation scolaire</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-xs text-slate-700 block mb-1">Titre de la question :</label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Ex: Comment bien rédiger la réciproque de Thalès au concours ?"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="font-bold text-xs text-slate-700 block mb-1">Détails et énoncé :</label>
                  <textarea
                    rows={4}
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    placeholder="Expliquez ce qui vous bloque et où vous avez des doutes..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    required
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsComposerOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-xs text-slate-600 hover:bg-slate-50"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs shadow-xs transition"
                  >
                    {isSubmitting ? 'Publication...' : 'Publier la question'}
                  </button>
                </div>
              </form>
            )}

            {/* Posts List */}
            <div className="space-y-5">
              {filteredPosts.map((post) => (
                <div
                  key={post.id}
                  className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-xs hover:shadow-md transition space-y-4"
                >
                  {/* Author Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-700 to-indigo-600 flex items-center justify-center text-lg text-white shadow-xs">
                        {post.authorAvatar || '👨‍🎓'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900">{post.authorName}</span>
                          <span
                            className={`text-[9px] font-bold px-2 py-0.2 rounded-full border ${
                              post.authorRole === 'PROFESSOR'
                                ? 'bg-amber-50 text-amber-900 border-amber-200'
                                : post.authorRole === 'PARENT'
                                ? 'bg-purple-50 text-purple-900 border-purple-200'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            {post.authorRole === 'PROFESSOR'
                              ? 'Enseignant Agréé'
                              : post.authorRole === 'PARENT'
                              ? 'Parent'
                              : 'Élève'}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Il y a 1 jour • {post.level} • {post.subject}
                        </div>
                      </div>
                    </div>

                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
                      {post.category}
                    </span>
                  </div>

                  {/* Post Content */}
                  <div className="space-y-2">
                    <h3 className="font-bold text-sm sm:text-base text-slate-900 font-serif leading-snug">
                      {post.title}
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                      {post.content}
                    </p>
                  </div>

                  {/* Certified Educator Answer Highlight (Section 2.3) */}
                  {post.hasCertifiedAnswer && post.certifiedAnswer && (
                    <div className="mt-4 p-4 sm:p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200/90 space-y-2.5 relative">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold">
                            ✓
                          </span>
                          <span className="text-xs font-bold text-emerald-950">
                            Réponse Pédagogique Certifiée
                          </span>
                        </div>
                        <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded-full border border-emerald-200">
                          {post.certifiedAnswer.teacherBadge}
                        </span>
                      </div>

                      <div className="text-xs font-bold text-slate-900">
                        {post.certifiedAnswer.teacherName} :
                      </div>

                      <p className="text-xs text-slate-700 leading-relaxed font-serif bg-white/70 p-3 rounded-xl border border-emerald-100">
                        {post.certifiedAnswer.content}
                      </p>
                    </div>
                  )}

                  {/* Post Actions: Like, Comment count, Share */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-500">
                    <div className="flex items-center gap-4">
                      <button
                        type="button"
                        onClick={() => handleLike(post.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition ${
                          post.likedByCurrentUser
                            ? 'bg-blue-50 text-blue-700 font-bold'
                            : 'hover:bg-slate-100 text-slate-600'
                        }`}
                      >
                        <Icons.ThumbsUp className="w-4 h-4" />
                        <span>{post.likesCount} J&apos;aime</span>
                      </button>

                      <div className="flex items-center gap-1.5 text-slate-500">
                        <Icons.MessageSquare className="w-4 h-4" />
                        <span>{post.commentsCount} Réponses</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => alert('Lien de la discussion copié dans le presse-papier !')}
                      className="flex items-center gap-1 hover:text-slate-800 transition"
                      title="Partager cette question"
                    >
                      <Icons.Share className="w-3.5 h-3.5" />
                      <span>Partager</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Groups & Certified Teachers Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            {/* Revision Groups Widget */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
              <h3 className="font-bold text-sm text-slate-900 font-serif flex items-center justify-between">
                <span>Groupes d&apos;Entraide Populaires</span>
                <span className="text-[10px] text-blue-600 font-normal">Rejoindre</span>
              </h3>

              <div className="space-y-3">
                {store.communityGroups.map((grp) => (
                  <div
                    key={grp.id}
                    className="p-3.5 rounded-2xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/30 transition flex items-start gap-3"
                  >
                    <span className="text-2xl">{grp.icon}</span>
                    <div className="space-y-1">
                      <h4 className="font-bold text-xs text-slate-900">{grp.title}</h4>
                      <p className="text-[11px] text-slate-500 leading-snug">{grp.description}</p>
                      <div className="text-[10px] font-semibold text-blue-700 flex items-center gap-1 pt-0.5">
                        <Icons.Users className="w-3 h-3" />
                        <span>{grp.membersCount.toLocaleString()} membres</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Certified Pedagogical Charter */}
            <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-md space-y-3 border border-slate-800">
              <div className="flex items-center gap-2 text-xs font-bold text-blue-400 uppercase tracking-wider">
                <Icons.Shield className="w-4 h-4" />
                <span>Charte Pédagogique Officielle</span>
              </div>
              <h4 className="font-serif font-bold text-sm text-white">
                Régulation & Modération par les Enseignants
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Toutes les réponses signalées d&apos;un badge vert sont relues et certifiées conformes aux directives et barèmes du Ministère de l&apos;Éducation Tunisien.
              </p>
              <div className="pt-1">
                <Link
                  href="/catalogue"
                  className="text-xs text-blue-400 hover:underline font-semibold"
                >
                  Consulter les manuels officiels associés →
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: STUDY GROUPS ──────────────────────────────────────────── */}
      {activeTab === 'GROUPS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {store.communityGroups.map((grp) => (
            <div key={grp.id} className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-2xl">
                  {grp.icon}
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 font-serif">{grp.title}</h3>
                  <div className="text-xs text-slate-400">{grp.level} • {grp.subject}</div>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                {grp.description}
              </p>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                  <Icons.Users className="w-4 h-4 text-blue-600" />
                  <span>{grp.membersCount} participants inscrits</span>
                </span>
                <button
                  type="button"
                  onClick={() => alert(`Vous avez rejoint le groupe : ${grp.title}`)}
                  className="px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs shadow-xs transition"
                >
                  Rejoindre le Groupe
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── TAB 3: WEBINARS & LIVE SESSIONS ──────────────────────────────── */}
      {activeTab === 'WEBINARS' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-xl font-bold text-slate-900 font-serif">
                  Calendrier des Séances de Révision en Direct (Trimestre 1)
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Séances interactives dirigées par des inspecteurs et enseignants de collèges et lycées pilotes.
                </p>
              </div>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                ● En direct LiveKit HLS
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {store.liveSessions.map((s) => (
                <div key={s.id} className="p-5 rounded-2xl border border-slate-200 hover:border-blue-300 space-y-4 transition">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
                      {s.subject}
                    </span>
                    <span className="text-xs font-bold text-slate-500 font-mono">
                      Dimanche 18:00 (Tunis)
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-sm text-slate-900">{s.title}</h3>
                    <p className="text-xs text-slate-500 mt-1">{s.description}</p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                    <span className="font-semibold text-slate-700">{s.professorName}</span>
                    <Link
                      href={`/student/live/${s.id}`}
                      className="px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold transition shadow-xs"
                    >
                      Accéder au Live →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 4: MY PROFILE & NOTIFICATIONS ────────────────────────────── */}
      {activeTab === 'PROFILE' && (
        <div className="max-w-2xl mx-auto bg-white rounded-3xl border border-slate-200 p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-4 pb-6 border-b border-slate-100">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-700 to-indigo-600 text-white flex items-center justify-center text-2xl font-bold shadow-md">
              {currentUser?.name.charAt(0) ?? '?'}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 font-serif">{currentUser?.name ?? 'Invité'}</h2>
              <div className="text-xs text-blue-600 font-semibold">{currentUser?.email ?? ''}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Membre certifié TuniEdu • Année 2026–2027</div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="text-2xl font-bold text-slate-900">4</div>
              <div className="text-[10px] text-slate-500 font-semibold uppercase mt-0.5">Questions Posées</div>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="text-2xl font-bold text-blue-700">18</div>
              <div className="text-[10px] text-slate-500 font-semibold uppercase mt-0.5">J&apos;aime Reçus</div>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="text-2xl font-bold text-emerald-700">100%</div>
              <div className="text-[10px] text-slate-500 font-semibold uppercase mt-0.5">Taux de Réponse</div>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <h4 className="font-bold text-xs text-slate-700 uppercase tracking-wider">Badges & Récompenses Pédagogiques :</h4>
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 text-xs font-semibold flex items-center gap-1.5">
                <span>🌟</span>
                <span>Élève Actif du 1er Trimestre</span>
              </span>
              <span className="px-3 py-1.5 rounded-xl bg-blue-50 text-blue-900 border border-blue-200 text-xs font-semibold flex items-center gap-1.5">
                <span>📐</span>
                <span>Spécialiste Géométrie dans l&apos;Espace</span>
              </span>
              <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-200 text-xs font-semibold flex items-center gap-1.5">
                <span>🏆</span>
                <span>Candidat Concours Pilote 2027</span>
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
