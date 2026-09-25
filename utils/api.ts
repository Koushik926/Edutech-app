import * as SecureStore from 'expo-secure-store';
import { ENDPOINTS, REQUEST_TIMEOUT } from '../constants/api';
import { TOKEN_KEY, User } from '../store/authStore';

/** Error thrown for any non-2xx HTTP response, so callers can branch on `status`. */
export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

export function isUnauthorized(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 401 || error.status === 403);
}

/**
 * Only idempotent GETs are retried, and only for failures a retry can fix
 * (network errors, 5xx, 429). Retrying a 4xx just delays the error, and
 * retrying a POST can duplicate side effects (e.g. register twice).
 */
function isRetryable(method: string, error: unknown): boolean {
  if (method !== 'GET') return false;
  if (error instanceof ApiError) return error.status >= 500 || error.status === 429;
  return true;
}

async function request<T>(
  url: string,
  options: RequestInit = {},
  retries = 2
): Promise<T> {
  const method = (options.method ?? 'GET').toUpperCase();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (!headers.Authorization) {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  try {
    const res = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new ApiError(err?.message || `HTTP ${res.status}`, res.status);
    }
    return (await res.json()) as T;
  } catch (error: unknown) {
    const isAbort = error instanceof Error && error.name === 'AbortError';
    if (retries > 0 && !isAbort && isRetryable(method, error)) {
      await new Promise((r) => setTimeout(r, 1000));
      return request<T>(url, options, retries - 1);
    }
    throw isAbort ? new Error('Request timed out') : error;
  } finally {
    clearTimeout(timer);
  }
}

export const api = {
  get: <T>(url: string, headers?: Record<string, string>) => request<T>(url, { headers }),
  post: <T>(url: string, body: unknown) =>
    request<T>(url, { method: 'POST', body: JSON.stringify(body) }),
};

// Auth
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export async function registerUser(data: {
  username: string;
  email: string;
  password: string;
}) {
  return api.post(ENDPOINTS.REGISTER, data);
}

export async function loginUser(data: { email: string; password: string }) {
  return api.post<{ data: AuthTokens & { user: User } }>(ENDPOINTS.LOGIN, data);
}

export async function logoutUser() {
  return api.post(ENDPOINTS.LOGOUT, {});
}

export async function getCurrentUser(accessToken: string): Promise<User> {
  const res = await api.get<{ data: User }>(ENDPOINTS.CURRENT_USER, {
    Authorization: `Bearer ${accessToken}`,
  });
  return res.data;
}

/** FreeAPI expects the refresh token in the body and may rotate it, so both tokens are returned. */
export async function refreshTokens(refreshToken: string): Promise<AuthTokens> {
  const res = await api.post<{ data: AuthTokens }>(ENDPOINTS.REFRESH_TOKEN, { refreshToken });
  return {
    accessToken: res.data.accessToken,
    refreshToken: res.data.refreshToken ?? refreshToken,
  };
}

export type SessionCheck =
  | ({ status: 'valid'; user: User } & AuthTokens)
  | { status: 'expired' }
  | { status: 'unreachable' };

/**
 * Validates a stored session against the server:
 * - access token accepted            -> 'valid' (with fresh user profile)
 * - access token rejected, refresh ok -> 'valid' (with new tokens)
 * - server rejects both tokens       -> 'expired' (caller should log out)
 * - network/server failure           -> 'unreachable' (caller should keep the session)
 */
export async function revalidateSession(
  accessToken: string,
  refreshToken: string
): Promise<SessionCheck> {
  try {
    const user = await getCurrentUser(accessToken);
    return { status: 'valid', user, accessToken, refreshToken };
  } catch (error) {
    if (!isUnauthorized(error)) return { status: 'unreachable' };
  }

  try {
    const tokens = await refreshTokens(refreshToken);
    const user = await getCurrentUser(tokens.accessToken);
    return { status: 'valid', user, ...tokens };
  } catch (error) {
    return isUnauthorized(error) ? { status: 'expired' } : { status: 'unreachable' };
  }
}

// Courses & Instructors
export async function fetchCourses(page = 1, limit = 20) {
  return api.get(`${ENDPOINTS.COURSES}?page=${page}&limit=${limit}`);
}

export async function fetchInstructors(limit = 20) {
  return api.get(`${ENDPOINTS.INSTRUCTORS}?limit=${limit}`);
}
