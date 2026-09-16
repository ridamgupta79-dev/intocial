import { useEffect, useState } from "react";

import {
  getStoredUser,
  logoutUser,
  getAlerts,
} from "../services/api";

function TopNav() {
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [alerts, setAlerts] = useState([]);

  const user = getStoredUser();

  useEffect(() => {
    async function loadAlerts() {
      try {
        const data = await getAlerts();
        setAlerts(data.alerts || []);
      } catch {
        setAlerts([]);
      }
    }

    loadAlerts();
  }, []);

  async function handleLogout() {
    await logoutUser();
    window.location.href = "/login";
  }

  function toggleNotifications() {
    setNotificationsOpen((value) => !value);
    setProfileOpen(false);
  }

  function toggleProfile() {
    setProfileOpen((value) => !value);
    setNotificationsOpen(false);
  }

  const openAlertsCount = alerts.filter(
    (alert) =>
      String(alert.status || "").toUpperCase() === "OPEN"
  ).length;

  const avatarLetter =
    user?.username?.charAt(0)?.toUpperCase() || "A";

  return (
    <header className="intocial-topbar">
      <a href="/" className="intocial-brand">
        <div className="intocial-logo">
          <img
            src="/intocial-logo.png"
            alt="INTOCIAL"
          />
        </div>

        <div className="intocial-brand-copy">
          <strong>INTOCIAL</strong>
          <span>INTELLIGENCE OPERATIONS</span>
        </div>
      </a>

      <div className="intocial-topbar-right">
        <div className="intocial-system-status">
          <span className="intocial-status-dot" />
          <span>SYSTEM OPERATIONAL</span>
        </div>

        <div className="intocial-top-divider" />

        <div className="intocial-dropdown">
          <button
            type="button"
            className="intocial-top-icon"
            onClick={toggleNotifications}
            aria-label="Notifications"
          >
            <span className="material-symbols-outlined">
              notifications
            </span>

            {openAlertsCount > 0 && (
              <span className="intocial-notification-badge">
                {openAlertsCount > 9 ? "9+" : openAlertsCount}
              </span>
            )}
          </button>

          {notificationsOpen && (
            <div className="intocial-notification-menu">
              <div className="intocial-dropdown-header">
                <strong>Notifications</strong>
                <span>{openAlertsCount} OPEN</span>
              </div>

              {alerts.length === 0 ? (
                <div className="intocial-dropdown-empty">
                  No open alerts.
                </div>
              ) : (
                <div className="intocial-notification-list">
                  {alerts.slice(0, 5).map((alert) => (
                    <button
                      key={alert.id}
                      type="button"
                      className="intocial-notification-item"
                      onClick={() =>
                        (window.location.href = "/alerts")
                      }
                    >
                      <strong>
                        {alert.title || "Risk Alert"}
                      </strong>
                      <span>
                        {alert.message ||
                          "Review intelligence alert."}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              <button
                type="button"
                className="intocial-dropdown-action"
                onClick={() =>
                  (window.location.href = "/alerts")
                }
              >
                View all alerts →
              </button>
            </div>
          )}
        </div>

        <div className="intocial-dropdown">
          <button
            type="button"
            className="intocial-user-button"
            onClick={toggleProfile}
            aria-label="Open analyst profile"
          >
            <span className="intocial-avatar">
              {avatarLetter}
            </span>

            <span className="intocial-user-copy">
              <strong>{user?.username || "Analyst"}</strong>
              <small>{user?.role || "ANALYST"}</small>
            </span>

            <span className="material-symbols-outlined intocial-user-chevron">
              expand_more
            </span>
          </button>

          {profileOpen && (
            <div className="intocial-profile-menu">
              <div className="intocial-profile-heading">
                <div className="intocial-profile-avatar">
                  {avatarLetter}
                </div>

                <div>
                  <strong>
                    {user?.username || "Analyst"}
                  </strong>
                  <span>{user?.role || "ANALYST"}</span>
                </div>
              </div>

              <div className="intocial-profile-email">
                {user?.email || ""}
              </div>

              <div className="intocial-profile-divider" />

              <button
                type="button"
                onClick={() =>
                  (window.location.href = "/settings")
                }
              >
                <span className="material-symbols-outlined">
                  settings
                </span>
                Profile & Settings
              </button>

              <button
                type="button"
                className="intocial-logout"
                onClick={handleLogout}
              >
                <span className="material-symbols-outlined">
                  logout
                </span>
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default TopNav;