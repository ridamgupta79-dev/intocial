import { useEffect, useMemo, useState } from "react";
import {
  acknowledgeAlert,
  getAlerts,
} from "../services/api";
import "./RiskAlerts.css";

function Icon({ name }) {
  return (
    <span className="material-symbols-outlined">
      {name}
    </span>
  );
}

function normalizeSeverity(alert) {
  return String(
    alert.severity ||
      alert.risk_level ||
      alert.risk ||
      "LOW"
  ).toUpperCase();
}

function getAlertTitle(alert) {
  return (
    alert.title ||
    alert.message ||
    alert.description ||
    "Risk alert requires analyst review"
  );
}

function getAlertText(alert) {
  return (
    alert.description ||
    alert.message ||
    alert.details ||
    "Automated risk detection generated this alert."
  );
}

function getPlatform(alert) {
  const value = String(
    alert.platform ||
      alert.source ||
      alert.source_platform ||
      "INTELLIGENCE ENGINE"
  );

  const normalized = value.toLowerCase();

  if (normalized.includes("youtube")) return "YouTube";
  if (normalized.includes("reddit")) return "Reddit";
  if (
    normalized === "x" ||
    normalized.includes("twitter")
  ) {
    return "X";
  }
  if (normalized.includes("telegram")) return "Telegram";
  if (normalized.includes("instagram")) return "Instagram";

  return value;
}

