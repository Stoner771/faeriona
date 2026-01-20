const BASE_URL = "http://team.heavencloud.in:2004";
const SUPABASE_FUNCTION_URL = "https://cngtifhgwwhuqthegvfr.supabase.co/functions/v1/faerion-proxy";

// Auth token management
let userType: "admin" | "reseller" | null = localStorage.getItem("faerion_user_type") as any;

const getAuthToken = () => localStorage.getItem("faerion_token");

export const setAuth = (token: string, type: "admin" | "reseller") => {
  localStorage.setItem("faerion_token", token);
  localStorage.setItem("faerion_user_type", type);
  userType = type;
};

export const clearAuth = () => {
  localStorage.removeItem("faerion_token");
  localStorage.removeItem("faerion_user_type");
  userType = null;
};

export const getAuth = () => ({ token: getAuthToken(), userType });

export const isAuthenticated = () => !!getAuthToken();

// Detect if we're in production
const isProduction = () => {
  return window.location.hostname !== 'localhost' && 
         window.location.hostname !== '127.0.0.1';
};

// API request helper
export const apiRequest = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<any> => {
  const token = getAuthToken();
  const isProd = isProduction();
  
  let url: string;
  let headers: HeadersInit;

  if (isProd) {
    // Production: Use Supabase Edge Function
    url = `${SUPABASE_FUNCTION_URL}?endpoint=${encodeURIComponent(endpoint)}`;
    headers = {
      "Content-Type": "application/json",
      ...(token && { "x-faerion-token": token }),
      ...options.headers,
    };
  } else {
    // Development: Direct via Vite proxy
    url = `/api${endpoint}`;
    headers = {
      "Content-Type": "application/json",
      ...(token && { "Authorization": `Bearer ${token}` }),
      ...options.headers,
    };
  }

  console.log(`[API] ${options.method || 'GET'} ${endpoint} (${isProd ? 'PROD' : 'DEV'})`, {
    hasToken: !!token,
    url: isProd ? `Supabase proxy -> ${endpoint}` : url,
  });

  const response = await fetch(url, {
    ...options,
    headers,
  });

  let data;
  try {
    data = await response.json();
  } catch (e) {
    console.error(`[API ERROR] Failed to parse response for ${endpoint}:`, e);
    throw new Error("Invalid response from server");
  }

  console.log(`[API RESPONSE] ${endpoint} - Status: ${response.status}`, data);

  if (!response.ok) {
    const errorMessage = data.detail || data.error || data.message || `HTTP ${response.status}`;
    console.error(`[API ERROR] ${endpoint}: ${errorMessage}`, data);
    throw new Error(errorMessage);
  }

  return data;
};

