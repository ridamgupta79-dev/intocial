import TopNav from "./TopNav";
import "./Layout.css";

function Layout({ children }) {
  const currentPath = window.location.pathname;

  const sections = [
    {
      label: "WORKSPACE",
      items: [
        { label: "Overview", path: "/", icon: "dashboard" },
        { label: "Live Feed", path: "/live-feed", icon: "dynamic_feed" },
      ],
    },
    {
      label: "INTELLIGENCE",
      items: [
        { label: "Investigations", path: "/investigations", icon: "search_insights" },
        { label: "Incidents", path: "/incidents", icon: "warning" },
        { label: "Correlation", path: "/correlation", icon: "hub" },
        { label: "Reports", path: "/reports", icon: "description" },
      ],
    },
    {
      label: "ANALYSIS",
      items: [
        { label: "Risk & Alerts", path: "/alerts", icon: "notifications_active" },
        { label: "Analytics", path: "/analytics", icon: "analytics" },
        { label: "Multimodal", path: "/multimodal", icon: "perm_media" },
      ],
    },
  ];

  return (
    <div className="intocial-shell">
      <TopNav />

      <div className="intocial-body">
        <aside className="intocial-sidebar">
          <div className="sidebar-groups">
            {sections.map((section) => (
              <div className="sidebar-group" key={section.label}>
                <div className="sidebar-section-label">
                  {section.label}
                </div>

                <nav className="intocial-sidebar-nav">
                  {section.items.map((item) => (
                    <a
                      key={item.path}
                      href={item.path}
                      className={`intocial-nav-item ${
                        currentPath === item.path ? "active" : ""
                      }`}
                    >
                      <span className="material-symbols-outlined">
                        {item.icon}
                      </span>

                      <span>{item.label}</span>
                    </a>
                  ))}
                </nav>
              </div>
            ))}
          </div>

          <div className="sidebar-system">
            <div className="sidebar-section-label">
              SYSTEM
            </div>

            <nav className="intocial-sidebar-nav">
              <a
                href="/settings"
                className={`intocial-nav-item ${
                  currentPath === "/settings" ? "active" : ""
                }`}
              >
                <span className="material-symbols-outlined">
                  settings
                </span>

                <span>Settings</span>
              </a>
            </nav>
          </div>

          <div className="sidebar-footer">
            <div className="sidebar-status-dot" />

            <div>
              <strong>System Operational</strong>
              <span>INTELLIGENCE NODE</span>
            </div>
          </div>
        </aside>

        <main className="intocial-main">
          {children}
        </main>
      </div>
    </div>
  );
}

export default Layout;