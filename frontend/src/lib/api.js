import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const TOKEN_KEY = 'futbot.token';

export const api = axios.create({ baseURL: `${BACKEND_URL}/api` });

api.interceptors.request.use((cfg) => {
  const t = localStorage.getItem(TOKEN_KEY);
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

export const errMsg = (e, fallback = 'Something went wrong') => e?.response?.data?.detail || e?.shortMessage || e?.message || fallback;
