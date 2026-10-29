import { ALL_QUESTIONS } from "../data/questionnaireData";

export interface DemographicsData {
  initials: string;
  angkatan: string;
}

export interface QuestionnaireState {
  hasConsented: boolean;
  consentTimestamp: string | null;
  demographics: DemographicsData;
  // Option number per question id, 1..5
  answers: Record<string, number>;
}

export const INITIAL_QUESTIONNAIRE_STATE: QuestionnaireState = {
  hasConsented: false,
  consentTimestamp: null,
  demographics: {
    initials: "",
    angkatan: "",
  },
  answers: {},
};

export async function submitToGoogleSheets(
  state: QuestionnaireState,
  customWebhookUrl?: string
): Promise<{
  success: boolean;
  mode: "cloud" | "local_simulation";
  submissionId: string;
  timestamp: string;
}> {
  const timestamp = new Date().toISOString();
  const submissionId = `UGM-PSI-${Math.random()
    .toString(36)
    .substring(2, 8)
    .toUpperCase()}`;

  // Sheet columns: Q1..Q11 hold the option number (1 = first option)
  const answers: Record<string, number | string> = {};
  for (const q of ALL_QUESTIONS) {
    answers[q.id.toUpperCase()] = state.answers[q.id] ?? "";
  }

  const payload = {
    submissionId,
    timestamp,
    consentTimestamp: state.consentTimestamp ?? "",
    initials: state.demographics.initials.trim() || "Anonim",
    angkatan: state.demographics.angkatan,
    ...answers,
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
