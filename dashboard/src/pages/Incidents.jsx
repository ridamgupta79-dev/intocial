import { useEffect, useMemo, useState } from "react";
import {
  getIncidents,
  getAlerts,
  acknowledgeAlert,
} from "../services/api";
import "./Incidents.css";

function Icon({ name, className = "" }) {
  return (
    <span className={`material-symbols-outlined ${className}`}>
      {name}
    </span>
  );
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString();
}

function getRiskLevel(incident) {
  return String(
    incident.risk_level ||
      incident.severity ||
      "LOW"
  ).toUpperCase();
}

function getRiskClass(level) {
  return String(level || "LOW").toLowerCase();
}

function getStatus(incident) {
  return String(
    incident.status || "OPEN"
  ).toUpperCase();
}

function isActiveIncident(incident) {
  return ![
    "CLOSED",
    "RESOLVED",
    "ARCHIVED",
  ].includes(getStatus(incident));
}

function getIncidentKey(incident, index) {
  return (
    incident.incident_key ||
    incident.incident_id ||
    incident.id ||
    `INC-${String(index + 1).padStart(6, "0")}`
  );
}

function getSignalCount(incident) {
  return Number(
    incident.signal_count ||
      incident.signals_count ||
      0
  );
}

function getPlatforms(incident) {
  if (Array.isArray(incident.platforms)) {
    return incident.platforms;
  }

  if (typeof incident.platforms === "string") {
    return incident.platforms
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function Incidents() {
  const [incidents, setIncidents] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [statusFilter, setStatusFilter] =
    useState("ALL");

  const [severityFilter, setSeverityFilter] =
    useState("ALL");

  const [search, setSearch] = useState("");

  async function loadData() {
    try {
      setError("");

      const [incidentData, alertData] =
        await Promise.all([
          getIncidents(),
          getAlerts(),
        ]);

      setIncidents(
        incidentData?.incidents || []
      );

      setAlerts(
        alertData?.alerts || []
      );
    } catch (err) {
      console.error(err);
      setError(
        "Failed to load incidents and alerts."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  async function handleAcknowledge(alertId) {
    try {
      setError("");
      await acknowledgeAlert(alertId);
      await loadData();
    } catch (err) {
      console.error(err);
      setError(
        "Failed to acknowledge alert."
      );
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const activeIncidents = useMemo(
    () =>
      incidents.filter(isActiveIncident),
    [incidents]
  );

  const criticalIncidents = useMemo(
    () =>
      activeIncidents.filter(
        (incident) =>
          getRiskLevel(incident) === "CRITICAL"
      ),
    [activeIncidents]
  );

  const highRiskIncidents = useMemo(
    () =>
      activeIncidents.filter(
        (incident) =>
          ["HIGH", "CRITICAL"].includes(
            getRiskLevel(incident)
          )
      ),
    [activeIncidents]
  );

  const openAlerts = useMemo(
    () =>
      alerts.filter(
        (alert) =>
          String(
            alert.status || ""
          ).toUpperCase() === "OPEN"
      ),
    [alerts]
  );

  const investigatingCount = useMemo(
    () =>
      activeIncidents.filter(
        (incident) =>
          getStatus(incident) ===
          "INVESTIGATING"
      ).length,
    [activeIncidents]
  );

  const resolvedCount = useMemo(
    () =>
      incidents.filter((incident) =>
        ["RESOLVED", "CLOSED"].includes(
          getStatus(incident)
        )
      ).length,
    [incidents]
  );

  const filteredIncidents = useMemo(() => {
    const normalizedSearch =
      search.trim().toLowerCase();

    return incidents.filter((incident) => {
      const status = getStatus(incident);
      const severity = getRiskLevel(incident);

      if (
        statusFilter === "ACTIVE" &&
        !isActiveIncident(incident)
      ) {
        return false;
      }

      if (
        statusFilter !== "ALL" &&
        statusFilter !== "ACTIVE" &&
        status !== statusFilter
      ) {
        return false;
      }

      if (
        severityFilter !== "ALL" &&
        severity !== severityFilter
      ) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const searchable = [
        incident.incident_key,
        incident.incident_id,
        incident.id,
        incident.title,
        incident.description,
        incident.status,
        incident.risk_level,
        incident.severity,
        ...getPlatforms(incident),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(
        normalizedSearch
      );
    });
  }, [
    incidents,
    search,
    statusFilter,
    severityFilter,
  ]);

  const severityDistribution = useMemo(() => {
    const counts = {
      CRITICAL: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0,
    };

    activeIncidents.forEach((incident) => {
      const level = getRiskLevel(incident);

      if (counts[level] !== undefined) {
        counts[level] += 1;
      }
    });

    return counts;
  }, [activeIncidents]);

  const pipelineCounts = useMemo(
    () => ({
      triage: activeIncidents.filter(
        (incident) =>
          getStatus(incident) === "OPEN"
      ).length,
      investigation: investigatingCount,
      resolved: resolvedCount,
    }),
    [
      activeIncidents,
      investigatingCount,
      resolvedCount,
    ]
  );

  if (loading) {
    return (
      <div className="incidents-page">
        <div className="incidents-loading">
          <Icon name="progress_activity" />
          <strong>
            Loading incident intelligence...
          </strong>
        </div>
      </div>
    );
  }

  return (
    <div className="incidents-page">
      <header className="incidents-command-header">
        <div>
          <div className="incidents-title-row">
            <h1>Incidents</h1>

            <span className="incidents-kicker">
              INCIDENT MANAGEMENT
            </span>

            <span className="incidents-live-label">
              LIVE REGISTER
            </span>
          </div>

          <p>
            Monitor, investigate, correlate and
            manage active intelligence incidents
            across threat vectors.
          </p>
        </div>

        <div className="incidents-header-actions">
          <button
            type="button"
            className="incidents-secondary-button"
            onClick={() => window.print()}
          >
            <Icon name="download" />
            <span>Export Register</span>
          </button>

          <button
            type="button"
            className="incidents-primary-button"
            onClick={() =>
              (window.location.href =
                "/investigations")
            }
          >
            <Icon name="add" />
            <span>Create Investigation</span>
          </button>
        </div>
      </header>

      {error && (
        <div className="incidents-error">
          <Icon name="error" />
          <span>{error}</span>

          <button
            type="button"
            onClick={handleRefresh}
          >
            Retry
          </button>
        </div>
      )}

      <section className="incident-metric-grid">
        <div className="incident-metric-card">
          <div className="incident-metric-top">
            <div>
              <span className="incident-metric-label">
                ACTIVE INCIDENTS
              </span>

              <strong>
                {formatNumber(
                  activeIncidents.length
                )}
              </strong>
            </div>

            <div className="incident-metric-icon teal">
              <Icon name="warning" />
            </div>
          </div>

          <div className="incident-metric-footer">
            <span>
              {investigatingCount} under
              investigation
            </span>

            <span className="metric-tag teal">
              ACTIVE
            </span>
          </div>
        </div>

        <div className="incident-metric-card">
          <div className="incident-metric-top">
            <div>
              <span className="incident-metric-label">
                CRITICAL INCIDENTS
              </span>

              <strong className="critical-value">
                {String(
                  criticalIncidents.length
                ).padStart(2, "0")}
              </strong>
            </div>

            <div className="incident-metric-icon red">
              <Icon name="priority_high" />
            </div>
          </div>

          <div className="incident-metric-footer">
            <span>
              Requires immediate review
            </span>

            <span className="metric-tag red">
              CRITICAL
            </span>
          </div>
        </div>

        <div className="incident-metric-card">
          <div className="incident-metric-top">
            <div>
              <span className="incident-metric-label">
                HIGH RISK INCIDENTS
              </span>

              <strong className="high-value">
                {formatNumber(
                  highRiskIncidents.length
                )}
              </strong>
            </div>

            <div className="incident-metric-icon orange">
              <Icon name="shield" />
            </div>
          </div>

          <div className="incident-metric-footer">
            <span>
              High-priority threat activity
            </span>

            <span className="metric-tag orange">
              HIGH RISK
            </span>
          </div>
        </div>

        <div className="incident-metric-card">
          <div className="incident-metric-top">
            <div>
              <span className="incident-metric-label">
                OPEN RAW ALERTS
              </span>

              <strong className="blue-value">
                {formatNumber(
                  openAlerts.length
                )}
              </strong>
            </div>

            <div className="incident-metric-icon blue">
              <Icon name="notifications_active" />
            </div>
          </div>

          <div className="incident-metric-footer">
            <span>
              Awaiting analyst triage
            </span>

            <span className="metric-tag blue">
              OPEN
            </span>
          </div>
        </div>
      </section>

      <div className="incidents-workspace-grid">
        <main className="incidents-register-column">
          <section className="incident-filter-panel">
            <div className="incident-filter-row">
              <div className="incident-search">
                <Icon name="search" />

                <input
                  type="text"
                  placeholder="Filter incidents..."
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value
                    )
                  }
                />
              </div>

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value
                  )
                }
              >
                <option value="ALL">
                  All Statuses
                </option>
                <option value="ACTIVE">
                  Active
                </option>
                <option value="OPEN">
                  Open
                </option>
                <option value="INVESTIGATING">
                  Investigating
                </option>
                <option value="RESOLVED">
                  Resolved
                </option>
                <option value="CLOSED">
                  Closed
                </option>
              </select>

              <select
                value={severityFilter}
                onChange={(event) =>
                  setSeverityFilter(
                    event.target.value
                  )
                }
              >
                <option value="ALL">
                  All Severities
                </option>
                <option value="CRITICAL">
                  Critical
                </option>
                <option value="HIGH">
                  High
                </option>
                <option value="MEDIUM">
                  Medium
                </option>
                <option value="LOW">
                  Low
                </option>
              </select>

              <button
                type="button"
                className="incident-refresh-button"
                onClick={handleRefresh}
                disabled={refreshing}
                title="Refresh incidents"
              >
                <Icon
                  name="sync"
                  className={
                    refreshing
                      ? "incident-spin"
                      : ""
                  }
                />
              </button>
            </div>

            <div className="incident-filter-tabs">
              {[
                ["ALL", "All", incidents.length],
                [
                  "ACTIVE",
                  "Active",
                  activeIncidents.length,
                ],
                [
                  "INVESTIGATING",
                  "Investigating",
                  investigatingCount,
                ],
                [
                  "RESOLVED",
                  "Resolved",
                  resolvedCount,
                ],
              ].map(
                ([value, label, count]) => (
                  <button
                    key={value}
                    type="button"
                    className={
                      statusFilter === value
                        ? "active"
                        : ""
                    }
                    onClick={() =>
                      setStatusFilter(value)
                    }
                  >
                    {label} ({count})
                  </button>
                )
              )}
            </div>

            <div className="incident-filter-status">
              <span className="status-dot" />
              FILTER APPLIED:
              <strong>
                {filteredIncidents.length} INCIDENTS
              </strong>
            </div>
          </section>

          <section className="incident-register">
            {filteredIncidents.length === 0 ? (
              <div className="incident-empty">
                <Icon name="search_off" />
                <strong>
                  No incidents found
                </strong>
                <span>
                  Try adjusting the current
                  filters or search.
                </span>
              </div>
            ) : (
              filteredIncidents.map(
                (incident, index) => {
                  const risk =
                    getRiskLevel(incident);

                  const status =
                    getStatus(incident);

                  const platforms =
                    getPlatforms(incident);

                  return (
                    <article
                      key={
                        incident.id ||
                        incident.incident_key ||
                        index
                      }
                      className={`incident-card ${getRiskClass(
                        risk
                      )}`}
                    >
                      <div className="incident-card-top">
                        <div className="incident-card-meta">
                          <span className="incident-id">
                            {getIncidentKey(
                              incident,
                              index
                            )}
                          </span>

                          <span
                            className={`incident-risk ${getRiskClass(
                              risk
                            )}`}
                          >
                            <span />
                            {risk}
                          </span>

                          <span
                            className={`incident-status ${status.toLowerCase()}`}
                          >
                            {status}
                          </span>

                          {platforms.length > 0 && (
                            <span className="incident-platform">
                              <Icon name="share" />
                              {platforms.join(
                                " & "
                              )}
                            </span>
                          )}
                        </div>

                        <span className="incident-updated">
                          {incident.updated_at
                            ? new Date(
                                incident.updated_at
                              ).toLocaleString()
                            : "Current record"}
                        </span>
                      </div>

                      <div className="incident-card-content">
                        <h2>
                          {incident.title ||
                            "Untitled intelligence incident"}
                        </h2>

                        <p>
                          {incident.description ||
                            "No incident description is available for this record."}
                        </p>
                      </div>

                      {Array.isArray(
                        incident.tags
                      ) &&
                        incident.tags.length > 0 && (
                          <div className="incident-tags">
                            {incident.tags
                              .slice(0, 5)
                              .map((tag) => (
                                <span
                                  key={tag}
                                >
                                  #{tag}
                                </span>
                              ))}
                          </div>
                        )}

                      <div className="incident-card-footer">
                        <div className="incident-telemetry">
                          <div>
                            <span>
                              CORRELATED SIGNALS
                            </span>

                            <strong>
                              {formatNumber(
                                getSignalCount(
                                  incident
                                )
                              )}
                            </strong>
                          </div>

                          <div>
                            <span>
                              RISK SCORE
                            </span>

                            <strong>
                              {incident.risk_score ??
                                "—"}
                            </strong>
                          </div>

                          <div>
                            <span>
                              PLATFORMS
                            </span>

                            <strong>
                              {platforms.length ||
                                "—"}
                            </strong>
                          </div>
                        </div>

                        <div className="incident-actions">
                          <button
                            type="button"
                            onClick={() =>
                              (window.location.href =
                                `/investigations?incident_id=${incident.id}`)
                            }
                          >
                            Open Investigation
                            <Icon name="arrow_forward" />
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                }
              )
            )}
          </section>
        </main>

        <aside className="incidents-side-column">
          <section className="incident-side-panel">
            <div className="incident-side-header">
              <div>
                <span>RISK DISTRIBUTION</span>
                <h2>Incident Risk</h2>
              </div>

              <span>
                N={activeIncidents.length}
              </span>
            </div>

            <div className="risk-distribution-bar">
              {Object.entries(
                severityDistribution
              ).map(([level, count]) => (
                <span
                  key={level}
                  className={`risk-segment ${getRiskClass(
                    level
                  )}`}
                  style={{
                    width: `${
                      activeIncidents.length
                        ? (count /
                            activeIncidents.length) *
                          100
                        : 0
                    }%`,
                  }}
                />
              ))}
            </div>

            <div className="risk-legend">
              {Object.entries(
                severityDistribution
              ).map(([level, count]) => (
                <div key={level}>
                  <span
                    className={`legend-dot ${getRiskClass(
                      level
                    )}`}
                  />

                  <strong>{level}</strong>

                  <span>{count}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="incident-side-panel">
            <div className="incident-side-header">
              <div>
                <span>INCIDENT PIPELINE</span>
                <h2>Workflow Status</h2>
              </div>

              <span className="side-live">
                ACTIVE
              </span>
            </div>

            <div className="pipeline-list">
              <div>
                <span className="pipeline-number">
                  1
                </span>

                <strong>Initial Triage</strong>

                <b>
                  {pipelineCounts.triage}
                </b>
              </div>

              <div className="current">
                <span className="pipeline-number">
                  2
                </span>

                <strong>
                  Deep Investigation
                </strong>

                <b>
                  {pipelineCounts.investigation}
                </b>
              </div>

              <div>
                <span className="pipeline-number">
                  3
                </span>

                <strong>
                  Resolved / Closed
                </strong>

                <b>
                  {pipelineCounts.resolved}
                </b>
              </div>
            </div>
          </section>

          <section className="incident-side-panel priority-panel">
            <div className="incident-side-header">
              <div>
                <span>HIGH PRIORITY QUEUE</span>
                <h2>Open Alerts</h2>
              </div>

              <span className="priority-count">
                {openAlerts.length}
              </span>
            </div>

            <div className="priority-list">
              {openAlerts.length === 0 ? (
                <div className="side-empty">
                  <Icon name="check_circle" />
                  No open alerts.
                </div>
              ) : (
                openAlerts
                  .slice(0, 5)
                  .map((alert) => (
                    <div
                      className="priority-item"
                      key={alert.id}
                    >
                      <div>
                        <strong>
                          {alert.alert_key ||
                            `ALT-${String(
                              alert.id
                            ).padStart(
                              6,
                              "0"
                            )}`}
                        </strong>

                        <span>
                          {alert.title ||
                            alert.message ||
                            "Risk alert requires review"}
                        </span>

                        <small>
                          Severity:{" "}
                          {String(
                            alert.severity ||
                              "HIGH"
                          ).toUpperCase()}
                        </small>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          handleAcknowledge(
                            alert.id
                          )
                        }
                      >
                        Acknowledge
                      </button>
                    </div>
                  ))
              )}
            </div>
          </section>

          <section className="incident-side-panel activity-panel">
            <div className="incident-side-header">
              <div>
                <span>RECENT ACTIVITY</span>
                <h2>Incident Activity</h2>
              </div>

              <Icon name="history" />
            </div>

            <div className="activity-list">
              {incidents
                .slice(0, 5)
                .map((incident, index) => (
                  <div
                    className="activity-item"
                    key={
                      incident.id || index
                    }
                  >
                    <span className="activity-time">
                      {incident.updated_at
                        ? new Date(
                            incident.updated_at
                          ).toLocaleTimeString(
                            [],
                            {
                              hour: "2-digit",
                              minute:
                                "2-digit",
                            }
                          )
                        : "—"}
                    </span>

                    <div>
                      <strong>
                        {getIncidentKey(
                          incident,
                          index
                        )}
                      </strong>

                      <span>
                        {incident.title ||
                          "Incident updated"}
                      </span>
                    </div>
                  </div>
                ))}
            </div>

            <button
              type="button"
              className="full-activity-button"
              onClick={handleRefresh}
            >
              Refresh Activity
              <Icon name="chevron_right" />
            </button>
          </section>
        </aside>
      </div>
    </div>
  );
}

export default Incidents;