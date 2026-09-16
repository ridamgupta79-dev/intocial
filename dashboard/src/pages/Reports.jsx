import { useEffect, useRef, useState } from "react";
import {
  getIncidentReport,
  getIncidents,
} from "../services/api";
import "./Reports.css";

function Icon({ name }) {
  return (
    <span className="material-symbols-outlined">
      {name}
    </span>
  );
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatNumber(value) {
  if (value === null || value === undefined) return "—";
  return Number(value).toLocaleString();
}

function riskClass(level) {
  const value = String(level || "unknown").toLowerCase();

  if (value.includes("critical")) return "critical";
  if (value.includes("high")) return "high";
  if (value.includes("medium")) return "medium";
  if (value.includes("low")) return "low";

  return "unknown";
}

export default function Reports() {
  const [incidentId, setIncidentId] = useState("");
  const [report, setReport] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    async function loadIncidents() {
      try {
        const data = await getIncidents();

        const items = Array.isArray(data)
          ? data
          : data?.incidents || data?.items || [];

        setIncidents(items.slice(0, 4));
      } catch (err) {
        console.error("Failed to load recent incidents:", err);
      }
    }

    loadIncidents();
  }, []);

  async function handleGenerate() {
    setError("");
    setReport(null);

    const id = Number(incidentId);

    if (!Number.isInteger(id) || id <= 0) {
      setError("Enter a valid incident ID.");
      return;
    }

    try {
      setLoading(true);

      const data = await getIncidentReport(id);

      setReport(data);
    } catch (err) {
      console.error("Report generation failed:", err);

      setError(
        err.response?.data?.detail ||
          "Failed to generate intelligence report."
      );
    } finally {
      setLoading(false);
    }
  }

  function selectIncident(id) {
    setIncidentId(String(id));
    setError("");
    inputRef.current?.focus();
  }

  function resetInput() {
    setIncidentId("");
    setReport(null);
    setError("");
    inputRef.current?.focus();
  }

  function handlePrint() {
    window.print();
  }

  const incident = report?.incident || {};
  const risk = report?.risk_assessment || {};
  const overview = report?.overview || {};
  const explainability = report?.explainability || {};

  const findings = Array.isArray(report?.findings)
    ? report.findings
    : [];

  const timeline = Array.isArray(report?.timeline)
    ? report.timeline
    : [];

  const signals = Array.isArray(report?.signals)
    ? report.signals
    : [];

  const riskLevel = String(
    risk.level || "Unknown"
  ).toUpperCase();

  return (
    <div className="reports-page">
      <header className="reports-header">
        <div>
          <div className="reports-eyebrow-row">
            <span className="reports-eyebrow">
              REPORTING & INTELLIGENCE
            </span>

            <span className="reports-pipeline">
              • SYNTHESIS PIPELINE
            </span>
          </div>

          <h1>Intelligence Reports</h1>

          <p>
            Generate structured, multi-source intelligence
            reports from detected incidents and coordinated
            social signal anomalies.
          </p>
        </div>

        <div className="reports-header-actions">
          <button
            type="button"
            className="secondary-action"
            onClick={() => inputRef.current?.focus()}
          >
            <Icon name="inventory_2" />
            Report Archive
          </button>

          <button
            type="button"
            className="primary-action"
            onClick={() => inputRef.current?.focus()}
          >
            <Icon name="auto_awesome" />
            Generate Report
          </button>
        </div>
      </header>

      <section className="report-metrics">
        <div className="metric-card">
          <div className="metric-label">
            REPORT STATUS
            <Icon name="description" />
          </div>

          <div className="metric-value">
            {report ? "READY" : "STANDBY"}
          </div>

          <div className="metric-sub">
            {report
              ? "Generated intelligence dossier"
              : "Awaiting incident selection"}
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-label">
            TARGET INCIDENT
            <Icon name="target" />
          </div>

          <div className="metric-value mono">
            {incident.incident_key || "—"}
          </div>

          <div className="metric-sub">
            {incident.title || "No incident selected"}
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-label">
            SUPPORTING SIGNALS
            <Icon name="hub" />
          </div>

          <div className="metric-value">
            {report
              ? formatNumber(incident.signal_count)
              : "—"}
          </div>

          <div className="metric-sub">
            Correlated evidence records
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-label">
            THREAT LEVEL
            <Icon name="priority_high" />
          </div>

          <div
            className={`metric-value risk-text ${riskClass(
              risk.level
            )}`}
          >
            {report ? riskLevel : "—"}
          </div>

          <div className="metric-sub">
            Current incident assessment
          </div>
        </div>
      </section>

      <section className="report-generator panel">
        <div className="generator-header">
          <div className="generator-title-wrap">
            <div className="generator-icon">
              <Icon name="fact_check" />
            </div>

            <div>
              <h2>Generate Intelligence Report</h2>

              <p>
                Select or input a detected incident identifier
                to compile a structured multi-source intelligence
                report.
              </p>
            </div>
          </div>

          <span className="engine-badge">
            INCIDENT SYNTHESIS ENGINE
          </span>
        </div>

        <div className="generator-form">
          <div className="incident-input-group">
            <div className="input-label-row">
              <label htmlFor="incident-id">
                TARGET INCIDENT ID
              </label>

              <span>REQUIRED: NUMERIC INCIDENT ID</span>
            </div>

            <div className="incident-input-wrap">
              <Icon name="travel_explore" />

              <input
                ref={inputRef}
                id="incident-id"
                type="number"
                value={incidentId}
                onChange={(event) =>
                  setIncidentId(event.target.value)
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    handleGenerate();
                  }
                }}
                placeholder="Enter incident ID"
              />

              {incidentId && (
                <button
                  type="button"
                  className="reset-input"
                  onClick={resetInput}
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          <button
            type="button"
            className="generate-button"
            onClick={handleGenerate}
            disabled={loading}
          >
            <Icon
              name={loading ? "sync" : "document_scanner"}
            />

            {loading
              ? "Synthesizing..."
              : "Generate Report"}
          </button>
        </div>

        {incidents.length > 0 && (
          <div className="recent-incidents">
            <span className="recent-label">
              RECENT INCIDENTS:
            </span>

            {incidents.map((item) => {
              const id =
                item.id ??
                item.incident_id ??
                item.signal_id;

              if (!id) return null;

              const level =
                item.risk_level ||
                item.severity ||
                "";

              return (
                <button
                  key={id}
                  type="button"
                  className={`incident-chip ${riskClass(
                    level
                  )}`}
                  onClick={() => selectIncident(id)}
                >
                  <span />
                  {item.incident_key ||
                    `INC-${String(id).padStart(6, "0")}`}
                  {level ? ` (${level})` : ""}
                </button>
              );
            })}
          </div>
        )}

        {error && (
          <div className="report-status error">
            <Icon name="error" />
            <span>{error}</span>
          </div>
        )}

        {!error && !report && !loading && (
          <div className="report-status">
            <Icon name="info" />
            <span>
              Connected to Incident Registry. Select an
              incident and generate a report.
            </span>
          </div>
        )}

        {loading && (
          <div className="report-status loading">
            <Icon name="sync" />
            <span>
              Querying Incident Registry and synthesizing
              multi-source intelligence...
            </span>
          </div>
        )}

        {report && !loading && (
          <div className="report-status success">
            <Icon name="check_circle" />
            <span>
              Report generated successfully and ready for
              analyst review.
            </span>
          </div>
        )}
      </section>

      {report && (
        <div className="report-workspace">
          <main className="report-dossier">
            <div className="dossier-topline">
              <span>STATUS: COMPLETED</span>
              <span>INTEL-REPORT</span>
              <span>
                {incident.incident_key || "UNKNOWN INCIDENT"}
              </span>
            </div>

            <div className="dossier-header">
              <p className="dossier-kicker">
                INTELLIGENCE REPORT
              </p>

              <h2>
                {incident.title ||
                  "Intelligence Incident Report"}
              </h2>

              <p>
                Structured assessment generated from the
                incident registry and supporting social signals.
              </p>
            </div>

            <section className="dossier-section">
              <div className="section-heading">
                <span>01.</span>
                <h3>Executive Summary</h3>
              </div>

              <div className="summary-box">
                <p>
                  {risk.assessment ||
                    "No executive assessment is available for this incident."}
                </p>
              </div>
            </section>

            <section className="dossier-section">
              <div className="section-heading">
                <span>02.</span>
                <h3>Incident Overview & Key Findings</h3>
              </div>

              <div className="overview-grid">
                <div className="overview-card">
                  <span>INCIDENT ID</span>
                  <strong className="mono">
                    {incident.incident_key || "—"}
                  </strong>
                </div>

                <div className="overview-card">
                  <span>STATUS</span>
                  <strong>
                    {String(
                      incident.status || "UNKNOWN"
                    ).toUpperCase()}
                  </strong>
                </div>

                <div className="overview-card">
                  <span>SIGNALS</span>
                  <strong>
                    {formatNumber(
                      incident.signal_count
                    )}
                  </strong>
                </div>
              </div>

              {findings.length > 0 && (
                <div className="findings-list">
                  {findings.map((finding, index) => (
                    <div
                      className="finding-item"
                      key={index}
                    >
                      <span>{index + 1}</span>
                      <p>{finding}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="dossier-section">
              <div className="section-heading">
                <span>03.</span>
                <h3>Risk & Threat Assessment</h3>
              </div>

              <div className="risk-grid">
                <div className="risk-card">
                  <span>ASSESSED SEVERITY</span>

                  <strong
                    className={`risk-value ${riskClass(
                      risk.level
                    )}`}
                  >
                    {riskLevel}
                  </strong>

                  <small>
                    Incident-level risk assessment
                  </small>
                </div>

                <div className="risk-card">
                  <span>RISK SCORE</span>

                  <strong>
                    {risk.score !== undefined
                      ? risk.score
                      : "—"}
                  </strong>

                  <small>
                    Computed from incident signals
                  </small>
                </div>

                <div className="risk-card">
                  <span>ANALYSIS STATE</span>

                  <strong>
                    {String(
                      incident.status || "UNKNOWN"
                    ).toUpperCase()}
                  </strong>

                  <small>
                    Current incident workflow state
                  </small>
                </div>
              </div>
            </section>

            <section className="dossier-section">
              <div className="section-heading">
                <span>04.</span>
                <h3>Intelligence Overview</h3>
              </div>

              <div className="intel-grid">
                <div>
                  <span>PLATFORMS</span>
                  <p>
                    {overview.platforms?.join(", ") ||
                      "None identified"}
                  </p>
                </div>

                <div>
                  <span>LOCATIONS</span>
                  <p>
                    {overview.locations?.join(", ") ||
                      "None identified"}
                  </p>
                </div>

                <div>
                  <span>ORGANIZATIONS</span>
                  <p>
                    {overview.organizations?.join(
                      ", "
                    ) || "None identified"}
                  </p>
                </div>

                <div>
                  <span>ENTITIES</span>
                  <p>
                    {overview.entities?.join(", ") ||
                      "None identified"}
                  </p>
                </div>
              </div>
            </section>

            <section className="dossier-section">
              <div className="section-heading">
                <span>05.</span>
                <h3>Correlated Signals & Evidence</h3>
              </div>

              {signals.length === 0 ? (
                <div className="empty-dossier">
                  No supporting signals available.
                </div>
              ) : (
                <div className="signal-table">
                  <div className="signal-table-header">
                    <span>SIGNAL ID</span>
                    <span>PLATFORM</span>
                    <span>RISK</span>
                    <span>CONFIDENCE</span>
                  </div>

                  {signals.map((signal) => (
                    <div
                      className="signal-row"
                      key={signal.id}
                    >
                      <strong className="mono">
                        SIG-{signal.id}
                      </strong>

                      <span>
                        {signal.platform || "Unknown"}
                      </span>

                      <span
                        className={`risk-badge ${riskClass(
                          signal.risk_level
                        )}`}
                      >
                        {String(
                          signal.risk_level ||
                            "UNKNOWN"
                        ).toUpperCase()}
                      </span>

                      <span className="mono">
                        {signal.confidence !==
                          null &&
                        signal.confidence !==
                          undefined
                          ? signal.confidence
                          : "—"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="dossier-section">
              <div className="section-heading">
                <span>06.</span>
                <h3>Incident Timeline</h3>
              </div>

              {timeline.length === 0 ? (
                <div className="empty-dossier">
                  No timeline data available.
                </div>
              ) : (
                <div className="timeline">
                  {timeline.map((event, index) => (
                    <div
                      className="timeline-item"
                      key={`${event.signal_id}-${index}`}
                    >
                      <div className="timeline-marker">
                        {index + 1}
                      </div>

                      <div>
                        <strong className="mono">
                          SIG-{event.signal_id}
                        </strong>

                        <p>
                          {event.platform ||
                            "Unknown platform"}{" "}
                          · Risk{" "}
                          {event.risk_score ?? "—"}{" "}
                          (
                          {event.risk_level ||
                            "Unknown"}
                          )
                        </p>

                        <small>
                          {formatDate(
                            event.timestamp
                          )}
                        </small>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="dossier-section">
              <div className="section-heading">
                <span>07.</span>
                <h3>Explainability</h3>
              </div>

              <div className="explainability-box">
                <p>
                  {explainability.explanation ||
                    "No additional explanation available."}
                </p>

                {Array.isArray(
                  explainability.risk_drivers
                ) &&
                  explainability.risk_drivers.length >
                    0 && (
                    <div className="risk-drivers">
                      {explainability.risk_drivers.map(
                        (driver, index) => (
                          <div
                            className="driver-item"
                            key={index}
                          >
                            <strong>
                              {driver.factor}
                            </strong>

                            <span>
                              {driver.impact}

                              {driver.count !==
                                undefined
                                ? ` (${driver.count})`
                                : ""}
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  )}
              </div>
            </section>

            <footer className="dossier-footer">
              <button
                type="button"
                className="footer-action"
                onClick={handlePrint}
              >
                <Icon name="print" />
                Print Report
              </button>

              <button
                type="button"
                className="footer-action"
                onClick={handleGenerate}
                disabled={loading}
              >
                <Icon name="refresh" />
                Generate Again
              </button>

              <span>
                Intelligence report generated from the
                Incident Registry.
              </span>
            </footer>
          </main>

          <aside className="report-sidebar">
            <section className="sidebar-card">
              <div className="sidebar-card-heading">
                <span>
                  <Icon name="description" />
                  Dossier Metadata
                </span>

                <small>SEC-OPS</small>
              </div>

              <div className="metadata-list">
                <div>
                  <span>Incident ID</span>
                  <strong className="mono">
                    {incident.incident_key || "—"}
                  </strong>
                </div>

                <div>
                  <span>Generated</span>
                  <strong>
                    {formatDate(
                      report.generated_at ||
                        report.created_at
                    )}
                  </strong>
                </div>

                <div>
                  <span>Status</span>
                  <strong>
                    {String(
                      incident.status ||
                        "UNKNOWN"
                    ).toUpperCase()}
                  </strong>
                </div>

                <div>
                  <span>Signals</span>
                  <strong>
                    {formatNumber(
                      incident.signal_count
                    )}
                  </strong>
                </div>
              </div>
            </section>

            <section className="sidebar-card">
              <div className="sidebar-card-heading">
                <span>
                  <Icon name="shield" />
                  Risk Assessment
                </span>
              </div>

              <div className="sidebar-risk">
                <span>THREAT SEVERITY</span>

                <strong
                  className={riskClass(risk.level)}
                >
                  {riskLevel}
                </strong>

                <small>
                  Score: {risk.score ?? "—"}
                </small>
              </div>
            </section>

            <section className="sidebar-card">
              <div className="sidebar-card-heading">
                <span>
                  <Icon name="fact_check" />
                  Key Findings
                </span>
              </div>

              <div className="sidebar-findings">
                {findings.length === 0 ? (
                  <span>No findings available.</span>
                ) : (
                  findings.slice(0, 5).map(
                    (finding, index) => (
                      <div key={index}>
                        <span>{index + 1}</span>
                        <p>{finding}</p>
                      </div>
                    )
                  )
                )}
              </div>
            </section>

            <section className="sidebar-card">
              <div className="sidebar-card-heading">
                <span>
                  <Icon name="schedule" />
                  Report Information
                </span>
              </div>

              <div className="report-info">
                <p>
                  This report consolidates incident metadata,
                  risk assessment, supporting signals,
                  timeline evidence and explainability into
                  one analyst-ready dossier.
                </p>
              </div>
            </section>
          </aside>
        </div>
      )}
    </div>
  );
}