function getTimestamp(alert) {
  const value =
    alert.created_at ||
    alert.timestamp ||
    alert.createdAt ||
    alert.time;

  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function getAlertId(alert, index) {
  return (
    alert.id ||
    alert.alert_id ||
    `ALT-${String(index + 1).padStart(6, "0")}`
  );
}

function getRiskScore(alert) {
  const value =
    alert.risk_score ??
    alert.score ??
    alert.risk ??
    null;

  if (value === null || value === undefined) {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}

function isOpen(alert) {
  const status = String(
    alert.status || ""
  ).toUpperCase();

  return ![
    "ACKNOWLEDGED",
    "RESOLVED",
    "CLOSED",
    "ARCHIVED",
  ].includes(status);
}

function isAcknowledged(alert) {
  const status = String(
    alert.status || ""
  ).toUpperCase();

  return (
    status === "ACKNOWLEDGED" ||
    alert.acknowledged === true ||
    alert.is_acknowledged === true
  );
}

export default function RiskAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [severityFilter, setSeverityFilter] =
    useState("ALL");
  const [platformFilter, setPlatformFilter] =
    useState("ALL");
  const [search, setSearch] = useState("");
  const [unacknowledgedOnly, setUnacknowledgedOnly] =
    useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] =
    useState(null);
  const [error, setError] = useState("");

  async function loadAlerts(showRefresh = false) {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const data = await getAlerts();

      setAlerts(
        Array.isArray(data?.alerts)
          ? data.alerts
          : []
      );
    } catch (err) {
      console.error(
        "Risk alerts loading failed:",
        err
      );

      setError(
        err.response?.data?.detail ||
          "Unable to load risk alerts."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadAlerts();
  }, []);

  const activeAlerts = useMemo(
    () => alerts.filter(isOpen),
    [alerts]
  );

  const counts = useMemo(() => {
    return {
      critical: activeAlerts.filter(
        (alert) =>
          normalizeSeverity(alert) === "CRITICAL"
      ).length,

      high: activeAlerts.filter(
        (alert) =>
          normalizeSeverity(alert) === "HIGH"
      ).length,

      medium: activeAlerts.filter(
        (alert) =>
          normalizeSeverity(alert) === "MEDIUM"
      ).length,

      low: activeAlerts.filter(
        (alert) =>
          normalizeSeverity(alert) === "LOW"
      ).length,
    };
  }, [activeAlerts]);

  const platforms = useMemo(() => {
    return [
      ...new Set(
        activeAlerts
          .map(getPlatform)
          .filter(Boolean)
      ),
    ];
  }, [activeAlerts]);

  const filteredAlerts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return activeAlerts.filter((alert) => {
      const severity = normalizeSeverity(alert);
      const platform = getPlatform(alert);
      const title = getAlertTitle(alert).toLowerCase();
      const text = getAlertText(alert).toLowerCase();
      const id = String(
        getAlertId(alert, 0)
      ).toLowerCase();

      const matchesSeverity =
        severityFilter === "ALL" ||
        severity === severityFilter;

      const matchesPlatform =
        platformFilter === "ALL" ||
        platform === platformFilter;

      const matchesSearch =
        !query ||
        title.includes(query) ||
        text.includes(query) ||
        id.includes(query) ||
        platform.toLowerCase().includes(query);

      const matchesAcknowledgement =
        !unacknowledgedOnly ||
        !isAcknowledged(alert);

      return (
        matchesSeverity &&
        matchesPlatform &&
        matchesSearch &&
        matchesAcknowledgement
      );
    });
  }, [
    activeAlerts,
    severityFilter,
    platformFilter,
    search,
    unacknowledgedOnly,
  ]);

  const highPriority = useMemo(
    () =>
      activeAlerts
        .filter((alert) =>
          ["CRITICAL", "HIGH"].includes(
            normalizeSeverity(alert)
          )
        )
        .slice(0, 3),
    [activeAlerts]
  );

  const recentActivity = useMemo(
    () =>
      [...alerts]
        .sort((a, b) => {
          const aTime = new Date(
            a.created_at ||
              a.timestamp ||
              0
          ).getTime();

          const bTime = new Date(
            b.created_at ||
              b.timestamp ||
              0
          ).getTime();

          return bTime - aTime;
        })
        .slice(0, 5),
    [alerts]
  );

  const totalDistribution =
    counts.critical +
    counts.high +
    counts.medium +
    counts.low;

  async function handleAcknowledge(alert) {
    const alertId = Number(
      alert.id ?? alert.alert_id
    );

    if (!Number.isInteger(alertId)) {
      setError(
        "This alert does not have a valid database ID."
      );
      return;
    }

    try {
      setProcessingId(alertId);
      setError("");

      await acknowledgeAlert(alertId);

      await loadAlerts(true);
    } catch (err) {
      console.error(
        "Alert acknowledgement failed:",
        err
      );

      setError(
        err.response?.data?.detail ||
          "Unable to acknowledge this alert."
      );
    } finally {
      setProcessingId(null);
    }
  }

  function openIncident(alert) {
    const incidentId =
      alert.incident_id ||
      alert.incidentId;

    if (!incidentId) {
      return;
    }

    window.location.href = `/incidents?incident_id=${incidentId}`;
  }

  function openInvestigation(alert) {
    const signalId =
      alert.signal_id ||
      alert.signalId;

    if (!signalId) {
      return;
    }

    window.location.href = `/investigations?signal_id=${signalId}`;
  }

  return (
    <div className="risk-alerts-page">
      <header className="risk-alerts-header">
        <div>
          <div className="risk-alerts-eyebrow-row">
            <span className="risk-alerts-eyebrow">
              <span className="risk-alerts-status-dot" />
              RISK OPERATIONS
            </span>

            <span className="risk-alerts-subsystem">
              INTEL_SURVEILLANCE // SUB-TIER 01
            </span>
          </div>

          <h1>Risk &amp; Alerts</h1>

          <p>
            Review prioritized intelligence signals,
            automated anomaly scores, and adversarial
            threat vectors.
          </p>
        </div>

        <div className="risk-alerts-header-actions">
          <div className="risk-alerts-health">
            <span />
            ACTIVE MONITORING
          </div>

          <button
            type="button"
            className="risk-alerts-refresh"
            onClick={() => loadAlerts(true)}
            disabled={refreshing}
          >
            <Icon name="refresh" />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </header>

      {error && (
        <div className="risk-alerts-error">
          <Icon name="error" />
          <span>{error}</span>
        </div>
      )}

      <section className="risk-alerts-kpis">
        <div className="risk-alert-kpi critical">
          <div className="risk-alert-kpi-top">
            <span>CRITICAL</span>
            <span className="risk-alert-kpi-tag">
              Immediate Review
            </span>
          </div>

          <div className="risk-alert-kpi-value">
            {counts.critical}
          </div>

          <p>
            Active critical alerts requiring immediate
            analyst attention.
          </p>
        </div>

        <div className="risk-alert-kpi high">
          <div className="risk-alert-kpi-top">
            <span>HIGH</span>
            <span className="risk-alert-kpi-tag">
              Priority
            </span>
          </div>

          <div className="risk-alert-kpi-value">
            {counts.high}
          </div>

          <p>
            Coordinated or elevated-risk vectors
            awaiting review.
          </p>
        </div>

        <div className="risk-alert-kpi medium">
          <div className="risk-alert-kpi-top">
            <span>MEDIUM</span>
            <span className="risk-alert-kpi-tag">
              Review
            </span>
          </div>

          <div className="risk-alert-kpi-value">
            {counts.medium}
          </div>

          <p>
            Anomalous alerts currently queued for
            analysis.
          </p>
        </div>

        <div className="risk-alert-kpi low">
          <div className="risk-alert-kpi-top">
            <span>LOW</span>
            <span className="risk-alert-kpi-tag">
              Monitoring
            </span>
          </div>

          <div className="risk-alert-kpi-value">
            {counts.low}
          </div>

          <p>
            Baseline deviations remaining under
            monitoring.
          </p>
        </div>
      </section>

      <div className="risk-alerts-layout">
        <section className="risk-alerts-main panel">
          <div className="risk-alerts-queue-header">
            <div>
              <div className="risk-alerts-section-kicker">
                ALERT QUEUE
              </div>

              <div className="risk-alerts-queue-title">
                <span />
                {activeAlerts.length} Active Alerts
              </div>
            </div>

            <div className="risk-alerts-sync">
              QUEUE STATUS
              <strong>LIVE</strong>
            </div>
          </div>

          <div className="risk-alerts-filters">
            <div className="risk-alerts-tabs">
              {[
                ["ALL", activeAlerts.length],
                ["CRITICAL", counts.critical],
                ["HIGH", counts.high],
                ["MEDIUM", counts.medium],
                ["LOW", counts.low],
              ].map(([severity, count]) => (
                <button
                  key={severity}
                  type="button"
                  className={
                    severityFilter === severity
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    setSeverityFilter(severity)
                  }
                >
                  {severity} ({count})
                </button>
              ))}
            </div>

            <label className="risk-alerts-checkbox">
              <input
                type="checkbox"
                checked={unacknowledgedOnly}
                onChange={(event) =>
                  setUnacknowledgedOnly(
                    event.target.checked
                  )
                }
              />
              <span>Unacknowledged Only</span>
            </label>
          </div>

          <div className="risk-alerts-filter-row">
            <div className="risk-alerts-search">
              <Icon name="search" />

              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Filter alerts by ID, keyword, or source..."
              />
            </div>

            <select
              value={platformFilter}
              onChange={(event) =>
                setPlatformFilter(event.target.value)
              }
            >
              <option value="ALL">
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
          </div>

          {loading ? (
            <div className="risk-alerts-state">
              <Icon name="progress_activity" />
              Loading risk alerts...
            </div>
          ) : filteredAlerts.length === 0 ? (
            <div className="risk-alerts-state">
              <Icon name="fact_check" />
              No alerts match the current filters.
            </div>
          ) : (
            <div className="risk-alert-list">
              {filteredAlerts.map(
                (alert, index) => {
                  const severity =
                    normalizeSeverity(alert);
                  const alertId =
                    getAlertId(alert, index);
                  const score =
                    getRiskScore(alert);
                  const acknowledged =
                    isAcknowledged(alert);
                  const numericId = Number(
                    alert.id ?? alert.alert_id
                  );

                  return (
                    <article
                      key={`${alertId}-${index}`}
                      className={`risk-alert-card ${severity.toLowerCase()}`}
                    >
                      <div className="risk-alert-card-top">
                        <div className="risk-alert-card-meta">
                          <span className="risk-alert-id">
                            {alertId}
                          </span>

                          <span
                            className={`risk-alert-severity ${severity.toLowerCase()}`}
                          >
                            {severity}
                          </span>

                          <span className="risk-alert-source">
                            {getPlatform(alert)}
                          </span>

                          <span className="risk-alert-time">
                            {getTimestamp(alert)}
                          </span>
                        </div>

                        {score !== null && (
                          <span className="risk-alert-score">
                            RISK {score.toFixed(1)}
                          </span>
                        )}
                      </div>

                      <h3>{getAlertTitle(alert)}</h3>

                      <p className="risk-alert-description">
                        {getAlertText(alert)}
                      </p>

                      <div className="risk-alert-details">
                        <div>
                          <span>STATUS</span>
                          <strong>
                            {acknowledged
                              ? "ACKNOWLEDGED"
                              : "OPEN"}
                          </strong>
                        </div>

                        <div>
                          <span>SOURCE</span>
                          <strong>
                            {getPlatform(alert)}
                          </strong>
                        </div>

                        <div>
                          <span>ALERT ID</span>
                          <strong>{alertId}</strong>
                        </div>
                      </div>

                      <div className="risk-alert-actions">
                        <button
                          type="button"
                          onClick={() =>
                            handleAcknowledge(
                              alert
                            )
                          }
                          disabled={
                            acknowledged ||
                            processingId === numericId
                          }
                          className={
                            acknowledged
                              ? "acknowledged"
                              : ""
                          }
                        >
                          <Icon
                            name={
                              acknowledged
                                ? "done_all"
                                : "check"
                            }
                          />

                          {processingId === numericId
                            ? "Acknowledging..."
                            : acknowledged
                            ? "Acknowledged"
                            : "Acknowledge"}
                        </button>

                        {(alert.signal_id ||
                          alert.signalId) && (
                          <button
                            type="button"
                            onClick={() =>
                              openInvestigation(
                                alert
                              )
                            }
                          >
                            Open Investigation
                            <Icon name="arrow_forward" />
                          </button>
                        )}

                        {(alert.incident_id ||
                          alert.incidentId) && (
                          <button
                            type="button"
                            onClick={() =>
                              openIncident(alert)
                            }
                          >
                            Open Incident
                            <Icon name="folder_open" />
                          </button>
                        )}
                      </div>
                    </article>
                  );
                }
              )}
            </div>
          )}
        </section>

        <aside className="risk-alerts-rail">
          <section className="risk-alerts-side-panel panel">
            <div className="risk-alerts-side-heading">
              <div>
                <span>RISK DISTRIBUTION</span>
                <h2>Active Matrix</h2>
              </div>

              <Icon name="donut_large" />
            </div>

            <div className="risk-distribution-bar">
              <span
                className="critical"
                style={{
                  width:
                    totalDistribution > 0
                      ? `${(counts.critical /
                          totalDistribution) *
                          100}%`
                      : "0%",
                }}
              />

              <span
                className="high"
                style={{
                  width:
                    totalDistribution > 0
                      ? `${(counts.high /
                          totalDistribution) *
                          100}%`
                      : "0%",
                }}
              />

              <span
                className="medium"
                style={{
                  width:
                    totalDistribution > 0
                      ? `${(counts.medium /
                          totalDistribution) *
                          100}%`
                      : "0%",
                }}
              />

              <span
                className="low"
                style={{
                  width:
                    totalDistribution > 0
                      ? `${(counts.low /
                          totalDistribution) *
                          100}%`
                      : "0%",
                }}
              />
            </div>

            {[
              ["CRITICAL", counts.critical],
              ["HIGH", counts.high],
              ["MEDIUM", counts.medium],
              ["LOW", counts.low],
            ].map(([label, count]) => (
              <div
                key={label}
                className="risk-distribution-row"
              >
                <span>
                  <i className={label.toLowerCase()} />
                  {label}
                </span>

                <strong>
                  {count}
                </strong>
              </div>
            ))}
          </section>

          <section className="risk-alerts-side-panel panel">
            <div className="risk-alerts-side-heading">
              <div>
                <span>ALERT WORKFLOW</span>
                <h2>Queue Status</h2>
              </div>

              <Icon name="account_tree" />
            </div>

            {[
              [
                "Open",
                activeAlerts.filter(
                  (alert) =>
                    !isAcknowledged(alert)
                ).length,
                "critical",
              ],
              [
                "Acknowledged",
                alerts.filter(
                  isAcknowledged
                ).length,
                "blue",
              ],
              [
                "Resolved / Closed",
                alerts.filter((alert) =>
                  [
                    "RESOLVED",
                    "CLOSED",
                  ].includes(
                    String(
                      alert.status || ""
                    ).toUpperCase()
                  )
                ).length,
                "green",
              ],
            ].map(([label, count, tone]) => (
              <div
                key={label}
                className="workflow-row"
              >
                <div>
                  <span
                    className={`workflow-dot ${tone}`}
                  />
                  <span>{label}</span>
                </div>

                <strong>{count}</strong>
              </div>
            ))}
          </section>

          <section className="risk-alerts-side-panel panel">
            <div className="risk-alerts-side-heading">
              <div>
                <span>HIGH PRIORITY QUEUE</span>
                <h2>Priority Review</h2>
              </div>

              <span className="priority-count">
                {highPriority.length}
              </span>
            </div>

            <div className="priority-list">
              {highPriority.length === 0 ? (
                <p className="side-empty">
                  No high-priority alerts.
                </p>
              ) : (
                highPriority.map(
                  (alert, index) => (
                    <div
                      key={`${getAlertId(
                        alert,
                        index
                      )}-priority`}
                      className="priority-item"
                    >
                      <div>
                        <strong>
                          {getAlertId(
                            alert,
                            index
                          )}
                        </strong>

                        <span
                          className={
                            normalizeSeverity(
                              alert
                            ).toLowerCase()
                          }
                        >
                          {normalizeSeverity(
                            alert
                          )}
                        </span>
                      </div>

                      <p>
                        {getAlertTitle(alert)}
                      </p>

                      <small>
                        {getTimestamp(alert)}
                      </small>
                    </div>
                  )
                )
              )}
            </div>
          </section>

          <section className="risk-alerts-side-panel panel">
            <div className="risk-alerts-side-heading">
              <div>
                <span>RECENT ACTIVITY</span>
                <h2>Alert History</h2>
              </div>

              <Icon name="history" />
            </div>

            <div className="activity-list">
              {recentActivity.length === 0 ? (
                <p className="side-empty">
                  No recent alert activity.
                </p>
              ) : (
                recentActivity.map(
                  (alert, index) => (
                    <div
                      key={`${getAlertId(
                        alert,
                        index
                      )}-activity`}
                      className="activity-item"
                    >
                      <span
                        className={`activity-dot ${normalizeSeverity(
                          alert
                        ).toLowerCase()}`}
                      />

                      <div>
                        <time>
                          {getTimestamp(alert)}
                        </time>

                        <p>
                          <strong>
                            {getAlertId(
                              alert,
                              index
                            )}
                          </strong>{" "}
                          {isAcknowledged(alert)
                            ? "acknowledged"
                            : "flagged for analyst review"}
                        </p>
                      </div>
                    </div>
                  )
                )
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}