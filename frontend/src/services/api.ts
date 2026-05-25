import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";

export const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export const createAuthedApi = (token: string) =>
  axios.create({
    baseURL: api.defaults.baseURL,
    headers: { Authorization: `Bearer ${token}` },
  });

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  (config as typeof config & { _t: number })._t = performance.now();
  return config;
});

api.interceptors.response.use(
  (response) => {
    const start = (response.config as typeof response.config & { _t: number })._t;
    const ms = Math.round(performance.now() - start);
    console.log(`[API] ${response.config.method?.toUpperCase()} ${response.config.url} — ${ms}ms`);
    return response;
  },
  (error) => {
    const config = error.config as (typeof error.config & { _t: number }) | undefined;
    if (config?._t) {
      const ms = Math.round(performance.now() - config._t);
      console.warn(`[API] ${config.method?.toUpperCase()} ${config.url} — ${ms}ms (error)`);
    }
    return Promise.reject(error);
  },
);

export default api;
