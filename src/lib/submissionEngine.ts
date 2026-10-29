import {
  VARIABLE_X_ITEMS,
  VARIABLE_Y_ITEMS,
  SWEET_CATEGORIES,
  QUANTITATIVE_TASK_METRICS,
} from "../data/questionnaireData";

export interface DemographicsData {
  initials: string;
  angkatan: string;
  semester: string;
  age: string;
  gender: string;
  residence: string;
  isActiveStudent: boolean | null;
  studyLocation: string;
  ewalletType: string;
  ewalletNumber: string;
}

export interface QuestionnaireState {
  hasConsented: boolean;
  consentTimestamp: string | null;
  demographics: DemographicsData;
  quantitativeTasks: Record<string, number>;
  variableXAnswers: Record<string, number>;
  sweetCategoryFrequency: Record<string, number>;
  variableYAnswers: Record<string, number>;
  openNote: string;
}

export const INITIAL_QUESTIONNAIRE_STATE: QuestionnaireState = {
  hasConsented: false,
  consentTimestamp: null,
  demographics: {
    initials: "",
    angkatan: "",
    semester: "",
    age: "",
    gender: "",
    residence: "",
    isActiveStudent: null,
    studyLocation: "",
    ewalletType: "GoPay",
    ewalletNumber: "",
  },
  quantitativeTasks: {},
  variableXAnswers: {},
  sweetCategoryFrequency: {},
  variableYAnswers: {},
  openNote: "",
};

export interface ComputedSummary {
  variableXTotalScore: number;
  variableXMaxPossible: number;
  variableXPercentage: number | null;
  variableXCategory: "Ringan" | "Moderat" | "Tinggi" | "Belum cukup data";
  variableYTotalScore: number;
  variableYMaxPossible: number;
  variableYPercentage: number | null;
  variableYCategory: "Terkendali" | "Moderat" | "Tinggi (Sweet-Seeker)" | "Belum cukup data";
  recodedVariableX: Record<string, number>;
  recodedVariableY: Record<string, number>;
  topSweetCraving: string;
}

export function computeQuestionnaireSummary(
  state: QuestionnaireState
): ComputedSummary {
  const recodedVariableX: Record<string, number> = {};
  let variableXTotalScore = 0;
  let answeredXCount = 0;

  for (const item of VARIABLE_X_ITEMS) {
    const raw = state.variableXAnswers[item.id];
    if (raw == null) continue;
    // The workload item uses a 5-point agreement scale.
    const recoded = item.isFavorable ? raw : 6 - raw;
    recodedVariableX[item.code] = recoded;
    variableXTotalScore += recoded;
    answeredXCount += 1;
  }

  const variableXMaxPossible = answeredXCount * 5;
  const variableXPercentage =
    answeredXCount > 0
      ? Math.round((variableXTotalScore / variableXMaxPossible) * 100)
      : null;

  const variableXCategory: ComputedSummary["variableXCategory"] =
    variableXPercentage == null
      ? "Belum cukup data"
      : variableXPercentage < 48
      ? "Ringan"
      : variableXPercentage < 75
      ? "Moderat"
      : "Tinggi";

  const recodedVariableY: Record<string, number> = {};
  let variableYTotalScore = 0;
  let answeredYCount = 0;

  for (const item of VARIABLE_Y_ITEMS) {
    const raw = state.variableYAnswers[item.id];
    if (raw == null) continue;
    const recoded = item.isFavorable ? raw : 5 - raw;
    recodedVariableY[item.code] = recoded;
    variableYTotalScore += recoded;
    answeredYCount += 1;
  }

  const variableYMaxPossible = answeredYCount * 4;
  const variableYPercentage =
    answeredYCount > 0
      ? Math.round((variableYTotalScore / variableYMaxPossible) * 100)
      : null;

  const variableYCategory: ComputedSummary["variableYCategory"] =
    variableYPercentage == null
      ? "Belum cukup data"
      : variableYPercentage < 48
      ? "Terkendali"
      : variableYPercentage < 75
      ? "Moderat"
      : "Tinggi (Sweet-Seeker)";

  let highestFreq = -1;
  let topSweetCraving = "Belum cukup data";

  for (const cat of SWEET_CATEGORIES) {
    const freq = state.sweetCategoryFrequency[cat.id];
    if (freq == null) continue;
    if (freq > highestFreq) {
      highestFreq = freq;
      topSweetCraving = cat.name;
    }
  }

  return {
    variableXTotalScore,
    variableXMaxPossible,
    variableXPercentage,
    variableXCategory,
    variableYTotalScore,
    variableYMaxPossible,
    variableYPercentage,
    variableYCategory,
    recodedVariableX,
    recodedVariableY,
    topSweetCraving,
  };
}

