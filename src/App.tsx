import { useEffect, useMemo, useRef, useState } from "react";
import { Beranda } from "./components/Beranda";
import { BrewCupCompanion } from "./components/BrewCupCompanion";
import { CubeMark } from "./components/CubeMark";
import { HasilPenelitian } from "./components/HasilPenelitian";
import { ResearcherAdminModal } from "./components/ResearcherAdminModal";
import { soundEngine } from "./lib/soundEngine";
import { Check, Moon, SpeakerHigh, SpeakerSlash, Sun } from "@phosphor-icons/react";
import {
  LIKERT_AGREEMENT_OPTIONS,
  LIKERT_FREQUENCY_OPTIONS,
  QUANTITATIVE_TASK_METRICS,
  SWEET_CATEGORIES,
  VARIABLE_X_ITEMS,
  VARIABLE_Y_ITEMS,
} from "./data/questionnaireData";
import {
  ComputedSummary,
  DemographicsData,
  INITIAL_QUESTIONNAIRE_STATE,
  QuestionnaireState,
  submitToGoogleSheets,
} from "./lib/submissionEngine";

type SurveyTab = "profile" | "workload" | "sugar" | "done";
type StepTab = Exclude<SurveyTab, "done">;

// Pages live in the hash so links can be shared and the back button works
type View = "beranda" | "kuesioner" | "hasil";
const viewFromHash = (hash: string): View => {
  if (hash.startsWith("#/kuesioner") || hash === "#kuesioner" || hash === "#pengantar") {
    return "kuesioner";
  }
  if (hash.startsWith("#/hasil")) return "hasil";
  return "beranda";
};

const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const STORAGE_KEY = "ugm_psi_questionnaire_draft_v2";
const TAB_KEY = "ugm_psi_questionnaire_tab_v2";
const THEME_KEY = "takaran_theme";

const STEPS: StepTab[] = ["profile", "workload", "sugar"];
const STEP_NAMES: Record<StepTab, string> = {
  profile: "Profil & persetujuan",
  workload: "Tugas kuliah",
  sugar: "Asupan manis",
};

const X_IDS = VARIABLE_X_ITEMS.map((i) => i.id);
const Y_IDS = VARIABLE_Y_ITEMS.map((i) => i.id);
const SWEET_IDS = SWEET_CATEGORIES.map((c) => c.id);

// Required answers per step, in on-screen order
const REQUIRED: Record<StepTab, string[]> = {
  profile: ["consent", "angkatan", "semester", "gender", "age"],
  workload: X_IDS,
  sugar: [...SWEET_IDS, ...Y_IDS],
};

// Chip questions in on-screen order; after a first answer we glide to the next open one
const CHIP_FLOW: Record<StepTab, string[]> = {
  profile: ["consent", "angkatan", "semester", "gender", "location"],
  workload: X_IDS,
  sugar: [...SWEET_IDS, ...Y_IDS],
};

const ANGKATAN = ["2021", "2022", "2023", "2024", "2025"];
const SEMESTERS = ["Semester 2", "Semester 4", "Semester 6", "Semester 8+"];
const GENDERS = ["Perempuan", "Laki-laki"];
const LOCATIONS = ["Kamar kos / rumah", "Perpustakaan kampus", "Kafe / coffee shop"];

interface ChoiceOption<T extends string | number> {
  value: T;
  label: string;
  hint?: string;
}

const toOptions = (values: string[]): ChoiceOption<string>[] =>
  values.map((v) => ({ value: v, label: v }));

const AGREEMENT: ChoiceOption<number>[] = LIKERT_AGREEMENT_OPTIONS.map((o) => ({
  value: o.value,
  label: o.fullLabel,
}));

const FREQUENCY: ChoiceOption<number>[] = LIKERT_FREQUENCY_OPTIONS.map((o) => ({
  value: o.value,
  label: o.fullLabel,
  hint: o.description,
}));

