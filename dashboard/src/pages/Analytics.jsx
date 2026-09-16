import { useEffect, useMemo, useState } from "react";
import {
  getHistoricalAnalytics,
  getRiskTrends,
  getPlatformAnalytics,
  getActivityAnomalies,
  getHighRiskAnomalies,
} from "../services/api";
import "./Analytics.css";

function Icon({ name }) {
  return (
    <span className="material-symbols-outlined">
      {name}
    </span>
  );
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString();
}

function formatPercent(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "—";
  }

  return `${Number(value).toFixed(1)}%`;
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getPlatformName(item) {
  const value = String(
    item?.platform ||
      item?.name ||
      item?.source ||
      ""
  ).toLowerCase();

  if (value.includes("youtube")) return "YouTube";
  if (value.includes("reddit")) return "Reddit";
  if (value.includes("telegram")) return "Telegram";
  if (value === "x" || value.includes("twitter")) return "X";
  if (value.includes("instagram")) return "Instagram";

  return item?.platform || item?.name || "Other";
}

function getRiskCount(item, level) {
  const upper = String(level || "").toUpperCase();
  const lower = upper.toLowerCase();

  return Number(
    item?.[upper] ??
      item?.[lower] ??
      item?.risk_distribution?.[upper] ??
      item?.risk_distribution?.[lower] ??
      0
  );
}

function getTrendDate(item) {
  return (
    item?.date ||
    item?.day ||
    item?.timestamp ||
    item?.created_at ||
    ""
  );
}

function getRiskClass(level) {
  return String(level || "LOW").toLowerCase();
}