// ============ Authentication ============
export const adminLogin = (username: string, password: string) =>
  apiRequest("/auth/admin/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });

export const resellerLogin = (username: string, password: string) =>
  apiRequest("/auth/reseller/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });

// ============ Admin Stats ============
export const getAdminStats = () => apiRequest("/admin/stats");

// ============ Licenses ============
export const getLicenses = (appId?: number) =>
  apiRequest(`/admin/licenses/${appId ? `?app_id=${appId}` : ""}`);

export const createLicenses = (data: {
  app_id: number;
  duration_days?: number;
  is_lifetime?: boolean;
  count?: number;
}) =>
  apiRequest("/admin/licenses/", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const deleteLicense = (licenseId: string | number) =>
  apiRequest(`/admin/licenses/${licenseId}`, { method: "DELETE" });

export const resetHwid = (licenseKey: string, hwid: string | null = null) =>
  apiRequest("/admin/licenses/reset-hwid", {
    method: "POST",
    body: JSON.stringify({ license_key: licenseKey, hwid }),
  });

// ============ Users ============
export const getUsers = (appId?: number, isBanned?: boolean) => {
  const params = new URLSearchParams();
  if (appId) params.append("app_id", appId.toString());
  if (isBanned !== undefined) params.append("is_banned", isBanned.toString());
  const query = params.toString();
  return apiRequest(`/admin/users/${query ? `?${query}` : ""}`);
};

export const getUser = (userId: string | number) =>
  apiRequest(`/admin/users/${userId}`);

export const deleteUser = (userId: string | number) =>
  apiRequest(`/admin/users/${userId}`, { method: "DELETE" });

export const banUser = (userId: string | number, reason: string | null = null) =>
  apiRequest("/admin/users/ban", {
    method: "POST",
    body: JSON.stringify({ user_id: userId, reason }),
  });

export const unbanUser = (userId: string | number) =>
  apiRequest("/admin/users/unban", {
    method: "POST",
    body: JSON.stringify({ user_id: userId }),
  });

// ============ Applications ============
export const getApplications = () => apiRequest("/admin/apps/");

export const createApplication = (data: {
  name: string;
  version?: string;
  webhook_url?: string;
  force_update?: boolean;
}) =>
  apiRequest("/admin/apps/", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const updateApplication = (
  appId: string | number,
  data: { name?: string; version?: string; webhook_url?: string; force_update?: boolean }
) =>
  apiRequest(`/admin/apps/${appId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });

export const deleteApplication = (appId: string | number) =>
  apiRequest(`/admin/apps/${appId}`, { method: "DELETE" });

// ============ Logs ============
export const getLogs = () => apiRequest("/admin/logs/");

// ============ Files ============
export const getFiles = () => apiRequest("/admin/files/");

export const deleteFile = (fileId: string | number) =>
  apiRequest(`/admin/files/${fileId}`, { method: "DELETE" });

// ============ Variables ============
export const getVariables = (appId: number) => apiRequest(`/admin/vars/?app_id=${appId}`);

export const createVariable = (data: { app_id: number; key: string; value: string }) =>
  apiRequest("/admin/vars/", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const updateVariable = (
  varId: string | number,
  data: { key?: string; value?: string }
) =>
  apiRequest(`/admin/vars/${varId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });

export const deleteVariable = (varId: string | number) =>
  apiRequest(`/admin/vars/${varId}`, { method: "DELETE" });

// ============ Resellers ============
export const getResellers = () => apiRequest("/admin/resellers/");

export const createReseller = (data: {
  username: string;
  email: string;
  password: string;
  initial_credits?: number;
}) =>
  apiRequest("/admin/resellers/", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const updateReseller = (
  resellerId: string | number,
  data: { credits?: number; enabled?: boolean }
) =>
  apiRequest(`/admin/resellers/${resellerId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });

export const deleteReseller = (resellerId: string | number) =>
  apiRequest(`/admin/resellers/${resellerId}`, { method: "DELETE" });

export const addResellerBalance = (resellerId: string | number, amount: number) =>
  apiRequest("/admin/resellers/add-balance", {
    method: "POST",
    body: JSON.stringify({ reseller_id: resellerId, amount }),
  });

export const deductResellerBalance = (resellerId: string | number, amount: number) =>
  apiRequest("/admin/resellers/deduct-balance", {
    method: "POST",
    body: JSON.stringify({ reseller_id: resellerId, amount }),
  });

export const assignApplicationToReseller = (resellerId: string | number, appId: number) =>
  apiRequest("/admin/resellers/assign-app", {
    method: "POST",
    body: JSON.stringify({ reseller_id: resellerId, app_id: appId }),
  });

export const removeApplicationFromReseller = (resellerId: string | number, appId: number) =>
  apiRequest("/admin/resellers/remove-app", {
    method: "DELETE",
    body: JSON.stringify({ reseller_id: resellerId, app_id: appId }),
  });

export const getResellerApplications = (resellerId: string | number) =>
  apiRequest(`/admin/resellers/apps/?reseller_id=${resellerId}`);

// ============ Tickets ============
export const getTickets = () => apiRequest("/admin/tickets/");

export const getTicket = (ticketId: string | number) =>
  apiRequest(`/admin/tickets/${ticketId}`);

export const replyToTicket = (ticketId: string | number, message: string) =>
  apiRequest("/admin/tickets/message", {
    method: "POST",
    body: JSON.stringify({ ticket_id: ticketId, content: message }),
  });

export const deleteTicket = (ticketId: string | number) =>
  apiRequest(`/admin/tickets/${ticketId}`, { method: "DELETE" });

export const closeTicket = (ticketId: string | number) => 
  apiRequest(`/admin/tickets/${ticketId}/close`, { method: "POST" });

// ============ System ============
export const getHealth = () => apiRequest("/health");

export const getApiStatus = () => apiRequest("/status");

export const getServerTime = () => apiRequest("/time");

// ============ Subscriptions ============
export const getSubscriptions = (params: { skip?: number; limit?: number; app_id?: string; status_filter?: string }) => {
  const queryParams = new URLSearchParams();
  if (params.skip !== undefined) queryParams.append("skip", params.skip.toString());
  if (params.limit !== undefined) queryParams.append("limit", params.limit.toString());
  if (params.app_id && params.app_id !== "all") queryParams.append("app_id", params.app_id);
  if (params.status_filter && params.status_filter !== "all") queryParams.append("status_filter", params.status_filter);
  
  return apiRequest(`/admin/subscriptions?${queryParams.toString()}`);
};

export const createSubscription = (data: any) =>
  apiRequest("/admin/subscriptions", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const getSubscriptionLevels = (appId: number) =>
  apiRequest(`/admin/subscriptions/levels/?app_id=${appId}`);

export const createSubscriptionLevel = (data: {
  app_id: number;
  name: string;
  level: number;
}) =>
  apiRequest("/admin/subscriptions/levels/", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const deleteSubscriptionLevel = (levelId: number) =>
  apiRequest(`/admin/subscriptions/levels/${levelId}`, { method: "DELETE" });

export const updateSubscriptionLevel = (levelId: number, data: { name?: string; level?: number }) =>
  apiRequest(`/admin/subscriptions/levels/${levelId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });

// ============ Reseller API ============
export const resellerGetProfile = () => apiRequest("/reseller/profile");

export const resellerGetTransactions = () => apiRequest("/reseller/transactions");

export const resellerGetApps = () => apiRequest("/reseller/apps");

export const resellerGenerateLicense = (data: {
  app_id: number;
  duration_days: number;
  username?: string;
  hwid?: string;
}) =>
  apiRequest("/reseller/licenses/generate", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const resellerGetLicenses = (appId?: number) =>
  apiRequest(`/reseller/licenses/${appId ? `?app_id=${appId}` : ""}`);

export const resellerCreateLicensesBulk = (data: {
  app_id: number;
  count: number;
  duration_days: number;
}) =>
  apiRequest("/reseller/licenses/bulk", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const resellerDeleteLicense = (licenseId: string | number) =>
  apiRequest(`/reseller/licenses/${licenseId}`, { method: "DELETE" });

export const resellerResetHwid = (licenseKey: string) =>
  apiRequest("/reseller/licenses/reset-hwid", {
    method: "POST",
    body: JSON.stringify({ license_key: licenseKey }),
  });

export const resellerGetTickets = () => apiRequest("/reseller/tickets");

export const resellerCreateLicenses = (data: {
  app_id: number;
  count: number;
  duration_days: number;
}) =>
  apiRequest("/reseller/licenses/bulk", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const resellerCreateTicket = (data: {
  title: string;
  description: string;
  priority?: string;
}) =>
  apiRequest("/reseller/tickets", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const resellerGetApplications = () =>
  apiRequest("/reseller/applications");

export const generateLicenseKey = (data: {
  app_id: number;
  duration_days: number;
  username?: string;
  hwid?: string;
}) =>
  apiRequest("/admin/licenses/generate", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const getResellerBalance = (resellerId: string | number) =>
  apiRequest(`/admin/resellers/${resellerId}/balance`);
export const authenticateApplication = (appId: string, secret: string) => apiRequest("/auth/app/login", { method: "POST", body: JSON.stringify({ app_id: appId, secret }) });
