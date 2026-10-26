import React, { useEffect, useState } from "react";
import { GOOGLE_APPS_SCRIPT_TEMPLATE } from "../lib/submissionEngine";

interface ResearcherAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ResearcherAdminModal: React.FC<ResearcherAdminModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [webhookUrl, setWebhookUrl] = useState("");
  const [savedNotice, setSavedNotice] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [submissions, setSubmissions] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    const savedUrl = localStorage.getItem("ugm_psi_webhook_url") || "";
    setWebhookUrl(savedUrl);

    try {
      const raw = localStorage.getItem("ugm_psi_submissions_log");
      setSubmissions(raw ? JSON.parse(raw) : []);
    } catch {
      setSubmissions([]);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveWebhook = () => {
    localStorage.setItem("ugm_psi_webhook_url", webhookUrl.trim());
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2200);
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_TEMPLATE);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2200);
  };

  const handleExportCSV = () => {
    if (submissions.length === 0) return;
    const headers = Object.keys(submissions[0]);
    const csvRows = [
      headers.join(","),
      ...submissions.map((row) =>
        headers
          .map((h) => {
            const cell = String(row[h] ?? "").replace(/"/g, '""');
            return `"${cell}"`;
          })
          .join(",")
      ),
    ];
    const blob = new Blob([csvRows.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Data-Kuesioner-Psikologi-UGM-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClearLocalLog = () => {
    localStorage.removeItem("ugm_psi_submissions_log");
    setSubmissions([]);
  };

  return (
    <div className="sheet" role="dialog" aria-modal="true">
      <div className="sheet-scrim" onClick={onClose} />
      <article className="sheet-panel">
        <div className="sheet-bar">
          <button type="button" className="ghost-btn" onClick={onClose}>
            Tutup
          </button>
          <span style={{ fontWeight: 650, fontSize: "15px" }}>
            Panel Data &amp; Google Sheets
          </span>
          <div style={{ display: "flex", gap: "8px" }}>
            {submissions.length > 0 && (
              <button type="button" className="open-btn" onClick={handleExportCSV}>
                Unduh CSV ({submissions.length})
              </button>
            )}
          </div>
        </div>

        <div className="sheet-body">
          <div>
            <h2 className="survey-title" style={{ marginTop: 0 }}>
              Google Sheets
            </h2>
            <p className="survey-lede">
              Semua skor Favorable (1&rarr;4) dan Unfavorable (4&rarr;1) dihitung
              otomatis sebelum masuk ke spreadsheet.
            </p>
          </div>

          <div className="field field-wide">
            <label htmlFor="webhookInput">
              URL Web App Google Apps Script (opsional)
            </label>
            <input
              id="webhookInput"
              type="url"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://script.google.com/macros/s/AKfycb.../exec"
            />
            <div style={{ marginTop: "12px" }}>
              <button
                type="button"
                className="ghost-btn"
                onClick={handleSaveWebhook}
              >
                {savedNotice ? "Tersimpan!" : "Simpan URL"}
              </button>
            </div>
          </div>

          <div style={{ display: "grid", gap: "12px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: "14px", fontWeight: 650, color: "var(--ink-3)" }}>
                Kode Extensions &rarr; Apps Script (15 baris)
              </span>
              <button type="button" className="ghost-btn" onClick={handleCopyScript}>
                {copiedScript ? "Tersalin" : "Salin kode"}
              </button>
            </div>
            <pre className="code-pre">{GOOGLE_APPS_SCRIPT_TEMPLATE}</pre>
          </div>

          <div style={{ display: "grid", gap: "16px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: "14px", fontWeight: 650, color: "var(--ink-3)" }}>
                Data tersimpan di browser ini ({submissions.length} respon)
              </span>
              {submissions.length > 0 && (
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={handleClearLocalLog}
                >
                  Bersihkan log
                </button>
              )}
            </div>

            {submissions.length === 0 ? (
              <p className="about-text">
                Belum ada respon yang dikirim. Isi kuesioner lalu klik Kirim
                jawaban untuk melihat baris data siap olah di sini.
              </p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Inisial</th>
                      <th>Angkatan</th>
                      <th>Skor Tugas (X)</th>
                      <th>Skor Gula (Y)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.map((sub, i) => (
                      <tr key={i}>
                        <td>{String(sub.submissionId)}</td>
                        <td>{String(sub.initials)}</td>
                        <td>{String(sub.angkatan)}</td>
                        <td>
                          {String(sub.variableXTotalScore)} (
                          {String(sub.variableXCategory)})
                        </td>
                        <td>
                          {String(sub.variableYTotalScore)} (
                          {String(sub.variableYCategory)})
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </article>
    </div>
  );
};
