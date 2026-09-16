import { useEffect, useState } from "react";

import Layout from "./components/Layout";

import Overview from "./pages/Overview";
import LiveFeed from "./pages/LiveFeed";
import RiskAlerts from "./pages/RiskAlerts";
import Investigations from "./pages/Investigations";
import Multimodal from "./pages/Multimodal";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";
import Incidents from "./pages/Incidents";
import Correlation from "./pages/Correlation";
import Reports from "./pages/Reports";
import Login from "./pages/Login";
import Register from "./pages/Register";

import {
  getStoredToken,
  getStoredUser,
  getCurrentUser,
  clearAuth,
} from "./services/api";

function App() {
  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState(getStoredUser());

  const path = window.location.pathname;

  useEffect(() => {
    async function checkAuthentication() {
      const token = getStoredToken();

      if (!token) {
        setUser(null);
        setAuthLoading(false);
        return;
      }

      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
      } catch {
        clearAuth();
        setUser(null);
      } finally {
        setAuthLoading(false);
      }
    }

    checkAuthentication();
  }, []);

  useEffect(() => {
    if (!authLoading && path === "/login" && user) {
      window.location.href = "/";
    }

    if (!authLoading && path === "/register" && user) {
      window.location.href = "/";
    }
  }, [authLoading, path, user]);

  if (path === "/login") {
    if (authLoading) {
      return null;
    }

    if (user) {
      return null;
    }

    return <Login />;
  }

  if (path === "/register") {
    if (authLoading) {
      return null;
    }

    if (user) {
      return null;
    }

    return <Register />;
  }

  if (authLoading) {
    return (
      <div className="app-shell">
        <div className="main-content">
          <div className="page">
            <p>Authenticating INTOCIAL session...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    window.location.href = "/login";
    return null;
  }

  if (path === "/live-feed") {
    return (
      <Layout>
        <LiveFeed />
      </Layout>
    );
  }

  if (path === "/alerts") {
    return (
      <Layout>
        <RiskAlerts />
      </Layout>
    );
  }

  if (path === "/investigations") {
    return (
      <Layout>
        <Investigations />
      </Layout>
    );
  }

  if (path === "/multimodal") {
    return (
      <Layout>
        <Multimodal />
      </Layout>
    );
  }

  if (path === "/analytics") {
    return (
      <Layout>
        <Analytics />
      </Layout>
    );
  }

  if (path === "/incidents") {
    return (
      <Layout>
        <Incidents />
      </Layout>
    );
  }

  if (path === "/correlation") {
    return (
      <Layout>
        <Correlation />
      </Layout>
    );
  }

  if (path === "/settings") {
    return (
      <Layout>
        <Settings />
      </Layout>
    );
  }

  if (path === "/reports") {
    return (
      <Layout>
        <Reports />
      </Layout>
    );
  }

  return (
    <Layout>
      <Overview />
    </Layout>
  );
}

export default App;