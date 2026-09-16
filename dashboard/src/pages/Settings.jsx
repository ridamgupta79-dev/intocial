import { useEffect, useState } from "react";
import {
  getHealth,
  getStoredUser,
} from "../services/api";
import "./Settings.css";

function Icon({ name }) {
  return (
    <span className="material-symbols-outlined">
      {name}
    </span>
  );
}

function Settings() {
  const [health, setHealth] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    setUser(getStoredUser());

    async function loadHealth() {
      try {
        const data = await getHealth();
        setHealth(data);
      } catch {
        setHealth(null);
      }
    }

    loadHealth();
  }, []);

  const apiConnected = Boolean(health);

  const username =
    user?.username ||
    user?.email ||
    "Authenticated User";

  const email = user?.email || "Not available";
  const role = user?.role || "Analyst";

  return (
    <div className="settings-page">
      <header className="settings-header">
        <div>
          <div className="settings-eyebrow-row">
            <span className="settings-eyebrow">
              SYSTEM CONFIGURATION
            </span>

            <span className="settings-system-id">
              SYS-ENV-01
            </span>
          </div>

          <h1>Settings</h1>

          <p>
            Review dashboard configuration and system information.
          </p>
        </div>

        <div className="settings-header-actions">
          <span
            className={`settings-status-badge ${
              apiConnected ? "online" : "offline"
            }`}
          >
            <span className="settings-status-dot" />
            {apiConnected
              ? "CONFIGURATION ACTIVE"
              : "API UNAVAILABLE"}
          </span>
        </div>
      </header>

      <section className="settings-metrics">
        <div className="settings-metric">
          <span>OPERATIONAL STATUS</span>
          <strong>
            <span
              className={`metric-dot ${
                apiConnected ? "online" : "offline"
              }`}
            />
            {apiConnected ? "ONLINE" : "OFFLINE"}
          </strong>
          <small>
            {apiConnected
              ? "Core API reachable"
              : "Core API unavailable"}
          </small>
        </div>

        <div className="settings-metric">
          <span>ENVIRONMENT</span>
          <strong>LOCAL DEVELOPMENT</strong>
          <small>Development environment</small>
        </div>

        <div className="settings-metric">
          <span>API GATEWAY</span>
          <strong>FASTAPI / {apiConnected ? "CONNECTED" : "OFFLINE"}</strong>
          <small>Core REST API</small>
        </div>

        <div className="settings-metric">
          <span>ACTIVE SESSION</span>
          <strong>
            {username}
          </strong>
          <small>{role}</small>
        </div>
      </section>

      <div className="settings-workspace">
        <div className="settings-left">
          <section className="settings-panel">
            <div className="settings-panel-header">
              <div>
                <span className="settings-section-label">
                  APPLICATION
                </span>
                <h2>System Information</h2>
                <p>
                  Current application environment and runtime configuration.
                </p>
              </div>

              <Icon name="dns" />
            </div>

            <div className="settings-info-list">
              <div className="settings-info-row">
                <span>Application</span>
                <strong>
                  Social Media Intelligence (INTOCIAL)
                </strong>
              </div>

              <div className="settings-info-row">
                <span>Environment</span>
                <strong>Local Development</strong>
              </div>

              <div className="settings-info-row">
                <span>Frontend</span>
                <strong>React + Vite</strong>
              </div>

              <div className="settings-info-row">
                <span>Backend</span>
                <strong>FastAPI</strong>
              </div>

              <div className="settings-info-row">
                <span>Ingestion</span>
                <strong>Signal ingestion pipeline</strong>
              </div>

              <div className="settings-info-row">
                <span>API Status</span>
                <strong
                  className={
                    apiConnected
                      ? "value-success"
                      : "value-error"
                  }
                >
                  <span className="inline-status-dot" />
                  {apiConnected ? "Connected" : "Unavailable"}
                </strong>
              </div>
            </div>
          </section>

          <section className="settings-panel">
            <div className="settings-panel-header">
              <div>
                <span className="settings-section-label">
                  DATA PIPELINE
                </span>
                <h2>Current Architecture</h2>
                <p>
                  End-to-end signal processing and intelligence workflow.
                </p>
              </div>

              <span className="settings-code-badge">
                PIPELINE
              </span>
            </div>

            <div className="settings-pipeline">
              <div className="pipeline-node">
                <span>01</span>
                <Icon name="rss_feed" />
                <strong>Social Signals</strong>
                <small>Source data</small>
              </div>

              <div className="pipeline-connector">→</div>

              <div className="pipeline-node">
                <span>02</span>
                <Icon name="input" />
                <strong>Ingestion</strong>
                <small>Normalize signals</small>
              </div>

              <div className="pipeline-connector">→</div>

              <div className="pipeline-node">
                <span>03</span>
                <Icon name="analytics" />
                <strong>Risk Analysis</strong>
                <small>Score & classify</small>
              </div>

              <div className="pipeline-connector">→</div>

              <div className="pipeline-node">
                <span>04</span>
                <Icon name="hub" />
                <strong>Incidents</strong>
                <small>Correlate events</small>
              </div>

              <div className="pipeline-connector">→</div>

              <div className="pipeline-node">
                <span>05</span>
                <Icon name="description" />
                <strong>Reports</strong>
                <small>Intelligence output</small>
              </div>
            </div>

            <div className="pipeline-footer">
              <Icon name="account_tree" />
              <span>
                Signal ingestion → analysis → risk → incidents →
                intelligence reports
              </span>
            </div>
          </section>

          <section className="settings-security">
            <Icon name="verified_user" />

            <div>
              <h2>Configuration Security & Isolation</h2>

              <p>
                This environment is configured for local development.
                External API credentials and application secrets are
                managed outside the visible dashboard interface.
                No credentials are displayed here.
              </p>

              <div className="security-meta">
                <span>LOCAL DEVELOPMENT</span>
                <span>SECRETS NOT EXPOSED</span>
              </div>
            </div>
          </section>
        </div>

        <div className="settings-right">
          <section className="settings-panel">
            <div className="settings-panel-header">
              <div>
                <span className="settings-section-label">
                  SERVICES
                </span>
                <h2>System Services</h2>
                <p>
                  Core application capabilities currently available.
                </p>
              </div>
            </div>

            <div className="service-list">
              <div className="service-row">
                <div>
                  <strong>API Gateway</strong>
                  <span>FastAPI REST endpoints</span>
                </div>
                <em className={apiConnected ? "operational" : "offline"}>
                  ● {apiConnected ? "Operational" : "Offline"}
                </em>
              </div>

              <div className="service-row">
                <div>
                  <strong>Signal Analysis</strong>
                  <span>Risk and anomaly analysis</span>
                </div>
                <em className="operational">
                  ● Available
                </em>
              </div>

              <div className="service-row">
                <div>
                  <strong>Incident Engine</strong>
                  <span>Incident clustering and registry</span>
                </div>
                <em className="operational">
                  ● Available
                </em>
              </div>

              <div className="service-row">
                <div>
                  <strong>Correlation Engine</strong>
                  <span>Cross-signal relationship analysis</span>
                </div>
                <em className="operational">
                  ● Available
                </em>
              </div>

              <div className="service-row">
                <div>
                  <strong>Intelligence Reports</strong>
                  <span>Structured incident reporting</span>
                </div>
                <em className="operational">
                  ● Available
                </em>
              </div>
            </div>
          </section>

          <section className="settings-panel">
            <div className="settings-panel-header">
              <div>
                <span className="settings-section-label">
                  SESSION
                </span>
                <h2>Current Session</h2>
                <p>
                  Authenticated operator information.
                </p>
              </div>

              <Icon name="badge" />
            </div>

            <div className="session-user">
              <div className="session-avatar">
                {String(username)
                  .slice(0, 2)
                  .toUpperCase()}
              </div>

              <div>
                <strong>{username}</strong>
                <span>{role}</span>
              </div>
            </div>

            <div className="session-details">
              <div>
                <span>EMAIL</span>
                <strong>{email}</strong>
              </div>

              <div>
                <span>ROLE</span>
                <strong>{role}</strong>
              </div>

              <div>
                <span>SESSION STATUS</span>
                <strong className="value-success">
                  <span className="inline-status-dot" />
                  AUTHENTICATED
                </strong>
              </div>
            </div>
          </section>
        </div>
      </div>

      <footer className="settings-footer">
        <div>
          <strong>INTOCIAL</strong>
          <span>Intelligence Operations & Social Intelligence Analysis</span>
          <span>Local Development</span>
        </div>

        <div>
          <span className="footer-online">
            ● System Operational
          </span>
        </div>
      </footer>
    </div>
  );
}

export default Settings;