function Analytics() {
  const [analytics, setAnalytics] = useState(null);
  const [riskTrends, setRiskTrends] = useState([]);
  const [platforms, setPlatforms] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [highRiskAnomalies, setHighRiskAnomalies] = useState([]);

  const [timeRange, setTimeRange] = useState("30D");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  function getDateRange(range) {
    const end = new Date();
    const start = new Date(end);

    if (range === "24H") {
      start.setHours(start.getHours() - 24);
    } else if (range === "7D") {
      start.setDate(start.getDate() - 7);
    } else if (range === "30D") {
      start.setDate(start.getDate() - 30);
    } else if (range === "90D") {
      start.setDate(start.getDate() - 90);
    }

    return {
      start: start.toISOString().slice(0, 10),
      end: end.toISOString().slice(0, 10),
    };
  }

  async function loadAnalytics(
    customStart = startDate,
    customEnd = endDate,
    showRefresh = false
  ) {
    try {
      setError("");

      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const [
        analyticsData,
        trendsData,
        platformData,
        anomalyData,
        highRiskData,
      ] = await Promise.all([
        getHistoricalAnalytics(customStart, customEnd),
        getRiskTrends(customStart, customEnd),
        getPlatformAnalytics(customStart, customEnd),
        getActivityAnomalies(customStart, customEnd),
        getHighRiskAnomalies(customStart, customEnd),
      ]);

      setAnalytics(analyticsData);
      setRiskTrends(trendsData?.trends || []);
      setPlatforms(platformData?.platforms || []);
      setAnomalies(anomalyData?.anomalies || []);
      setHighRiskAnomalies(highRiskData?.anomalies || []);
    } catch (err) {
      console.error("Analytics loading failed:", err);

      setError(
        err.response?.data?.detail ||
          "Unable to load historical analytics."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    const range = getDateRange(timeRange);

    setStartDate(range.start);
    setEndDate(range.end);

    loadAnalytics(range.start, range.end);
  }, []);

  function applyPreset(range) {
    setTimeRange(range);

    const dates = getDateRange(range);

    setStartDate(dates.start);
    setEndDate(dates.end);

    loadAnalytics(dates.start, dates.end);
  }

  function applyCustomRange() {
    setTimeRange("CUSTOM");

    if (!startDate || !endDate) {
      setError("Select both start and end dates.");
      return;
    }

    if (startDate > endDate) {
      setError("Start date cannot be after end date.");
      return;
    }

    loadAnalytics(startDate, endDate);
  }

  function clearDates() {
    const dates = getDateRange("30D");

    setTimeRange("30D");
    setStartDate(dates.start);
    setEndDate(dates.end);

    loadAnalytics(dates.start, dates.end);
  }

  const riskDistribution = analytics?.risk_distribution || {};

  const totalSignals = Number(
    analytics?.total_signals || 0
  );

  const averageRisk = Number(
    analytics?.average_risk_score || 0
  );

  const averageConfidence = Number(
    analytics?.average_confidence || 0
  );

  const highRiskCount =
    Number(riskDistribution.HIGH || 0) +
    Number(riskDistribution.CRITICAL || 0);

  const totalRiskCount = Object.values(
    riskDistribution
  ).reduce(
    (sum, value) => sum + Number(value || 0),
    0
  );

  const trendPoints = useMemo(() => {
    return riskTrends
      .map((item) => ({
        date: getTrendDate(item),
        low: getRiskCount(item, "LOW"),
        medium: getRiskCount(item, "MEDIUM"),
        high: getRiskCount(item, "HIGH"),
        critical: getRiskCount(item, "CRITICAL"),
      }))
      .slice(-30);
  }, [riskTrends]);

  const maxTrend = useMemo(() => {
    const values = trendPoints.flatMap((point) => [
      point.low,
      point.medium,
      point.high,
      point.critical,
    ]);

    return Math.max(...values, 1);
  }, [trendPoints]);

  const trendAxisMax = useMemo(() => {
    if (maxTrend <= 5) return 5;
    if (maxTrend <= 10) return 10;
    if (maxTrend <= 25) return 25;
    if (maxTrend <= 50) return 50;
    if (maxTrend <= 100) return 100;

    return Math.ceil(maxTrend / 25) * 25;
  }, [maxTrend]);

  const trendSeries = [
    { key: "low", label: "LOW", color: "#52697d" },
    { key: "medium", label: "MEDIUM", color: "#b48618" },
    { key: "high", label: "HIGH", color: "#c65d18" },
    { key: "critical", label: "CRITICAL", color: "#8a2635" },
  ];

  const platformTotal = platforms.reduce(
    (sum, item) =>
      sum +
      Number(
        item?.total_signals ??
        item?.count ??
        item?.signal_count ??
        item?.total ??
        0 
      ),
    0
  );

  const combinedAnomalies = [
    ...highRiskAnomalies,
    ...anomalies.filter(
      (item) => !highRiskAnomalies.includes(item)
    ),
  ].slice(0, 6);

  const dominantRisk = Object.entries(
    riskDistribution
  ).sort(
    ([, a], [, b]) => Number(b) - Number(a)
  )[0];

  if (loading) {
    return (
      <div className="analytics-page">
        <div className="analytics-header">
          <div>
            <span className="analytics-kicker">
              INTELLIGENCE ANALYTICS
            </span>
            <h1>Historical Analytics</h1>
            <p>
              Analyze historical social-media intelligence
              across risk levels, platforms, and activity
              patterns.
            </p>
          </div>
        </div>

        <div className="analytics-loading">
          Loading historical intelligence...
        </div>
      </div>
    );
  }

  return (
    <div className="analytics-page">
      <header className="analytics-header">
        <div>
          <div className="analytics-eyebrow-row">
            <span className="analytics-kicker">
              INTELLIGENCE ANALYTICS
            </span>

            <span className="analytics-code">
              HIST-OPS-QUERY
            </span>
          </div>

          <h1>Historical Analytics</h1>

          <p>
            Analyze historical social-media intelligence
            across risk levels, platforms, and activity
            patterns.
          </p>
        </div>

        <div className="analytics-header-actions">
          <span className="analytics-ready">
            <span />
            ANALYTICS READY
          </span>

          <button
            type="button"
            className="analytics-refresh"
            onClick={() =>
              loadAnalytics(
                startDate,
                endDate,
                true
              )
            }
            disabled={refreshing}
          >
            <Icon name="sync" />
            {refreshing ? "Refreshing" : "Refresh"}
          </button>
        </div>
      </header>

      {error && (
        <div className="analytics-error">
          <Icon name="error" />
          {error}
        </div>
      )}

      <section className="analytics-filter-panel">
        <div className="analytics-filter-heading">
          <div>
            <span className="analytics-section-code">
              DATE RANGE
            </span>
            <strong>Analytics Period</strong>
          </div>

          <span className="analytics-engine">
            ENGINE: TR-CORRELATE-V4
          </span>
        </div>

        <div className="analytics-filter-row">
          <div className="analytics-presets">
            {[
              ["24H", "Last 24 Hours"],
              ["7D", "Last 7 Days"],
              ["30D", "Last 30 Days"],
              ["90D", "Quarter-to-Date"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={
                  timeRange === value
                    ? "active"
                    : ""
                }
                onClick={() =>
                  applyPreset(value)
                }
              >
                {label}
              </button>
            ))}
          </div>

          <div className="analytics-date-fields">
            <label>
              <span>FROM</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) =>
                  setStartDate(e.target.value)
                }
              />
            </label>

            <span className="date-arrow">TO</span>

            <label>
              <span>TO</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) =>
                  setEndDate(e.target.value)
                }
              />
            </label>
          </div>

          <div className="analytics-filter-actions">
            <button
              type="button"
              className="clear-filter"
              onClick={clearDates}
            >
              Clear
            </button>

            <button
              type="button"
              className="apply-filter"
              onClick={applyCustomRange}
            >
              <Icon name="filter_alt" />
              Apply Filter
            </button>
          </div>
        </div>

        <div className="analytics-query-status">
          <Icon name="check_circle" />
          Telemetry query evaluated across{" "}
          <strong>
            {formatNumber(totalSignals)}
          </strong>{" "}
          signal events
        </div>
      </section>

      <section className="analytics-kpi-grid">
        <article className="analytics-kpi signals">
          <span className="analytics-kpi-label">
            INGESTED SIGNALS // PERIOD
          </span>

          <strong>
            {formatNumber(totalSignals)}
          </strong>

          <small>
            Historical intelligence events
          </small>
        </article>

        <article className="analytics-kpi risk">
          <span className="analytics-kpi-label">
            MEAN RISK SCORE // NORM
          </span>

          <strong>{averageRisk.toFixed(1)}</strong>

          <small>
            Across selected temporal window
          </small>
        </article>

        <article className="analytics-kpi confidence">
          <span className="analytics-kpi-label">
            MODEL FIDELITY // CONF
          </span>

          <strong>
            {formatPercent(averageConfidence * 100)}
          </strong>

          <small>
            Average model confidence
          </small>
        </article>

        <article className="analytics-kpi critical">
          <span className="analytics-kpi-label">
            HIGH & CRITICAL // ESCALATED
          </span>

          <strong>
            {formatNumber(highRiskCount)}
          </strong>

          <small>
            {totalSignals
              ? formatPercent(
                  (highRiskCount / totalSignals) *
                    100
                )
              : "0.0%"}{" "}
            of selected signals
          </small>
        </article>
      </section>

      <div className="analytics-main-grid">
        <div className="analytics-primary-column">
          <section className="analytics-panel">
            <div className="analytics-panel-header">
              <div>
                <h2>Historical Risk Levels</h2>
                <p>
                  Distribution of categorized threat
                  severities across the active temporal
                  window.
                </p>
              </div>

              <span className="analytics-panel-meta">
                N={formatNumber(totalRiskCount)}
              </span>
            </div>

            <div className="risk-distribution-bar">
              {[
                ["CRITICAL", riskDistribution.CRITICAL],
                ["HIGH", riskDistribution.HIGH],
                ["MEDIUM", riskDistribution.MEDIUM],
                ["LOW", riskDistribution.LOW],
              ].map(([level, value]) => {
                const percentage = totalRiskCount
                  ? (Number(value || 0) /
                      totalRiskCount) *
                    100
                  : 0;

                return (
                  <div
                    key={level}
                    className={`risk-segment ${getRiskClass(
                      level
                    )}`}
                    style={{
                      width: `${percentage}%`,
                    }}
                    title={`${level}: ${formatNumber(
                      value
                    )}`}
                  />
                );
              })}
            </div>

            <div className="risk-legend-grid">
              {[
                ["CRITICAL", riskDistribution.CRITICAL],
                ["HIGH", riskDistribution.HIGH],
                ["MEDIUM", riskDistribution.MEDIUM],
                ["LOW", riskDistribution.LOW],
              ].map(([level, value]) => {
                const percentage = totalRiskCount
                  ? (Number(value || 0) /
                      totalRiskCount) *
                    100
                  : 0;

                return (
                  <div
                    key={level}
                    className={`risk-level-card ${getRiskClass(
                      level
                    )}`}
                  >
                    <span>
                      <i />
                      {level}
                    </span>

                    <strong>
                      {formatNumber(value)}
                    </strong>

                    <small>
                      {percentage.toFixed(1)}% of volume
                    </small>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="analytics-panel">
            <div className="analytics-panel-header">
              <div>
                <h2>Risk Trend & Threat Evolution</h2>
                <p>
                  Signal volume by risk level across the selected period.
                </p>
              </div>

              <span className="analytics-panel-meta">
                {trendPoints.length} PERIODS
              </span>
            </div>

            {trendPoints.length > 0 ? (
              <>
                <div className="trend-legend">
                  {trendSeries.map((series) => (
                    <span
                      key={series.key}
                      className="trend-legend-item"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "7px",
                        marginRight: "20px",
                        whiteSpace: "nowrap",
                      }}
                    >
                      <i
                        style={{
                          backgroundColor: series.color,
                        }}
                      />
                      {series.label}
                    </span>
                  ))}
                </div>

                <div className="trend-chart">
                  <div className="trend-y-axis">
                    <span>{trendAxisMax}</span>
                    <span>{Math.round(trendAxisMax * 0.75)}</span>
                    <span>{Math.round(trendAxisMax * 0.5)}</span>
                    <span>{Math.round(trendAxisMax * 0.25)}</span>
                    <span>0</span>
                  </div>

                  <div className="trend-area">
                    <div className="trend-grid-lines">
                      <span />
                      <span />
                      <span />
                      <span />
                      <span />
                    </div>

                    <svg
                      viewBox="0 0 900 260"
                      preserveAspectRatio="none"
                      aria-label="Signal risk activity by risk level"
                    >
                      {trendSeries.map((series) => (
                        <polyline
                          key={series.key}
                          fill="none"
                          stroke={series.color}
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          points={trendPoints
                            .map((point, index) => {
                              const x =
                                trendPoints.length === 1
                                  ? 450
                                  : (index /
                                      (trendPoints.length - 1)) *
                                      880 +
                                    10;

                              const y =
                                245 -
                                (point[series.key] / trendAxisMax) *
                                  220;

                              return `${x},${y}`;
                            })
                            .join(" ")}
                        />
                      ))}

                      {trendSeries.map((series) =>
                        trendPoints.map((point, index) => {
                          const x =
                            trendPoints.length === 1
                              ? 450
                              : (index /
                                  (trendPoints.length - 1)) *
                                  880 +
                                10;

                          const y =
                            245 -
                            (point[series.key] / trendAxisMax) *
                              220;

                          return (
                            <circle
                              key={`${series.key}-${index}`}
                              cx={x}
                              cy={y}
                              r="3"
                              fill={series.color}
                            >
                              <title>
                                {`${series.label}: ${point[series.key]} on ${formatDate(
                                  point.date
                                )}`}
                              </title>
                            </circle>
                          );
                        })
                      )}
                    </svg>

                    <div className="trend-x-axis">
                      {trendPoints
                        .filter(
                          (_, index) =>
                            index === 0 ||
                            index === trendPoints.length - 1 ||
                            index %
                              Math.max(
                                Math.floor(trendPoints.length / 5),
                                1
                              ) === 0
                        )
                        .map((point, index) => (
                          <span key={index}>
                            {formatDate(point.date)}
                          </span>
                        ))}
                    </div>
                  </div>
                </div>

                <div className="trend-footer">
                  <span>Risk-level signal volume over time</span>

                  <strong>
                    Latest:{" "}
                    {(() => {
                      const latest =
                        trendPoints[trendPoints.length - 1];

                      return (
                        Number(latest.low) +
                        Number(latest.medium) +
                        Number(latest.high) +
                        Number(latest.critical)
                      );
                    })()}{" "}
                    signals
                  </strong>
                </div>
              </>
            ) : (
              <div className="analytics-empty">
                No trend data available for this period.
              </div>
            )}
          </section>
        </div>

        <div className="analytics-side-column">
          <section className="analytics-panel">
            <div className="analytics-panel-header">
              <div>
                <h2>Platform Distribution</h2>
                <p>
                  Signal volume by upstream origin.
                </p>
              </div>

              <span className="analytics-panel-meta">
                {platforms.length} SOURCES
              </span>
            </div>

            <div className="platform-list">
              {platforms.length > 0 ? (
                platforms.map((item, index) => {
                  const count = Number(
                    item?.total_signals ??
                      item?.count ??
                      item?.signal_count ??
                      item?.total ??
                      0
                  );

                  const percentage =
                    platformTotal > 0
                      ? (count / platformTotal) *
                        100
                      : 0;

                  return (
                    <article
                      className="platform-item"
                      key={`${getPlatformName(
                        item
                      )}-${index}`}
                    >
                      <div className="platform-top">
                        <strong>
                          {getPlatformName(item)}
                        </strong>

                        <span>
                          {formatNumber(count)}
                        </span>
                      </div>

                      <div className="platform-bar">
                        <span
                          style={{
                            width: `${percentage}%`,
                          }}
                        />
                      </div>

                      <small>
                        {percentage.toFixed(1)}% of
                        selected volume
                      </small>
                    </article>
                  );
                })
              ) : (
                <div className="analytics-empty">
                  No platform data available.
                </div>
              )}
            </div>
          </section>

          <section className="analytics-panel">
            <div className="analytics-panel-header">
              <div>
                <h2>Activity Patterns</h2>
                <p>
                  Detected anomalies and elevated
                  activity.
                </p>
              </div>

              <span className="analytics-alert-count">
                {combinedAnomalies.length} DETECTED
              </span>
            </div>

            <div className="anomaly-list">
              {combinedAnomalies.length > 0 ? (
                combinedAnomalies.map(
                  (item, index) => {
                    const level =
                      item?.risk_level ||
                      item?.severity ||
                      item?.level ||
                      "HIGH";

                    const title =
                      item?.description ||
                      item?.title ||
                      item?.message ||
                      item?.reason ||
                      "Activity anomaly detected";

                    return (
                      <article
                        className="anomaly-item"
                        key={index}
                      >
                        <div className="anomaly-meta">
                          <span>
                            {item?.date ||
                              item?.timestamp ||
                              "ANOMALY"}
                          </span>

                          <strong
                            className={getRiskClass(
                              level
                            )}
                          >
                            {String(
                              level
                            ).toUpperCase()}
                          </strong>
                        </div>

                        <p>{title}</p>

                        <small>
                          {item?.platform ||
                            item?.source ||
                            item?.category ||
                            "INTELLIGENCE ENGINE"}
                        </small>
                      </article>
                    );
                  }
                )
              ) : (
                <div className="analytics-empty">
                  No significant anomalies detected.
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      <section className="analytics-synthesis">
        <div className="analytics-panel-header">
          <div>
            <span className="analytics-section-code">
              SYNTHESIS DOSSIER
            </span>

            <h2>Analytical Summary</h2>

            <p>
              Operational observations synthesized from
              historical query data.
            </p>
          </div>

          <span className="analytics-panel-meta">
            PERIOD: {formatDate(startDate)} —{" "}
            {formatDate(endDate)}
          </span>
        </div>

        <div className="synthesis-grid">
          <article>
            <div className="synthesis-icon">
              <Icon name="query_stats" />
            </div>

            <span>DOMINANT RISK PROFILE</span>

            <strong>
              {dominantRisk
                ? dominantRisk[0]
                : "NO DATA"}
            </strong>

            <p>
              {dominantRisk
                ? `${formatNumber(
                    dominantRisk[1]
                  )} signals represent the dominant risk
                  category within the selected period.`
                : "Insufficient data for a risk profile."}
            </p>
          </article>

          <article>
            <div className="synthesis-icon">
              <Icon name="hub" />
            </div>

            <span>DISSEMINATION VECTOR</span>

            <strong>
              {platforms.length
                ? getPlatformName(platforms[0])
                : "NO DATA"}
            </strong>

            <p>
              The highest-volume upstream source in the
              selected historical window.
            </p>
          </article>

          <article>
            <div className="synthesis-icon">
              <Icon name="verified_user" />
            </div>

            <span>HIGH-RISK CONCENTRATION</span>

            <strong>
              {totalSignals
                ? formatPercent(
                    (highRiskCount /
                      totalSignals) *
                      100
                  )
                : "0.0%"}
            </strong>

            <p>
              Combined proportion of HIGH and CRITICAL
              signals in the selected period.
            </p>
          </article>
        </div>

        <div className="analytics-classification">
          <span>
            <Icon name="lock" />
            CLASSIFICATION: TLP:AMBER
          </span>

          <span>
            INTELLIGENCE ANALYTICS
          </span>
        </div>

        <div className="analytics-bottom-actions">
          <button
            type="button"
            onClick={() => window.print()}
          >
            <Icon name="download" />
            Export Historical Dataset
          </button>

          <button
            type="button"
            onClick={() =>
              loadAnalytics(
                startDate,
                endDate,
                true
              )
            }
          >
            <Icon name="manage_search" />
            Query Audit Log
          </button>

          <button
            type="button"
            className="primary"
            onClick={() =>
              window.location.href = "/reports"
            }
          >
            <Icon name="description" />
            Generate Analytics Intelligence Dossier
          </button>
        </div>
      </section>
    </div>
  );
}

export default Analytics;