
import { useEffect, useState } from "react";
import {
  getDashboardSignals,
  investigateWithTinyFish,
  searchWebWithTinyFish,
} from "../services/api";
import "./Investigations.css";

function Investigations() {
  const [signals, setSignals] = useState([]);
  const [selectedSignal, setSelectedSignal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [investigation, setInvestigation] = useState(null);
  const [investigating, setInvestigating] = useState(false);
  const [investigationError, setInvestigationError] = useState("");
  const [webQuery, setWebQuery] = useState("");
  const [webSearching, setWebSearching] = useState(false);
  const [webSearchError, setWebSearchError] = useState("");
  const [webSearchResults, setWebSearchResults] = useState(null);

  async function loadSignals() {
    try {
      setLoading(true);
      setError("");

      const data = await getDashboardSignals();
      const incomingSignals = data.signals || [];

      setSignals(incomingSignals);

      setSelectedSignal((previous) => {
        if (!incomingSignals.length) return null;

        if (previous) {
          const existing = incomingSignals.find(
            (signal) =>
              signal.id != null &&
              signal.id === previous.id
          );

          if (existing) return existing;
        }

        return incomingSignals[0];
      });
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

  useEffect(() => {
    setInvestigation(null);
    setInvestigationError("");
  }, [selectedSignal]);

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

  async function handleWebInvestigation() {
    const claim = selectedSignal?.text?.trim();

    if (!claim) {
      setInvestigationError(
        "The selected signal has no text to investigate."
      );
      return;
    }

    try {
      setInvestigating(true);
      setInvestigationError("");
      setInvestigation(null);

      const result = await investigateWithTinyFish(claim, 5);
      setInvestigation(result);
    } catch (err) {
      console.error("TinyFish investigation failed:", err);

      const detail = err.response?.data?.detail;

      setInvestigationError(
        typeof detail === "string"
          ? detail
          : "Live web investigation failed. Check the backend terminal and try again."
      );
    } finally {
      setInvestigating(false);
    }
  }

  async function handleIndependentWebSearch(event) {
    event.preventDefault();

    const query = webQuery.trim();

    if (!query) {
      setWebSearchError("Enter a keyword, event, organization, or claim to search.");
      return;
    }

    try {
      setWebSearching(true);
      setWebSearchError("");
      setWebSearchResults(null);

      const result = await searchWebWithTinyFish(query, 5);
      setWebSearchResults(result);
    } catch (err) {
      console.error("Independent TinyFish search failed:", err);

      const detail = err.response?.data?.detail;
      setWebSearchError(
        typeof detail === "string"
          ? detail
          : "Web search failed. Check the backend terminal and try again."
      );
    } finally {
      setWebSearching(false);
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

  const searchResults = investigation?.search_results || [];
  const fetchedSources = investigation?.fetched_sources || [];

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

      <section className="independent-web-search panel">
        <div className="independent-search-heading">
          <span className="investigation-eyebrow">
            TINYFISH · LIVE WEB INTELLIGENCE
          </span>
          <h2>Search the Open Web</h2>
          <p>
            Search any keyword, event, organization, or suspicious claim
            without selecting a signal from the queue.
          </p>
        </div>

        <form onSubmit={handleIndependentWebSearch}>
          <input
            type="search"
            value={webQuery}
            onChange={(event) => setWebQuery(event.target.value)}
            placeholder="e.g. emerging cyber fraud campaign..."
            maxLength={500}
            aria-label="Search public web"
          />
          <button type="submit" disabled={webSearching}>
            <span className="material-symbols-outlined">
              {webSearching ? "progress_activity" : "search"}
            </span>
            {webSearching ? "Searching..." : "Search Web"}
          </button>
        </form>

        {webSearchError && (
          <p className="independent-search-error" role="alert">
            {webSearchError}
          </p>
        )}

        {webSearchResults && (
          <div className="independent-search-results">
            <div className="independent-results-heading">
              <h3>Results for “{webQuery.trim()}”</h3>
              <span>
                {(webSearchResults.search_results || []).length} sources
              </span>
            </div>

            {(webSearchResults.search_results || []).length === 0 && (
              <p className="tinyfish-muted">
                No search results were returned. Try a more specific query.
              </p>
            )}

            {(webSearchResults.search_results || []).map((source, index) => (
              <article
                className="independent-search-result"
                key={`${source.url || source.final_url || "source"}-${index}`}
              >
                <div className="independent-result-meta">
                  <span>SOURCE {index + 1}</span>
                  <span>{source.site_name || source.domain || "Public web"}</span>
                </div>
                <h4>{source.title || "Untitled source"}</h4>
                <p>{source.snippet || source.description || "No preview available."}</p>
                {(source.url || source.final_url) && (
                  <a
                    href={source.url || source.final_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open original source ↗
                  </a>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

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
          <strong className="critical-value">{criticalCount}</strong>
          <p>Requires immediate analyst attention</p>
        </div>

        <div className="investigation-kpi">
          <div className="investigation-kpi-top">
            <span>HIGH RISK CASES</span>
            <span className="material-symbols-outlined high-icon">
              warning
            </span>
          </div>
          <strong className="high-value">{highRiskCount}</strong>
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
          <span className="material-symbols-outlined">error</span>
          {error}
        </section>
      )}

      {!loading && !error && signals.length === 0 && (
        <section className="investigation-state">
          <span className="material-symbols-outlined">search_off</span>
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
                const selected =
                  selectedSignal === signal ||
                  (
                    selectedSignal?.id != null &&
                    selectedSignal.id === signal.id
                  );

                return (
                  <button
                    key={signal.id ?? `${signal.text}-${index}`}
                    type="button"
                    className={`investigation-card ${
                      selected ? "selected" : ""
                    }`}
                    onClick={() => setSelectedSignal(signal)}
                  >
                    <div className="investigation-card-top">
                      <div className="investigation-card-meta">
                        <span
                          className={`investigation-risk ${getRiskClass(
                            signal.risk_level
                          )}`}
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
                        {signal.risk_score ?? 0}
                      </span>
                    </div>

                    <h3>
                      {signal.text || "Untitled intelligence signal"}
                    </h3>

                    <p>
                      {signal.prediction || "Classification pending"}
                    </p>

                    <div className="investigation-card-footer">
                      <span>
                        CONFIDENCE{" "}
                        <strong>
                          {(Number(signal.confidence || 0) * 100).toFixed(1)}%
                        </strong>
                      </span>

                      <span>
                        RISK SCORE{" "}
                        <strong>{signal.risk_score ?? 0}</strong>
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
                  <strong>{selectedSignal.risk_score ?? 0}</strong>
                </div>

                <div className="detail-section">
                  <span className="detail-section-label">
                    ORIGINAL SIGNAL
                  </span>
                  <div className="detail-signal">
                    {selectedSignal.text || "No signal text available."}
                  </div>
                </div>

                <div className="detail-grid">
                  <div>
                    <span className="detail-section-label">PLATFORM</span>
                    <strong>{selectedSignal.platform || "Unknown"}</strong>
                  </div>
                  <div>
                    <span className="detail-section-label">PREDICTION</span>
                    <strong>{selectedSignal.prediction || "Unknown"}</strong>
                  </div>
                  <div>
                    <span className="detail-section-label">CONFIDENCE</span>
                    <strong>
                      {(Number(selectedSignal.confidence || 0) * 100).toFixed(1)}%
                    </strong>
                  </div>
                  <div>
                    <span className="detail-section-label">RISK LEVEL</span>
                    <strong>{selectedSignal.risk_level || "LOW"}</strong>
                  </div>
                </div>

                <div className="detail-section">
                  <span className="detail-section-label">SEVERITY TERMS</span>
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
                  <span className="detail-section-label">URGENCY TERMS</span>
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
                    {getRecommendedResponse(selectedSignal.risk_level)}
                  </strong>
                </div>

                <div className="tinyfish-action">
                  <span className="investigation-eyebrow">
                    LIVE WEB RESEARCH
                  </span>
                  <h3>Investigate this signal</h3>
                  <p>
                    Search public web sources and retrieve relevant pages
                    to help an analyst examine this claim.
                  </p>

                  <button
                    type="button"
                    className="tinyfish-investigate-button"
                    onClick={handleWebInvestigation}
                    disabled={investigating || !selectedSignal.text?.trim()}
                  >
                    <span className="material-symbols-outlined">
                      {investigating ? "progress_activity" : "travel_explore"}
                    </span>
                    {investigating
                      ? "Investigating the live web..."
                      : "Investigate Across the Web"}
                  </button>

                  {investigationError && (
                    <div className="tinyfish-error" role="alert">
                      {investigationError}
                    </div>
                  )}
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
                  <strong>{selectedSignal.severity_terms?.length || 0}</strong>
                </div>
                <div className="evidence-row">
                  <span>Urgency indicators</span>
                  <strong>{selectedSignal.urgency_terms?.length || 0}</strong>
                </div>
                <div className="evidence-row">
                  <span>Confidence</span>
                  <strong>
                    {(Number(selectedSignal.confidence || 0) * 100).toFixed(1)}%
                  </strong>
                </div>
                <div className="evidence-row">
                  <span>Source platform</span>
                  <strong>{selectedSignal.platform || "Unknown"}</strong>
                </div>
              </section>
            </aside>
          )}
        </div>
      )}

      {investigation && (
        <section className="tinyfish-dossier panel">
          <div className="investigation-panel-header">
            <div>
              <span className="investigation-eyebrow">
                TINYFISH · LIVE WEB INTELLIGENCE
              </span>
              <h2>Investigation Dossier</h2>
            </div>
            <span className="investigation-count">
              {searchResults.length} SEARCH RESULTS
            </span>
          </div>

          <div className="tinyfish-dossier-body">
            <span className="detail-section-label">CLAIM INVESTIGATED</span>
            <div className="detail-signal">{investigation.claim}</div>

            <div className="tinyfish-disclaimer">
              <span className="material-symbols-outlined">info</span>
              {investigation.disclaimer ||
                "Search results are leads, not proof. Verify source credibility and compare conflicting evidence."}
            </div>

            <div className="tinyfish-section-heading">
              <h3>Discovered sources</h3>
              <span>{searchResults.length} sources</span>
            </div>

            {searchResults.length === 0 && (
              <p className="tinyfish-muted">
                No search results were returned for this claim.
              </p>
            )}

            <div className="tinyfish-source-list">
              {searchResults.map((source, index) => (
                <article
                  className="tinyfish-source-card"
                  key={`${source.url}-${index}`}
                >
                  <div className="tinyfish-source-top">
                    <span className="tinyfish-source-number">
                      SOURCE {index + 1}
                    </span>
                    <span>{source.site_name || "Public web"}</span>
                  </div>

                  <h4>{source.title || "Untitled source"}</h4>
                  <p>{source.snippet || "No search snippet available."}</p>

                  {source.url && (
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open original source ↗
                    </a>
                  )}
                </article>
              ))}
            </div>

            <div className="tinyfish-section-heading">
              <h3>Retrieved page evidence</h3>
              <span>{fetchedSources.length} pages</span>
            </div>

            {fetchedSources.length === 0 && (
              <p className="tinyfish-muted">
                No page content was retrieved. Review the discovered source
                links or try the investigation again.
              </p>
            )}

            <div className="tinyfish-source-list">
              {fetchedSources.map((source, index) => (
                <article
                  className="tinyfish-source-card tinyfish-fetched-card"
                  key={`${source.url || source.final_url}-${index}`}
                >
                  <h4>{source.title || "Retrieved page"}</h4>

                  {source.published_date && (
                    <p className="tinyfish-published-date">
                      Published date reported by source: {source.published_date}
                    </p>
                  )}

                  <p className="tinyfish-page-text">
                    {source.text || "No readable text was returned."}
                  </p>

                  {(source.final_url || source.url) && (
                    <a
                      href={source.final_url || source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Verify against original page ↗
                    </a>
                  )}
                </article>
              ))}
            </div>

            {investigation.fetch_errors?.length > 0 && (
              <div className="tinyfish-muted">
                Some pages could not be retrieved. The search results remain
                available for manual review.
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

export default Investigations;
