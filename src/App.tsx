import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Beranda } from "./components/Beranda";

import { CubeMark } from "./components/CubeMark";
import { Persetujuan } from "./components/Persetujuan";
import { soundEngine } from "./lib/soundEngine";
import { Check, Moon, SpeakerHigh, SpeakerSlash, Sun } from "./components/Icons";
import { ANGKATAN, Question, SUGAR_QUESTIONS, TASK_QUESTIONS } from "./data/questionnaireData";
import {
  DemographicsData,
  INITIAL_QUESTIONNAIRE_STATE,
  QuestionnaireState,
  submitToGoogleSheets,
} from "./lib/submissionEngine";

const PenjelasanPenelitian = React.lazy(() =>
  import("./components/PenjelasanPenelitian").then((m) => ({ default: m.PenjelasanPenelitian }))
);
const HasilPenelitian = React.lazy(() =>
  import("./components/HasilPenelitian").then((m) => ({ default: m.HasilPenelitian }))
);
const ResearcherAdminModal = React.lazy(() =>
  import("./components/ResearcherAdminModal").then((m) => ({ default: m.ResearcherAdminModal }))
);
const BrewCupCompanion = React.lazy(() =>
  import("./components/BrewCupCompanion").then((m) => ({ default: m.BrewCupCompanion }))
);

type SurveyTab = "profile" | "workload" | "sugar" | "done";
type StepTab = Exclude<SurveyTab, "done">;

// Pages live in the hash so links can be shared and the back button works
type View = "beranda" | "penjelasan" | "persetujuan" | "kuesioner" | "hasil";
const viewFromHash = (hash: string): View => {
  if (hash.startsWith("#/kuesioner") || hash === "#kuesioner" || hash === "#pengantar") {
    return "kuesioner";
  }
  if (hash.startsWith("#/penjelasan")) return "penjelasan";
  if (hash.startsWith("#/persetujuan")) return "persetujuan";
  if (hash.startsWith("#/hasil")) return "hasil";
  return "beranda";
};

const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// v3: the questions now follow the group's design doc, older drafts no longer fit
const STORAGE_KEY = "ugm_psi_questionnaire_draft_v3";
const TAB_KEY = "ugm_psi_questionnaire_tab_v3";
const THEME_KEY = "takaran_theme";

const STEPS: StepTab[] = ["profile", "workload", "sugar"];
const STEP_NAMES: Record<StepTab, string> = {
  profile: "Identitas",
  workload: "Tugas akademik",
  sugar: "Konsumsi gula",
};

const TASK_IDS = TASK_QUESTIONS.map((q) => q.id);
const SUGAR_IDS = SUGAR_QUESTIONS.map((q) => q.id);

// Required answers per step, in on-screen order. Consent is given on its own
// page, which stays one step behind step 1.
const REQUIRED: Record<StepTab, string[]> = {
  profile: ["initials", "angkatan"],
  workload: TASK_IDS,
  sugar: SUGAR_IDS,
};

// Chip questions in on-screen order; after a first answer we glide to the next open one
const CHIP_FLOW: Record<StepTab, string[]> = {
  profile: ["angkatan"],
  workload: TASK_IDS,
  sugar: SUGAR_IDS,
};

const QUESTION_COUNT = TASK_IDS.length + SUGAR_IDS.length;

interface ChoiceOption<T extends string | number> {
  value: T;
  label: string;
  hint?: string;
}

const toOptions = (values: string[]): ChoiceOption<string>[] =>
  values.map((v) => ({ value: v, label: v }));

const ANGKATAN_OPTIONS = toOptions(ANGKATAN);

// Options are numbered from 1 in the order the design doc lists them
const numbered = (q: Question): ChoiceOption<number>[] =>
  q.options.map((label, i) => ({ value: i + 1, label }));

const OPTIONS_BY_ID: Record<string, ChoiceOption<number>[]> = Object.fromEntries(
  [...TASK_QUESTIONS, ...SUGAR_QUESTIONS].map((q) => [q.id, numbered(q)])
);

const isAnswered = (s: QuestionnaireState, qid: string): boolean => {
  switch (qid) {
    case "angkatan":
      return !!s.demographics.angkatan;
    case "initials":
      return !!s.demographics.initials.trim();
    default:
      return s.answers[qid] != null;
  }
};

