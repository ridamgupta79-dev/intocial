import "./Overview.css";
import { useEffect, useMemo, useState } from "react";

import {
  getActivityAnomalies,
  getAlerts,
  getDashboardSignals,
  getDashboardSummary,
  getHealth,
  getIncidents,
  getLiveSummary,
  getPlatformAnalytics,
} from "../services/api";
import api from "../services/api";

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

function formatPercent(value) {
  if (value === null || value === undefined) {
    return "—";
  }

  return `${Number(value).toFixed(1)}%`;
}

function getRiskClass(level) {
  return String(level || "LOW").toLowerCase();
}

function getPlatformName(platform) {
  const value = String(
    platform?.platform ||
      platform?.name ||
      platform?.source ||
      ""
  ).toLowerCase();

  if (value.includes("youtube")) return "YouTube";
  if (value.includes("reddit")) return "Reddit";
  if (value === "x" || value.includes("twitter")) return "X";
  if (value.includes("telegram")) return "Telegram";
  if (value.includes("instagram")) return "Instagram";

  return platform?.platform || platform?.name || "Other";
}

function getSignalId(signal, index) {
  return (
    signal.signal_id ||
    signal.id ||
    signal.signalId ||
    `SIG-${String(index + 1).padStart(5, "0")}`
  );
}

