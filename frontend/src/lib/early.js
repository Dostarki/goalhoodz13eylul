import axios from 'axios';

const BASE = `${process.env.REACT_APP_BACKEND_URL}/api`;
export const EARLY_TOKEN = 'futbot.early';
export const ADMIN_TOKEN = 'futbot.admin';
export const COLLAB_TOKEN = 'futbot.collab';
export const CLIENT_ID = 'futbot.cid';

const clientId = () => {
  let id = localStorage.getItem(CLIENT_ID);
  if (!id) {
    id = (window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`).replace(/-/g, '');
    localStorage.setItem(CLIENT_ID, id);
  }
  return id;
};

const withToken = (key) => {
  const inst = axios.create({ baseURL: BASE });
  inst.interceptors.request.use((cfg) => {
    const t = localStorage.getItem(key);
    if (t) cfg.headers.Authorization = `Bearer ${t}`;
    if (key === EARLY_TOKEN) cfg.headers['X-Client-Id'] = clientId();
    return cfg;
  });
  return inst;
};

export const earlyApi = withToken(EARLY_TOKEN);
export const adminApi = withToken(ADMIN_TOKEN);
export const collabApi = withToken(COLLAB_TOKEN);
export const tweetId = (url) => (url || '').match(/status\/(\d+)/)?.[1] || null;
export const shortWallet = (w) => `${w.slice(0, 6)}…${w.slice(-4)}`;

export const tweetIntent = (text, url) =>
  `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}${url ? `&url=${encodeURIComponent(url)}` : ''}`;

export const padTicket = (n) => `#${String(n).padStart(4, '0')}`;

export const TIERS = {
  bronze: { label: 'BRONZE', color: '#9a6b3f' },
  silver: { label: 'SILVER', color: '#6f7a85' },
  gold: { label: 'GOLD', color: '#b08a12' },
  platinum: { label: 'PLATINUM', color: '#3f7f96' },
};

export const REF_KEY = 'futbot.ref';
export const referralLink = (x) => `${window.location.origin}/?ref=${encodeURIComponent(x)}`;
export const fmtUsd = (v) => `$${Number(v || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
