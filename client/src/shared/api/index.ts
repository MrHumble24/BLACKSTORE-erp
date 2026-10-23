import axios, { type AxiosError } from 'axios';

let onUnauthorizedCallback: (() => void) | null = null;

/** Sets the callback to invoke when a 401 Unauthorized response is received. */
export function setOnUnauthorized(cb: () => void) {
  onUnauthorizedCallback = cb;
}

/** Extracts a readable message string from an API error response (Nest error shape). */
export function getApiErrorMessage(err: unknown): string | undefined {
  const axiosError = err as AxiosError<{ message?: string | string[] }>;
  const msg = axiosError.response?.data?.message;
  if (typeof msg === 'string') return msg;
  if (Array.isArray(msg)) return msg.join(', ');
  return undefined;
}

/** Extracts HTTP status code from an API error response. */
export function getApiErrorStatus(err: unknown): number | undefined {
  const axiosError = err as AxiosError;
  return axiosError?.response?.status;
}

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  withCredentials: true,
});

export const api = apiClient;
export const API_BASE_URL = apiClient.defaults.baseURL ?? '/api';

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Only redirect/clear on 401 if it is not the login endpoint itself failing
    if (error.response?.status === 401 && !error.config?.url?.includes('/auth/login')) {
      if (onUnauthorizedCallback) {
        onUnauthorizedCallback();
      }
    }
    return Promise.reject(error);
  },
);
