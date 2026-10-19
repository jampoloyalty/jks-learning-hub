const curriculum = {
  7: [
    { title: 'Introduction to Computing', lessons: ['Components of computers and computer systems', 'Technology in the community', 'Health and safety in using ICT tools'] },
    { title: 'Productivity Software', lessons: ['Introduction to word processing', 'Introduction to presentation', 'Introduction to electronic spreadsheet'] },
    { title: 'Communication Networks', lessons: ['Computer networks', 'Internet and social media', 'Information security', 'Web technologies'] },
    { title: 'Computational Thinking', lessons: ['Introduction to programming', 'Algorithm', 'Robotics', 'Artificial intelligence'] },
  ],
  8: [
    { title: 'Introduction to Computing', lessons: ['Components of computers and computer systems', 'Technology in the community', 'Health and safety in using ICT tools'] },
    { title: 'Productivity Software', lessons: ['Introduction to word processing', 'Introduction to presentation', 'Introduction to desktop publishing', 'Introduction to electronic spreadsheet'] },
    { title: 'Communication Networks', lessons: ['Computer networks', 'Internet and social media', 'Information security', 'Web technologies'] },
    { title: 'Computational Thinking', lessons: ['Introduction to programming', 'Algorithm', 'Robotics', 'Artificial intelligence'] },
  ],
  9: [
    { title: 'Introduction to Computing', lessons: ['Components of computers and computer systems'] },
    { title: 'Productivity Software', lessons: ['Introduction to word processing', 'Introduction to presentation', 'Introduction to desktop publishing', 'Introduction to electronic spreadsheet'] },
    { title: 'Communication Networks', lessons: ['Computer networks', 'Internet and social media', 'Information security', 'Web technologies'] },
    { title: 'Computational Thinking', lessons: ['Introduction to programming', 'Algorithm', 'Robotics', 'Artificial intelligence'] },
  ],
};

const state = {
  grade: Number(localStorage.getItem('kompulearn-grade')) || 7,
  view: 'home',
  topic: null,
  resource: 'notes',
  filter: 'all',
  query: '',
  openUnits: new Set([0, 1, 2, 3]),
  saved: new Set(JSON.parse(localStorage.getItem('kompulearn-saved') || '[]')),
  done: new Set(JSON.parse(localStorage.getItem('kompulearn-done') || '[]')),
  flashcardIndex: 0,
  flashcardFlipped: false,
  quizAnswers: {},
  quizSubmitted: false,
  lessonGrade: 7,
  teacherPlans: JSON.parse(localStorage.getItem('jks-teacher-plans') || '[]'),
};

const app = document.getElementById('appContent');
const breadcrumb = document.getElementById('breadcrumbCurrent');
const searchInput = document.getElementById('searchInput');
const toast = document.getElementById('toast');
let toastTimer;

