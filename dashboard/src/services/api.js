import axios from "axios";

const TOKEN_KEY = "intocial_access_token";
const USER_KEY = "intocial_user";

const api = axios.create({
  baseURL: "http://localhost:8000",
  timeout: 120000,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(TOKEN_KEY);

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response?.status === 401 &&
      !error.config?.url?.startsWith("/auth/")
    ) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);

      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser() {
  const user = localStorage.getItem(USER_KEY);

  if (!user) {
    return null;
  }

  try {
    return JSON.parse(user);
  } catch {
    localStorage.removeItem(USER_KEY);
    return null;
  }
}

export function saveAuth(accessToken, user) {
  localStorage.setItem(TOKEN_KEY, accessToken);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export async function registerUser(username, email, password) {
  const response = await api.post("/auth/register", {
    username,
    email,
    password,
  });

  return response.data;
}

export async function loginUser(email, password) {
  const response = await api.post("/auth/login", {
    email,
    password,
  });

  saveAuth(
    response.data.access_token,
    response.data.user
  );

  return response.data;
}

export async function getCurrentUser() {
  const response = await api.get("/auth/me");
  return response.data;
}

export async function logoutUser() {
  clearAuth();
}

export async function getHealth() {
  const response = await api.get("/health");
  return response.data;
}

export async function getDashboardSummary() {
  const response = await api.get("/dashboard/summary");
  return response.data;
}

export async function getDashboardSignals() {
  const response = await api.get("/dashboard/signals");
  return response.data;
}

export async function ingestYouTube(
  videoId,
  maxResults = 20
) {
  const response = await api.post(
    "/ingest/youtube",
    null,
    {
      params: {
        video_id: videoId,
        max_results: maxResults,
      },
    }
  );

  return response.data;
}

export async function getLiveSignals(
  limit = 20,
  offset = 0,
  riskLevel = null,
  platform = null
) {
  const params = {
    limit,
    offset,
  };

  if (riskLevel && riskLevel !== "ALL") {
    params.risk_level = riskLevel;
  }

  if (platform && platform !== "ALL") {
    params.platform = platform.toLowerCase();
  }

  const response = await api.get(
    "/live/signals",
    {
      params,
    }
  );

  return response.data;
}

export async function getLiveSummary(
  platform = null
) {
  const params = {};

  if (platform && platform !== "ALL") {
    params.platform = platform.toLowerCase();
  }

  const response = await api.get(
    "/live/summary",
    {
      params,
    }
  );

  return response.data;
}

export async function getHistoricalAnalytics(
  startDate = null,
  endDate = null
) {
  const params = {};

  if (startDate) {
    params.start_date = startDate;
  }

  if (endDate) {
    params.end_date = endDate;
  }

  const response = await api.get(
    "/analytics/summary",
    {
      params,
    }
  );

  return response.data;
}

export async function getRiskTrends(
  startDate = null,
  endDate = null
) {
  const params = {};

  if (startDate) {
    params.start_date = startDate;
  }

  if (endDate) {
    params.end_date = endDate;
  }

  const response = await api.get(
    "/analytics/risk-trends",
    {
      params,
    }
  );

  return response.data;
}

export async function getPlatformAnalytics(
  startDate = null,
  endDate = null
) {
  const params = {};

  if (startDate) {
    params.start_date = startDate;
  }

  if (endDate) {
    params.end_date = endDate;
  }

  const response = await api.get(
    "/analytics/platforms",
    {
      params,
    }
  );

  return response.data;
}

export async function getActivityAnomalies(
  startDate = null,
  endDate = null
) {
  const params = {};

  if (startDate) {
    params.start_date = startDate;
  }

  if (endDate) {
    params.end_date = endDate;
  }

  const response = await api.get(
    "/analytics/anomalies",
    {
      params,
    }
  );

  return response.data;
}

export async function getHighRiskAnomalies(
  startDate = null,
  endDate = null
) {
  const params = {};

  if (startDate) {
    params.start_date = startDate;
  }

  if (endDate) {
    params.end_date = endDate;
  }

  const response = await api.get(
    "/analytics/high-risk-anomalies",
    {
      params,
    }
  );

  return response.data;
}

export async function getIncidents() {
  const response = await api.get("/incidents");
  return response.data;
}

export async function getIncident(incidentId) {
  const response = await api.get(
    `/incidents/${incidentId}`
  );

  return response.data;
}

export async function attachSignalToIncident(
  incidentId,
  signalId
) {
  const response = await api.post(
    `/incidents/${incidentId}/signals/${signalId}`
  );

  return response.data;
}

export async function getAlerts() {
  const response = await api.get("/alerts");
  return response.data;
}

export async function getAlert(alertId) {
  const response = await api.get(
    `/alerts/${alertId}`
  );

  return response.data;
}

export async function acknowledgeAlert(
  alertId
) {
  const response = await api.post(
    `/alerts/${alertId}/acknowledge`
  );

  return response.data;
}

export async function analyzeCorrelation(signalIds) {
  const response = await api.post(
    "/correlation/analyze",
    signalIds
  );

  return response.data;
}

export async function getCorrelationSignals() {
  const response = await api.get("/correlation/signals");
  return response.data;
}

export async function getIncidentReport(incidentId) {
  const response = await api.get(
    `/incidents/${incidentId}/report`
  );

  return response.data;
}

export default api;