export async function submitToGoogleSheets(
  state: QuestionnaireState,
  customWebhookUrl?: string
): Promise<{
  success: boolean;
  mode: "cloud" | "local_simulation";
  submissionId: string;
  timestamp: string;
  summary: ComputedSummary;
}> {
  const summary = computeQuestionnaireSummary(state);
  const timestamp = new Date().toISOString();
  const submissionId = `UGM-PSI-${Math.random()
    .toString(36)
    .substring(2, 8)
    .toUpperCase()}`;

  const payload = {
    submissionId,
    timestamp,
    initials: state.demographics.initials || "Anonim",
    angkatan: state.demographics.angkatan,
    semester: state.demographics.semester,
    age: state.demographics.age,
    gender: state.demographics.gender,
    residence: state.demographics.residence,
    studyLocation: state.demographics.studyLocation,
    isActiveStudent:
      state.demographics.isActiveStudent == null
        ? ""
        : state.demographics.isActiveStudent
          ? "Ya"
          : "Tidak",
    ewalletReward: state.demographics.ewalletNumber
      ? `${state.demographics.ewalletType}: ${state.demographics.ewalletNumber}`
      : "Tidak Mengisi",
    weeklyAssignmentsCount:
      state.quantitativeTasks[QUANTITATIVE_TASK_METRICS[0].id] ?? "",
    dailyStudyHours:
      state.quantitativeTasks[QUANTITATIVE_TASK_METRICS[1].id] ?? "",
    variableXTotalScore: summary.variableXTotalScore,
    variableXCategory: summary.variableXCategory,
    ...summary.recodedVariableX,
    ...state.sweetCategoryFrequency,
    variableYTotalScore: summary.variableYTotalScore,
    variableYCategory: summary.variableYCategory,
    ...summary.recodedVariableY,
    openNote: state.openNote || "-",
  };

  // Save in local submission log for researcher inspection
  try {
    const existingRaw = localStorage.getItem("ugm_psi_submissions_log");
    const existing = existingRaw ? JSON.parse(existingRaw) : [];
    existing.unshift(payload);
    localStorage.setItem(
      "ugm_psi_submissions_log",
      JSON.stringify(existing.slice(0, 50))
    );
  } catch {
    // Ignore storage errors
  }

  const webhookUrl =
    customWebhookUrl ||
    localStorage.getItem("ugm_psi_webhook_url") ||
    import.meta.env.VITE_GOOGLE_SCRIPT_URL ||
    "";

  if (webhookUrl && webhookUrl.startsWith("https://")) {
    try {
      await fetch(webhookUrl, {
        method: "POST",
        mode: "no-cors",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      return {
        success: true,
        mode: "cloud",
        submissionId,
        timestamp,
        summary,
      };
    } catch {
      // Fallback gracefully if network fails
    }
  }

  // Simulate realistic network latency for tactile skeletal feedback
  await new Promise((resolve) => setTimeout(resolve, 1100));

  return {
    success: true,
    mode: "local_simulation",
    submissionId,
    timestamp,
    summary,
  };
}

export const GOOGLE_APPS_SCRIPT_TEMPLATE = `// Tempel kode ini pada Google Sheets: Extensions -> Apps Script
// Ganti token di bawah dengan GAS_ADMIN_TOKEN dari .env.local
var ADMIN_TOKEN = "GANTI_DENGAN_TOKEN_RAHASIA";

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    var data = JSON.parse(e.postData.contents);

    if (data.action) return handleAdmin(sheet, data);

    var headers = sheet.getLastRow() === 0
      ? []
      : sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

    // Soal baru -> kolom baru ditambahkan di ujung header
    var missing = Object.keys(data).filter(function(key) {
      return headers.indexOf(key) === -1;
    });
    if (missing.length > 0) {
      sheet.getRange(1, headers.length + 1, 1, missing.length).setValues([missing]);
      headers = headers.concat(missing);
    }

    sheet.appendRow(headers.map(function(header) {
      return data[header] !== undefined ? data[header] : "";
    }));
    return reply({ status: "success" });
  } finally {
    lock.releaseLock();
  }
}

function handleAdmin(sheet, data) {
  if (ADMIN_TOKEN === "GANTI_DENGAN_TOKEN_RAHASIA" || data.token !== ADMIN_TOKEN) {
    return reply({ status: "forbidden" });
  }
  if (data.action === "reset") {
    sheet.clearContents();
    return reply({ status: "reset" });
  }
  if (data.action === "deleteTest") {
    var values = sheet.getDataRange().getValues();
    var col = values[0].indexOf("initials");
    var removed = 0;
    for (var i = values.length - 1; i >= 1; i--) {
      if (col !== -1 && values[i][col] === "TEST") {
        sheet.deleteRow(i + 1);
        removed++;
      }
    }
    return reply({ status: "deleted", removed: removed });
  }
  return reply({ status: "unknown_action" });
}

function reply(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}`;