function topicId(grade, unitIndex, lessonIndex) { return `${grade}-${unitIndex}-${lessonIndex}`; }
function topicRecord(grade, unitIndex, lessonIndex) {
  return { grade, unitIndex, lessonIndex, title: curriculum[grade][unitIndex].lessons[lessonIndex], unit: curriculum[grade][unitIndex].title, id: topicId(grade, unitIndex, lessonIndex) };
}
function allTopics(grade = state.grade) {
  return curriculum[grade].flatMap((unit, unitIndex) => unit.lessons.map((_, lessonIndex) => topicRecord(grade, unitIndex, lessonIndex)));
}
function totalLessons(grade = state.grade) { return allTopics(grade).length; }
function gradeDone(grade = state.grade) { return allTopics(grade).filter((topic) => state.done.has(topic.id)).length; }
function safe(text) { return String(text).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch])); }
function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2300);
}
function setGrade(grade) {
  state.grade = Number(grade);
  localStorage.setItem('kompulearn-grade', String(state.grade));
  document.querySelectorAll('[data-grade]').forEach((el) => el.classList.toggle('active', Number(el.dataset.grade) === state.grade));
  render();
}
function setView(view) {
  state.view = view;
  state.topic = null;
  state.query = '';
  searchInput.value = '';
  render();
  if (window.innerWidth <= 760) closeMenu();
}
function openTopic(topic) {
  state.topic = topic;
  state.view = 'lesson';
  state.resource = 'notes';
  state.flashcardIndex = 0;
  state.flashcardFlipped = false;
  state.quizAnswers = {};
  state.quizSubmitted = false;
  render();
  app.focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function toggleSaved(id) {
  if (state.saved.has(id)) state.saved.delete(id); else state.saved.add(id);
  localStorage.setItem('kompulearn-saved', JSON.stringify([...state.saved]));
  render();
  showToast(state.saved.has(id) ? 'Topic saved for later.' : 'Removed from saved topics.');
}
function toggleDone(id) {
  if (state.done.has(id)) state.done.delete(id); else state.done.add(id);
  localStorage.setItem('kompulearn-done', JSON.stringify([...state.done]));
  render();
  showToast(state.done.has(id) ? 'Nice work — topic marked complete.' : 'Topic marked as in progress.');
}
function iconFor(unitIndex, lessonIndex) {
  const icons = ['▣', '◈', '⌁', '⌘', '▤', '▧', '▥', '◎', '◉', '⌘', '↗', '✳'];
  return icons[(unitIndex * 3 + lessonIndex) % icons.length];
}
function setNavActive() {
  document.querySelectorAll('.nav-link').forEach((el) => el.classList.toggle('active', el.dataset.view === state.view || (state.view === 'lesson' && el.dataset.view === 'topics')));
  document.querySelectorAll('.grade-shortcut').forEach((el) => el.classList.toggle('active', Number(el.dataset.grade) === state.grade));
}
function currentPlanTopics(grade = state.lessonGrade) {
  return curriculum[grade].flatMap((unit, unitIndex) => unit.lessons.map((lesson, lessonIndex) => ({ id: topicId(grade, unitIndex, lessonIndex), label: `${unit.title} — ${lesson}` })));
}
function heading(title, description, label = `BASIC ${state.grade} · COMPUTING`) {
  return `<div class="page-heading"><div><div class="eyebrow"><span class="eyebrow-mark"></span>${label}</div><h1>${safe(title)}</h1><p>${safe(description)}</p></div>${state.view === 'lesson' ? '<button class="back-button" data-action="back">← &nbsp;Back to topics</button>' : ''}</div>`;
}
function renderHome() {
  const completed = gradeDone();
  const firstIncomplete = allTopics().find((topic) => !state.done.has(topic.id)) || allTopics()[0];
  const percent = totalLessons() ? Math.round((completed / totalLessons()) * 100) : 0;
  return `
    <section class="hero">
      <div class="hero-copy">
        <div class="eyebrow"><span class="eyebrow-mark"></span>YOUR COMPUTING JOURNEY · BASIC ${state.grade}</div>
        <h1>Make sense of computing,<br /><em>one idea at a time.</em></h1>
        <p>Explore your class topics with clear explanations, quick practice and helpful learning tools — all in one place.</p>
      </div>
      <div class="hero-illustration" aria-hidden="true"><div class="orbit"></div><div class="orbit two"></div><div class="book"><div class="book-page"></div><div class="book-page right"></div></div><i class="spark s1">✦</i><i class="spark s2">✧</i><i class="hero-dot"></i></div>
    </section>

    <section class="subject-priority"><div class="subject-priority-mark">▦</div><div><span class="eyebrow">JKS LEARNING HUB · GHANA</span><strong>Computing is the first subject.</strong><p>The platform is designed to grow to 10 subjects. Computing stays at the top; the other subjects can be added when you provide their details.</p></div><span class="focus-pill">CURRENT FOCUS</span></section>

    <div class="section-heading"><div><h2>Choose your class</h2><p>Your learning space changes with your grade.</p></div></div>
    <section class="grade-grid" aria-label="Choose a grade">
      ${[7, 8, 9].map((grade) => `<button class="grade-card ${state.grade === grade ? 'selected' : ''}" data-grade="${grade}"><div class="grade-card-top"><h3>Basic ${grade}</h3><span class="selection-check">✓ Selected</span><span class="grade-arrow">↗</span></div><p>${grade === 7 ? 'Build your computing foundations.' : grade === 8 ? 'Grow your digital skills.' : 'Get ready for what comes next.'}</p><div class="grade-meta"><span class="tiny-dot"></span>${curriculum[grade].length} learning units <span>·</span> ${curriculum[grade].reduce((n, unit) => n + unit.lessons.length, 0)} topics</div></button>`).join('')}
    </section>

    <div class="section-heading"><div><h2>Pick up where you left off</h2><p>A little progress each day adds up.</p></div><button class="text-button" data-view="progress">See my progress&nbsp; →</button></div>
    <section class="continue-card">
      <div class="continue-main"><div class="continue-icon">${completed === totalLessons() ? '✓' : '↗'}</div><div class="continue-copy"><div class="continue-label">${completed === totalLessons() ? 'ALL TOPICS COMPLETE' : 'UP NEXT IN BASIC ' + state.grade}</div><strong>${safe(firstIncomplete.title)}</strong><p>${safe(firstIncomplete.unit)} &nbsp;·&nbsp; ${completed} of ${totalLessons()} topics complete</p><div class="progress-track"><div class="progress-fill" style="width:${percent}%"></div></div></div></div>
      <button class="primary-button" data-topic="${firstIncomplete.id}">Continue learning <span class="button-arrow">→</span></button>
    </section>

    <div class="section-heading"><div><h2>Your learning path</h2><p>Explore the four computing units for Basic ${state.grade}.</p></div><button class="text-button" data-view="topics">All topics&nbsp; →</button></div>
    ${renderUnitGrid()}
    <section class="resource-strip" aria-label="Learning tools"><div class="resource-tile"><div class="resource-icon">▤</div><div><strong>Clear notes</strong><span>Understand the idea</span></div></div><div class="resource-tile"><div class="resource-icon">▶</div><div><strong>Short videos</strong><span>See it in action</span></div></div><div class="resource-tile"><div class="resource-icon">▣</div><div><strong>Flashcards</strong><span>Remember key terms</span></div></div><div class="resource-tile"><div class="resource-icon">✓</div><div><strong>Quick quizzes</strong><span>Check what you know</span></div></div></section>
    <div class="guest-note"><span>◉</span><div><strong>Start as a guest</strong><p>Your saved topics and progress stay in this browser for now. Creating an account to sync progress is a planned next step.</p></div><button class="text-button" data-action="account">Account plans&nbsp; →</button></div>`;
}
function renderUnitGrid() {
  return `<section class="unit-grid">${curriculum[state.grade].map((unit, unitIndex) => {
    const completeCount = unit.lessons.filter((_, lessonIndex) => state.done.has(topicId(state.grade, unitIndex, lessonIndex))).length;
    const isOpen = state.openUnits.has(unitIndex);
    return `<article class="unit-card"><div class="unit-card-head"><div class="unit-number">0${unitIndex + 1}</div><div class="unit-title"><h3>${safe(unit.title)}</h3><span>${unit.lessons.length} topics · ${completeCount} complete</span></div><button class="unit-toggle" data-unit-toggle="${unitIndex}" aria-label="${isOpen ? 'Collapse' : 'Expand'} ${safe(unit.title)}">${isOpen ? '⌃' : '⌄'}</button></div>${isOpen ? `<div class="unit-lessons">${unit.lessons.map((lesson, lessonIndex) => {
      const id = topicId(state.grade, unitIndex, lessonIndex);
      return `<button class="lesson-row ${state.done.has(id) ? 'done' : ''}" data-topic="${id}"><span class="lesson-bullet">${state.done.has(id) ? '✓' : lessonIndex + 1}</span><span>${safe(lesson)}</span></button>`;
    }).join('')}</div>` : ''}<div class="unit-foot"><span>${completeCount ? `${Math.round(completeCount / unit.lessons.length * 100)}% explored` : 'Ready when you are'}</span><button data-unit-open="${unitIndex}">Open unit&nbsp; →</button></div></article>`;
  }).join('')}</section>`;
}
function renderTopicList(topics) {
  if (!topics.length) return `<div class="empty-state"><div class="empty-art">⌕</div><h3>No topics found</h3><p>Try another search or choose a different unit filter.</p></div>`;
  return `<div class="topic-list">${topics.map((topic) => `<button class="topic-item" data-topic="${topic.id}"><span class="topic-icon">${iconFor(topic.unitIndex, topic.lessonIndex)}</span><span class="topic-item-main"><small>UNIT ${topic.unitIndex + 1} · ${safe(topic.unit)}</small><strong>${safe(topic.title)}</strong></span>${state.done.has(topic.id) ? '<span class="topic-status">✓ COMPLETE</span>' : '<span class="topic-item-tail">→</span>'}</button>`).join('')}</div>`;
}
function renderTopics() {
  const topics = allTopics().filter((topic) => (state.filter === 'all' || topic.unitIndex === Number(state.filter)) && (!state.query || `${topic.title} ${topic.unit}`.toLowerCase().includes(state.query.toLowerCase())));
  return `${heading('Explore your topics', 'Choose a topic to open its notes, videos, flashcards and practice quiz.')}
    <div class="topic-filters">${['all', '0', '1', '2', '3'].map((filter) => `<button class="filter-chip ${state.filter === filter ? 'active' : ''}" data-filter="${filter}">${filter === 'all' ? 'All units' : `Unit ${Number(filter) + 1} · ${safe(curriculum[state.grade][Number(filter)].title)}`}</button>`).join('')}</div>
    ${renderTopicList(topics)}`;
}
function isComponentsLesson(topic = state.topic) {
  return Boolean(topic && topic.unitIndex === 0 && topic.lessonIndex === 0 && window.JKS_COMPONENTS_LESSON);
}
function renderLessonDownloads() {
  return `<div class="download-panel"><div><strong>Download this topic</strong><p>Keep a copy for study or class. Video links need internet access.</p></div><div class="download-links"><a class="download-link" href="downloads/JKS_Components_of_Computers_Basic_7-9.pdf" download>PDF <span>↓</span></a><a class="download-link" href="downloads/JKS_Components_of_Computers_Basic_7-9.docx" download>Word <span>↓</span></a><a class="download-link" href="downloads/JKS_Components_of_Computers_Basic_7-9.pptx" download>Slides <span>↓</span></a></div></div>`;
}
function renderLessonDiagram(id) {
  if (id === 'system') return `<div class="lesson-diagram system-diagram" role="img" aria-label="Computer system parts work together"><div class="diagram-title">COMPUTER SYSTEM</div>${[['Hardware','physical parts'],['Software','instructions'],['Data','facts'],['People','users'],['Procedures','steps'],['Communication','connections']].map(([a,b]) => `<div class="diagram-node"><strong>${a}</strong><span>${b}</span></div>`).join('')}</div>`;
  if (id === 'ipos') return `<div class="lesson-diagram ipos-diagram" role="img" aria-label="Input, processing, output and storage cycle">${[['INPUT','Enter marks'],['PROCESSING','Calculate average'],['OUTPUT','Show result'],['STORAGE','Save the file']].map(([a,b],i) => `<div class="ipos-step"><strong>${a}</strong><span>${b}</span></div>${i < 3 ? '<span class="ipos-arrow" aria-hidden="true">→</span>' : ''}`).join('')}</div>`;
  if (id === 'perception') return `<div class="lesson-diagram perception-diagram" role="img" aria-label="Sensing, interpretation and response"><div><strong>Sense</strong><span>Camera · microphone · sensor</span></div><span aria-hidden="true">→</span><div><strong>Interpret</strong><span>Software analyses signals</span></div><span aria-hidden="true">→</span><div><strong>Respond</strong><span>Screen · sound · action</span></div></div>`;
  return '';
}
function renderLessonBlock(block) {
  if (block.type === 'paragraph') return `<p>${safe(block.text)}</p>`;
  if (block.type === 'heading') return `<h3>${safe(block.text || block.title || '')}</h3>`;
  if (block.type === 'callout') return `<aside class="lesson-callout"><strong>${safe(block.title)}</strong><p>${safe(block.text)}</p></aside>`;
  if (block.type === 'table') return `<div class="lesson-table-wrap"><table class="lesson-table"><thead><tr>${block.headers.map((head) => `<th>${safe(head)}</th>`).join('')}</tr></thead><tbody>${block.rows.map((row) => `<tr>${row.map((cell) => `<td>${safe(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  if (block.type === 'diagram') return renderLessonDiagram(block.id);
  return '';
}
function renderChapterNotes() {
  const chapter = window.JKS_COMPONENTS_LESSON;
  const grade = `Basic ${state.topic.grade}`;
  const currentGrade = chapter.grades.find((item) => item.grade === grade) || chapter.grades[0];
  return `<article class="chapter-notes">
    <div class="chapter-intro"><div class="eyebrow">${safe(chapter.series)} · ${safe(grade)}</div><h2>${safe(chapter.title)}</h2><p>${safe(chapter.description)}</p><div class="chapter-badge">Original JKS learning chapter · ${safe(currentGrade.code)}</div></div>
    ${renderLessonDownloads()}
    <div class="grade-focus-grid">${chapter.grades.map((item) => `<section class="grade-focus ${item.grade === grade ? 'current' : ''}"><span>${safe(item.grade)} · ${safe(item.code)}</span><p>${safe(item.focus)}</p><small>${safe(item.memory)}</small></section>`).join('')}</div>
    <details class="outcomes-details"><summary>What you should be able to do</summary><ul>${chapter.outcomes.map((item) => `<li>${safe(item)}</li>`).join('')}</ul></details>
    ${chapter.sections.map((section) => `<section class="chapter-section"><h2>${safe(section.title)}</h2>${section.blocks.map(renderLessonBlock).join('')}</section>`).join('')}
    <section class="teacher-activities"><h2>Teacher lesson ideas</h2><div class="activity-grid">${chapter.teacher_activities.map((item) => `<article><div class="activity-time">${safe(item.time)}</div><h3>${safe(item.title)}</h3><p>${safe(item.steps)}</p></article>`).join('')}</div></section>
    <details class="glossary-details"><summary>Key word glossary · ${chapter.glossary.length} terms</summary><div class="glossary-grid">${chapter.glossary.map((item) => `<div><strong>${safe(item.term)}</strong><span>${safe(item.definition)}</span></div>`).join('')}</div></details>
    <details class="sources-details"><summary>Sources and publication note</summary><p>${safe(chapter.curriculum_note)}</p><p class="publication-note">${safe(chapter.copyright_note)} Check the publisher, author, edition and page details from each reference book’s title page before preparing a formal bibliography.</p><ul>${chapter.references.map((ref) => `<li><strong>${safe(ref.label)}</strong>${ref.url ? ` · <a href="${safe(ref.url)}" target="_blank" rel="noopener noreferrer">Open source ↗</a>` : ''}</li>`).join('')}</ul></details>
  </article>`;
}
function renderChapterVideo() {
  const videos = window.JKS_COMPONENTS_LESSON.videos;
  return `<section class="chapter-videos"><div class="resource-intro"><span class="eyebrow">WATCH · PAUSE · EXPLAIN</span><h2>See the ideas in action</h2><p>Watch the short introduction first. Use the second video as an extension for quantum computing.</p></div>${videos.map((video, index) => `<article class="video-card"><div class="video-frame"><iframe src="https://www.youtube-nocookie.com/embed/${safe(video.embed)}" title="${safe(video.title)}" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div><div class="video-meta"><span class="eyebrow">${index === 0 ? 'CORE VIDEO' : 'EXTENSION'} · ${safe(video.duration)}</span><h3>${safe(video.title)}</h3><p>${safe(video.description)}</p><small>${safe(video.creator)}</small><a href="${safe(video.url)}" target="_blank" rel="noopener noreferrer">Open on YouTube ↗</a></div></article>`).join('')}<p class="video-note">Videos are hosted on YouTube and require an internet connection. If playback is unavailable, use the written notes and slides.</p></section>`;
}
function renderChapterCards() {
  const cards = window.JKS_COMPONENTS_LESSON.flashcards;
  const index = ((state.flashcardIndex % cards.length) + cards.length) % cards.length;
  const item = cards[index];
  const showingBack = state.flashcardFlipped;
  return `<section class="flashcard-study"><div class="resource-intro"><span class="eyebrow">RECALL PRACTICE</span><h2>Flashcards</h2><p>Try to answer before revealing the explanation.</p></div><div class="flashcard-count">CARD ${index + 1} OF ${cards.length}</div><button class="flashcard ${showingBack ? 'showing-answer' : ''}" data-action="flashcard-flip" aria-label="${showingBack ? 'Show the question' : 'Reveal the answer'}"><span class="flashcard-label">${showingBack ? 'ANSWER' : 'QUESTION'}</span><strong>${safe(showingBack ? item.back : item.front)}</strong><span class="flashcard-hint">Tap or press Enter to ${showingBack ? 'see the question' : 'reveal the answer'}</span></button><div class="flashcard-controls"><button class="secondary-button" data-action="flashcard-prev">← Previous</button><button class="primary-button" data-action="flashcard-next">Next card →</button></div></section>`;
}
function renderChapterQuiz() {
  const questions = window.JKS_COMPONENTS_LESSON.quiz;
  const score = questions.reduce((total, item, index) => total + (Number(state.quizAnswers[index]) === item.answer ? 1 : 0), 0);
  return `<section class="chapter-quiz"><div class="resource-intro"><span class="eyebrow">CHECK YOUR UNDERSTANDING</span><h2>Quick quiz</h2><p>Choose one answer for each question. Read the feedback and return to the notes for anything you want to review.</p></div>${state.quizSubmitted ? `<div class="quiz-result"><strong>${score} / ${questions.length}</strong><span>${score === questions.length ? 'Excellent recall. Explain your answers in your own words.' : 'Review the explanations below, then try again.'}</span></div>` : ''}<div class="quiz-question-list">${questions.map((item,index)=>`<fieldset class="quiz-question"><legend><span>${String(index+1).padStart(2,'0')}</span>${safe(item.question)}</legend><div class="quiz-choices">${item.choices.map((choice,choiceIndex)=>{const selected=Number(state.quizAnswers[index])===choiceIndex;const correct=state.quizSubmitted&&choiceIndex===item.answer;const wrong=state.quizSubmitted&&selected&&!correct;return `<button type="button" class="quiz-choice ${selected?'selected':''} ${correct?'correct':''} ${wrong?'incorrect':''}" data-quiz-choice="${index}-${choiceIndex}" ${state.quizSubmitted?'disabled':''}><span class="choice-dot">${String.fromCharCode(65+choiceIndex)}</span>${safe(choice)}</button>`;}).join('')}</div>${state.quizSubmitted?`<p class="quiz-explanation"><strong>${Number(state.quizAnswers[index])===item.answer?'Correct.':'Review:'}</strong> ${safe(item.explanation)}</p>`:''}</fieldset>`).join('')}</div><div class="quiz-actions">${state.quizSubmitted?'<button class="secondary-button" data-action="quiz-reset">Try again</button>':'<button class="primary-button" data-action="quiz-submit">Check my answers →</button>'}<span>${Object.keys(state.quizAnswers).length} of ${questions.length} answered</span></div></section>`;
}
function renderResourceContent() {
  if (isComponentsLesson()) {
    if (state.resource === 'notes') return renderChapterNotes();
    if (state.resource === 'video') return renderChapterVideo();
    if (state.resource === 'cards') return renderChapterCards();
    if (state.resource === 'quiz') return renderChapterQuiz();
  }
  const labels = { notes: ['Lesson notes', 'Clear notes are being prepared for this topic.', 'Your facilitator will add explanations, examples and diagrams here.'], video: ['Video lesson', 'A short video will appear here.', 'Watch the topic explained step by step, then return to practise what you learned.'], cards: ['Flashcards', 'Flashcards for this topic are on the way.', 'Use quick question-and-answer cards to review key words and ideas.'], quiz: ['Quick quiz', 'Your practice quiz is being prepared.', 'Try a few questions, see helpful feedback and find out what to review next.'] };
  const [title, message, detail] = labels[state.resource];
  const symbols = { notes: '▤', video: '▶', cards: '▣', quiz: '✓' };
  return `<div class="content-empty"><div class="empty-art">${symbols[state.resource]}</div><h3>${title}</h3><p>${message} ${detail}</p><span class="empty-note"><span>✦</span> This space is ready for your facilitator's materials</span></div>`;
}
function renderLesson() {
  const topic = state.topic;
  const saved = state.saved.has(topic.id);
  const complete = state.done.has(topic.id);
  const tabs = [['notes', 'Notes'], ['video', 'Video'], ['cards', 'Flashcards'], ['quiz', 'Quiz']];
  return `${heading(topic.title, 'A friendly place to build your understanding, step by step.', `BASIC ${topic.grade} · UNIT ${topic.unitIndex + 1}`)}
    <div class="lesson-layout"><section class="lesson-panel"><div class="lesson-toolbar"><div class="lesson-path">${safe(topic.unit)} &nbsp;›&nbsp; <strong>${safe(topic.title)}</strong></div><button class="save-button ${saved ? 'saved' : ''}" data-save="${topic.id}">${saved ? '♥ Saved' : '♡ Save topic'}</button></div>
      <div class="resource-tabs" role="tablist" aria-label="Lesson resources">${tabs.map(([key, label]) => `<button class="resource-tab ${state.resource === key ? 'active' : ''}" role="tab" aria-selected="${state.resource === key}" data-resource="${key}">${label}</button>`).join('')}</div>
      <div class="resource-content" role="tabpanel">${renderResourceContent()}</div>
    </section><aside class="lesson-aside"><h3>Learning toolkit</h3><div class="aside-item"><span class="aside-icon">▤</span><div><strong>Read the notes</strong><p>Start with the main idea and examples.</p></div></div><div class="aside-item"><span class="aside-icon">▶</span><div><strong>Watch and explore</strong><p>See how the topic connects to real life.</p></div></div><div class="aside-item"><span class="aside-icon">✓</span><div><strong>Try a quick quiz</strong><p>Check what you remember as you go.</p></div></div><div class="study-tip"><strong>Small steps work.</strong>Pause when you need to. Come back to a topic whenever you want.</div></aside></div>
    <div class="complete-row"><p>${complete ? 'You have marked this topic as complete. Great work!' : 'Finished exploring this topic? Mark it complete to track your progress.'}</p><button class="primary-button ${complete ? 'completed' : ''}" data-complete="${topic.id}">${complete ? '✓ Completed' : 'Mark as complete'}</button></div>`;
}
function renderSaved() {
  const topics = [...state.saved].map((id) => {
    const [grade, unitIndex, lessonIndex] = id.split('-').map(Number);
    return curriculum[grade]?.[unitIndex]?.lessons[lessonIndex] ? topicRecord(grade, unitIndex, lessonIndex) : null;
  }).filter((topic) => topic && topic.grade === state.grade);
  return `${heading('Saved for later', 'Keep the topics you want to revisit close by.', 'YOUR STUDY LIST')}${topics.length ? renderTopicList(topics) : `<div class="empty-state"><div class="empty-art">♡</div><h3>Your saved list is empty</h3><p>Open a topic and choose “Save topic” to keep it here for later.</p></div>`}`;
}
function renderProgress() {
  const done = gradeDone();
  const count = totalLessons();
  const pct = count ? Math.round(done / count * 100) : 0;
  return `${heading('Your progress', 'Every topic you complete is a step forward.', 'YOUR LEARNING JOURNEY')}
    <section class="stats-grid"><div class="stat-card"><span>Topics completed</span><strong>${done}<small> / ${count}</small></strong><small>in Basic ${state.grade}</small></div><div class="stat-card"><span>Topics saved</span><strong>${[...state.saved].filter((id) => id.startsWith(`${state.grade}-`)).length}</strong><small>for you to revisit</small></div><div class="stat-card"><span>Learning path</span><strong>${pct}%</strong><small>of the listed topics explored</small></div></section>
    <div class="section-heading"><div><h2>Topics in Basic ${state.grade}</h2><p>Mark a topic complete after you have studied it.</p></div></div>${renderTopicList(allTopics())}`;
}
function renderTeachers() {
  const topics = currentPlanTopics();
  return `${heading('Teacher lesson plans', 'Build a practical Computing lesson plan for Basic 7, 8 or 9. Drafts stay on this device.', 'TEACHER TOOL · COMPUTING FIRST')}
    <div class="teacher-intro"><div class="teacher-intro-icon">▤</div><div><strong>Plan a lesson that helps learners understand.</strong><p>Use the fields as a planning guide. Add learner names or sensitive personal details nowhere in these drafts.</p></div></div>
    <form class="plan-form" id="lessonPlanForm" onsubmit="return false">
      <div class="form-section-head"><span class="form-step">01</span><div><h2>Lesson details</h2><p>Choose a Basic class and a Computing topic.</p></div></div>
      <div class="form-grid three"><label>Basic class<select id="planGrade"><option value="7" ${state.lessonGrade === 7 ? 'selected' : ''}>Basic 7</option><option value="8" ${state.lessonGrade === 8 ? 'selected' : ''}>Basic 8</option><option value="9" ${state.lessonGrade === 9 ? 'selected' : ''}>Basic 9</option></select></label><label class="span-two">Computing topic<select id="planTopic">${topics.map((t) => `<option value="${t.id}">${safe(t.label)}</option>`).join('')}</select></label></div>
      <div class="form-grid three"><label>Lesson title<input id="planTitle" placeholder="e.g. How computer networks share information" /></label><label>Term / week<input id="planWeek" placeholder="e.g. Term 1 · Week 3" /></label><label>Lesson duration<input id="planDuration" placeholder="e.g. 60 minutes" /></label></div>
      <div class="form-section-head"><span class="form-step">02</span><div><h2>Prepare the learning</h2><p>Write short, clear steps you can use in class.</p></div></div>
      <div class="form-grid"><label>Learning objectives<textarea id="planObjectives" rows="3" placeholder="By the end, learners should be able to…"></textarea></label><label>Resources and materials<textarea id="planMaterials" rows="3" placeholder="List available devices, board materials or local examples…"></textarea></label><label>Starter / prior knowledge<textarea id="planStarter" rows="3" placeholder="How will you connect to what learners already know?"></textarea></label><label>Teaching and learning activities<textarea id="planActivities" rows="4" placeholder="Model, guide practice, then let learners try…"></textarea></label><label>Assessment for understanding<textarea id="planAssessment" rows="3" placeholder="What question or task will show understanding?"></textarea></label><label>Homework / next step<textarea id="planHomework" rows="3" placeholder="Optional practice or preparation for next lesson…"></textarea></label></div>
      <label class="full-field">Teacher reflection<textarea id="planReflection" rows="3" placeholder="After teaching: what worked, and what needs revisiting?"></textarea></label>
      <div class="form-actions"><span>Drafts are saved in this browser only. No account or cloud sync is connected.</span><button class="primary-button" type="button" data-action="save-plan">Save lesson draft <span>→</span></button></div>
    </form>
    <section class="saved-plans"><div class="section-heading"><div><h2>Your saved drafts</h2><p>${state.teacherPlans.length} draft${state.teacherPlans.length === 1 ? '' : 's'} saved on this device.</p></div></div>${state.teacherPlans.length ? `<div class="saved-plan-list">${state.teacherPlans.map((plan) => `<article class="saved-plan-card"><div><small>BASIC ${safe(plan.grade)} · ${safe(plan.week || 'No term/week added')}</small><h3>${safe(plan.title)}</h3><p>${safe(plan.topicLabel)}</p></div><div class="plan-actions"><button class="secondary-button" data-action="export-plan" data-plan-id="${safe(plan.id)}">Download</button><button class="icon-button danger" aria-label="Delete ${safe(plan.title)}" data-action="delete-plan" data-plan-id="${safe(plan.id)}">×</button></div></article>`).join('')}</div>` : `<div class="empty-state compact-empty"><div class="empty-art">▤</div><h3>No drafts saved yet</h3><p>Start with the Basic class, topic and learning objectives, then save your plan.</p></div>`}</section>`;
}
function renderJi() {
  return `${heading('Meet JI — Jampo Intelligence', 'Natural intelligence and artificial intelligence working together to support understanding.', 'JI LEARNING ASSISTANT')}
    <section class="ji-hero"><div class="ji-orb">JI</div><div><span class="focus-pill">YOUR LEARNING COMPANION</span><h2>Clear explanations, patient practice, helpful voice support.</h2><p>JI is the name for the assistant you plan to build. Live AI answers are not connected in this prototype.</p></div></section>
    <div class="ji-grid"><section class="ji-card"><div class="ji-card-title"><span class="ji-icon">✦</span><div><h2>Ask JI about Computing</h2><p>Try the interface. This demo does not send your question anywhere.</p></div></div><label class="ji-prompt-label" for="jiQuestion">What would you like help understanding?</label><textarea id="jiQuestion" rows="4" placeholder="For example: Explain an algorithm in simple steps…"></textarea><div class="ji-controls"><button class="secondary-button" data-action="ji-example">Use an example question</button><button class="primary-button" data-action="ji-send">Ask JI <span>→</span></button></div><div id="jiReply" class="ji-reply" aria-live="polite"><strong>JI is ready to help.</strong><p>When an AI service is connected, this space can give guided explanations and practice questions.</p></div></section>
      <section class="ji-card voice-card"><span class="ji-icon">◖))</span><h2>JI voice support</h2><p>Hear a short welcome using the speech voices available in your browser. This is browser text-to-speech, not a recorded JI voice.</p><div class="voice-script" id="jiVoiceScript">Hello, I am JI — Jampo Intelligence. We can take computing one small idea at a time. Ask questions, practise, and keep learning at your own pace.</div><div class="ji-controls"><button class="secondary-button" data-action="ji-speak">▶ Play welcome</button><button class="text-button" data-action="ji-stop">Stop voice</button></div><small class="support-note">Voice availability depends on the device and browser.</small></section></div>
    <div class="prototype-note"><strong>Designed for accessible learning.</strong> A future JI connection can support voice answers, explanations at different levels and teacher help. The live AI connection, account system and online data storage still need to be built.</div>`;
}
function renderBece() {
  return `${heading('BECE to SHS: know yourself, compare carefully', 'Reflect on what matters to you before exploring SHS options. This guide does not place you or decide your future.', 'STUDENT PATHWAY GUIDE')}
    <div class="bece-callout"><span>✦</span><p><strong>Your interests are clues, not labels.</strong> This private worksheet helps you describe what you enjoy and what support you need. It will not score your ability or tell you what school you must choose.</p></div>
    <form class="bece-form" onsubmit="return false"><div class="form-section-head"><span class="form-step">01</span><div><h2>What feels like you?</h2><p>Choose a few interests. There are no wrong answers.</p></div></div>
      <fieldset class="interest-grid"><legend>Your interests</legend>${[['computing','Computing and technology'],['science','Science and discovery'],['making','Building and practical projects'],['business','Business and enterprise'],['creative','Creative arts and design'],['people','Helping and working with people'],['nature','Nature and the environment'],['sport','Sport and physical activity']].map(([key,label]) => `<label class="check-card"><input type="checkbox" name="interest" value="${key}"><span>${label}</span></label>`).join('')}</fieldset>
      <div class="form-grid"><label>Subjects or activities you feel confident in<textarea id="beceStrengths" rows="3" placeholder="Think of things you enjoy practising or explaining."></textarea></label><label>Things you want to learn or improve<textarea id="beceGoals" rows="3" placeholder="Skills, subjects or experiences you would like to explore."></textarea></label><label>Preferred region or area (optional)<input id="beceArea" placeholder="Type an area you would like to consider"></label><label>Accommodation preference<select id="beceAccommodation"><option value="not sure">Not sure yet</option><option value="day">Day school</option><option value="boarding">Boarding school</option><option value="either">Either could work</option></select></label></div>
      <div class="form-actions"><span>Your answers stay on this page and are not saved or submitted.</span><button class="primary-button" data-action="bece-reflect" type="button">Create my reflection checklist&nbsp; →</button></div><div id="beceResult" class="bece-result" aria-live="polite"></div></form>
    <section class="school-data-card"><div class="school-data-mark">⌖</div><div><h2>Compare SHS information with trusted sources</h2><p>A verified school finder is a future feature. It should use current official placement guidance and confirmed details for programmes, location, accommodation, costs and support. School information is not connected yet, so this prototype will not invent school profiles or recommendations.</p></div></section>`;
}
function showAccountModal() {
  const root = document.getElementById('globalModal');
  root.innerHTML = `<div class="modal-backdrop"><section class="account-modal" role="dialog" aria-modal="true" aria-labelledby="accountTitle"><button class="modal-close" data-action="close-modal" aria-label="Close">×</button><div class="modal-mark">JKS</div><div class="eyebrow">JKS LOYALTY'S AI & TECHNOLOGIES</div><h2 id="accountTitle">Guest learning is open.</h2><p>You can explore Computing now. Email or phone accounts, synced progress, teacher contribution accounts and optional paid features are planned for a later secure release.</p><div class="account-plan-list"><span>✓ Learn as a guest today</span><span>◷ Save progress on this device</span><span>◷ Email / phone sign-in after secure setup</span></div><div class="data-note"><strong>Privacy first:</strong> this prototype does not ask for a learner's name, email or phone number. Before accounts are enabled, the service needs secure authentication, clear notices and appropriate consent for children’s data.</div><button class="primary-button modal-done" data-action="close-modal">Continue as guest</button></section></div>`;
  root.querySelector('.modal-backdrop').addEventListener('click', (event) => { if (event.target === event.currentTarget) root.innerHTML = ''; });
  root.querySelector('.modal-close').focus();
}
function renderSearch() {
  const topics = Object.keys(curriculum).flatMap((grade) => allTopics(Number(grade))).filter((topic) => `${topic.title} ${topic.unit} Basic ${topic.grade}`.toLowerCase().includes(state.query.toLowerCase()));
  breadcrumb.textContent = 'Search results';
  return `${heading(`Search results`, `Topics matching “${state.query}”`, 'SEARCH THE LEARNING SPACE')}${topics.length ? renderTopicList(topics) : `<div class="empty-state"><div class="empty-art">⌕</div><h3>No matching topics yet</h3><p>Try a shorter search, such as “robotics”, “internet” or “spreadsheets”.</p></div>`}`;
}
function render() {
  setNavActive();
  if (state.query.trim()) { app.innerHTML = renderSearch(); return; }
  const labels = { home: 'My learning', topics: 'Computing', saved: 'Saved for later', progress: 'My progress', lesson: 'Lesson', teachers: 'Teacher lesson plans', ji: 'JI assistant', bece: 'BECE → SHS guide' };
  breadcrumb.textContent = labels[state.view] || 'My learning';
  if (state.view === 'home') app.innerHTML = renderHome();
  else if (state.view === 'topics') app.innerHTML = renderTopics();
  else if (state.view === 'saved') app.innerHTML = renderSaved();
  else if (state.view === 'progress') app.innerHTML = renderProgress();
  else if (state.view === 'teachers') app.innerHTML = renderTeachers();
  else if (state.view === 'ji') app.innerHTML = renderJi();
  else if (state.view === 'bece') app.innerHTML = renderBece();
  else if (state.view === 'lesson' && state.topic) app.innerHTML = renderLesson();
  else app.innerHTML = renderHome();
}

function closeMenu() { document.getElementById('sidebar').classList.remove('open'); document.getElementById('menuToggle').setAttribute('aria-expanded', 'false'); }

document.addEventListener('click', (event) => {
  const viewButton = event.target.closest('[data-view]');
  if (viewButton) { state.filter = 'all'; setView(viewButton.dataset.view); return; }
  const gradeButton = event.target.closest('[data-grade]');
  if (gradeButton) { setGrade(gradeButton.dataset.grade); return; }
  const topicButton = event.target.closest('[data-topic]');
  if (topicButton) {
    const [grade, unitIndex, lessonIndex] = topicButton.dataset.topic.split('-').map(Number);
    openTopic(topicRecord(grade, unitIndex, lessonIndex));
    return;
  }
  const resourceButton = event.target.closest('[data-resource]');
  if (resourceButton) { state.resource = resourceButton.dataset.resource; render(); return; }
  const quizChoice = event.target.closest('[data-quiz-choice]');
  if (quizChoice && !state.quizSubmitted) {
    const [questionIndex, choiceIndex] = quizChoice.dataset.quizChoice.split('-').map(Number);
    state.quizAnswers[questionIndex] = choiceIndex;
    render(); return;
  }
  const saveButton = event.target.closest('[data-save]');
  if (saveButton) { toggleSaved(saveButton.dataset.save); return; }
  const completeButton = event.target.closest('[data-complete]');
  if (completeButton) { toggleDone(completeButton.dataset.complete); return; }
  const filterButton = event.target.closest('[data-filter]');
  if (filterButton) { state.filter = filterButton.dataset.filter; render(); return; }
  const toggle = event.target.closest('[data-unit-toggle]');
  if (toggle) {
    const unit = Number(toggle.dataset.unitToggle);
    state.openUnits.has(unit) ? state.openUnits.delete(unit) : state.openUnits.add(unit);
    render(); return;
  }
  const unitOpen = event.target.closest('[data-unit-open]');
  if (unitOpen) { state.filter = String(unitOpen.dataset.unitOpen); state.view = 'topics'; render(); return; }
  if (event.target.closest('[data-action="back"]')) { state.view = 'topics'; render(); return; }
  const actionButton = event.target.closest('[data-action]');
  if (actionButton) {
    const action = actionButton.dataset.action;
    if (action === 'account') { showAccountModal(); return; }
    if (action === 'close-modal') { document.getElementById('globalModal').innerHTML = ''; return; }
    if (action === 'save-plan') { saveLessonPlan(); return; }
    if (action === 'delete-plan') { deleteLessonPlan(actionButton.dataset.planId); return; }
    if (action === 'export-plan') { exportLessonPlan(actionButton.dataset.planId); return; }
    if (action === 'flashcard-flip') { state.flashcardFlipped = !state.flashcardFlipped; render(); return; }
    if (action === 'flashcard-next') { state.flashcardIndex += 1; state.flashcardFlipped = false; render(); return; }
    if (action === 'flashcard-prev') { state.flashcardIndex -= 1; state.flashcardFlipped = false; render(); return; }
    if (action === 'quiz-submit') { state.quizSubmitted = true; render(); return; }
    if (action === 'quiz-reset') { state.quizAnswers = {}; state.quizSubmitted = false; render(); return; }
    if (action === 'ji-example') { document.getElementById('jiQuestion').value = 'Can you explain an algorithm using a simple everyday example?'; return; }
    if (action === 'ji-send') { showJiDemoReply(); return; }
    if (action === 'ji-speak') { speakJiWelcome(); return; }
    if (action === 'ji-stop') { if ('speechSynthesis' in window) speechSynthesis.cancel(); return; }
    if (action === 'bece-reflect') { buildBeceReflection(); return; }
  }
});

function saveLessonPlan() {
  const topicSelect = document.getElementById('planTopic');
  const selectedTopic = topicSelect.options[topicSelect.selectedIndex];
  const title = document.getElementById('planTitle').value.trim() || selectedTopic.textContent.split(' — ').pop();
  const fields = ['Week','Duration','Objectives','Materials','Starter','Activities','Assessment','Homework','Reflection'];
  const plan = { id: `${Date.now()}`, grade: document.getElementById('planGrade').value, topicId: topicSelect.value, topicLabel: selectedTopic.textContent, title, week: document.getElementById('planWeek').value.trim(), duration: document.getElementById('planDuration').value.trim(), savedAt: new Date().toLocaleDateString() };
  fields.slice(2).forEach((key) => { const el = document.getElementById(`plan${key}`); plan[key.toLowerCase()] = el.value.trim(); });
  state.teacherPlans.unshift(plan);
  localStorage.setItem('jks-teacher-plans', JSON.stringify(state.teacherPlans));
  render(); showToast('Lesson plan saved in this browser.');
}
function deleteLessonPlan(id) {
  state.teacherPlans = state.teacherPlans.filter((plan) => plan.id !== id);
  localStorage.setItem('jks-teacher-plans', JSON.stringify(state.teacherPlans));
  render(); showToast('Draft deleted from this browser.');
}
function exportLessonPlan(id) {
  const plan = state.teacherPlans.find((item) => item.id === id);
  if (!plan) return;
  const labels = { grade: 'Class', topicLabel: 'Computing topic', title: 'Lesson title', week: 'Term / week', duration: 'Duration', objectives: 'Learning objectives', materials: 'Resources and materials', starter: 'Starter / prior knowledge', activities: 'Teaching and learning activities', assessment: 'Assessment for understanding', homework: 'Homework / next step', reflection: 'Teacher reflection' };
  const textFile = `JKS LOYALTY'S AI & TECHNOLOGIES\nTeacher lesson plan · Jampo Kwadwo Sampson\n\n${Object.entries(labels).map(([key, label]) => `${label}:\n${plan[key] || '—'}\n`).join('\n')}`;
  const blob = new Blob([textFile], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob); const link = document.createElement('a');
  link.href = url; link.download = `${plan.title.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'lesson-plan'}.txt`; link.click(); URL.revokeObjectURL(url);
}
function showJiDemoReply() {
  const reply = document.getElementById('jiReply');
  const question = document.getElementById('jiQuestion').value.trim();
  if (!question) { reply.innerHTML = '<strong>Tell JI what you are learning.</strong><p>Type a Computing question to preview the assistant panel.</p>'; return; }
  reply.innerHTML = `<strong>JI prototype note</strong><p>Your question is: “${safe(question)}”</p><p>Live AI is not connected yet. When it is, JI can explain the idea in small steps, give a Ghanaian everyday example, then ask a practice question.</p>`;
}
function speakJiWelcome() {
  if (!('speechSynthesis' in window)) { showToast('This browser does not provide speech playback.'); return; }
  speechSynthesis.cancel();
  const line = document.getElementById('jiVoiceScript').textContent;
  const utterance = new SpeechSynthesisUtterance(line); utterance.rate = 0.9; speechSynthesis.speak(utterance);
}
function buildBeceReflection() {
  const selected = [...document.querySelectorAll('input[name="interest"]:checked')].map((el) => el.parentElement.innerText.trim());
  const area = document.getElementById('beceArea').value.trim();
  const accommodation = document.getElementById('beceAccommodation').value;
  const strengths = document.getElementById('beceStrengths').value.trim();
  const goals = document.getElementById('beceGoals').value.trim();
  document.getElementById('beceResult').innerHTML = `<h3>Your reflection checklist</h3><ul><li>Interests you selected: ${selected.length ? safe(selected.join(', ')) : 'Choose any interests that feel relevant.'}</li><li>Skills you want to keep using: ${strengths ? safe(strengths) : 'Add examples of skills or subjects you feel confident in.'}</li><li>What you hope to grow: ${goals ? safe(goals) : 'Write one thing you would like to learn or improve.'}</li><li>Area to research: ${area ? safe(area) : 'Compare locations that work for you and your family.'}</li><li>Accommodation to check: ${safe(accommodation)}. Ask about current availability and requirements.</li></ul><p>Discuss your reflections with a trusted teacher or caregiver and check current official placement information before making choices. This is not a school recommendation.</p>`;
}

document.getElementById('menuToggle').addEventListener('click', (event) => {
  const sidebar = document.getElementById('sidebar');
  const open = sidebar.classList.toggle('open');
  event.currentTarget.setAttribute('aria-expanded', String(open));
});
document.addEventListener('change', (event) => {
  if (event.target.id !== 'planGrade') return;
  state.lessonGrade = Number(event.target.value);
  const select = document.getElementById('planTopic');
  select.innerHTML = currentPlanTopics().map((topic) => `<option value="${topic.id}">${safe(topic.label)}</option>`).join('');
});
searchInput.addEventListener('input', () => { state.query = searchInput.value.trim(); render(); });
document.addEventListener('keydown', (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); searchInput.focus(); }
  if (event.key === 'Escape') { searchInput.blur(); closeMenu(); }
});

render();
