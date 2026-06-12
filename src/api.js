// Client for the Netlify Functions backend (account + progress sync).
const BASE = '/api';

async function request(path, { method = 'GET', token, body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* non-JSON error body */
  }
  if (!res.ok) {
    const err = new Error(data?.error || `Request failed (${res.status})`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export const apiRegister = (email, password) =>
  request('/register', { method: 'POST', body: { email, password } });

export const apiLogin = (email, password) =>
  request('/login', { method: 'POST', body: { email, password } });

export const apiGetProgress = (token) => request('/progress', { token });

export const apiPutProgress = (token, progress, updatedAt) =>
  request('/progress', { method: 'PUT', token, body: { progress, updatedAt } });
