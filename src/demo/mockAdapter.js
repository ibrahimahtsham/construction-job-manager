// Demo mode: answers every API call in the browser from fixtures.json, so the
// app runs as a static site (GitHub Pages) with no backend. Changes are kept
// in memory and reset on page reload.
import { message } from 'antd';
import fixtures from './fixtures.json';

const BASE = import.meta.env.BASE_URL;
const store = structuredClone(fixtures);
let warned = false;

const uuid = () => crypto.randomUUID();
const clone = (v) => (v === undefined ? v : structuredClone(v));

function ok(config, data, status = 200) {
  return Promise.resolve({ data: clone(data), status, statusText: 'OK', headers: {}, config, request: {} });
}

function notFound(config) {
  const error = new Error('Not found in demo data');
  error.config = config;
  error.response = { data: { error: 'Not found' }, status: 404, statusText: 'Not Found', headers: {}, config };
  return Promise.reject(error);
}

function demoNotice() {
  if (warned) return;
  warned = true;
  message.info('Demo mode: changes are kept until you reload the page.');
}

function parseBody(data) {
  if (!data || data instanceof FormData) return {};
  if (typeof data === 'string') {
    try { return JSON.parse(data); } catch { return {}; }
  }
  return data;
}

// Every array fixture that may contain an item with this id
function arraysContaining(id) {
  return Object.values(store).filter((v) => Array.isArray(v) && v.some((x) => x?.id === id));
}

function handleGet(config, path, query) {
  if (config.responseType === 'blob') {
    return fetch(`${BASE}demo-sample.pdf`).then((r) => r.blob()).then((blob) => ok(config, blob));
  }

  const key = query ? `${path}?${query}` : path;
  if (key in store) {
    const data = store[key];
    if (data?.portal_url) return ok(config, { portal_url: data.portal_url.replace('__BASE__', location.origin + BASE) });
    return ok(config, data);
  }

  const status = new URLSearchParams(query).get('status');
  if (path === '/jobs' && status) {
    const wanted = new Set(status.split(','));
    return ok(config, store['/jobs'].filter((j) => wanted.has(j.status)));
  }

  if (path === '/settings/backups' || path.endsWith('/files') || path.endsWith('/items')) return ok(config, []);
  return notFound(config);
}

function handleWrite(config, method, path) {
  demoNotice();
  const body = parseBody(config.data);
  const parts = path.split('/').filter(Boolean);
  const last = parts[parts.length - 1];
  const parentPath = '/' + parts.slice(0, -1).join('/');

  if (method === 'post') {
    // POST /collection → append to that list if we have it
    if (Array.isArray(store[path])) {
      const item = { id: uuid(), created_at: new Date().toISOString(), ...body };
      store[path].push(item);
      return ok(config, item, 201);
    }
    return ok(config, { ok: true });
  }

  if (method === 'put' || method === 'patch') {
    let updated = null;
    if (store[path] && typeof store[path] === 'object' && !Array.isArray(store[path])) {
      Object.assign(store[path], body);
      updated = store[path];
    }
    for (const list of arraysContaining(last)) {
      const item = list.find((x) => x.id === last);
      Object.assign(item, body);
      updated = updated || item;
    }
    return ok(config, updated || { id: last, ...body });
  }

  if (method === 'delete') {
    for (const list of arraysContaining(last)) list.splice(list.findIndex((x) => x.id === last), 1);
    delete store[path];
    if (Array.isArray(store[parentPath])) store[parentPath] = store[parentPath].filter((x) => x.id !== last);
    return ok(config, null, 204);
  }

  return ok(config, { ok: true });
}

export default function mockAdapter(config) {
  const url = new URL(config.url, 'http://demo');
  const path = url.pathname.replace(/\/+$/, '');
  const query = url.search.slice(1);
  const method = (config.method || 'get').toLowerCase();
  return method === 'get' ? handleGet(config, path, query) : handleWrite(config, method, path);
}

export const demoUser = store['/auth/me'];