function getSignalTime(signal) {
  const value =
    signal.timestamp ||
    signal.created_at ||
    signal.createdAt ||
    signal.time;

  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function getSignalLocation(signal) {
  return (
    signal.location ||
    signal.location_name ||
    signal.place ||
    signal.region ||
    "—"
  );
}

function getSignalPlatform(signal) {
  const value = String(
    signal.platform ||
      signal.source ||
      signal.source_platform ||
      ""
  ).toLowerCase();

  if (value.includes("youtube")) return "YouTube";
  if (value.includes("reddit")) return "Reddit";
  if (value === "x" || value.includes("twitter")) return "X";
  if (value.includes("telegram")) return "Telegram";
  if (value.includes("instagram")) return "Instagram";

  return signal.platform || signal.source || "Other";
}

function getRiskCount(item, level) {
  return Number(
    item?.[level] ??
      item?.[level.toLowerCase()] ??
      0
  );
}

function formatTrendDate(value, range) {
  if (!value) return "—";

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  if (range === "24H") {
    return "Today";
  }

  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
}

function getRangeDates(range) {
  const end = new Date();
  const start = new Date(end);

  if (range === "7D") {
    start.setDate(end.getDate() - 6);
  } else if (range === "30D") {
    start.setDate(end.getDate() - 29);
  }

  const toDateString = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  return {
    start_date: toDateString(start),
    end_date: toDateString(end),
  };
}

function Overview() {
  const [systemStatus, setSystemStatus] = useState("CHECKING");
  const [summary, setSummary] = useState(null);
  const [signals, setSignals] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [riskTrends, setRiskTrends] = useState([]);
  const [platforms, setPlatforms] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [timeRange, setTimeRange] = useState("24H");
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  async function loadDashboard() {
    try {
      setError("");

      const [
        health,
        summaryData,
        signalsData,
        liveSummary,
        incidentsData,
        alertsData,
        platformsData,
        anomaliesData,
      ] = await Promise.all([
        getHealth(),
        getDashboardSummary(),
        getDashboardSignals(),
        getLiveSummary(),
        getIncidents(),
        getAlerts(),
        getPlatformAnalytics(),
        getActivityAnomalies(),
      ]);

      setSystemStatus(
        health.status === "healthy"
          ? "OPERATIONAL"
          : "DEGRADED"
      );

      setSummary({
        ...summaryData,
        live_total: liveSummary?.total || 0,
        live_risk_distribution:
          liveSummary?.risk_distribution || {},
      });

      setSignals(signalsData?.signals || []);
      setIncidents(incidentsData?.incidents || []);
      setAlerts(alertsData?.alerts || []);
      setPlatforms(platformsData?.platforms || []);
      setAnomalies(anomaliesData?.anomalies || []);
    } catch (err) {
      console.error("Overview loading failed:", err);

      setSystemStatus("OFFLINE");
      setError(
        "Unable to connect to the intelligence backend."
      );
    }
  }

  useEffect(() => {
    async function loadRiskActivity() {
      try {
        const params = getRangeDates(timeRange);
        const response = await api.get(
          "/analytics/risk-trends",
          { params }
        );
        setRiskTrends(response.data?.trends || []);
      } catch (err) {
        console.error(
          "Risk activity loading failed:",
          err
        );
        setRiskTrends([]);
      }
    }

    loadRiskActivity();
  }, [timeRange]);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function handleRefresh() {
    setRefreshing(true);

    await loadDashboard();

    setRefreshing(false);
  }

  const openAlerts = useMemo(
    () =>
      alerts.filter(
        (alert) =>
          String(alert.status || "").toUpperCase() ===
          "OPEN"
      ),
    [alerts]
  );

  const activeIncidents = useMemo(
    () =>
      incidents.filter((incident) => {
        const status = String(
          incident.status || ""
        ).toUpperCase();

        return ![
          "CLOSED",
          "RESOLVED",
          "ARCHIVED",
        ].includes(status);
      }),
    [incidents]
  );

  const highRiskSignals = useMemo(() => {
    const distribution =
      summary?.live_risk_distribution || {};

    return (
      Number(distribution.high || 0) +
      Number(distribution.critical || 0)
    );
  }, [summary]);

  const chartData = useMemo(() => {
    return riskTrends.map((item) => ({
      date: item.date,
      LOW: getRiskCount(item, "LOW"),
      MEDIUM: getRiskCount(item, "MEDIUM"),
      HIGH: getRiskCount(item, "HIGH"),
      CRITICAL: getRiskCount(item, "CRITICAL"),
    }));
  }, [riskTrends]);

  const chartMax = useMemo(() => {
    const maxValue = Math.max(
      ...chartData.map((item) =>
        Math.max(
          item.LOW,
          item.MEDIUM,
          item.HIGH,
          item.CRITICAL
        )
      ),
      1
    );

    return Math.max(
      4,
      Math.ceil(maxValue / 4) * 4
    );
  }, [chartData]);

  const chartYLabels = useMemo(() => {
    return [
      chartMax,
      Math.round(chartMax * 0.75),
      Math.round(chartMax * 0.5),
      Math.round(chartMax * 0.25),
      0,
    ];
  }, [chartMax]);

  const chartSeries = useMemo(() => {
    const levels = [
      { key: "LOW", label: "Low", color: "#2f7d4a" },
      { key: "MEDIUM", label: "Medium", color: "#b07a1b" },
      { key: "HIGH", label: "High", color: "#c65a24" },
      { key: "CRITICAL", label: "Critical", color: "#762d36" },
    ];

    return levels.map((level) => ({
      ...level,
      points: chartData.map((item, index) => {
        const x =
          chartData.length === 1
            ? 50
            : (index / (chartData.length - 1)) * 100;
        const y =
          88 -
          (item[level.key] / chartMax) * 68;

        return {
          x,
          y,
          value: item[level.key],
        };
      }),
    }));
  }, [chartData, chartMax]);

  const chartXLabels = useMemo(() => {
    if (!chartData.length) return [];

    const count = Math.min(5, chartData.length);
    const indexes = Array.from(
      { length: count },
      (_, index) => {
        if (count === 1) return 0;
        return Math.round(
          (index / (count - 1)) *
            (chartData.length - 1)
        );
      }
    );

    return indexes.map((index) => ({
      label: formatTrendDate(
        chartData[index].date,
        timeRange
      ),
      index,
    }));
  }, [chartData, timeRange]);

  const sourceActivity = useMemo(() => {
    let items = Array.isArray(platforms)
      ? platforms
      : [];

    if (!items.length && platforms && typeof platforms === "object") {
      items = Object.entries(platforms).map(
        ([platform, value]) => ({
          platform,
          count:
            typeof value === "number"
              ? value
              : value?.count || value?.total_signals || 0,
        })
      );
    }

    const normalized = items.map((item) => ({
      name: getPlatformName(item),
      count: Number(
        item.total_signals ??
          item.count ??
          item.total ??
          item.signals ??
          item.volume ??
          item.message_count ??
          0
      ),
    }));

    const total = normalized.reduce(
      (sum, item) => sum + item.count,
      0
    );

    return normalized
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map((item) => ({
        ...item,
        percentage:
          total > 0
            ? (item.count / total) * 100
            : 0,
      }));
  }, [platforms]);

  const attentionQueue = useMemo(() => {
    const alertItems = openAlerts.slice(0, 4);

    if (alertItems.length) {
      return alertItems.map((alert) => ({
        id: alert.id,
        title:
          alert.title ||
          alert.message ||
          "Risk alert requires review",
        source:
          alert.platform ||
          alert.source ||
          "INTELLIGENCE ENGINE",
        severity:
          alert.severity ||
          alert.risk_level ||
          "HIGH",
        time:
          alert.created_at ||
          alert.timestamp ||
          "",
      }));
    }

    return signals
      .filter((signal) =>
        ["HIGH", "CRITICAL"].includes(
          String(signal.risk_level || "").toUpperCase()
        )
      )
      .slice(0, 4)
      .map((signal, index) => ({
        id: getSignalId(signal, index),
        title:
          signal.text ||
          signal.prediction ||
          "High-risk signal",
        source: getSignalPlatform(signal),
        severity:
          signal.risk_level || "HIGH",
        time: getSignalTime(signal),
      }));
  }, [openAlerts, signals]);

  const emergingPatterns = useMemo(() => {
    return anomalies
      .slice(-4)
      .reverse()
      .map((item) => {
        const score = Number(item.anomaly_score || 0);

        return {
          pattern: item.is_anomaly
            ? "Significant activity anomaly"
            : "Activity pattern",
          volume: Number(item.signal_count || 0),
          risk: item.is_anomaly ? "HIGH" : "LOW",
          confidence: null,
          trend:
            score > 0
              ? `Anomaly score +${score.toFixed(2)}`
              : `Anomaly score ${score.toFixed(2)}`,
        };
      });
  }, [anomalies]);

  if (error && !summary) {
    return (
      <div className="intocial-overview">
        <div className="overview-error">
          <Icon name="error" />
          <div>
            <strong>Backend connection unavailable</strong>
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
          >
            RETRY
          </button>
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="intocial-overview">
        <div className="overview-loading">
          <Icon name="progress_activity" />
          <span>Loading operational intelligence...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="intocial-overview">
      <header className="overview-command-header">
        <div>
          <div className="overview-title-row">
            <h1>Overview</h1>
            <span className="workspace-label">
              LIVE WORKSPACE
            </span>
          </div>

          <p>
            Operational intelligence — Monitor signals,
            emerging risks, incidents and investigations
            from one workspace.
          </p>
        </div>

        <div className="overview-header-actions">
          <button
            type="button"
            className="last-updated"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <Icon
              name="sync"
              className={
                refreshing ? "icon-spin" : ""
              }
            />
            <span>
              Last updated{" "}
              <strong>
                {new Date().toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </strong>{" "}
              • Today
            </span>
          </button>

          <button
            type="button"
            className="new-investigation-button"
            onClick={() =>
              (window.location.href =
                "/investigations")
            }
          >
            <Icon name="add" />
            New Investigation
          </button>
        </div>
      </header>

      <section className="operational-ribbon">
        <div className="operational-metric">
          <div className="metric-heading">
            <span>ACTIVE SIGNALS</span>
            <Icon name="query_stats" />
          </div>

          <div className="metric-value-row">
            <strong>
              {formatNumber(summary.live_total)}
            </strong>
            <span className="metric-positive">
              <Icon name="arrow_upward" />
              Live
            </span>
          </div>

          <small>Current monitored signal volume</small>
        </div>

        <div className="operational-metric">
          <div className="metric-heading">
            <span>HIGH RISK SIGNALS</span>
            <Icon
              name="shield"
              className="risk-icon-high"
            />
          </div>

          <div className="metric-value-row">
            <strong className="metric-high">
              {formatNumber(highRiskSignals)}
            </strong>
            <span className="metric-risk-label">
              HIGH
            </span>
          </div>

          <small>High + critical classifications</small>
        </div>

        <div className="operational-metric">
          <div className="metric-heading">
            <span>ACTIVE INCIDENTS</span>
            <Icon name="warning" />
          </div>

          <div className="metric-value-row">
            <strong>
              {formatNumber(activeIncidents.length)}
            </strong>
            <span className="metric-neutral">
              OPEN
            </span>
          </div>

          <small>Incident registry currently active</small>
        </div>

        <div className="operational-metric">
          <div className="metric-heading">
            <span>OPEN ALERTS</span>
            <Icon
              name="notifications_active"
              className="risk-icon-critical"
            />
          </div>

          <div className="metric-value-row">
            <strong className="metric-critical">
              {formatNumber(openAlerts.length)}
            </strong>
            <span className="metric-critical-label">
              ATTENTION
            </span>
          </div>

          <small>Alerts requiring analyst review</small>
        </div>
      </section>

      <section className="overview-primary-grid">
        <div className="overview-panel risk-activity-panel">
          <div className="overview-panel-header">
            <div>
              <span className="section-kicker">
                RISK ACTIVITY
              </span>
              <h2>Signal Risk Activity</h2>
            </div>

            <div className="time-range-control">
              {["24H", "7D", "30D"].map((range) => (
                <button
                  key={range}
                  type="button"
                  className={
                    timeRange === range
                      ? "active"
                      : ""
                  }
                  onClick={() => setTimeRange(range)}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>

          <div className="risk-chart">
            <div className="chart-y-axis">
              {chartYLabels.map((label) => (
                <span key={label}>
                  {formatNumber(label)}
                </span>
              ))}
            </div>

            <div className="chart-area">
              <div className="chart-grid-lines">
                <span />
                <span />
                <span />
                <span />
                <span />
              </div>

              {chartData.length > 0 ? (
                <svg
                  className="risk-chart-svg"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                >
                  {chartSeries.map((series) => {
                    const points = series.points
                      .map(
                        (point) =>
                          `${point.x},${point.y}`
                      )
                      .join(" ");

                    return (
                      <g key={series.key}>
                        {chartData.length > 1 && (
                          <polyline
                            points={points}
                            fill="none"
                            stroke={series.color}
                            strokeWidth="1.8"
                            vectorEffect="non-scaling-stroke"
                          />
                        )}

                        {series.points.map(
                          (point, index) => (
                            <circle
                              key={`${series.key}-${index}`}
                              cx={point.x}
                              cy={point.y}
                              r="1.35"
                              fill={series.color}
                            />
                          )
                        )}
                      </g>
                    );
                  })}
                </svg>
              ) : (
                <div className="chart-empty">
                  No risk activity for this period
                </div>
              )}

              <div className="chart-x-axis">
                {chartXLabels.map((item) => (
                  <span key={`${item.label}-${item.index}`}>
                    {item.label}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "18px",
              padding: "0 20px 16px",
              flexWrap: "wrap",
            }}
          >
            {chartSeries.map((series) => (
              <span
                key={series.key}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "#52615d",
                }}
              >
                <span
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: series.color,
                  }}
                />
                {series.label}
              </span>
            ))}
          </div>
        </div>

        <div className="overview-panel attention-panel">
          <div className="overview-panel-header">
            <div>
              <span className="section-kicker">
                ATTENTION QUEUE
              </span>
              <h2>Requires Review</h2>
            </div>

            <span className="panel-count">
              {attentionQueue.length}
            </span>
          </div>

          <div className="attention-list">
            {attentionQueue.length === 0 ? (
              <div className="section-empty">
                <Icon name="check_circle" />
                No immediate attention items.
              </div>
            ) : (
              attentionQueue.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="attention-item"
                  onClick={() =>
                    (window.location.href =
                      "/alerts")
                  }
                >
                  <span
                    className={`severity-marker ${getRiskClass(
                      item.severity
                    )}`}
                  />

                  <div className="attention-content">
                    <strong>{item.title}</strong>

                    <span>
                      {item.source}{" "}
                      {item.time
                        ? `• ${item.time}`
                        : ""}
                    </span>
                  </div>

                  <Icon name="chevron_right" />
                </button>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="overview-panel recent-signals-panel">
        <div className="overview-panel-header">
          <div>
            <span className="section-kicker">
              RECENT SIGNALS
            </span>
            <h2>Priority Signal Register</h2>
          </div>

          <button
            type="button"
            className="text-action"
            onClick={() =>
              (window.location.href =
                "/live-feed")
            }
          >
            View Live Feed →
          </button>
        </div>

        <div className="signal-table-wrap">
          <table className="intelligence-table">
            <thead>
              <tr>
                <th>TIME</th>
                <th>SOURCE</th>
                <th>SIGNAL</th>
                <th>RISK</th>
                <th>CONFIDENCE</th>
                <th>LOCATION</th>
              </tr>
            </thead>

            <tbody>
              {signals.slice(0, 6).map(
                (signal, index) => (
                  <tr key={getSignalId(signal, index)}>
                    <td className="mono-cell">
                      {getSignalTime(signal)}
                    </td>

                    <td>
                      <span className="source-label">
                        <Icon
                          name={
                            getSignalPlatform(
                              signal
                            ) === "YouTube"
                              ? "smart_display"
                              : getSignalPlatform(
                                  signal
                                ) === "Reddit"
                              ? "forum"
                              : "tag"
                          }
                        />

                        {getSignalPlatform(signal)}
                      </span>
                    </td>

                    <td className="signal-table-text">
                      <span className="signal-id">
                        {getSignalId(signal, index)}
                      </span>
                      <span>
                        {signal.text ||
                          signal.prediction ||
                          "Signal content unavailable"}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`table-risk ${getRiskClass(
                          signal.risk_level
                        )}`}
                      >
                        {signal.risk_level ||
                          "LOW"}
                      </span>
                    </td>

                    <td className="mono-cell">
                      {formatPercent(
                        Number(
                          signal.confidence || 0
                        ) * 100
                      )}
                    </td>

                    <td className="location-cell">
                      <Icon name="location_on" />
                      {getSignalLocation(signal)}
                    </td>
                  </tr>
                )
              )}

              {!signals.length && (
                <tr>
                  <td
                    colSpan="6"
                    className="table-empty"
                  >
                    No signals available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="overview-secondary-grid">
        <div className="overview-panel">
          <div className="overview-panel-header">
            <div>
              <span className="section-kicker">
                ACTIVE INCIDENTS
              </span>
              <h2>Incident Register</h2>
            </div>

            <button
              type="button"
              className="text-action"
              onClick={() =>
                (window.location.href =
                  "/incidents")
              }
            >
              View All →
            </button>
          </div>

          <div className="compact-register">
            {activeIncidents
              .slice(0, 4)
              .map((incident, index) => (
                <button
                  key={
                    incident.id ||
                    incident.incident_id ||
                    index
                  }
                  type="button"
                  className="register-row"
                  onClick={() =>
                    (window.location.href =
                      "/incidents")
                  }
                >
                  <div>
                    <strong>
                      {incident.incident_id ||
                        incident.id ||
                        `INC-${String(
                          index + 21
                        ).padStart(6, "0")}`}
                    </strong>

                    <span>
                      {incident.title ||
                        incident.name ||
                        "Active intelligence incident"}
                    </span>
                  </div>

                  <div className="register-meta">
                    <span
                      className={`table-risk ${getRiskClass(
                        incident.severity ||
                          incident.risk_level
                      )}`}
                    >
                      {incident.severity ||
                        incident.risk_level ||
                        "MEDIUM"}
                    </span>

                    <span>
                      {incident.status ||
                        "ACTIVE"}
                    </span>
                  </div>
                </button>
              ))}

            {!activeIncidents.length && (
              <div className="section-empty">
                No active incidents.
              </div>
            )}
          </div>
        </div>

        <div className="overview-panel">
          <div className="overview-panel-header">
            <div>
              <span className="section-kicker">
                SOURCE ACTIVITY
              </span>
              <h2>Monitored Platforms</h2>
            </div>

            <span className="panel-meta">
              LIVE
            </span>
          </div>

          <div className="source-activity">
            {sourceActivity.map((source) => (
              <div
                className="source-activity-row"
                key={source.name}
              >
                <div className="source-activity-heading">
                  <span>
                    <Icon
                      name={
                        source.name === "YouTube"
                          ? "smart_display"
                          : source.name === "Reddit"
                          ? "forum"
                          : source.name === "X"
                          ? "tag"
                          : "public"
                      }
                    />
                    {source.name}
                  </span>

                  <strong>
                    {formatNumber(source.count)}
                  </strong>
                </div>

                <div className="source-track">
                  <span
                    style={{
                      width: `${Math.max(
                        source.percentage,
                        source.count ? 3 : 0
                      )}%`,
                    }}
                  />
                </div>
              </div>
            ))}

            {!sourceActivity.length && (
              <div className="section-empty">
                Platform activity unavailable.
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="overview-secondary-grid">
        <div className="overview-panel">
          <div className="overview-panel-header">
            <div>
              <span className="section-kicker">
                EMERGING ACTIVITY
              </span>
              <h2>Detected Patterns</h2>
            </div>

            <Icon name="insights" />
          </div>

          <div className="pattern-grid">
            {emergingPatterns.map(
              (item, index) => (
                <div
                  className="pattern-item"
                  key={`${item.pattern}-${index}`}
                >
                  <div className="pattern-top">
                    <strong>
                      {item.pattern}
                    </strong>

                    <span
                      className={`table-risk ${getRiskClass(
                        item.risk
                      )}`}
                    >
                      {item.risk}
                    </span>
                  </div>

                  <div className="pattern-meta">
                    <span>
                      Volume: {item.volume}
                    </span>

                    <span>
                      {item.confidence !== null
                        ? `Confidence ${formatPercent(
                            Number(
                              item.confidence
                            ) > 1
                              ? item.confidence
                              : Number(
                                  item.confidence
                                ) * 100
                          )}`
                        : "Confidence —"}
                    </span>

                    <span>{item.trend}</span>
                  </div>
                </div>
              )
            )}

            {!emergingPatterns.length && (
              <div className="section-empty">
                No emerging patterns detected.
              </div>
            )}
          </div>
        </div>

        <div className="overview-panel">
          <div className="overview-panel-header">
            <div>
              <span className="section-kicker">
                RECENT INVESTIGATIONS
              </span>
              <h2>Analyst Workspace</h2>
            </div>

            <button
              type="button"
              className="text-action"
              onClick={() =>
                (window.location.href =
                  "/investigations")
              }
            >
              Open Workspace →
            </button>
          </div>

          <div className="investigation-register">
            <div className="investigation-row">
              <strong>Investigation workspace</strong>
              <span>AVAILABLE</span>
            </div>

            <div className="investigation-row">
              <strong>
                Active incident investigations
              </strong>
              <span>
                {activeIncidents.length}
              </span>
            </div>

            <div className="investigation-row">
              <strong>
                Signals requiring analysis
              </strong>
              <span>
                {highRiskSignals}
              </span>
            </div>

            <div className="investigation-row">
              <strong>
                Open intelligence alerts
              </strong>
              <span>
                {openAlerts.length}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="system-health-strip">
        <div>
          <span
            className={`health-dot ${
              systemStatus === "OPERATIONAL"
                ? "operational"
                : "degraded"
            }`}
          />
          <span>
            Data Ingestion{" "}
            <strong>
              {systemStatus === "OPERATIONAL"
                ? "Operational"
                : systemStatus}
            </strong>
          </span>
        </div>

        <div>
          <span
            className={`health-dot ${
              systemStatus === "OPERATIONAL"
                ? "operational"
                : "degraded"
            }`}
          />
          <span>
            Signal Processing{" "}
            <strong>
              {systemStatus === "OPERATIONAL"
                ? "Operational"
                : systemStatus}
            </strong>
          </span>
        </div>

        <div>
          <span
            className={`health-dot ${
              systemStatus === "OPERATIONAL"
                ? "operational"
                : "degraded"
            }`}
          />
          <span>
            Risk Engine{" "}
            <strong>
              {systemStatus === "OPERATIONAL"
                ? "Operational"
                : systemStatus}
            </strong>
          </span>
        </div>

        <div>
          <span
            className={`health-dot ${
              systemStatus === "OPERATIONAL"
                ? "operational"
                : "degraded"
            }`}
          />
          <span>
            Correlation Engine{" "}
            <strong>
              {systemStatus === "OPERATIONAL"
                ? "Operational"
                : systemStatus}
            </strong>
          </span>
        </div>
      </section>
    </div>
  );
}

export default Overview;