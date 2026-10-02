export const API_BASE_URL =
  import.meta.env.VITE_API_URL || "https://coconawada.valentinabanner.com";

const AUTH_PATHS_WITHOUT_REFRESH = [
  "/api/v1/auth/login",
  "/api/v1/auth/refresh",
  "/api/v1/auth/logout",
];

// Share a single in-flight refresh so parallel 401s don't stampede the endpoint.
let refreshPromise = null;

function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
      method: "POST",
      credentials: "include",
    })
      .then((res) => res.ok)
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

/**
 * fetch() wrapper for authenticated API calls.
 * - Prefixes API_BASE_URL and always sends the session cookies.
 * - On a 401 (access token lasts 15 min), tries /auth/refresh once and retries.
 *
 * `path` must start with "/", e.g. apiFetch("/api/v1/auth/me").
 */
export async function apiFetch(path, options = {}) {
  const request = () =>
    fetch(`${API_BASE_URL}${path}`, { ...options, credentials: "include" });

  let res = await request();

  if (res.status === 401 && !AUTH_PATHS_WITHOUT_REFRESH.includes(path)) {
    if (await refreshSession()) {
      res = await request();
    }
  }
  return res;
}
