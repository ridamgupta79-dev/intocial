import { useEffect, useState } from "react";
import { getDashboardSignals } from "../services/api";
import "./Investigations.css";

function Investigations() {
  const [signals, setSignals] = useState([]);
  const [selectedSignal, setSelectedSignal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadSignals() {
    try {
      setLoading(true);
      setError("");

      const data = await getDashboardSignals();
      const incomingSignals = data.signals || [];

      setSignals(incomingSignals);

      if (incomingSignals.length > 0) {
        setSelectedSignal(incomingSignals[0]);
      } else {
        setSelectedSignal(null);
      }
    } catch (err) {
      console.error("Investigation loading failed:", err);
      setError("Unable to load investigation data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSignals();
  }, []);

  function getRiskClass(level) {
    return String(level || "LOW").toLowerCase();
  }

  function getRecommendedResponse(level) {
    switch (String(level || "").toUpperCase()) {
      case "CRITICAL":
        return "IMMEDIATE HUMAN REVIEW";
      case "HIGH":
        return "PRIORITY REVIEW";
      case "MEDIUM":
        return "CONTINUE MONITORING";
      default:
        return "NO IMMEDIATE ACTION";
    }
  }

  const criticalCount = signals.filter(
    (signal) =>
      String(signal.risk_level || "").toUpperCase() === "CRITICAL"
  ).length;

  const highRiskCount = signals.filter(
    (signal) =>
      String(signal.risk_level || "").toUpperCase() === "HIGH"
  ).length;

  const activeReviewCount = signals.filter(
    (signal) =>
      ["HIGH", "CRITICAL"].includes(
        String(signal.risk_level || "").toUpperCase()
      )
  ).length;

  return (
    <div className="investigations-page">
      <div className="investigations-header">
        <div>
          <div className="investigations-title-row">
            <h1>Investigations</h1>
            <span className="investigations-workspace-badge">
              INVESTIGATION WORKSPACE
            </span>
          </div>

          <p>
            Operational intelligence — Deep signal inspection,
            evidence analysis, and threat investigation from one workspace.
          </p>
        </div>

        <div className="investigations-header-actions">
          <div className="investigations-status">
            <span />
            ANALYSIS READY
          </div>

          <button
            type="button"
            className="investigations-refresh"
            onClick={loadSignals}
            disabled={loading}
          >
            <span className="material-symbols-outlined">
              refresh
            </span>
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      <section className="investigation-kpis">
        <div className="investigation-kpi">
          <div className="investigation-kpi-top">
            <span>ACTIVE SIGNALS</span>
            <span className="material-symbols-outlined">
              folder_open
            </span>
          </div>

          <strong>{signals.length}</strong>

          <p>Signals currently available for analysis</p>
        </div>

        <div className="investigation-kpi">
          <div className="investigation-kpi-top">
            <span>CRITICAL THREATS</span>
            <span className="material-symbols-outlined critical-icon">
              priority_high
            </span>
          </div>

          <strong className="critical-value">
            {criticalCount}
          </strong>

          <p>Requires immediate analyst attention</p>
        </div>

        <div className="investigation-kpi">
          <div className="investigation-kpi-top">
            <span>HIGH RISK CASES</span>
            <span className="material-symbols-outlined high-icon">
              warning
            </span>
          </div>

          <strong className="high-value">
            {highRiskCount}
          </strong>

          <p>Signals requiring priority review</p>
        </div>

        <div className="investigation-kpi">
          <div className="investigation-kpi-top">
            <span>REQUIRES REVIEW</span>
            <span className="material-symbols-outlined">
              manage_search
            </span>
          </div>

          <strong>{activeReviewCount}</strong>

          <p>High-priority investigation queue</p>
        </div>
      </section>

      {loading && (
        <section className="investigation-state">
          <span className="material-symbols-outlined">
            progress_activity
          </span>
          Loading investigation intelligence...
        </section>
      )}

      {!loading && error && (
        <section className="investigation-state error">
          <span className="material-symbols-outlined">
            error
          </span>
          {error}
        </section>
      )}

      {!loading && !error && signals.length === 0 && (
        <section className="investigation-state">
          <span className="material-symbols-outlined">
            search_off
          </span>
          No signals are currently available for investigation.
        </section>
      )}

      {!loading && !error && signals.length > 0 && (
        <div className="investigation-workspace">
          <section className="investigation-queue panel">
            <div className="investigation-panel-header">
              <div>
                <span className="investigation-eyebrow">
                  ACTIVE INVESTIGATION QUEUE
                </span>
                <h2>Signals Under Analysis</h2>
              </div>

              <span className="investigation-count">
                {signals.length} SIGNALS
              </span>
            </div>

            <div className="investigation-list">
              {signals.map((signal, index) => {
                const selected = selectedSignal === signal;
                const riskClass = getRiskClass(signal.risk_level);

                return (
                  <button
                    key={`${signal.text}-${index}`}
                    type="button"
                    className={`investigation-card ${
                      selected ? "selected" : ""
                    }`}
                    onClick={() => setSelectedSignal(signal)}
                  >
                    <div className="investigation-card-top">
                      <div className="investigation-card-meta">
                        <span
                          className={`investigation-risk ${riskClass}`}
                        >
                          {signal.risk_level || "LOW"}
                        </span>

                        <span className="investigation-id">
                          SIG-{index + 1}
                        </span>

                        <span className="investigation-platform">
                          {signal.platform || "social"}
                        </span>
                      </div>

                      <span className="investigation-score-small">
                        {signal.risk_score}
                      </span>
                    </div>

                    <h3>
                      {signal.text || "Untitled intelligence signal"}
                    </h3>

                    <p>
                      {signal.prediction ||
                        "Classification pending"}
                    </p>

                    <div className="investigation-card-footer">
                      <span>
                        CONFIDENCE{" "}
                        <strong>
                          {(
                            Number(signal.confidence || 0) * 100
                          ).toFixed(1)}
                          %
                        </strong>
                      </span>

                      <span>
                        RISK SCORE{" "}
                        <strong>
                          {signal.risk_score ?? 0}
                        </strong>
                      </span>

                      <span>
                        {selected ? "SELECTED" : "VIEW DETAILS →"}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {selectedSignal && (
            <aside className="investigation-detail">
              <section className="investigation-detail-panel panel">
                <div className="investigation-panel-header">
                  <div>
                    <span className="investigation-eyebrow">
                      SIGNAL DOSSIER
                    </span>
                    <h2>Investigation Detail</h2>
                  </div>

                  <span
                    className={`investigation-risk ${getRiskClass(
                      selectedSignal.risk_level
                    )}`}
                  >
                    {selectedSignal.risk_level || "LOW"}
                  </span>
                </div>

                <div className="detail-risk-block">
                  <span>RISK SCORE</span>
                  <strong>
                    {selectedSignal.risk_score ?? 0}
                  </strong>
                </div>

                <div className="detail-section">
                  <span className="detail-section-label">
                    ORIGINAL SIGNAL
                  </span>

                  <div className="detail-signal">
                    {selectedSignal.text ||
                      "No signal text available."}
                  </div>
                </div>

                <div className="detail-grid">
                  <div>
                    <span className="detail-section-label">
                      PLATFORM
                    </span>
                    <strong>
                      {selectedSignal.platform || "Unknown"}
                    </strong>
                  </div>

                  <div>
                    <span className="detail-section-label">
                      PREDICTION
                    </span>
                    <strong>
                      {selectedSignal.prediction || "Unknown"}
                    </strong>
                  </div>

                  <div>
                    <span className="detail-section-label">
                      CONFIDENCE
                    </span>
                    <strong>
                      {(
                        Number(selectedSignal.confidence || 0) *
                        100
                      ).toFixed(1)}
                      %
                    </strong>
                  </div>

                  <div>
                    <span className="detail-section-label">
                      RISK LEVEL
                    </span>
                    <strong>
                      {selectedSignal.risk_level || "LOW"}
                    </strong>
                  </div>
                </div>

                <div className="detail-section">
                  <span className="detail-section-label">
                    SEVERITY TERMS
                  </span>

                  <div className="detail-tags">
                    {selectedSignal.severity_terms?.length ? (
                      selectedSignal.severity_terms.map((term) => (
                        <span key={term}>{term}</span>
                      ))
                    ) : (
                      <em>None detected</em>
                    )}
                  </div>
                </div>

                <div className="detail-section">
                  <span className="detail-section-label">
                    URGENCY TERMS
                  </span>

                  <div className="detail-tags">
                    {selectedSignal.urgency_terms?.length ? (
                      selectedSignal.urgency_terms.map((term) => (
                        <span key={term}>{term}</span>
                      ))
                    ) : (
                      <em>None detected</em>
                    )}
                  </div>
                </div>

                <div className="detail-response">
                  <span className="detail-section-label">
                    RECOMMENDED RESPONSE
                  </span>

                  <strong>
                    {getRecommendedResponse(
                      selectedSignal.risk_level
                    )}
                  </strong>
                </div>
              </section>

              <section className="investigation-side-panel panel">
                <div className="investigation-panel-header compact">
                  <div>
                    <span className="investigation-eyebrow">
                      EVIDENCE SUMMARY
                    </span>
                    <h2>Risk Indicators</h2>
                  </div>
                </div>

                <div className="evidence-row">
                  <span>Severity indicators</span>
                  <strong>
                    {selectedSignal.severity_terms?.length || 0}
                  </strong>
                </div>

                <div className="evidence-row">
                  <span>Urgency indicators</span>
                  <strong>
                    {selectedSignal.urgency_terms?.length || 0}
                  </strong>
                </div>

                <div className="evidence-row">
                  <span>Confidence</span>
                  <strong>
                    {(
                      Number(selectedSignal.confidence || 0) * 100
                    ).toFixed(1)}
                    %
                  </strong>
                </div>

                <div className="evidence-row">
                  <span>Source platform</span>
                  <strong>
                    {selectedSignal.platform || "Unknown"}
                  </strong>
                </div>
              </section>
            </aside>
          )}
        </div>
      )}
    </div>
  );
}

export default Investigations;