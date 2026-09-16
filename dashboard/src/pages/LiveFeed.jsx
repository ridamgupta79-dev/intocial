import { useEffect, useMemo, useState } from "react";
import { getLiveSignals } from "../services/api";
import YouTubeIngestion from "../components/YouTubeIngestion";
import "./LiveFeed.css";

function LiveFeed() {
  const [signals, setSignals] = useState([]);
  const [riskFilter, setRiskFilter] = useState("ALL");
  const [platformFilter, setPlatformFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [totalSignals, setTotalSignals] = useState(0);
  const [showIngestion, setShowIngestion] = useState(false);

  const pageSize = 20;

  async function loadSignals(showLoading = true) {
    try {
      if (showLoading) {
        setLoading(true);
      }

      setError("");

      const data = await getLiveSignals(
        pageSize,
        (page - 1) * pageSize
      );

      const loadedSignals = data.signals || [];

      setSignals(loadedSignals);
      setTotalSignals(data.total || 0);
      setHasNext(
        page * pageSize < (data.total || 0)
      );
    } catch (err) {
      console.error("Live feed loading failed:", err);
      setError("Unable to load intelligence signals.");
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    loadSignals();

    const interval = setInterval(() => {
      loadSignals(false);
    }, 30000);

    return () => clearInterval(interval);
  }, [page]);

  const counts = useMemo(() => {
    return {
      LOW: signals.filter(
        (signal) => signal.risk_level === "LOW"
      ).length,
      MEDIUM: signals.filter(
        (signal) => signal.risk_level === "MEDIUM"
      ).length,
      HIGH: signals.filter(
        (signal) => signal.risk_level === "HIGH"
      ).length,
      CRITICAL: signals.filter(
        (signal) => signal.risk_level === "CRITICAL"
      ).length,
    };
  }, [signals]);

  const platforms = useMemo(() => {
    return [
      ...new Set(
        signals
          .map((signal) =>
            String(signal.platform || "").toUpperCase()
          )
          .filter(Boolean)
      ),
    ];
  }, [signals]);

  const filteredSignals = useMemo(() => {
    const query = search.trim().toLowerCase();

    return signals.filter((signal) => {
      const matchesRisk =
        riskFilter === "ALL" ||
        signal.risk_level === riskFilter;

      const platform =
        String(signal.platform || "").toUpperCase();

      const matchesPlatform =
        platformFilter === "ALL" ||
        platform === platformFilter;

      const searchableText = [
        signal.text,
        signal.author,
        signal.platform,
        signal.prediction,
        signal.risk_level,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !query || searchableText.includes(query);

      return (
        matchesRisk &&
        matchesPlatform &&
        matchesSearch
      );
    });
  }, [
    signals,
    riskFilter,
    platformFilter,
    search,
  ]);

  const riskDistribution = [
    {
      label: "Critical",
      value: counts.CRITICAL,
      className: "critical",
    },
    {
      label: "High Risk",
      value: counts.HIGH,
      className: "high",
    },
    {
      label: "Moderate",
      value: counts.MEDIUM,
      className: "medium",
    },
    {
      label: "Baseline",
      value: counts.LOW,
      className: "low",
    },
  ];

  const maxRiskValue = Math.max(
    ...riskDistribution.map((item) => item.value),
    1
  );

  function formatTimestamp(timestamp) {
    if (!timestamp) {
      return "UNKNOWN";
    }

    return new Date(timestamp).toLocaleString();
  }

  function getPlatformIcon(platform) {
    const value = String(platform || "").toLowerCase();

    if (value.includes("youtube")) {
      return "smart_display";
    }

    if (value.includes("reddit")) {
      return "forum";
    }

    if (value.includes("instagram")) {
      return "photo_camera";
    }

    if (value.includes("twitter") || value === "x") {
      return "chat";
    }

    if (value.includes("telegram")) {
      return "send";
    }

    return "language";
  }

  return (
    <div className="live-feed-page">
      <section className="live-feed-header">
        <div className="live-feed-header-main">
          <div className="live-feed-title-row">
            <h1>Live Feed</h1>

            <span className="live-feed-status">
              <span />
              LIVE INTELLIGENCE
            </span>
          </div>

          <p>
            Operational intelligence — Real-time signal
            ingestion, threat correlation, and
            multimodal monitoring across social channels.
          </p>
        </div>

        <div className="live-feed-header-actions">
          

          <button
            type="button"
            className="live-feed-secondary-button"
            onClick={() => loadSignals()}
            disabled={loading}
          >
            <span className="material-symbols-outlined">
              sync
            </span>

            {loading ? "Refreshing..." : "Refresh"}
          </button>

          <button
            type="button"
            className="live-feed-primary-button"
            onClick={() =>
              setShowIngestion((value) => !value)
            }
          >
            <span className="material-symbols-outlined">
              add
            </span>

            Ingest Source
          </button>
        </div>
      </section>

      {showIngestion && (
        <section className="live-feed-ingestion">
          <div className="live-feed-ingestion-header">
            <div>
              <span className="live-feed-section-label">
                SOURCE INGESTION
              </span>

              <h2>Connect Intelligence Source</h2>
            </div>

            <button
              type="button"
              onClick={() => setShowIngestion(false)}
              className="live-feed-close-button"
            >
              <span className="material-symbols-outlined">
                close
              </span>
            </button>
          </div>

          <YouTubeIngestion />
        </section>
      )}

      <section className="live-feed-kpis">
        <article className="live-feed-kpi">
          <div>
            <span>ACTIVE SIGNALS</span>
            <span className="material-symbols-outlined">
              stream
            </span>
          </div>

          <strong>
            {totalSignals.toLocaleString()}
          </strong>

          <small>Captured intelligence signals</small>
        </article>

        <article className="live-feed-kpi">
          <div>
            <span>HIGH RISK SIGNALS</span>
            <span className="material-symbols-outlined">
              warning
            </span>
          </div>

          <strong>{counts.HIGH}</strong>

          <small>Requires threat escalation</small>
        </article>

        <article className="live-feed-kpi critical">
          <div>
            <span>CRITICAL SIGNALS</span>
            <span className="material-symbols-outlined">
              emergency
            </span>
          </div>

          <strong>{counts.CRITICAL}</strong>

          <small>Requires immediate review</small>
        </article>

        <article className="live-feed-kpi">
          <div>
            <span>ACTIVE SOURCES</span>
            <span className="material-symbols-outlined">
              hub
            </span>
          </div>

          <strong>{platforms.length}</strong>

          <small>
            Sources represented in current feed
          </small>
        </article>
      </section>

      <section className="live-feed-filter-panel">
        <div className="live-feed-search">
          <span className="material-symbols-outlined">
            search
          </span>

          <input
            type="text"
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Search signals, keywords, hashtags, entities..."
          />
        </div>

        <select
          value={riskFilter}
          onChange={(event) => {
            setRiskFilter(event.target.value);
            setPage(1);
          }}
        >
          <option value="ALL">All Risks</option>
          <option value="CRITICAL">Critical</option>
          <option value="HIGH">High Risk</option>
          <option value="MEDIUM">Moderate</option>
          <option value="LOW">Baseline</option>
        </select>

        <select
          value={platformFilter}
          onChange={(event) => {
            setPlatformFilter(event.target.value);
            setPage(1);
          }}
        >
          <option value="ALL">All Platforms</option>

          {platforms.map((platform) => (
            <option
              key={platform}
              value={platform}
            >
              {platform}
            </option>
          ))}
        </select>

        <div className="live-feed-filter-state">
          <span />
          Realtime
        </div>
      </section>

      <div className="live-feed-workspace">
        <main className="live-feed-stream">
          <div className="live-feed-stream-header">
            <div>
              <span className="live-feed-section-label">
                LIVE INTELLIGENCE STREAM
              </span>

              <h2>Incoming Signals</h2>
            </div>

            <span className="live-feed-result-count">
              {filteredSignals.length} matching
            </span>
          </div>

          {loading && (
            <div className="live-feed-state">
              <span className="material-symbols-outlined">
                progress_activity
              </span>
              Loading intelligence feed...
            </div>
          )}

          {!loading && error && (
            <div className="live-feed-error">
              <span className="material-symbols-outlined">
                error
              </span>
              {error}
            </div>
          )}

          {!loading &&
            !error &&
            filteredSignals.length === 0 && (
              <div className="live-feed-state">
                <span className="material-symbols-outlined">
                  search_off
                </span>
                No signals match the current filters.
              </div>
            )}

          {!loading &&
            !error &&
            filteredSignals.map((signal, index) => {
              const risk =
                String(
                  signal.risk_level || "LOW"
                ).toLowerCase();

              return (
                <article
                  className="live-signal-card"
                  key={`${signal.id || "signal"}-${index}`}
                >
                  <div className="live-signal-top">
                    <div className="live-signal-identity">
                      <span
                        className={`live-risk-badge ${risk}`}
                      >
                        {signal.risk_level || "LOW"}
                      </span>

                      <strong>
                        {signal.id ||
                          `SIG-${index + 1}`}
                      </strong>

                      <span className="live-signal-dot" />

                      <span className="live-signal-platform">
                        <span className="material-symbols-outlined">
                          {getPlatformIcon(
                            signal.platform
                          )}
                        </span>

                        {signal.platform ||
                          "Unknown"}
                      </span>

                      <span className="live-signal-dot" />

                      <span className="live-signal-time">
                        {formatTimestamp(
                          signal.timestamp
                        )}
                      </span>
                    </div>

                    <div className="live-signal-confidence">
                      CONFIDENCE{" "}
                      <strong>
                        {(
                          (signal.confidence || 0) *
                          100
                        ).toFixed(1)}
                        %
                      </strong>
                    </div>
                  </div>

                  <h3>
                    {signal.text ||
                      "No signal content available."}
                  </h3>

                  <p className="live-signal-description">
                    {signal.prediction
                      ? `Classification: ${signal.prediction}`
                      : "Model-generated intelligence signal requiring analyst review."}
                  </p>

                  <div className="live-signal-meta">
                    <span>
                      PLATFORM:{" "}
                      {signal.platform ||
                        "UNKNOWN"}
                    </span>

                    <span>
                      AUTHOR:{" "}
                      {signal.author ||
                        "UNKNOWN"}
                    </span>

                    <span>
                      RISK SCORE:{" "}
                      {signal.risk_score ?? "—"}
                    </span>
                  </div>
                </article>
              );
            })}

          {!loading && !error && (
            <div className="live-feed-pagination">
              <span>
                Showing{" "}
                <strong>
                  {filteredSignals.length}
                </strong>{" "}
                of{" "}
                <strong>
                  {totalSignals.toLocaleString()}
                </strong>{" "}
                captured signals
              </span>

              <div>
                <button
                  type="button"
                  onClick={() =>
                    setPage(
                      Math.max(1, page - 1)
                    )
                  }
                  disabled={page === 1}
                >
                  <span className="material-symbols-outlined">
                    chevron_left
                  </span>
                </button>

                <strong>{page}</strong>

                <button
                  type="button"
                  onClick={() =>
                    setPage(page + 1)
                  }
                  disabled={!hasNext}
                >
                  <span className="material-symbols-outlined">
                    chevron_right
                  </span>
                </button>
              </div>
            </div>
          )}
        </main>

        <aside className="live-feed-sidebar">
          <section className="live-side-panel">
            <div className="live-side-title">
              <div>
                <span className="material-symbols-outlined">
                  dns
                </span>
                <h3>Feed Health</h3>
              </div>

              <span className="live-health-badge">
                CONNECTED
              </span>
            </div>

            <div className="live-health-list">
              <div>
                <span>API CONNECTION</span>
                <strong>ACTIVE</strong>
              </div>

              <div>
                <span>REFRESH INTERVAL</span>
                <strong>30 SEC</strong>
              </div>

              <div>
                <span>PAGE SIZE</span>
                <strong>{pageSize}</strong>
              </div>

              <div>
                <span>CURRENT PAGE</span>
                <strong>{page}</strong>
              </div>
            </div>

            <div className="live-health-bar">
              <span />
            </div>
          </section>

          <section className="live-side-panel">
            <div className="live-side-title">
              <div>
                <span className="material-symbols-outlined">
                  pie_chart
                </span>
                <h3>Risk Distribution</h3>
              </div>

              <span>CURRENT PAGE</span>
            </div>

            <div className="risk-distribution-bar">
              {riskDistribution.map((item) => (
                <span
                  key={item.label}
                  className={item.className}
                  style={{
                    width: `${Math.max(
                      3,
                      (item.value /
                        maxRiskValue) *
                        100
                    )}%`,
                  }}
                />
              ))}
            </div>

            <div className="risk-distribution-list">
              {riskDistribution.map((item) => (
                <div key={item.label}>
                  <span>
                    <i className={item.className} />
                    {item.label}
                  </span>

                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
          </section>

          <section className="live-side-panel">
            <div className="live-side-title">
              <div>
                <span className="material-symbols-outlined">
                  hub
                </span>
                <h3>Active Sources</h3>
              </div>

              <span>{platforms.length}</span>
            </div>

            <div className="live-source-list">
              {platforms.length === 0 ? (
                <span>
                  No source data available.
                </span>
              ) : (
                platforms.map((platform) => (
                  <div key={platform}>
                    <span>
                      <span className="material-symbols-outlined">
                        {getPlatformIcon(platform)}
                      </span>
                      {platform}
                    </span>

                    <strong>
                      {signals.filter(
                        (signal) =>
                          String(
                            signal.platform || ""
                          ).toUpperCase() ===
                          platform
                      ).length}
                    </strong>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="live-side-panel">
            <div className="live-side-title">
              <div>
                <span className="material-symbols-outlined">
                  visibility
                </span>
                <h3>Threat Watchlist</h3>
              </div>
            </div>

            <div className="live-watchlist">
              <span>CRITICAL</span>
              <span>HIGH RISK</span>
              <span>ANOMALY</span>
              <span>CORRELATION</span>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

export default LiveFeed;