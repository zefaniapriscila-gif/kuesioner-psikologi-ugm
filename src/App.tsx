import React, { useEffect, useMemo, useRef, useState } from "react";
import { SweetBrewHero } from "./components/SweetBrewHero";
import { BrewCupCompanion } from "./components/BrewCupCompanion";
import { ResearcherAdminModal } from "./components/ResearcherAdminModal";
import { soundEngine } from "./lib/soundEngine";
import {
  SpeakerHigh,
  SpeakerSlash,
  ArrowRight,
  ArrowsClockwise,
  Moon,
  Sun,
  Table,
} from "@phosphor-icons/react";
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

const STORAGE_KEY = "ugm_psi_questionnaire_draft_v2";

export function App() {
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

  const [activeTab, setActiveTab] = useState<SurveyTab>("profile");
  const [isNightMode, setIsNightMode] = useState<boolean>(false);
  const [replayCount, setReplayCount] = useState<number>(0);
  const [isIntroPlaying, setIsIntroPlaying] = useState<boolean>(true);
  const [isTucked, setIsTucked] = useState<boolean>(false);
  const [isNudged, setIsNudged] = useState<boolean>(false);
  const [isSentFlare, setIsSentFlare] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [isAdminOpen, setIsAdminOpen] = useState<boolean>(false);
  const [isAudioUnlocked, setIsAudioUnlocked] = useState<boolean>(() => soundEngine.isUnlocked());
  const [receipt, setReceipt] = useState<{
    submissionId: string;
    timestamp: string;
    summary: ComputedSummary;
  } | null>(null);

  const surveyRef = useRef<HTMLElement>(null);

  useEffect(() => {
    return soundEngine.onUnlockChange((unlocked) => {
      setIsAudioUnlocked(unlocked);
    });
  }, []);

  // Auto-save draft to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore
    }
  }, [state]);

  // Tuck masthead on scroll down, show on scroll up
  useEffect(() => {
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      const dy = y - lastY;
      lastY = y;
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

  // Calculate overall progress (0..1) to fill the Sweet Brew Cup above the sheet
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

  const updateDemo = (patch: Partial<DemographicsData>) => {
    setErrorMsg("");
    triggerCupNudge();
    setState((prev) => ({
      ...prev,
      demographics: { ...prev.demographics, ...patch },
    }));
  };

  const scrollToSurvey = () => {
    surveyRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleQuickFill = () => {
    triggerCupNudge();
    setErrorMsg("");
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

  const handleNextFromProfile = () => {
    if (!state.hasConsented) {
      setErrorMsg("Pilih persetujuan partisipasi terlebih dahulu.");
      return;
    }
    if (
      !state.demographics.angkatan ||
      !state.demographics.semester ||
      !state.demographics.age ||
      !state.demographics.gender
    ) {
      setErrorMsg("Lengkapi angkatan, semester, usia, dan jenis kelamin.");
      return;
    }
    setErrorMsg("");
    setActiveTab("workload");
    scrollToSurvey();
  };

  const handleNextFromWorkload = () => {
    if (Object.keys(state.variableXAnswers).length < VARIABLE_X_ITEMS.length) {
      setErrorMsg(
        `Masih ada ${
          VARIABLE_X_ITEMS.length - Object.keys(state.variableXAnswers).length
        } pernyataan tugas yang belum dipilih.`
      );
      return;
    }
    setErrorMsg("");
    setActiveTab("sugar");
    scrollToSurvey();
  };

  const handleSubmitAll = async () => {
    if (
      Object.keys(state.sweetCategoryFrequency).length < SWEET_CATEGORIES.length ||
      Object.keys(state.variableYAnswers).length < VARIABLE_Y_ITEMS.length
    ) {
      setErrorMsg("Lengkapi seluruh pilihan frekuensi dan pernyataan gula terlebih dahulu.");
      return;
    }
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
      scrollToSurvey();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    localStorage.removeItem(STORAGE_KEY);
    setState(INITIAL_QUESTIONNAIRE_STATE);
    setReceipt(null);
    setIsSentFlare(false);
    setActiveTab("profile");
    scrollToSurvey();
  };

  const sidebarCopy = {
    profile: {
      title: "Mulai dari meja belajarmu.",
      lede: "Empat data singkat sebelum kita menakar beban tugas dan asupan manismu.",
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

  return (
    <div id="top">
      {/* Floating Pill Masthead */}
      <header
        className={`masthead ${isTucked ? "is-tucked" : ""} ${
          isIntroPlaying ? "is-hidden-intro" : ""
        }`}
      >
        <button
          type="button"
          className="masthead-pill masthead-name"
          onClick={async () => {
            soundEngine.unmute();
            await soundEngine.unlock();
            setReplayCount((c) => c + 1);
          }}
          title="Tuang ulang animasi gelas & gula batu"
        >
          <span>
            Psikologi UGM<span className="masthead-surname"> &middot; Tugas &amp; Gula</span>
          </span>
        </button>

        <nav className="masthead-pill masthead-nav" aria-label="Navigasi">
          <button
            type="button"
            className="masthead-sound-pill"
            onClick={async () => {
              if (!isAudioUnlocked) {
                soundEngine.unmute();
                const ok = await soundEngine.unlock();
                setIsAudioUnlocked(ok);
              } else {
                const muted = soundEngine.toggleMute();
                setIsAudioUnlocked(!muted);
              }
            }}
            title={isAudioUnlocked ? "Bisukan suara" : "Nyalakan suara"}
            aria-label={isAudioUnlocked ? "Bisukan suara" : "Nyalakan suara"}
          >
            {isAudioUnlocked ? (
              <SpeakerHigh size={15} weight="bold" />
            ) : (
              <SpeakerSlash size={15} weight="bold" />
            )}
          </button>
          <a href="#pengantar" className="nav-link-pengantar">Pengantar</a>
          <a href="#kuesioner" className="nav-link-kuesioner">Kuesioner</a>
          <button
            type="button"
            className="nav-btn-sheets"
            onClick={() => setIsAdminOpen(true)}
            title="Buka panel Data Sheets"
          >
            <span className="nav-sheets-full">Data Sheets</span>
            <span className="nav-sheets-short">Data</span>
          </button>
          <a className="nav-cta" href="#kuesioner">
            <i className="open-dot" aria-hidden="true" />
            <span className="nav-cta-full">Gelasku {Math.round(riseProgress * 100)}%</span>
            <span className="nav-cta-short">{Math.round(riseProgress * 100)}%</span>
          </a>
        </nav>
      </header>

      <main>
        {/* Interactive Liquid Sugar, Ice Cubes & Study Workload Hero */}
        <SweetBrewHero
          onStartClick={scrollToSurvey}
          replayTrigger={replayCount}
          onIntroStateChange={setIsIntroPlaying}
          isNightMode={isNightMode}
          onToggleNightMode={() => setIsNightMode((n) => !n)}
          onReplayIntro={() => setReplayCount((c) => c + 1)}
        />

        {/* Minimal Editorial About Section */}
        <section
          className="section-wrap about-section"
          id="pengantar"
          aria-labelledby="aboutTitle"
        >
          <h2 className="section-title" id="aboutTitle">
            Tentang Riset
          </h2>

          <div className="about-body">
            <p className="about-lead">
              Tumpukan tugas di layar laptop, dan segelas manis dingin di
              sebelah catatanmu.
            </p>
            <p className="about-text">
              Penelitian Tugas Metode Penelitian Kuantitatif ini mengkaji hubungan antara{" "}
              <strong>Jumlah Tugas Akademik</strong> dan{" "}
              <strong>Kecenderungan Perilaku Konsumsi Tinggi Gula</strong> pada
              mahasiswa S1 Fakultas Psikologi Universitas Gadjah Mada. Tidak ada
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
              <dd>Undian Rp 500.000 (GoPay / ShopeePay) untuk 10 responden</dd>
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

        {/* The Questionnaire Scene: Glass Cup fills up with caramel & ice as you answer */}
        <section
          className="section-wrap survey-body"
          id="kuesioner"
          ref={surveyRef}
          aria-labelledby="surveyHeading"
        >
          {/* Left Sticky Column */}
          <div className="survey-sidebar">
            <p className="open-pill">
              <i className="open-dot" aria-hidden="true" />
              <span>Tersimpan otomatis di browser</span>
            </p>

            <h2 className="survey-title" id="surveyHeading">
              {sidebarCopy.title}
            </h2>
            <p className="survey-lede">{sidebarCopy.lede}</p>

            <div className="survey-steps" role="tablist" aria-label="Tahapan kuesioner">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "profile"}
                className={`step-tab ${activeTab === "profile" ? "is-active" : ""}`}
                onClick={() => setActiveTab("profile")}
              >
                <span className="step-tab-name">1. Profil &amp; Persetujuan</span>
                <span className="step-tab-count">
                  {state.hasConsented && state.demographics.angkatan ? "Selesai" : "4 isian"}
                </span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "workload"}
                className={`step-tab ${activeTab === "workload" ? "is-active" : ""}`}
                onClick={() => setActiveTab("workload")}
              >
                <span className="step-tab-name">2. Tugas Kuliah</span>
                <span className="step-tab-count">
                  {Object.keys(state.variableXAnswers).length} / {VARIABLE_X_ITEMS.length}
                </span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "sugar"}
                className={`step-tab ${activeTab === "sugar" ? "is-active" : ""}`}
                onClick={() => setActiveTab("sugar")}
              >
                <span className="step-tab-name">3. Asupan Manis</span>
                <span className="step-tab-count">
                  {Object.keys(state.variableYAnswers).length} / {VARIABLE_Y_ITEMS.length}
                </span>
              </button>
            </div>

            <div style={{ marginTop: "24px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <button type="button" className="ghost-btn" onClick={handleQuickFill}>
                Isi contoh cepat
              </button>
              <button
                type="button"
                className="ghost-btn"
                onClick={() => {
                  window.scrollTo({ top: 0, behavior: "smooth" });
                  setTimeout(() => setReplayCount((c) => c + 1), 350);
                }}
              >
                Tuang ulang gelas
              </button>
            </div>
          </div>

          {/* Right Questionnaire Sheet with Interactive Sweet Brew Cup Companion */}
          <div
            className="note-scene"
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
                    <div className="note-kicker">
                      <span>Bagian 1 dari 3</span>
                      <span>Informed Consent &amp; Profil</span>
                    </div>
                    <p className="note-phrase">
                      Saya mahasiswa aktif S1 Psikologi UGM dan bersedia ikut
                      secara sukarela.
                    </p>
                  </div>

                  <div className="q-list">
                    <div className="q-item">
                      <span className="q-num">Persetujuan</span>
                      <div className="chips">
                        <button
                          type="button"
                          className={`chip ${state.hasConsented ? "is-selected" : ""}`}
                          onClick={() => {
                            triggerCupNudge();
                            setErrorMsg("");
                            setState((prev) => ({
                              ...prev,
                              hasConsented: !prev.hasConsented,
                              consentTimestamp: !prev.hasConsented
                                ? new Date().toISOString()
                                : null,
                            }));
                          }}
                        >
                          Ya, saya setuju &amp; bersedia berpartisipasi
                        </button>
                      </div>
                    </div>

                    <div className="q-item">
                      <span className="q-num">Angkatan</span>
                      <p className="q-text">Tahun masuk S1 Psikologi UGM</p>
                      <div className="chips">
                        {["2021", "2022", "2023", "2024", "2025"].map((yr) => (
                          <button
                            key={yr}
                            type="button"
                            className={`chip ${
                              state.demographics.angkatan === yr ? "is-selected" : ""
                            }`}
                            onClick={() => updateDemo({ angkatan: yr })}
                          >
                            {yr}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="q-item">
                      <span className="q-num">Semester</span>
                      <p className="q-text">Semester yang sedang ditempuh</p>
                      <div className="chips">
                        {["Semester 2", "Semester 4", "Semester 6", "Semester 8+"].map(
                          (sem) => (
                            <button
                              key={sem}
                              type="button"
                              className={`chip ${
                                state.demographics.semester === sem ? "is-selected" : ""
                              }`}
                              onClick={() => updateDemo({ semester: sem })}
                            >
                              {sem}
                            </button>
                          )
                        )}
                      </div>
                    </div>

                    <div className="q-item">
                      <span className="q-num">Jenis kelamin</span>
                      <div className="chips">
                        {["Perempuan", "Laki-laki"].map((g) => (
                          <button
                            key={g}
                            type="button"
                            className={`chip ${
                              state.demographics.gender === g ? "is-selected" : ""
                            }`}
                            onClick={() => updateDemo({ gender: g })}
                          >
                            {g}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="q-item">
                      <span className="q-num">Tempat nugas utama</span>
                      <p className="q-text">Lokasi paling sering saat mengerjakan tugas</p>
                      <div className="chips">
                        {[
                          "Kamar kos / rumah",
                          "Perpustakaan kampus",
                          "Kafe / coffee shop",
                        ].map((loc) => (
                          <button
                            key={loc}
                            type="button"
                            className={`chip ${
                              state.demographics.studyLocation === loc
                                ? "is-selected"
                                : ""
                            }`}
                            onClick={() =>
                              updateDemo({
                                studyLocation: loc,
                                residence: "Yogyakarta",
                              })
                            }
                          >
                            {loc}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="note-fields">
                    <div className="field">
                      <label htmlFor="fInitials">Nama panggilan / inisial (opsional)</label>
                      <input
                        id="fInitials"
                        type="text"
                        placeholder="Misal: N. Putri"
                        value={state.demographics.initials}
                        onChange={(e) => updateDemo({ initials: e.target.value })}
                      />
                    </div>

                    <div className="field">
                      <label htmlFor="fAge">Usia (tahun)</label>
                      <input
                        id="fAge"
                        type="number"
                        min={16}
                        max={35}
                        placeholder="20"
                        value={state.demographics.age}
                        onChange={(e) => updateDemo({ age: e.target.value })}
                      />
                    </div>

                    <div className="field field-wide">
                      <label htmlFor="fWallet">
                        Nomor GoPay / ShopeePay untuk undian Rp 500.000 (opsional)
                      </label>
                      <input
                        id="fWallet"
                        type="tel"
                        placeholder="0812xxxxxxxx (boleh dikosongkan)"
                        value={state.demographics.ewalletNumber}
                        onChange={(e) => updateDemo({ ewalletNumber: e.target.value })}
                      />
                    </div>
                  </div>

                  {errorMsg && <p className="field-error">{errorMsg}</p>}

                  <div className="note-send">
                    <span style={{ fontSize: "14px", color: "var(--ink-3)" }}>
                      Gelas di atas terisi setiap kali kamu memilih jawaban.
                    </span>
                    <button
                      type="button"
                      className="note-btn"
                      onClick={handleNextFromProfile}
                    >
                      <i className="note-btn-cube" aria-hidden="true" />
                      <span>Lanjut ke Tugas Kuliah</span>
                    </button>
                  </div>
                </>
              )}

              {/* TAB 2: ACADEMIC WORKLOAD (VARIABLE X) */}
              {activeTab === "workload" && (
                <>
                  <div>
                    <div className="note-kicker">
                      <span>Bagian 2 dari 3</span>
                      <span>Variabel X &middot; Tugas Akademik</span>
                    </div>
                    <p className="note-phrase">
                      Beban tugas kuliah yang kamu rasakan selama sebulan terakhir.
                    </p>
                  </div>

                  {/* 3 Clean Sliders */}
                  <div style={{ display: "grid", gap: "14px" }}>
                    {QUANTITATIVE_TASK_METRICS.map((m) => {
                      const val = state.quantitativeTasks[m.id] ?? m.defaultValue;
                      return (
                        <div className="lab-block" key={m.id}>
                          <div className="lab-row">
                            <span className="lab-title">{m.label}</span>
                            <span className="lab-val">
                              {val} {m.unit}
                            </span>
                          </div>
                          <input
                            type="range"
                            className="lab-range"
                            min={m.min}
                            max={m.max}
                            step={m.step}
                            value={val}
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
                        </div>
                      );
                    })}
                  </div>

                  {/* 8 Statement Rows */}
                  <div className="q-list">
                    {VARIABLE_X_ITEMS.map((item, idx) => {
                      const picked = state.variableXAnswers[item.id];
                      return (
                        <div className="q-item" key={item.id}>
                          <span className="q-num">
                            Pernyataan 0{idx + 1} &middot; {item.dimension}
                          </span>
                          <p className="q-text">{item.text}</p>
                          <div className="chips chips-likert-agreement">
                            {LIKERT_AGREEMENT_OPTIONS.map((opt) => (
                              <button
                                key={opt.value}
                                type="button"
                                className={`chip ${
                                  picked === opt.value ? "is-selected" : ""
                                }`}
                                onClick={() => {
                                  triggerCupNudge();
                                  setErrorMsg("");
                                  setState((prev) => ({
                                    ...prev,
                                    variableXAnswers: {
                                      ...prev.variableXAnswers,
                                      [item.id]: opt.value,
                                    },
                                  }));
                                }}
                              >
                                {opt.fullLabel}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {errorMsg && <p className="field-error">{errorMsg}</p>}

                  <div className="note-send">
                    <button
                      type="button"
                      className="ghost-btn"
                      onClick={() => {
                        setActiveTab("profile");
                        scrollToSurvey();
                      }}
                    >
                      Kembali
                    </button>
                    <button
                      type="button"
                      className="note-btn"
                      onClick={handleNextFromWorkload}
                    >
                      <i className="note-btn-cube" aria-hidden="true" />
                      <span>Lanjut ke Asupan Manis</span>
                    </button>
                  </div>
                </>
              )}

              {/* TAB 3: SUGAR CONSUMPTION (VARIABLE Y) */}
              {activeTab === "sugar" && (
                <>
                  <div>
                    <div className="note-kicker">
                      <span>Bagian 3 dari 3</span>
                      <span>Variabel Y &middot; Konsumsi Gula</span>
                    </div>
                    <p className="note-phrase">
                      Seberapa sering yang manis-manis menemani jam belajarmu?
                    </p>
                  </div>

                  {/* 5 Sweet Categories */}
                  <div className="q-list">
                    {SWEET_CATEGORIES.map((cat) => {
                      const picked = state.sweetCategoryFrequency[cat.id];
                      return (
                        <div className="q-item" key={cat.id}>
                          <span className="q-num">
                            Frekuensi &middot; {cat.sugarEstimate}
                          </span>
                          <p className="q-text">{cat.name}</p>
                          <div className="chips chips-likert-frequency">
                            {LIKERT_FREQUENCY_OPTIONS.map((opt) => (
                              <button
                                key={opt.value}
                                type="button"
                                className={`chip ${
                                  picked === opt.value ? "is-selected" : ""
                                }`}
                                onClick={() => {
                                  triggerCupNudge();
                                  setErrorMsg("");
                                  setState((prev) => ({
                                    ...prev,
                                    sweetCategoryFrequency: {
                                      ...prev.sweetCategoryFrequency,
                                      [cat.id]: opt.value,
                                    },
                                  }));
                                }}
                              >
                                {opt.fullLabel}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}

                    {/* 8 Sugar Behavior Statements */}
                    {VARIABLE_Y_ITEMS.map((item, idx) => {
                      const picked = state.variableYAnswers[item.id];
                      return (
                        <div className="q-item" key={item.id}>
                          <span className="q-num">
                            Pernyataan 0{idx + 1} &middot; {item.dimension}
                          </span>
                          <p className="q-text">{item.text}</p>
                          <div className="chips chips-likert-agreement">
                            {LIKERT_AGREEMENT_OPTIONS.map((opt) => (
                              <button
                                key={opt.value}
                                type="button"
                                className={`chip ${
                                  picked === opt.value ? "is-selected" : ""
                                }`}
                                onClick={() => {
                                  triggerCupNudge();
                                  setErrorMsg("");
                                  setState((prev) => ({
                                    ...prev,
                                    variableYAnswers: {
                                      ...prev.variableYAnswers,
                                      [item.id]: opt.value,
                                    },
                                  }));
                                }}
                              >
                                {opt.fullLabel}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="field field-wide">
                    <label htmlFor="fNote">
                      Minuman atau camilan manis andalan saat nugas (opsional)
                    </label>
                    <input
                      id="fNote"
                      type="text"
                      placeholder="Misal: Es kopi susu gula aren Less Sugar waktu lembur"
                      value={state.openNote}
                      onChange={(e) =>
                        setState((prev) => ({ ...prev, openNote: e.target.value }))
                      }
                    />
                  </div>

                  {errorMsg && <p className="field-error">{errorMsg}</p>}

                  <div className="note-send">
                    <button
                      type="button"
                      className="ghost-btn"
                      onClick={() => {
                        setActiveTab("workload");
                        scrollToSurvey();
                      }}
                    >
                      Kembali
                    </button>
                    <button
                      type="button"
                      className="note-btn"
                      disabled={isSubmitting}
                      onClick={handleSubmitAll}
                    >
                      <i className="note-btn-cube" aria-hidden="true" />
                      <span>
                        {isSubmitting ? "Menyimpan takaran..." : "Selesai & Kirim Jawaban"}
                      </span>
                    </button>
                  </div>
                </>
              )}

              {/* TAB 4: DONE / STUDY CAFE RECEIPT */}
              {activeTab === "done" && receipt && (
                <>
                  <div>
                    <div className="note-kicker">
                      <span>STRUK TAKARAN &middot; {receipt.submissionId}</span>
                      <span>PSIKOLOGI UGM</span>
                    </div>
                    <p className="note-phrase">
                      Gelasmu sudah penuh. Ini ringkasan beban tugas dan
                      takaran manismu.
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
                    <button
                      type="button"
                      className="ghost-btn"
                      onClick={() => setIsAdminOpen(true)}
                    >
                      Lihat tabel data (SPSS / CSV)
                    </button>
                    <button type="button" className="note-btn" onClick={handleReset}>
                      <i className="note-btn-cube" aria-hidden="true" />
                      <span>Isi untuk responden baru</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <p>Kuesioner Tugas Metode Penelitian Kuantitatif &middot; S1 Psikologi UGM, 2026 &middot; Takaran Tugas &amp; Gula</p>
        <p>Setiap jawaban melarutkan gula batu ke dalam gelas takar riset.</p>
      </footer>

      <ResearcherAdminModal
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
      />
    </div>
  );
}

export default App;
