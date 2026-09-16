import { useEffect, useMemo, useState } from "react";
import {
  analyzeCorrelation,
  getCorrelationSignals,
} from "../services/api";
import "./Correlation.css";

function Icon({ name }) {
  return (
    <span className="material-symbols-outlined">
      {name}
    </span>
  );
}

function riskClass(level) {
  return String(level || "LOW").toLowerCase();
}

function platformName(value) {
  const platform = String(value || "").toLowerCase();

  if (platform.includes("youtube")) return "YouTube";
  if (platform.includes("reddit")) return "Reddit";
  if (platform.includes("instagram")) return "Instagram";
  if (platform === "x" || platform.includes("twitter")) return "X";

  return value || "Other";
}

function formatTime(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString([], {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export default function Correlation() {
  const [signals, setSignals] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [result, setResult] = useState(null);
  const [search, setSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [riskFilter, setRiskFilter] = useState("all");
  const [loadingSignals, setLoadingSignals] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadSignals() {
    try {
      setLoadingSignals(true);
      setError("");

      const data = await getCorrelationSignals();

      setSignals(data?.signals || []);
    } catch (err) {
      console.error(
        "Correlation signals loading failed:",
        err
      );

      setError(
        err.response?.data?.detail ||
          "Unable to load correlation signals."
      );
    } finally {
      setLoadingSignals(false);
    }
  }

  useEffect(() => {
    loadSignals();
  }, []);

  const platforms = useMemo(() => {
    return [
      ...new Set(
        signals
          .map((signal) => platformName(signal.platform))
          .filter(Boolean)
      ),
    ];
  }, [signals]);

  const filteredSignals = useMemo(() => {
    const query = search.trim().toLowerCase();

    return signals.filter((signal) => {
      const text = String(signal.text || "").toLowerCase();
      const id = String(signal.id || "").toLowerCase();
      const platform = platformName(signal.platform);
      const risk = String(
        signal.risk_level || ""
      ).toLowerCase();

      const matchesSearch =
        !query ||
        text.includes(query) ||
        id.includes(query) ||
        platform.toLowerCase().includes(query);

      const matchesPlatform =
        platformFilter === "all" ||
        platform.toLowerCase() ===
          platformFilter.toLowerCase();

      const matchesRisk =
        riskFilter === "all" ||
        risk === riskFilter.toLowerCase();

      return (
        matchesSearch &&
        matchesPlatform &&
        matchesRisk
      );
    });
  }, [
    signals,
    search,
    platformFilter,
    riskFilter,
  ]);

  function toggleSignal(signalId) {
    const id = Number(signalId);

    if (!Number.isInteger(id)) {
      return;
    }

    setSelectedIds((current) => {
      if (current.includes(id)) {
        return current.filter(
          (item) => item !== id
        );
      }

      return [...current, id];
    });

    setResult(null);
    setError("");
  }

  function clearSelection() {
    setSelectedIds([]);
    setResult(null);
    setError("");
  }

  async function handleAnalyze() {
    if (selectedIds.length < 2) {
      setError(
        "Select at least 2 signals to analyze."
      );
      return;
    }

    try {
      setLoading(true);
      setError("");
      setResult(null);

      const data = await analyzeCorrelation(
        selectedIds
      );

      setResult(data);
    } catch (err) {
      console.error(
        "Correlation analysis failed:",
        err
      );

      setError(
        err.response?.data?.detail ||
          "Failed to analyze correlation."
      );
    } finally {
      setLoading(false);
    }
  }

  const pairs = result?.pairs || [];

  const correlatedPairs = pairs.filter(
    (pair) => pair.correlation?.correlated
  );

  const confidence =
    result?.confidence?.confidence_percentage;

  const confidenceLevel =
    result?.confidence?.confidence_level ||
    "Not assessed";

  const crossPlatform =
    result?.cross_platform?.corroborated;

  const evidence = [
    ...new Set(
      pairs.flatMap(
        (pair) =>
          pair.correlation?.evidence || []
      )
    ),
  ];

  return (
    <div className="correlation-page">
      <header className="correlation-header">
        <div>
          <div className="correlation-eyebrow-row">
            <span className="correlation-eyebrow">
              <span className="status-dot" />
              CORRELATION ANALYSIS
            </span>

            <span className="system-id">
              SYS-ID: CR-ENG-24
            </span>
          </div>

          <h1>Correlation</h1>

          <p>
            Analyze relationships between signals
            across platforms, time horizons, entities,
            and shared evidence.
          </p>
        </div>

        <div className="correlation-header-actions">
          <button
            type="button"
            className="secondary-action"
            onClick={clearSelection}
            disabled={!selectedIds.length}
          >
            <Icon name="layers_clear" />
            Clear Selection
          </button>

          <button
            type="button"
            className="primary-action"
            onClick={handleAnalyze}
            disabled={
              loading ||
              selectedIds.length < 2
            }
          >
            <Icon name="insights" />
            {loading
              ? "Analyzing..."
              : "Analyze Correlation"}
          </button>
        </div>
      </header>

      {error && (
        <div className="correlation-error">
          <Icon name="error" />
          {error}
        </div>
      )}

      <div className="correlation-workspace">
        <section className="signal-selector panel">
          <div className="panel-header">
            <div>
              <div className="panel-title-row">
                <h2>Select Signals</h2>

                <span className="selected-count">
                  {selectedIds.length} selected
                </span>
              </div>
            </div>

            <span className="panel-code">
              SIGNAL REGISTER
            </span>
          </div>

          <div className="selector-controls">
            <div className="signal-search">
              <Icon name="search" />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search signals..."
              />
            </div>

            <div className="filter-row">
              <select
                value={platformFilter}
                onChange={(event) =>
                  setPlatformFilter(
                    event.target.value
                  )
                }
              >
                <option value="all">
                  All Platforms
                </option>

                {platforms.map((platform) => (
                  <option
                    key={platform}
                    value={platform}
                  >
                    {platform}
                  </option>
                ))}
              </select>

              <select
                value={riskFilter}
                onChange={(event) =>
                  setRiskFilter(
                    event.target.value
                  )
                }
              >
                <option value="all">
                  All Risk Levels
                </option>
                <option value="critical">
                  Critical
                </option>
                <option value="high">
                  High
                </option>
                <option value="medium">
                  Medium
                </option>
                <option value="low">
                  Low
                </option>
              </select>
            </div>
          </div>

          <div className="signal-list">
            {loadingSignals ? (
              <div className="selector-state">
                <Icon name="progress_activity" />
                Loading signals...
              </div>
            ) : filteredSignals.length === 0 ? (
              <div className="selector-state">
                <Icon name="search_off" />
                No matching signals.
              </div>
            ) : (
              filteredSignals.map((signal) => {
                const id = Number(signal.id);

                const selected =
                  selectedIds.includes(id);

                return (
                  <button
                    key={id}
                    type="button"
                    className={`signal-item ${
                      selected ? "selected" : ""
                    }`}
                    onClick={() =>
                      toggleSignal(id)
                    }
                  >
                    <div className="signal-top">
                      <div className="signal-id-group">
                        <span
                          className={`signal-checkbox ${
                            selected
                              ? "checked"
                              : ""
                          }`}
                        >
                          {selected && (
                            <Icon name="check" />
                          )}
                        </span>

                        <span className="signal-id">
                          SIG-
                          {String(id).padStart(
                            5,
                            "0"
                          )}
                        </span>

                        <span
                          className={`risk-badge ${riskClass(
                            signal.risk_level
                          )}`}
                        >
                          {signal.risk_level ||
                            "LOW"}
                        </span>
                      </div>

                      {signal.confidence != null && (
                        <span className="signal-confidence">
                          {(
                            Number(
                              signal.confidence
                            ) * 100
                          ).toFixed(1)}
                          %
                        </span>
                      )}
                    </div>

                    <strong className="signal-text">
                      {signal.text ||
                        "Signal content unavailable"}
                    </strong>

                    <div className="signal-meta">
                      <span>
                        {platformName(
                          signal.platform
                        )}
                      </span>

                      <span>•</span>

                      <span>
                        {formatTime(
                          signal.timestamp
                        )}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          <div className="selector-footer">
            <span>
              {selectedIds.length < 2
                ? "Select 2 or more signals"
                : `${selectedIds.length} signals ready`}
            </span>

            <button
              type="button"
              onClick={clearSelection}
              disabled={!selectedIds.length}
            >
              Clear
            </button>
          </div>
        </section>

        <section className="correlation-results">
          <div className="panel synthesis-panel">
            <div className="synthesis-header">
              <div>
                <span className="section-kicker">
                  CORRELATION ANALYSIS
                </span>

                <h2>
                  {result
                    ? "Correlation Analysis Complete"
                    : "Awaiting Signal Analysis"}
                </h2>
              </div>

              {result && (
                <span className="result-status">
                  <span />
                  COMPLETE
                </span>
              )}
            </div>

            <div className="metric-ribbon">
              <div className="metric">
                <span>Confidence</span>
                <strong>
                  {confidence != null
                    ? `${confidence}%`
                    : "—"}
                </strong>
                <small>
                  {confidenceLevel}
                </small>
              </div>

              <div className="metric">
                <span>Correlated Pairs</span>
                <strong>
                  {result
                    ? correlatedPairs.length
                    : "—"}
                </strong>
                <small>
                  {result
                    ? `${result.pair_count || pairs.length} total`
                    : "Awaiting analysis"}
                </small>
              </div>

              <div className="metric">
                <span>Similarity</span>
                <strong>
                  {result?.average_similarity ??
                    "—"}
                </strong>
                <small>
                  Average similarity
                </small>
              </div>

              <div className="metric">
                <span>Temporal Score</span>
                <strong>
                  {result?.average_temporal_score ??
                    "—"}
                </strong>
                <small>
                  Temporal relationship
                </small>
              </div>

              <div className="metric">
                <span>Signals</span>
                <strong>
                  {result?.signal_count ??
                    "—"}
                </strong>
                <small>
                  Analyzed
                </small>
              </div>

              <div className="metric">
                <span>Cross-Platform</span>
                <strong
                  className={
                    crossPlatform
                      ? "positive"
                      : ""
                  }
                >
                  {result
                    ? crossPlatform
                      ? "YES"
                      : "NO"
                    : "—"}
                </strong>
                <small>
                  Corroboration
                </small>
              </div>
            </div>
          </div>

          <div className="panel topology-panel">
            <div className="panel-header">
              <div className="panel-title-with-icon">
                <Icon name="schema" />
                <h2>
                  Signal Relationship Topology
                </h2>
              </div>

              <span className="panel-code">
                PAIRWISE EVIDENCE
              </span>
            </div>

            {!result ? (
              <div className="analysis-empty">
                <Icon name="hub" />

                <strong>
                  Select two or more signals
                </strong>

                <span>
                  Run correlation analysis to reveal
                  relationships, similarity and
                  temporal evidence.
                </span>
              </div>
            ) : pairs.length === 0 ? (
              <div className="analysis-empty">
                <Icon name="link_off" />

                <strong>
                  No pairwise evidence returned
                </strong>
              </div>
            ) : (
              <div className="topology-content">
                {pairs.map((pair, index) => (
                  <div
                    key={`${pair.signal_a}-${pair.signal_b}-${index}`}
                    className={`pair-card ${
                      pair.correlation?.correlated
                        ? "correlated"
                        : ""
                    }`}
                  >
                    <div className="pair-header">
                      <span className="pair-signal">
                        SIG-
                        {String(
                          pair.signal_a
                        ).padStart(5, "0")}
                      </span>

                      <Icon name="link" />

                      <span className="pair-signal">
                        SIG-
                        {String(
                          pair.signal_b
                        ).padStart(5, "0")}
                      </span>

                      <span
                        className={`pair-status ${
                          pair.correlation?.correlated
                            ? "confirmed"
                            : "unconfirmed"
                        }`}
                      >
                        {pair.correlation?.correlated
                          ? "CORRELATED"
                          : "UNCONFIRMED"}
                      </span>
                    </div>

                    <div className="pair-details">
                      <div>
                        <span>
                          SIMILARITY
                        </span>
                        <strong>
                          {pair.correlation
                            ?.combined_similarity ??
                            "—"}
                        </strong>
                      </div>

                      <div>
                        <span>
                          TEMPORAL DELTA
                        </span>
                        <strong>
                          {pair.temporal
                            ?.time_difference_minutes ??
                            "—"}
                          {pair.temporal
                            ?.time_difference_minutes !=
                            null && " min"}
                        </strong>
                      </div>

                      <div>
                        <span>EVIDENCE</span>
                        <strong>
                          {pair.correlation
                            ?.evidence?.join(
                              ", "
                            ) || "None"}
                        </strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="lower-analysis-grid">
            <div className="panel evidence-panel">
              <div className="panel-header">
                <div className="panel-title-with-icon">
                  <Icon name="fact_check" />
                  <h2>
                    Correlation Evidence
                  </h2>
                </div>
              </div>

              <div className="evidence-grid">
                <div className="evidence-block">
                  <span>01</span>

                  <div>
                    <h3>Shared Evidence</h3>

                    {evidence.length ? (
                      <ul>
                        {evidence
                          .slice(0, 6)
                          .map((item, index) => (
                            <li key={index}>
                              {item}
                            </li>
                          ))}
                      </ul>
                    ) : (
                      <p>
                        Awaiting correlation
                        evidence.
                      </p>
                    )}
                  </div>
                </div>

                <div className="evidence-block">
                  <span>02</span>

                  <div>
                    <h3>Cross-Platform</h3>

                    <p>
                      {result
                        ? crossPlatform
                          ? "Cross-platform corroboration detected."
                          : "No cross-platform corroboration detected."
                        : "Awaiting analysis."}
                    </p>
                  </div>
                </div>

                <div className="evidence-block">
                  <span>03</span>

                  <div>
                    <h3>Temporal Relationship</h3>

                    <p>
                      {result?.average_temporal_score ??
                        "Awaiting temporal score."}
                    </p>
                  </div>
                </div>

                <div className="evidence-block">
                  <span>04</span>

                  <div>
                    <h3>Analyst Confidence</h3>

                    <p>
                      {confidence != null
                        ? `${confidence}% — ${confidenceLevel}`
                        : "Awaiting confidence assessment."}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="panel assessment-panel">
              <div className="panel-header">
                <div className="panel-title-with-icon">
                  <Icon name="assignment" />
                  <h2>
                    Intelligence Assessment
                  </h2>
                </div>
              </div>

              <div className="assessment-body">
                <span className="assessment-kicker">
                  ANALYTICAL INTERPRETATION
                </span>

                <h3>
                  {result
                    ? confidence != null &&
                      Number(confidence) >= 80
                      ? "Strong correlation identified"
                      : "Analyst review required"
                    : "No assessment yet"}
                </h3>

                <p>
                  {result
                    ? `${result.signal_count || selectedIds.length} signals produced ${result.correlated_pairs || correlatedPairs.length} correlated pair(s).`
                    : "Run correlation analysis to generate an evidence-backed assessment."}
                </p>

                <div className="assessment-actions">
                  <button
                    type="button"
                    disabled={!result}
                    onClick={() =>
                      (window.location.href =
                        "/investigations")
                    }
                  >
                    <Icon name="open_in_new" />
                    Open Investigation
                  </button>

                  <button
                    type="button"
                    disabled={!result}
                    onClick={() =>
                      (window.location.href =
                        "/incidents")
                    }
                  >
                    <Icon name="warning" />
                    View Incidents
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}