const setDemo =
  (patch: Partial<DemographicsData>) =>
  (prev: QuestionnaireState): QuestionnaireState => ({
    ...prev,
    demographics: { ...prev.demographics, ...patch },
  });

const scrollBehavior = (): ScrollBehavior => (prefersReducedMotion() ? "auto" : "smooth");

// Researcher tools (sample fill, data panel) stay out of respondents' way.
// Open the site with ?peneliti to show them.
const detectResearcher = () => {
  if (import.meta.env.DEV) return true;
  try {
    return new URLSearchParams(window.location.search).has("peneliti");
  } catch {
    return false;
  }
};

interface ChoiceRowProps<T extends string | number> {
  qid: string;
  label: string;
  text?: string;
  hint?: string;
  options: ChoiceOption<T>[];
  value: T | undefined;
  isMissing: boolean;
  variant?: string;
  onPick: (qid: string, value: T) => void;
}

function ChoiceRowInner<T extends string | number>({
  qid,
  label,
  text,
  hint,
  options,
  value,
  isMissing,
  variant = "",
  onPick,
}: ChoiceRowProps<T>) {
  const textId = `${qid}-text`;
  return (
    <div
      className={`q-item ${isMissing ? "is-missing" : ""}`}
      data-qid={qid}
      role="group"
      aria-labelledby={text ? textId : undefined}
      aria-label={text ? undefined : label}
    >
      <span className="q-num">
        {label}
        {isMissing && <em className="q-missing">Belum dijawab</em>}
      </span>
      {text && (
        <p className="q-text" id={textId}>
          {text}
        </p>
      )}
      {hint && <p className="q-hint">{hint}</p>}
      <div className={`chips ${variant}`}>
        {options.map((opt) => {
          const selected = value === opt.value;
          return (
            <button
              key={String(opt.value)}
              type="button"
              aria-pressed={selected}
              className={`chip ${opt.hint ? "chip-has-hint" : ""} ${selected ? "is-selected" : ""}`}
              onClick={() => onPick(qid, opt.value)}
            >
              <span>{opt.label}</span>
              {opt.hint && <small className="chip-hint">{opt.hint}</small>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const ChoiceRow = React.memo(ChoiceRowInner) as typeof ChoiceRowInner;

export function App() {
  const isResearcher = useMemo(detectResearcher, []);
  const [view, setView] = useState<View>(() => viewFromHash(window.location.hash));
  // The intro plays once per visit, and only when the visit starts on the beranda
  const [introDone, setIntroDone] = useState<boolean>(
    () => viewFromHash(window.location.hash) !== "beranda" || prefersReducedMotion()
  );
  const resumeOnOpen = useRef(false);

  const [state, setState] = useState<QuestionnaireState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return { ...INITIAL_QUESTIONNAIRE_STATE, ...JSON.parse(saved) };
      }
    } catch {
      // ignore
    }
    return INITIAL_QUESTIONNAIRE_STATE;
  });

  const [activeTab, setActiveTab] = useState<SurveyTab>(() => {
    try {
      const saved = localStorage.getItem(TAB_KEY);
      if (saved && (STEPS as string[]).includes(saved)) return saved as StepTab;
    } catch {
      // ignore
    }
    return "profile";
  });
  const [isNightMode, setIsNightMode] = useState<boolean>(
    () => document.documentElement.dataset.theme === "night"
  );
  const [isSoundOn, setIsSoundOn] = useState<boolean>(() => !soundEngine.isMuted);
  const [isTucked, setIsTucked] = useState<boolean>(false);
  const [isScrolled, setIsScrolled] = useState<boolean>(false);
  const [isNudged, setIsNudged] = useState<boolean>(false);
  const [isSentFlare, setIsSentFlare] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [missing, setMissing] = useState<Set<string>>(() => new Set());
  const [isAdminOpen, setIsAdminOpen] = useState<boolean>(false);
  const [shareNote, setShareNote] = useState<string>("");
  const [receipt, setReceipt] = useState<{
    submissionId: string;
    timestamp: string;
  } | null>(null);

  const surveyRef = useRef<HTMLElement>(null);
  const noteRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;
  const glideTimer = useRef<number>(0);

  // Auto-save draft and current step to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore
    }
  }, [state]);

  useEffect(() => {
    if (activeTab === "done") return;
    try {
      localStorage.setItem(TAB_KEY, activeTab);
    } catch {
      // ignore
    }
  }, [activeTab]);

  useEffect(() => {
    document.documentElement.dataset.theme = isNightMode ? "night" : "day";
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", isNightMode ? "#0c1130" : "#eceff2");
  }, [isNightMode]);

  useEffect(() => {
    const onNav = () => setView(viewFromHash(window.location.hash));
    window.addEventListener("popstate", onNav);
    window.addEventListener("hashchange", onNav);
    return () => {
      window.removeEventListener("popstate", onNav);
      window.removeEventListener("hashchange", onNav);
    };
  }, []);

  // Browsers only allow audio after a gesture: wake the sound engine on the first one
  useEffect(() => {
    const wake = () => {
      if (!soundEngine.isMuted) soundEngine.unlock();
    };
    window.addEventListener("pointerdown", wake, { once: true });
    window.addEventListener("keydown", wake, { once: true });
    return () => {
      window.removeEventListener("pointerdown", wake);
      window.removeEventListener("keydown", wake);
      window.clearTimeout(glideTimer.current);
    };
  }, []);

  // Tuck masthead on scroll down, show on scroll up (throttled via requestAnimationFrame)
  useEffect(() => {
    let lastY = window.scrollY;
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const y = window.scrollY;
          const dy = y - lastY;
          lastY = y;
          setIsScrolled(y > 8);
          if (y < 140 || dy < -4) setIsTucked(false);
          else if (dy > 6) setIsTucked(true);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const triggerCupNudge = () => {
    soundEngine.playSugarDrop();
    setIsNudged(false);
    requestAnimationFrame(() => {
      setIsNudged(true);
    });
  };

  // Overall progress (0..1) fills the cup above the sheet
  const { riseProgress, answeredCount, totalCount } = useMemo(() => {
    const totalPoints = 2 + QUESTION_COUNT; // initials, angkatan

    if (activeTab === "done") {
      return {
        riseProgress: 1,
        answeredCount: totalPoints,
        totalCount: totalPoints,
      };
    }

    let filled = 0;
    if (state.demographics.initials.trim()) filled += 1;
    if (state.demographics.angkatan) filled += 1;
    filled += Object.keys(state.answers).length;

    return {
      riseProgress: Math.min(1, filled / totalPoints),
      answeredCount: filled,
      totalCount: totalPoints,
    };
  }, [state, activeTab]);

  const stepStats = useMemo(() => {
    const stats = {} as Record<StepTab, { done: number; total: number }>;
    STEPS.forEach((tab) => {
      stats[tab] = {
        done: REQUIRED[tab].filter((id) => isAnswered(state, id)).length,
        total: REQUIRED[tab].length,
      };
    });
    return stats;
  }, [state]);

  const pct = Math.round(riseProgress * 100);

  const scrollToSurvey = () => {
    surveyRef.current?.scrollIntoView({ behavior: scrollBehavior(), block: "start" });
  };

  const scrollToNote = () => {
    const el = noteRef.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 96;
    window.scrollTo({ top, behavior: scrollBehavior() });
  };

  const scrollToQuestion = (qid: string, focus = false) => {
    const el = document.querySelector<HTMLElement>(`[data-qid="${qid}"]`);
    if (!el) return;
    const rect = el.getBoundingClientRect();
    window.scrollTo({
      top: window.scrollY + rect.top - window.innerHeight * 0.22,
      behavior: scrollBehavior(),
    });
    if (focus) el.querySelector<HTMLElement>("button, input")?.focus({ preventScroll: true });
  };

  const clearMissing = (qid: string) => {
    setMissing((m) => {
      if (!m.has(qid)) return m;
      const next = new Set(m);
      next.delete(qid);
      return next;
    });
  };

  // After a first answer, bring the next unanswered question into view if it is off-screen
  const glideToNext = (qid: string) => {
    if (activeTabRef.current === "done") return;
    const flow = CHIP_FLOW[activeTabRef.current];
    const idx = flow.indexOf(qid);
    if (idx < 0) return;
    window.clearTimeout(glideTimer.current);
    glideTimer.current = window.setTimeout(() => {
      const nextId = flow.slice(idx + 1).find((id) => !isAnswered(stateRef.current, id));
      if (!nextId) return;
      const el = document.querySelector<HTMLElement>(`[data-qid="${nextId}"]`);
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (rect.top > 72 && rect.bottom < window.innerHeight - 24) return;
      scrollToQuestion(nextId);
    }, 320);
  };

  const answer = useCallback((qid: string, apply: (prev: QuestionnaireState) => QuestionnaireState) => {
    const wasAnswered = isAnswered(stateRef.current, qid);
    triggerCupNudge();
    setErrorMsg("");
    clearMissing(qid);
    setState(apply);
    if (!wasAnswered) glideToNext(qid);
  }, []);

  const handlePickAngkatan = useCallback((qid: string, v: string) => {
    answer(qid, setDemo({ angkatan: v }));
  }, [answer]);

  const handlePickAnswer = useCallback((qid: string, v: number) => {
    answer(qid, (prev) => ({
      ...prev,
      answers: { ...prev.answers, [qid]: v },
    }));
  }, [answer]);

  const updateField = (patch: Partial<DemographicsData>, qid?: string) => {
    setErrorMsg("");
    if (qid) clearMissing(qid);
    setState(setDemo(patch));
  };

  const goToStep = (tab: SurveyTab) => {
    setErrorMsg("");
    setMissing(new Set());
    setActiveTab(tab);
    requestAnimationFrame(scrollToNote);
  };

  // Marks every unanswered required question and takes the respondent to the first one
  const checkStep = (tab: StepTab): boolean => {
    const open = REQUIRED[tab].filter((id) => !isAnswered(state, id));
    if (open.length === 0) return true;
    setMissing(new Set(open));
    setErrorMsg(
      `Masih ada ${open.length} pertanyaan yang belum dijawab. Yang bertanda merah perlu diisi.`
    );
    requestAnimationFrame(() => scrollToQuestion(open[0], true));
    return false;
  };

  // Take a returning respondent straight to their first open question
  const scrollToResumePoint = () => {
    if (activeTab !== "done" && answeredCount > 0) {
      const next = REQUIRED[activeTab].find((id) => !isAnswered(state, id));
      if (next) scrollToQuestion(next);
      else scrollToNote();
      return;
    }
    scrollToSurvey();
  };

  const resumeSurvey = () => {
    soundEngine.playIceClink();
    scrollToResumePoint();
  };

  const navigate = (next: View) => {
    if (next === view) {
      window.scrollTo({ top: 0, behavior: scrollBehavior() });
      return;
    }
    const url =
      next === "beranda"
        ? window.location.pathname + window.location.search
        : `#/${next}`;
    window.history.pushState(null, "", url);
    setView(next);
  };

  const needsConsent = !state.hasConsented && activeTab !== "done";

  // Consent is given once and kept with the draft. A respondent who already
  // agreed goes straight on from where they stopped.
  const openKuesioner = () => {
    soundEngine.playIceClink();
    if (needsConsent) {
      navigate("persetujuan");
      return;
    }
    resumeOnOpen.current = activeTab !== "done" && answeredCount > 0;
    navigate("kuesioner");
  };

  const setConsent = (agreed: boolean) => {
    setState((prev) => ({
      ...prev,
      hasConsented: agreed,
      consentTimestamp: agreed ? prev.consentTimestamp ?? new Date().toISOString() : null,
    }));
  };

  const handleAgree = () => {
    soundEngine.playSugarDrop();
    resumeOnOpen.current = activeTab !== "done" && answeredCount > 0;
    navigate("kuesioner");
  };

  // The questions stay closed until consent is given, even by direct link
  useEffect(() => {
    if (view === "kuesioner" && needsConsent) {
      window.history.replaceState(null, "", "#/persetujuan");
      setView("persetujuan");
    }
  }, [view, needsConsent]);

  // A new page starts at its top, unless the respondent is picking up where they left off
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    if (view === "kuesioner" && resumeOnOpen.current) {
      resumeOnOpen.current = false;
      requestAnimationFrame(scrollToResumePoint);
    }
  }, [view]);

  const toggleSound = () => {
    const muted = soundEngine.toggleMute();
    setIsSoundOn(!muted);
  };

  const toggleTheme = () => {
    const next = !isNightMode;
    setIsNightMode(next);
    try {
      localStorage.setItem(THEME_KEY, next ? "night" : "day");
    } catch {
      // ignore
    }
    soundEngine.playIceClink();
  };

  const handleQuickFill = () => {
    triggerCupNudge();
    setErrorMsg("");
    setMissing(new Set());
    const answers: Record<string, number> = {};
    [...TASK_IDS, ...SUGAR_IDS].forEach((id, i) => {
      answers[id] = [4, 3, 3, 2, 4, 2, 3, 2, 3, 3, 4][i % 11];
    });

    // Initials TEST so `npm run sheet:hapus-test` can clear these rows later
    setState({
      hasConsented: true,
      consentTimestamp: new Date().toISOString(),
      demographics: {
        initials: "TEST",
        angkatan: "2025",
      },
      answers,
    });
  };

  const handleSubmitAll = async () => {
    if (!checkStep("sugar")) return;
    setErrorMsg("");
    setIsSubmitting(true);
    try {
      const res = await submitToGoogleSheets(state);
      setReceipt({
        submissionId: res.submissionId,
        timestamp: res.timestamp,
      });
      soundEngine.playWarmInviteChord();
      setIsSentFlare(true);
      setActiveTab("done");
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(TAB_KEY);
      requestAnimationFrame(scrollToNote);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleShare = async () => {
    const url = window.location.origin + window.location.pathname;
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Takaran: kuesioner tugas & gula",
          text: "Bantu isi kuesioner Metode Penelitian Kuantitatif Psikologi UGM (3–4 menit, anonim).",
          url,
        });
        return;
      }
      await navigator.clipboard.writeText(url);
      setShareNote("Tautan tersalin");
      window.setTimeout(() => setShareNote(""), 2400);
    } catch {
      // share sheet dismissed or clipboard blocked
    }
  };

  const handleReset = () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(TAB_KEY);
    setState(INITIAL_QUESTIONNAIRE_STATE);
    setReceipt(null);
    setIsSentFlare(false);
    setErrorMsg("");
    setMissing(new Set());
    setActiveTab("profile");
    window.scrollTo({ top: 0, behavior: "instant" });
  };

  const sidebarCopy = {
    profile: {
      title: "Mulai dari identitas singkat.",
      lede: "Cukup inisial dan angkatan sebelum masuk ke pertanyaan.",
    },
    workload: {
      title: "Seberapa padat tugasmu?",
      lede: "Tiga pertanyaan tentang jumlah tugas akademik dan lama mengerjakannya.",
    },
    sugar: {
      title: "Saatnya menakar yang manis.",
      lede: "Delapan pertanyaan tentang makanan dan minuman tinggi gula dalam seminggu.",
    },
    done: {
      title: "Struk takaranmu siap.",
      lede: "Jawabanmu sudah terekam untuk Tugas Metode Penelitian Kuantitatif Fakultas Psikologi UGM.",
    },
  }[activeTab];

  const stepKicker = (tab: StepTab, index: number) => (
    <div className="note-kicker">
      <span>Bagian {index} dari 3</span>
      <span className="note-kicker-count">
        {stepStats[tab].done} dari {stepStats[tab].total} terjawab
      </span>
    </div>
  );

  const introPlaying = view === "beranda" && !introDone;

  return (
    <div id="top">
      <header
        className={`masthead ${isTucked ? "is-tucked" : ""} ${isScrolled ? "is-scrolled" : ""} ${
          introPlaying ? "is-hidden" : ""
        }`}
      >
        <a
          className="brand"
          href="#/"
          aria-label="Takaran, ke beranda"
          onClick={(e) => {
            e.preventDefault();
            navigate("beranda");
          }}
        >
          <CubeMark className="brand-mark" />
          <span className="brand-name">Takaran</span>
          <span className="brand-sub">Psikologi UGM</span>
        </a>

        <nav className="masthead-nav" aria-label="Navigasi">
          {view !== "beranda" && (
            <a
              className="nav-link"
              href="#/"
              onClick={(e) => {
                e.preventDefault();
                navigate("beranda");
              }}
            >
              Beranda
            </a>
          )}
          <button
            type="button"
            className="icon-btn"
            onClick={toggleSound}
            aria-pressed={isSoundOn}
            aria-label="Efek suara"
            title={isSoundOn ? "Matikan efek suara" : "Nyalakan efek suara"}
          >
            {isSoundOn ? (
              <SpeakerHigh size={18} weight="bold" />
            ) : (
              <SpeakerSlash size={18} weight="bold" />
            )}
          </button>
          <button
            type="button"
            className="icon-btn"
            onClick={toggleTheme}
            aria-pressed={isNightMode}
            aria-label="Mode gelap"
            title={isNightMode ? "Ganti ke mode siang" : "Ganti ke mode lembur (gelap)"}
          >
            {isNightMode ? <Sun size={18} weight="bold" /> : <Moon size={18} weight="bold" />}
          </button>
          {view === "kuesioner" && !needsConsent && (
            <a
              className="nav-progress"
              href="#/kuesioner"
              aria-label={`Ke pertanyaan berikutnya, terisi ${pct}%`}
              onClick={(e) => {
                e.preventDefault();
                resumeSurvey();
              }}
            >
              <i className="cube-dot" aria-hidden="true" />
              <span className="nav-progress-full">Gelasku {pct}%</span>
              <span className="nav-progress-short">{pct}%</span>
            </a>
          )}
        </nav>
      </header>

      <main>
        {view === "beranda" && (
          <Beranda
            isNightMode={isNightMode}
            playIntro={!introDone}
            resumePercent={activeTab !== "done" && answeredCount > 0 ? pct : 0}
            onIntroEnd={() => setIntroDone(true)}
            onOpenPenjelasan={() => navigate("penjelasan")}
            onOpenKuesioner={openKuesioner}
            onOpenHasil={() => navigate("hasil")}
          />
        )}

        {view === "penjelasan" && (
          <Suspense fallback={<div style={{ minHeight: "50vh" }} />}>
            <PenjelasanPenelitian
              onOpenKuesioner={openKuesioner}
              onBack={() => navigate("beranda")}
            />
          </Suspense>
        )}

        {view === "hasil" && (
          <Suspense fallback={<div className="hasil-loading" style={{ minHeight: "50vh" }} />}>
            <HasilPenelitian onOpenKuesioner={openKuesioner} onBack={() => navigate("beranda")} />
          </Suspense>
        )}

        {view === "persetujuan" && (
          <Persetujuan
            agreed={state.hasConsented}
            isResuming={state.hasConsented && answeredCount > 0}
            onToggle={setConsent}
            onAgree={handleAgree}
            onDecline={() => navigate("beranda")}
            onOpenPenjelasan={() => navigate("penjelasan")}
          />
        )}

        {view === "kuesioner" && !needsConsent && (
          <>
            {/* The Questionnaire Scene: the cup fills up as you answer */}
            <section
              className="section-wrap survey-body"
              id="kuesioner"
              ref={surveyRef}
              aria-labelledby="surveyHeading"
            >
              {/* Left Sticky Column */}
              <div className="survey-sidebar">
                <p className="open-pill">
                  <i className="cube-dot" aria-hidden="true" />
                  <span>Tersimpan otomatis di browser</span>
                </p>

                <h1 className="survey-title" id="surveyHeading">
                  {sidebarCopy.title}
                </h1>
                <p className="survey-lede">{sidebarCopy.lede}</p>

                <div className="survey-steps" role="tablist" aria-label="Tahapan kuesioner">
                  {STEPS.map((tab, i) => {
                    const st = stepStats[tab];
                    const complete = activeTab === "done" || st.done === st.total;
                    return (
                      <button
                        key={tab}
                        type="button"
                        role="tab"
                        aria-selected={activeTab === tab}
                        disabled={activeTab === "done"}
                        className={`step-tab ${activeTab === tab ? "is-active" : ""}`}
                        onClick={() => goToStep(tab)}
                      >
                        <span className="step-tab-name">
                          {i + 1}. {STEP_NAMES[tab]}
                        </span>
                        <span className={`step-tab-count ${complete ? "is-complete" : ""}`}>
                          {complete ? (
                            <>
                              <Check size={13} weight="bold" aria-hidden="true" /> Selesai
                            </>
                          ) : (
                            `${st.done} / ${st.total}`
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {isResearcher && activeTab !== "done" && (
                  <div className="researcher-tools">
                    <span>Mode peneliti</span>
                    <button type="button" className="ghost-btn" onClick={handleQuickFill}>
                      Isi contoh cepat
                    </button>
                  </div>
                )}
              </div>

              {/* Right Questionnaire Sheet with the cup companion */}
              <div
                className="note-scene"
                ref={noteRef}
                style={{ ["--rise" as string]: riseProgress.toFixed(3) }}
              >
                <Suspense fallback={null}>
                  <BrewCupCompanion
                    progress={riseProgress}
                    isNudged={isNudged}
                    isSent={isSentFlare}
                    answeredCount={answeredCount}
                    totalCount={totalCount}
                  />
                </Suspense>

                <div className="note">
                  {/* TAB 1: PROFILE */}
                  {activeTab === "profile" && (
                    <>
                      <div>
                        {stepKicker("profile", 1)}
                        <p className="note-phrase">
                          Identitas singkat sebagai mahasiswa S1 Psikologi UGM.
                        </p>
                      </div>

                      <div className="note-fields">
                        <div
                          className={`field field-wide ${missing.has("initials") ? "is-missing" : ""}`}
                          data-qid="initials"
                        >
                          <label htmlFor="fInitials">
                            Nama (inisial)
                            {missing.has("initials") && <em className="q-missing">Belum diisi</em>}
                          </label>
                          <input
                            id="fInitials"
                            type="text"
                            autoComplete="off"
                            maxLength={12}
                            placeholder="Misal: NP"
                            aria-invalid={missing.has("initials")}
                            value={state.demographics.initials}
                            onChange={(e) => updateField({ initials: e.target.value }, "initials")}
                          />
                        </div>
                      </div>

                      <div className="q-list">
                        <ChoiceRow
                          qid="angkatan"
                          label="Angkatan"
                          options={ANGKATAN_OPTIONS}
                          value={state.demographics.angkatan}
                          isMissing={missing.has("angkatan")}
                          onPick={handlePickAngkatan}
                        />
                      </div>

                      {errorMsg && (
                        <p className="field-error" role="alert">
                          {errorMsg}
                        </p>
                      )}

                      <div className="note-send">
                        <button
                          type="button"
                          className="ghost-btn"
                          onClick={() => navigate("persetujuan")}
                        >
                          Kembali
                        </button>
                        <button
                          type="button"
                          className="note-btn"
                          onClick={() => checkStep("profile") && goToStep("workload")}
                        >
                          <i className="note-btn-cube" aria-hidden="true" />
                          <span>Lanjut ke tugas akademik</span>
                        </button>
                      </div>
                    </>
                  )}

                  {/* TAB 2: ACADEMIC WORKLOAD (VARIABLE X) */}
                  {activeTab === "workload" && (
                    <>
                      <div>
                        {stepKicker("workload", 2)}
                        <p className="note-phrase">
                          Jumlah tugas akademik dan waktu yang kamu butuhkan untuk menyelesaikannya.
                        </p>
                      </div>

                      <div className="q-list">
                        {TASK_QUESTIONS.map((q, idx) => (
                          <ChoiceRow
                            key={q.id}
                            qid={q.id}
                            label={`Pertanyaan ${idx + 1} dari ${QUESTION_COUNT}`}
                            text={q.text}
                            options={OPTIONS_BY_ID[q.id]}
                            value={state.answers[q.id]}
                            isMissing={missing.has(q.id)}
                            variant="chips-scale"
                            onPick={handlePickAnswer}
                          />
                        ))}
                      </div>

                      {errorMsg && (
                        <p className="field-error" role="alert">
                          {errorMsg}
                        </p>
                      )}

                      <div className="note-send">
                        <button type="button" className="ghost-btn" onClick={() => goToStep("profile")}>
                          Kembali
                        </button>
                        <button
                          type="button"
                          className="note-btn"
                          onClick={() => checkStep("workload") && goToStep("sugar")}
                        >
                          <i className="note-btn-cube" aria-hidden="true" />
                          <span>Lanjut ke konsumsi gula</span>
                        </button>
                      </div>
                    </>
                  )}

                  {/* TAB 3: SUGAR CONSUMPTION (VARIABLE Y) */}
                  {activeTab === "sugar" && (
                    <>
                      <div>
                        {stepKicker("sugar", 3)}
                        <p className="note-phrase">
                          Makanan dan minuman tinggi gula yang kamu konsumsi dalam satu minggu.
                        </p>
                      </div>

                      <div className="q-list">
                        {SUGAR_QUESTIONS.map((q, idx) => (
                          <ChoiceRow
                            key={q.id}
                            qid={q.id}
                            label={`Pertanyaan ${idx + TASK_QUESTIONS.length + 1} dari ${QUESTION_COUNT}`}
                            text={q.text}
                            options={OPTIONS_BY_ID[q.id]}
                            value={state.answers[q.id]}
                            isMissing={missing.has(q.id)}
                            variant="chips-scale"
                            onPick={handlePickAnswer}
                          />
                        ))}
                      </div>

                      {errorMsg && (
                        <p className="field-error" role="alert">
                          {errorMsg}
                        </p>
                      )}

                      <div className="note-send">
                        <button type="button" className="ghost-btn" onClick={() => goToStep("workload")}>
                          Kembali
                        </button>
                        <button
                          type="button"
                          className="note-btn"
                          disabled={isSubmitting}
                          onClick={handleSubmitAll}
                        >
                          <i className="note-btn-cube" aria-hidden="true" />
                          <span>{isSubmitting ? "Mengirim jawaban..." : "Kirim jawaban"}</span>
                        </button>
                      </div>
                    </>
                  )}

                  {/* TAB 4: DONE / STUDY CAFE RECEIPT */}
                  {activeTab === "done" && receipt && (
                    <>
                      <div>
                        <div className="note-kicker">
                          <span>Struk takaran {receipt.submissionId}</span>
                          <span>Psikologi UGM</span>
                        </div>
                        <p className="note-phrase">
                          Terima kasih, jawabanmu sudah terkirim untuk penelitian Kelompok 9
                          Metode Penelitian Kuantitatif.
                        </p>
                      </div>

                      <div className="receipt-box">
                        <div className="receipt-row">
                          <span>KODE PARTISIPAN</span>
                          <strong>{receipt.submissionId}</strong>
                        </div>
                        <div className="receipt-row">
                          <span>ANGKATAN</span>
                          <strong>{state.demographics.angkatan || "-"}</strong>
                        </div>
                        <div className="receipt-row">
                          <span>PERTANYAAN TERJAWAB</span>
                          <strong>
                            {QUESTION_COUNT} dari {QUESTION_COUNT}
                          </strong>
                        </div>
                      </div>

                      <div className="note-send">
                        <div className="note-send-group">
                          <button type="button" className="ghost-btn" onClick={handleReset}>
                            Isi untuk responden baru
                          </button>
                          {isResearcher && (
                            <button
                              type="button"
                              className="ghost-btn"
                              onClick={() => setIsAdminOpen(true)}
                            >
                              Lihat tabel data (SPSS / CSV)
                            </button>
                          )}
                        </div>
                        <button type="button" className="note-btn" onClick={handleShare}>
                          <i className="note-btn-cube" aria-hidden="true" />
                          <span aria-live="polite">{shareNote || "Bagikan ke teman"}</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </section>
          </>
        )}
      </main>

      {view !== "beranda" && (
        <footer className="footer">
          <p>Kuesioner Tugas Metode Penelitian Kuantitatif, S1 Psikologi UGM 2026</p>
          {isResearcher ? (
            <button type="button" className="footer-link" onClick={() => setIsAdminOpen(true)}>
              Panel data peneliti
            </button>
          ) : (
            <p>Setiap jawaban menambah satu kubus gula ke gelas riset.</p>
          )}
        </footer>
      )}

      {isAdminOpen && (
        <Suspense fallback={null}>
          <ResearcherAdminModal
            isOpen={isAdminOpen}
            onClose={() => setIsAdminOpen(false)}
          />
        </Suspense>
      )}
    </div>
  );
}

export default App;
