import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const TOKEN_KEY = 'futbot.token';

export const api = axios.create({ baseURL: `${BACKEND_URL}/api` });

api.interceptors.request.use((cfg) => {
  const t = localStorage.getItem(TOKEN_KEY);
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

export const nftGateOf = (e) => {
  const d = e?.response?.data?.detail;
  return e?.response?.status === 403 && d && typeof d === 'object' && d.code === 'NFT_REQUIRED' ? d : null;
};

api.interceptors.response.use(
  (r) => r,
  (e) => {
    const gate = nftGateOf(e);
    if (gate) window.dispatchEvent(new CustomEvent('futbot-nft-required', { detail: gate }));
    return Promise.reject(e);
  }
);

export const errMsg = (e, fallback = 'Something went wrong') => {
  const d = e?.response?.data?.detail;
  if (d && typeof d === 'object') return d.message || fallback;
  return d || e?.shortMessage || e?.message || fallback;
};
