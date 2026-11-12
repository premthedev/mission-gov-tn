import { App as CapApp } from '@capacitor/app';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { chapterByOrder, contentVersion, lessonById, subscribe } from './data/content';
import { getSetting, setSetting } from './data/db';
import { markKuralLearned, markLessonDone } from './data/progress';
import { loadDownloaded, syncContent } from './data/sync';
import type { Bi, Deck, Mode, Question } from './data/types';
import type { Blueprint } from './engine/planner';
import { isNative, scheduleReminders } from './native';
import { LangCtx, Screen, T, TopBar, txt, type LangMode } from './ui/kit';
import { KuralReader } from './ui/KuralReader';
import { DeckView, Learn } from './ui/Learn';
import { LessonView } from './ui/LessonView';
import { Mock } from './ui/Mock';
import { Practice } from './ui/Practice';
import { Progress } from './ui/Progress';
import { QuizRunner } from './ui/QuizRunner';
import { Session } from './ui/Session';
import { Today } from './ui/Today';

type Tab = 'today' | 'learn' | 'practice' | 'progress';
type Overlay =
  | { kind: 'session' }
  | { kind: 'lesson'; id: string }
  | { kind: 'kural'; order: number }
  | { kind: 'deck'; deck: Deck }
  | { kind: 'quiz'; title: Bi; questions: Question[]; mode: Mode }
  | { kind: 'mock'; blueprint: Blueprint };

const TABS: { v: Tab; icon: string; label: string }[] = [
  { v: 'today', icon: '☀️', label: 'இன்று' },
  { v: 'learn', icon: '📖', label: 'கற்க' },
  { v: 'practice', icon: '✍️', label: 'பயிற்சி' },
  { v: 'progress', icon: '📊', label: 'முன்னேற்றம்' },
];

export default function App() {
  const [tab, setTab] = useState<Tab>('today');
  const [stack, setStack] = useState<Overlay[]>([]);
  const [lang, setLang] = useState<LangMode>('both');
  const [ready, setReady] = useState(false);
  const [toast, setToast] = useState('');
  useSyncExternalStore(subscribe, contentVersion);
  const stackRef = useRef(stack);
  stackRef.current = stack;
  const tabRef = useRef(tab);
  tabRef.current = tab;

  const push = (o: Overlay) => {
    setStack((s) => [...s, o]);
    window.scrollTo({ top: 0 });
  };
  const pop = () => setStack((s) => s.slice(0, -1));

  useEffect(() => {
    void (async () => {
      setLang(await getSetting<LangMode>('lang', 'both'));
      await loadDownloaded();
      setReady(true);
      const r = await syncContent();
      if (r.ok && r.updated > 0) {
        setToast(r.newQuestions ? `📥 புதிய உள்ளடக்கம் வந்தது (${r.newQuestions} வினாக்கள்)` : '📥 புதிய பாடங்கள் வந்தன');
        window.setTimeout(() => setToast(''), 4000);
      }
      if (isNative && !(await getSetting('remindersSet', false))) {
        const ok = await scheduleReminders(await getSetting('reminderTime', '20:15'));
        if (ok) await setSetting('remindersSet', true);
      }
    })();
    const onResume = () => document.visibilityState === 'visible' && void syncContent();
    document.addEventListener('visibilitychange', onResume);
    if (!isNative) return () => document.removeEventListener('visibilitychange', onResume);
    const sub = CapApp.addListener('backButton', () => {
      const top = stackRef.current[stackRef.current.length - 1];
      if (top?.kind === 'mock' && !window.confirm('தேர்வை விட்டு வெளியேறவா? விடைகள் சேமிக்கப்பட்டுள்ளன.')) return;
      if (stackRef.current.length) setStack((s) => s.slice(0, -1));
      else if (tabRef.current !== 'today') setTab('today');
      else void CapApp.minimizeApp();
    });
    return () => {
      document.removeEventListener('visibilitychange', onResume);
      void sub.then((h) => h.remove());
    };
  }, []);

  if (!ready) return <div className="grid min-h-screen place-items-center bg-slate-50 text-slate-500 dark:bg-slate-900">Mission GOV…</div>;

  const top = stack[stack.length - 1];
  let content;
  if (top) {
    let title = '';
    let body;
    switch (top.kind) {
      case 'session':
        title = 'இன்றைய அமர்வு';
        body = <Session onExit={pop} />;
        break;
      case 'lesson':
        title = txt(lessonById(top.id)?.title) || 'பாடம்';
        body = <LessonView lessonId={top.id} onDone={async () => { await markLessonDone(top.id); pop(); }} />;
        break;
      case 'kural':
        title = `திருக்குறள் · ${chapterByOrder(top.order).name}`;
        body = <KuralReader order={top.order} onDone={async () => { await markKuralLearned(top.order); pop(); }} />;
        break;
      case 'deck':
        title = txt(top.deck.title);
        body = <DeckView deck={top.deck} />;
        break;
      case 'quiz':
        title = txt(top.title);
        body = <QuizRunner questions={top.questions} mode={top.mode} sessionId={`practice-${new Date().toISOString().slice(0, 10)}`} onFinish={pop} finishLabel={{ ta: 'முடிக்க ✓' }} />;
        break;
      case 'mock':
        title = top.blueprint === 'TAMIL_100' ? 'தமிழ் 100 · மாதிரித் தேர்வு' : 'முழு மாதிரித் தேர்வு';
        body = <Mock blueprint={top.blueprint} onDone={pop} />;
        break;
    }
    content = (
      <>
        <TopBar title={title} onBack={() => (top.kind !== 'mock' || window.confirm('தேர்வை விட்டு வெளியேறவா? விடைகள் சேமிக்கப்பட்டுள்ளன.')) && pop()} />
        <Screen className="pb-10">{body}</Screen>
      </>
    );
  } else {
    content = (
      <>
        <div style={{ paddingTop: 'env(safe-area-inset-top)' }} />
        {tab === 'today' && <Today onStart={() => push({ kind: 'session' })} />}
        {tab === 'learn' && <Learn openKural={(order) => push({ kind: 'kural', order })} openLesson={(id) => push({ kind: 'lesson', id })} openDeck={(deck) => push({ kind: 'deck', deck })} />}
        {tab === 'practice' && <Practice startQuiz={(title, questions, mode) => push({ kind: 'quiz', title, questions, mode })} startMock={(blueprint) => push({ kind: 'mock', blueprint })} />}
        {tab === 'progress' && <Progress lang={lang} setLang={setLang} />}
        <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
          <div className="mx-auto grid max-w-xl grid-cols-4">
            {TABS.map((t) => (
              <button key={t.v} type="button" onClick={() => setTab(t.v)} className={`flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium ${tab === t.v ? 'text-teal-700 dark:text-teal-300' : 'text-slate-500'}`}>
                <span className={`text-xl transition ${tab === t.v ? 'scale-110' : ''}`}>{t.icon}</span>
                <T v={t.label} />
              </button>
            ))}
          </div>
        </nav>
      </>
    );
  }

  return (
    <LangCtx.Provider value={lang}>
      <div className="min-h-full bg-slate-50 text-slate-900 dark:bg-slate-900 dark:text-slate-100">
        {content}
        {toast && <div className="pop-in fixed inset-x-4 top-4 z-50 mx-auto max-w-md rounded-2xl bg-slate-900 px-4 py-3 text-center text-sm font-medium text-white shadow-xl">{toast}</div>}
      </div>
    </LangCtx.Provider>
  );
}