const isAnswered = (s: QuestionnaireState, qid: string): boolean => {
  switch (qid) {
    case "consent":
      return s.hasConsented;
    case "angkatan":
      return !!s.demographics.angkatan;
    case "semester":
      return !!s.demographics.semester;
    case "gender":
      return !!s.demographics.gender;
    case "location":
      return !!s.demographics.studyLocation;
    case "age":
      return !!(s.demographics.age || "").trim();
    default:
      return (
        s.variableXAnswers[qid] != null ||
        s.sweetCategoryFrequency[qid] != null ||
        s.variableYAnswers[qid] != null
      );
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
  onPick: (value: T) => void;
}

function ChoiceRow<T extends string | number>({
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
              onClick={() => onPick(opt.value)}
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
    summary: ComputedSummary;
  } | null>(null);

  const surveyRef = useRef<HTMLElement>(null);
  const noteRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef(state);
  stateRef.current = state;
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

  // Tuck masthead on scroll down, show on scroll up
  useEffect(() => {
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      const dy = y - lastY;
      lastY = y;
      setIsScrolled(y > 8);
      if (y < 140 || dy < -4) setIsTucked(false);
      else if (dy > 6) setIsTucked(true);
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
    const totalPoints =
      1 + // consent
      4 + // angkatan, semester, age, gender
      VARIABLE_X_ITEMS.length +
      SWEET_CATEGORIES.length +
      VARIABLE_Y_ITEMS.length;

    if (activeTab === "done") {
      return {
        riseProgress: 1,
        answeredCount: totalPoints,
        totalCount: totalPoints,
      };
    }

    let filled = 0;
    if (state.hasConsented) filled += 1;
    if (state.demographics.angkatan) filled += 1;
    if (state.demographics.semester) filled += 1;
    if (state.demographics.age) filled += 1;
    if (state.demographics.gender) filled += 1;

    filled += Object.keys(state.variableXAnswers).length;
    filled += Object.keys(state.sweetCategoryFrequency).length;
    filled += Object.keys(state.variableYAnswers).length;

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
    if (activeTab === "done") return;
    const flow = CHIP_FLOW[activeTab];
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

  const answer = (qid: string, apply: (prev: QuestionnaireState) => QuestionnaireState) => {
    const wasAnswered = isAnswered(state, qid);
    triggerCupNudge();
    setErrorMsg("");
    clearMissing(qid);
    setState(apply);
    if (!wasAnswered) glideToNext(qid);
  };

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
      open.length === 1 && open[0] === "consent"
        ? "Pilih persetujuan partisipasi terlebih dahulu."
        : `Masih ada ${open.length} pertanyaan yang belum dijawab. Yang bertanda merah perlu diisi.`
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

  const openKuesioner = () => {
    soundEngine.playIceClink();
    resumeOnOpen.current = activeTab !== "done" && answeredCount > 0;
    navigate("kuesioner");
  };

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
    const vx: Record<string, number> = {};
    VARIABLE_X_ITEMS.forEach((item, i) => {
      vx[item.id] = [4, 3, 2, 4, 3, 2, 4, 3][i % 8];
    });
    const freq: Record<string, number> = {};
    SWEET_CATEGORIES.forEach((cat, i) => {
      freq[cat.id] = [4, 3, 2, 3, 3][i % 5];
    });
    const vy: Record<string, number> = {};
    VARIABLE_Y_ITEMS.forEach((item, i) => {
      vy[item.id] = [4, 4, 2, 4, 3, 4, 2, 3][i % 8];
    });

    setState({
      hasConsented: true,
      consentTimestamp: new Date().toISOString(),
      demographics: {
        initials: "N. Putri",
        angkatan: "2023",
        semester: "Semester 6",
        age: "20",
        gender: "Perempuan",
        residence: "Kos / Kontrakan Sendiri",
        isActiveStudent: true,
        studyLocation: "Kafe / coffee shop",
        ewalletType: "GoPay",
        ewalletNumber: "081234567890",
      },
      quantitativeTasks: {
        weekly_assignments_count: 7,
        daily_study_hours: 5,
        late_night_sessions: 4,
      },
      variableXAnswers: vx,
      sweetCategoryFrequency: freq,
      variableYAnswers: vy,
      openNote: "Es kopi susu gula aren waktu lembur praktikum.",
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
        summary: res.summary,
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
    goToStep("profile");
  };

  const sidebarCopy = {
    profile: {
      title: "Mulai dari meja belajarmu.",
      lede: "Beberapa data singkat sebelum kita menakar beban tugas dan asupan manismu.",
    },
    workload: {
      title: "Seberapa padat minggu ini?",
      lede: "Hitungan tugas kuliah, laporan praktikum, dan jam belajar di luar kelas.",
    },
    sugar: {
      title: "Saatnya menakar yang manis.",
      lede: "Kopi susu gula aren, boba, atau camilan yang menemani saat tenggat mendekat.",
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
          {isResearcher && (
            <button
              type="button"
              className="nav-link nav-data"
              onClick={() => setIsAdminOpen(true)}
              title="Buka panel data peneliti"
            >
              Data
            </button>
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
          {view === "kuesioner" && (
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
            onOpenKuesioner={openKuesioner}
            onOpenHasil={() => navigate("hasil")}
          />
        )}

        {view === "hasil" && (
          <HasilPenelitian onOpenKuesioner={openKuesioner} onBack={() => navigate("beranda")} />
        )}

        {view === "kuesioner" && (
          <>
            {/* Minimal Editorial About Section */}
            <section
              className="section-wrap about-section"
              id="pengantar"
              aria-labelledby="aboutTitle"
            >
              <h1 className="section-title" id="aboutTitle">
                Tentang Riset
              </h1>

              <div className="about-body">
                <p className="about-lead">
                  Tumpukan tugas di layar laptop dan segelas manis dingin di
                  sebelah catatanmu.
                </p>
                <p className="about-text">
                  Penelitian Tugas Metode Penelitian Kuantitatif ini mengkaji bagaimana{" "}
                  <strong>
                    Kecenderungan Perilaku Konsumsi Tinggi Gula saat Menghadapi
                    Tuntutan Akademik
                  </strong>{" "}
                  pada mahasiswa S1 Fakultas Psikologi Universitas Gadjah Mada. Tidak ada
                  jawaban benar maupun salah.
                </p>
                <p className="about-aside">
                  Setiap butir jawaban yang kamu pilih akan menambah gula batu dan
                  mengisi gelas takar di atas lembar kuesioner.
                </p>
              </div>

              <dl className="about-stack">
                <div>
                  <dt>Partisipan</dt>
                  <dd>Mahasiswa aktif S1 Psikologi UGM</dd>
                </div>
                <div>
                  <dt>Durasi</dt>
                  <dd>Sekitar 3–4 menit (16 pernyataan singkat)</dd>
                </div>
                <div>
                  <dt>Apresiasi</dt>
                  <dd>Undian saldo GoPay / ShopeePay Rp 50.000 untuk 10 responden</dd>
                </div>
                <div>
                  <dt>Kerahasiaan</dt>
                  <dd>Dijamin anonim &amp; progres tersimpan otomatis</dd>
                </div>
              </dl>
            </section>

            {/* Full-bleed Kinetic Marquee with Sugar Cubes & Boba Pearls */}
            <div className="marquee" aria-hidden="true">
              <div className="marquee-track">
                {[0, 1, 2, 3].map((g) => (
                  <div className="marquee-group" key={g}>
                    <span className="marquee-item">Tumpukan Tugas</span>
                    <i className="marquee-cube" />
                    <span className="marquee-item is-outline">Kopi Gula Aren</span>
                    <i className="marquee-boba" />
                    <span className="marquee-item">Kejar Deadline</span>
                    <i className="marquee-cube" />
                    <span className="marquee-item is-outline">Takaran Manis</span>
                    <i className="marquee-boba" />
                  </div>
                ))}
              </div>
            </div>

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

                <h2 className="survey-title" id="surveyHeading">
                  {sidebarCopy.title}
                </h2>
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
                <BrewCupCompanion
                  progress={riseProgress}
                  isNudged={isNudged}
                  isSent={isSentFlare}
                  answeredCount={answeredCount}
                  totalCount={totalCount}
                />

                <div className="note">
                  {/* TAB 1: PROFILE & CONSENT */}
                  {activeTab === "profile" && (
                    <>
                      <div>
                        {stepKicker("profile", 1)}
                        <p className="note-phrase">
                          Saya mahasiswa aktif S1 Psikologi UGM dan bersedia ikut
                          secara sukarela.
                        </p>
                      </div>

                      <div className="q-list">
                        <div
                          className={`q-item ${missing.has("consent") ? "is-missing" : ""}`}
                          data-qid="consent"
                        >
                          <span className="q-num">
                            Persetujuan
                            {missing.has("consent") && <em className="q-missing">Belum dipilih</em>}
                          </span>
                          <div className="chips">
                            <button
                              type="button"
                              aria-pressed={state.hasConsented}
                              className={`chip chip-consent ${state.hasConsented ? "is-selected" : ""}`}
                              onClick={() =>
                                answer("consent", (prev) => ({
                                  ...prev,
                                  hasConsented: !prev.hasConsented,
                                  consentTimestamp: !prev.hasConsented
                                    ? new Date().toISOString()
                                    : null,
                                }))
                              }
                            >
                              <span className="chip-check" aria-hidden="true">
                                {state.hasConsented && <Check size={12} weight="bold" />}
                              </span>
                              <span>Ya, saya setuju &amp; bersedia berpartisipasi</span>
                            </button>
                          </div>
                        </div>

                        <ChoiceRow
                          qid="angkatan"
                          label="Angkatan"
                          text="Tahun masuk S1 Psikologi UGM"
                          options={toOptions(ANGKATAN)}
                          value={state.demographics.angkatan}
                          isMissing={missing.has("angkatan")}
                          onPick={(v) => answer("angkatan", setDemo({ angkatan: v }))}
                        />

                        <ChoiceRow
                          qid="semester"
                          label="Semester"
                          text="Semester yang sedang ditempuh"
                          options={toOptions(SEMESTERS)}
                          value={state.demographics.semester}
                          isMissing={missing.has("semester")}
                          onPick={(v) => answer("semester", setDemo({ semester: v }))}
                        />

                        <ChoiceRow
                          qid="gender"
                          label="Jenis kelamin"
                          options={toOptions(GENDERS)}
                          value={state.demographics.gender}
                          isMissing={missing.has("gender")}
                          onPick={(v) => answer("gender", setDemo({ gender: v }))}
                        />

                        <ChoiceRow
                          qid="location"
                          label="Tempat nugas utama (opsional)"
                          text="Lokasi paling sering saat mengerjakan tugas"
                          options={toOptions(LOCATIONS)}
                          value={state.demographics.studyLocation}
                          isMissing={false}
                          onPick={(v) =>
                            answer(
                              "location",
                              setDemo({ studyLocation: v, residence: "Yogyakarta" })
                            )
                          }
                        />
                      </div>

                      <div className="note-fields">
                        <div
                          className={`field ${missing.has("age") ? "is-missing" : ""}`}
                          data-qid="age"
                        >
                          <label htmlFor="fAge">
                            Usia (tahun)
                            {missing.has("age") && <em className="q-missing">Belum diisi</em>}
                          </label>
                          <input
                            id="fAge"
                            type="number"
                            inputMode="numeric"
                            min={16}
                            max={35}
                            placeholder="20"
                            aria-invalid={missing.has("age")}
                            value={state.demographics.age}
                            onChange={(e) => updateField({ age: e.target.value }, "age")}
                          />
                        </div>

                        <div className="field">
                          <label htmlFor="fInitials">Nama panggilan / inisial (opsional)</label>
                          <input
                            id="fInitials"
                            type="text"
                            autoComplete="nickname"
                            placeholder="Misal: N. Putri"
                            value={state.demographics.initials}
                            onChange={(e) => updateField({ initials: e.target.value })}
                          />
                        </div>

                        <div className="field field-wide">
                          <label htmlFor="fWallet">
                            Nomor GoPay / ShopeePay untuk undian (opsional)
                          </label>
                          <input
                            id="fWallet"
                            type="tel"
                            inputMode="tel"
                            autoComplete="tel"
                            placeholder="0812xxxxxxxx (boleh dikosongkan)"
                            value={state.demographics.ewalletNumber}
                            onChange={(e) => updateField({ ewalletNumber: e.target.value })}
                          />
                        </div>
                      </div>

                      {errorMsg && (
                        <p className="field-error" role="alert">
                          {errorMsg}
                        </p>
                      )}

                      <div className="note-send">
                        <span className="note-send-hint">
                          Gelas di atas terisi setiap kali kamu memilih jawaban.
                        </span>
                        <button
                          type="button"
                          className="note-btn"
                          onClick={() => checkStep("profile") && goToStep("workload")}
                        >
                          <i className="note-btn-cube" aria-hidden="true" />
                          <span>Lanjut ke tugas kuliah</span>
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
                          Beban tugas kuliah yang kamu rasakan selama sebulan terakhir.
                        </p>
                      </div>

                      <div className="q-group">
                        <p className="q-group-title">Perkiraan angka</p>
                        <div className="lab-stack">
                          {QUANTITATIVE_TASK_METRICS.map((m) => {
                            const val = state.quantitativeTasks[m.id] ?? m.defaultValue;
                            return (
                              <div className="lab-block" key={m.id}>
                                <div className="lab-row">
                                  <label className="lab-title" htmlFor={`range-${m.id}`}>
                                    {m.label}
                                  </label>
                                  <span className="lab-val">
                                    {val} <small>{m.unit}</small>
                                  </span>
                                </div>
                                <input
                                  id={`range-${m.id}`}
                                  type="range"
                                  className="lab-range"
                                  min={m.min}
                                  max={m.max}
                                  step={m.step}
                                  value={val}
                                  aria-valuetext={`${val} ${m.unit}`}
                                  onChange={(e) => {
                                    triggerCupNudge();
                                    setState((prev) => ({
                                      ...prev,
                                      quantitativeTasks: {
                                        ...prev.quantitativeTasks,
                                        [m.id]: Number(e.target.value),
                                      },
                                    }));
                                  }}
                                />
                                <div className="lab-scale" aria-hidden="true">
                                  <span>{m.min}</span>
                                  <span>{m.max}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="q-group">
                        <p className="q-group-title">
                          Seberapa sesuai pernyataan berikut dengan kondisimu?
                        </p>
                        <div className="q-list">
                          {VARIABLE_X_ITEMS.map((item, idx) => (
                            <ChoiceRow
                              key={item.id}
                              qid={item.id}
                              label={`Pernyataan ${idx + 1} dari ${VARIABLE_X_ITEMS.length}`}
                              text={item.text}
                              options={AGREEMENT}
                              value={state.variableXAnswers[item.id]}
                              isMissing={missing.has(item.id)}
                              variant="chips-likert-agreement"
                              onPick={(v) =>
                                answer(item.id, (prev) => ({
                                  ...prev,
                                  variableXAnswers: { ...prev.variableXAnswers, [item.id]: v },
                                }))
                              }
                            />
                          ))}
                        </div>
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
                          <span>Lanjut ke asupan manis</span>
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
                          Seberapa sering yang manis-manis menemani jam belajarmu?
                        </p>
                      </div>

                      <div className="q-group">
                        <p className="q-group-title">
                          Dalam sebulan terakhir, seberapa sering kamu mengonsumsi ini?
                        </p>
                        <div className="q-list">
                          {SWEET_CATEGORIES.map((cat, idx) => (
                            <ChoiceRow
                              key={cat.id}
                              qid={cat.id}
                              label={`Jenis ${idx + 1} dari ${SWEET_CATEGORIES.length}`}
                              text={cat.name}
                              hint={`${cat.examples}. Sekitar ${cat.sugarEstimate}.`}
                              options={FREQUENCY}
                              value={state.sweetCategoryFrequency[cat.id]}
                              isMissing={missing.has(cat.id)}
                              variant="chips-likert-frequency"
                              onPick={(v) =>
                                answer(cat.id, (prev) => ({
                                  ...prev,
                                  sweetCategoryFrequency: {
                                    ...prev.sweetCategoryFrequency,
                                    [cat.id]: v,
                                  },
                                }))
                              }
                            />
                          ))}
                        </div>
                      </div>

                      <div className="q-group">
                        <p className="q-group-title">
                          Seberapa sesuai pernyataan berikut dengan dirimu?
                        </p>
                        <div className="q-list">
                          {VARIABLE_Y_ITEMS.map((item, idx) => (
                            <ChoiceRow
                              key={item.id}
                              qid={item.id}
                              label={`Pernyataan ${idx + 1} dari ${VARIABLE_Y_ITEMS.length}`}
                              text={item.text}
                              options={AGREEMENT}
                              value={state.variableYAnswers[item.id]}
                              isMissing={missing.has(item.id)}
                              variant="chips-likert-agreement"
                              onPick={(v) =>
                                answer(item.id, (prev) => ({
                                  ...prev,
                                  variableYAnswers: { ...prev.variableYAnswers, [item.id]: v },
                                }))
                              }
                            />
                          ))}
                        </div>
                      </div>

                      <div className="field field-wide">
                        <label htmlFor="fNote">
                          Minuman atau camilan manis andalan saat nugas (opsional)
                        </label>
                        <input
                          id="fNote"
                          type="text"
                          placeholder="Misal: Es kopi susu gula aren less sugar waktu lembur"
                          value={state.openNote}
                          onChange={(e) =>
                            setState((prev) => ({ ...prev, openNote: e.target.value }))
                          }
                        />
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
                          Terima kasih, jawabanmu terkirim. Ini ringkasan beban tugas
                          dan takaran manismu.
                        </p>
                      </div>

                      <div className="detail-numbers">
                        <div>
                          <p className="number-value">
                            {receipt.summary.variableXPercentage}%
                          </p>
                          <p className="number-label">
                            Indeks beban tugas ({receipt.summary.variableXCategory})
                          </p>
                        </div>
                        <div>
                          <p className="number-value">
                            {receipt.summary.variableYPercentage}%
                          </p>
                          <p className="number-label">
                            Indeks asupan manis ({receipt.summary.variableYCategory})
                          </p>
                        </div>
                        <div>
                          <p className="number-value">
                            {state.quantitativeTasks.weekly_assignments_count ?? 5}
                          </p>
                          <p className="number-label">Rata-rata tugas per minggu</p>
                        </div>
                      </div>

                      <div className="receipt-box">
                        <div className="receipt-row">
                          <span>KODE PARTISIPAN</span>
                          <strong>{receipt.submissionId}</strong>
                        </div>
                        <div className="receipt-row">
                          <span>TEMPAT NUGAS FAVORIT</span>
                          <strong>{state.demographics.studyLocation || "Kampus / Kos"}</strong>
                        </div>
                        <div className="receipt-row">
                          <span>ASUPAN MANIS UTAMA</span>
                          <strong>{receipt.summary.topSweetCraving}</strong>
                        </div>
                        <div className="receipt-row">
                          <span>DURASI NUGAS HARIAN</span>
                          <strong>{state.quantitativeTasks.daily_study_hours ?? 4} Jam / Hari</strong>
                        </div>
                      </div>

                      <p className="about-text">
                        Saat beban kognitif meningkat akibat tenggat tugas, otak
                        membutuhkan asupan energi cepat dan pelepasan dopamin
                        singkat—itulah mengapa minuman dan camilan manis terasa
                        begitu menggoda di tengah lembur.
                      </p>

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

      <ResearcherAdminModal
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
      />
    </div>
  );
}

export default App;
