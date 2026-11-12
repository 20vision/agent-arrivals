// Agent Arrivals (agents.myclawn.com)
// A live board of pull requests opened by AI coding agents on public GitHub,
// a 2026 recap per GitHub user and a 30-day report per repository.
// Site-wide numbers come from collector/collect.py (pushed to /api/ingest). Per-user and per-repo
// numbers are fetched by the visitor's own browser. A user can claim their pass by signing in with
// GitHub (device flow, public information only); the numbers are then checked here with their own
// sign-in and stored, which gives the leaderboard, the README badge and the lounge.
import PAGE from './page.html';
import CSS from './app.css.txt';
import JS from './app.client.txt';
import OG from './og.bin';
import { legalResponse } from './legal.js';

const ORIGIN = 'https://agents.myclawn.com';
const YEAR = 2026;
const UA = 'agent-arrivals (+https://agents.myclawn.com)';
const LOGIN = /^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/;
const REPO = /^(?!\.{1,2}$)[A-Za-z0-9._-]{1,100}$/;
const HANDLE = /^[a-z0-9][a-z0-9-]{1,38}$/;
const RESERVED = new Set(['api', 'auth', 'badge', 'agent', 'rules', 'og.png', 'robots.txt', 'sitemap.xml', 'favicon.svg', 'favicon.ico', 'method', 'about', 'terms', 'privacy', 'imprint', 'impressum', 'apple-touch-icon.png', 'llms.txt', 'top', 'lounge']);
const AGENTS = [['claude', 'Claude Code'], ['codex', 'Codex'], ['cursor', 'Cursor'], ['copilot', 'Copilot']];
const SIG = '("Generated with Claude Code" OR head:claude/ OR head:codex/ OR head:cursor/ OR head:copilot/)';
const FAM = { claude: '("Generated with Claude Code" OR head:claude/)', codex: 'head:codex/', cursor: 'head:cursor/' };
const BAD = /(fuck|shit|nigg|fagg|cunt|porn|nsfw|hentai|rape|nazi|onlyfans|xxx)/i;
const SLUG = { claude: 'claude-code', codex: 'codex', cursor: 'cursor', copilot: 'copilot' };
const BYSLUG = { 'claude-code': 'claude', codex: 'codex', cursor: 'cursor', copilot: 'copilot' };
const COUNTED = {
  claude: ['its text says “Generated with Claude Code”, or its branch name starts with <code>claude/</code>', '<code>("Generated with Claude Code" OR head:claude/)</code>'],
  codex: ['its branch name starts with <code>codex/</code>, the name Codex gives the branches it works on', '<code>head:codex/</code>'],
  cursor: ['its branch name starts with <code>cursor/</code>, the name Cursor’s background agents give their branches', '<code>head:cursor/</code>'],
  copilot: ['its branch name starts with <code>copilot/</code>, the name GitHub’s Copilot coding agent gives its branches', '<code>head:copilot/</code>'],
};
const TRUST = 'From 20Vision, makers of AI Architectures · 16,000+ users · customers in 75+ countries · since 2022';
// Sections each kind of page keeps. Everything else is cut on the server, so each page stands on its own.
const KEEP = {
  home: ['result', 'hero', 'board', 'carriers', 'flyers', 'lounge', 'departures', 'address', 'rules', 'method'],
  agent: ['hero', 'board', 'carriers', 'about', 'method'],
  rules: ['rules', 'method'],
  method: ['method', 'carriers'],
};

const LEGAL = {
  name: 'Agent Arrivals', host: 'agents.myclawn.com',
  what: 'Agent Arrivals shows a live count of pull requests opened by AI coding agents on public GitHub repositories, a yearly recap per GitHub user and a 30-day report per repository, taken from GitHub\'s public search. People can claim their own recap by signing in with GitHub and add a short note of what they have and what they need.',
  terms: [
    'The numbers come from GitHub\'s public search and are estimates: a pull request counts as an agent\'s when it carries that agent\'s default signature or branch name. They can be too low or too high for any person or repository. Do not rely on them for decisions about people.',
    'Recaps and repository reports are computed in your browser from public data. Anyone can look up any public GitHub account or repository. If a page about your account shows something you want removed, email us.',
    'Claiming a pass is free. You may remove your pass at any time on its page.',
    'Agent Arrivals is not affiliated with GitHub, Anthropic, OpenAI, Anysphere or Microsoft.',
  ],
  ugc: 'You keep the rights to the "has" and "needs" notes you post. You give us a free, worldwide, non-exclusive licence to show them on Agent Arrivals for as long as your pass exists. Notes must not be illegal, infringe rights, harass or deceive, and must not be advertising for something unrelated. We may shorten, hide or remove notes and passes that break these rules.',
  liab: 'We are in particular not liable for the accuracy of counts taken from GitHub, or for arrangements you make with people you find here',
  collects: [
    '<b>Lookups</b>: when you look up a GitHub username or repository, your browser asks GitHub\'s public API directly; we do not receive or store who was looked up. We keep a total count of lookups made.',
    '<b>Claiming a pass (optional)</b>: if you sign in with GitHub we receive your public GitHub username, numeric id and avatar address, and nothing private: the sign-in asks for public information only. We use the sign-in once to count your public agent pull requests and store those counts with your username. The access token is deleted as soon as the count is done, at the latest after 15 minutes. We also store the "has" and "needs" notes and the contact handle you enter, and whether you want to be listed (Art. 6(1)(b) GDPR). Remove your pass on its page or by email and all of it is deleted.',
    '<b>Cookies</b>: only a sign-in cookie after you claim a pass, and a short-lived cookie during sign-in. Both are strictly necessary; there are no advertising or tracking cookies.',
  ],
  processors: [
    '<b>GitHub, Inc.</b> (USA): your browser loads public data and profile pictures from GitHub, and GitHub handles the sign-in.',
  ],
};

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (n) => Number(n).toLocaleString('en-US');
const json = (data, status = 200, extra = {}) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', ...extra } });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const nowSec = () => Math.floor(Date.now() / 1000);
function tierOf(n) {
  if (n >= 10000) return 'Owns the airport';
  if (n >= 1000) return 'Air traffic control';
  if (n >= 100) return 'Captain';
  if (n >= 10) return 'Frequent flyer';
  if (n >= 1) return 'Carry-on only';
  return 'Standby';
}

const SECURITY = {
  'content-security-policy': "default-src 'self'; script-src 'self' 'unsafe-inline' https://t.myclawn.com; style-src 'unsafe-inline'; img-src 'self' data: https://github.com https://avatars.githubusercontent.com; connect-src 'self' https://api.github.com https://raw.githubusercontent.com https://t.myclawn.com; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
};

// ---------------------------------------------------------------- storage
let ready = false;
async function init(env) {
  if (ready) return;
  await env.DB.batch([
    env.DB.prepare('CREATE TABLE IF NOT EXISTS blobs (k TEXT PRIMARY KEY, v TEXT NOT NULL, at INTEGER NOT NULL)'),
    env.DB.prepare('CREATE TABLE IF NOT EXISTS counters (day TEXT NOT NULL, name TEXT NOT NULL, n INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (day, name))'),
    env.DB.prepare("CREATE TABLE IF NOT EXISTS passes (gh_id INTEGER PRIMARY KEY, login TEXT NOT NULL, login_lc TEXT NOT NULL UNIQUE, total INTEGER, merged INTEGER, abroad INTEGER, top TEXT, first TEXT, fam TEXT, langs TEXT, has TEXT NOT NULL DEFAULT '', needs TEXT NOT NULL DEFAULT '', handle TEXT NOT NULL DEFAULT '', listed INTEGER NOT NULL DEFAULT 1, claimed_at INTEGER NOT NULL, verified_at INTEGER, card_at INTEGER)"),
    env.DB.prepare('CREATE TABLE IF NOT EXISTS devices (id TEXT PRIMARY KEY, device_code TEXT NOT NULL, at INTEGER NOT NULL)'),
    env.DB.prepare("CREATE TABLE IF NOT EXISTS jobs (gh_id INTEGER PRIMARY KEY, login TEXT NOT NULL, token TEXT NOT NULL, step INTEGER NOT NULL DEFAULT 0, data TEXT NOT NULL DEFAULT '{}', at INTEGER NOT NULL)"),
  ]);
  ready = true;
}

let memo = { at: 0, tide: null };
async function getTide(env) {
  const now = Date.now();
  if (now - memo.at < 20000) return memo.tide;
  await init(env);
  const row = await env.DB.prepare("SELECT v FROM blobs WHERE k = 'tide'").first();
  let tide = null;
  if (row) { try { tide = JSON.parse(row.v); } catch { tide = null; } }
  const made = await env.DB.prepare('SELECT name, SUM(n) AS n FROM counters GROUP BY name').all();
  const m = {};
  for (const r of made.results || []) m[r.name] = r.n;
  const c = await env.DB.prepare('SELECT COUNT(*) AS n FROM passes').first();
  m.claimed = (c && c.n) || 0;
  if (tide) tide.made = m; else tide = { made: m };
  memo = { at: now, tide };
  return tide;
}

let boardMemo = { at: 0, top: null, lounge: null };
async function getBoards(env) {
  const now = Date.now();
  if (boardMemo.top && now - boardMemo.at < 30000) return boardMemo;
  await init(env);
  const rows = await env.DB.prepare('SELECT login, total, merged FROM passes WHERE listed = 1 AND verified_at IS NOT NULL AND total > 0 ORDER BY total DESC, claimed_at ASC LIMIT 50').all();
  const c = await env.DB.prepare('SELECT COUNT(*) AS n FROM passes').first();
  const l = await env.DB.prepare("SELECT login, total, has, needs, handle FROM passes WHERE listed = 1 AND (has != '' OR needs != '') ORDER BY card_at DESC LIMIT 60").all();
  boardMemo = { at: now, top: { claimed: (c && c.n) || 0, top: rows.results || [] }, lounge: l.results || [] };
  return boardMemo;
}
const shapeFund = (list) => (Array.isArray(list) ? list : []).slice(0, 12).map((p) => ({
  slug: String(p.slug || ''), owner: String(p.owner || ''), repo: String(p.repo || ''), title: String(p.title || '').slice(0, 80), vision: String(p.vision || '').slice(0, 200),
})).filter((p) => /^[a-z0-9-]+$/i.test(p.slug));
const shapeNet = (x) => ({ agents: Number(x.agents_registered) || 0, cards: Number(x.cards_published) || 0, wallet: !!x.wallet_enabled });
const getFund = () => cachedFetch(fundMemo, 'https://fund.myclawn.com/api/projects', 600000, shapeFund);
const getNet = () => cachedFetch(netMemo, 'https://contacts.myclawn.com/api/net/public/stats', 300000, shapeNet);

function publicPass(r) {
  if (!r) return null;
  let fam = [], langs = [];
  try { fam = JSON.parse(r.fam || '[]'); } catch { fam = []; }
  try { langs = JSON.parse(r.langs || '[]'); } catch { langs = []; }
  return { login: r.login, total: r.total, merged: r.merged, abroad: r.abroad, top: r.top || '', first: r.first || '', fam, langs, has: r.has || '', needs: r.needs || '', handle: r.handle || '', listed: !!r.listed, claimed_at: r.claimed_at, verified_at: r.verified_at || null };
}
async function getPass(env, login) {
  await init(env);
  return publicPass(await env.DB.prepare('SELECT * FROM passes WHERE login_lc = ?1').bind(String(login).toLowerCase()).first());
}

// ---------------------------------------------------------------- ingest
function cleanTide(d) {
  const num = (x) => (Number.isFinite(x) && x >= 0 ? Math.round(x) : null);
  const out = { at: num(d.at) || nowSec(), h24: {}, d30: {}, hours: [], sample: null, tape: [] };
  for (const k of ['claude', 'codex', 'cursor', 'copilot', 'all_agents', 'all_prs']) {
    const v = num(d.h24 && d.h24[k]);
    if (v !== null) out.h24[k] = v;
  }
  for (const [k] of AGENTS) {
    const s = d.d30 && d.d30[k];
    if (!s) continue;
    const o = { opened: num(s.opened), merged: num(s.merged), turned: num(s.turned) };
    if (o.opened !== null) out.d30[k] = o;
  }
  if (num(d.d30_at)) out.d30_at = num(d.d30_at);
  if (Array.isArray(d.hours)) out.hours = d.hours.slice(-24).map((h) => ({ t: num(h.t), n: num(h.n) })).filter((h) => h.t && h.n !== null);
  if (d.sample && num(d.sample.n)) out.sample = { n: num(d.sample.n), owner: num(d.sample.owner) || 0, team: num(d.sample.team) || 0, outside: num(d.sample.outside) || 0 };
  if (Array.isArray(d.tape)) {
    for (const it of d.tape.slice(0, 200)) {
      if (!it || !['claude', 'codex', 'cursor', 'copilot'].includes(it.a) || !['opened', 'landed', 'turned'].includes(it.s)) continue;
      const r = String(it.r || '');
      const m = /^([^/\s]+)\/([^/\s]+)$/.exec(r);
      if (!m || !LOGIN.test(m[1]) || !REPO.test(m[2])) continue;
      const nr = num(it.n);
      if (!nr) continue;
      out.tape.push({ t: num(it.t), a: it.a, s: it.s, r, n: nr, title: String(it.title || '').replace(/[\u0000-\u001f\u007f]/g, ' ').slice(0, 110) });
    }
  }
  return out;
}

const hits = new Map();
function throttled(key, max, windowMs) {
  const now = Date.now();
  const a = (hits.get(key) || []).filter((t) => now - t < windowMs);
  if (a.length >= max) { hits.set(key, a); return true; }
  a.push(now);
  hits.set(key, a);
  if (hits.size > 5000) hits.clear();
  return false;
}

let fundMemo = { at: 0, data: null };
let netMemo = { at: 0, data: null };
async function cachedFetch(memoRef, url, ttl, shape) {
  const now = Date.now();
  if (memoRef.data && now - memoRef.at < ttl) return memoRef.data;
  try {
    const r = await fetch(url, { headers: { accept: 'application/json', 'user-agent': UA }, cf: { cacheTtl: 120 } });
    if (r.ok) { memoRef.data = shape(await r.json()); memoRef.at = now; }
  } catch { /* keep the last good copy */ }
  return memoRef.data;
}

// ---------------------------------------------------------------- sign-in (GitHub device flow, public information only)
const enc = new TextEncoder();
const b64u = (bytes) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = (s) => atob(s.replace(/-/g, '+').replace(/_/g, '/'));
async function hmac(secret, data) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64u(new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(data))));
}
function cookies(req) {
  const out = {};
  for (const part of (req.headers.get('cookie') || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = part.slice(i + 1).trim();
  }
  return out;
}
async function sessionCookie(env, id, login) {
  const payload = b64u(enc.encode(JSON.stringify({ i: id, l: login, e: nowSec() + 30 * 86400 })));
  return `aa_s=${payload}.${await hmac(env.SESSION_SECRET, payload)}; Path=/; Max-Age=${30 * 86400}; HttpOnly; Secure; SameSite=Lax`;
}
async function session(req, env) {
  const c = cookies(req).aa_s;
  if (!c || !env.SESSION_SECRET) return null;
  const [payload, sig] = c.split('.');
  if (!payload || !sig || (await hmac(env.SESSION_SECRET, payload)) !== sig) return null;
  try {
    const s = JSON.parse(unb64u(payload));
    return s.e > nowSec() ? { id: s.i, login: s.l } : null;
  } catch { return null; }
}
function sameOrigin(req, url) {
  const o = req.headers.get('origin');
  if (!o) return false;
  try { return new URL(o).host === url.host; } catch { return false; }
}

// One GitHub search with the signed-in person's own sign-in. Returns null when GitHub says wait.
async function ghSearch(token, q, opt = {}) {
  const u = new URL('https://api.github.com/search/issues');
  u.searchParams.set('q', q);
  u.searchParams.set('per_page', String(opt.n || 1));
  u.searchParams.set('advanced_search', 'true');
  if (opt.sort) { u.searchParams.set('sort', opt.sort); u.searchParams.set('order', opt.order || 'desc'); }
  const r = await fetch(u, { headers: { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json', 'user-agent': UA } });
  if (r.status === 403 || r.status === 429) return { wait: Math.min(30, Number(r.headers.get('retry-after')) || 8) };
  if (!r.ok) return { failed: r.status };
  return r.json();
}

// Counts the signed-in person's public agent pull requests, one search per call, so no call runs long.
// The sign-in token lives in the jobs table only while this runs (15 minutes at most) and is deleted at the end.
const STEPS = ['total', 'merged', 'abroad', 'first', 'claude', 'codex', 'cursor', 'langs'];
async function verifyStep(env, job) {
  const d = JSON.parse(job.data || '{}');
  const login = job.login, token = job.token;
  const base = `is:pr is:public author:${login} created:>=${YEAR}-01-01 ${SIG}`;
  let step = job.step;
  const name = STEPS[step];
  let r = null;
  if (name === 'total') {
    r = await ghSearch(token, base, { n: 15, sort: 'created' });
    if (r && typeof r.total_count === 'number') {
      d.total = r.total_count;
      const cnt = {};
      for (const it of r.items || []) { const x = String(it.repository_url || '').split('/repos/')[1]; if (x) cnt[x] = (cnt[x] || 0) + 1; }
      d.top = Object.keys(cnt).sort((p, q) => cnt[q] - cnt[p])[0] || '';
      d.fam = [];
      step = d.total ? step + 1 : STEPS.indexOf('langs');
    }
  } else if (name === 'merged' || name === 'abroad') {
    r = await ghSearch(token, name === 'merged' ? `${base} is:merged` : `${base} -user:${login}`);
    if (r && typeof r.total_count === 'number') { d[name] = r.total_count; step += 1; }
  } else if (name === 'first') {
    r = await ghSearch(token, base, { n: 1, sort: 'created', order: 'asc' });
    if (r && typeof r.total_count === 'number') {
      const it = r.items && r.items[0];
      d.first = it ? `${String(it.created_at || '').slice(0, 10)} · ${String(it.repository_url || '').split('/repos/')[1] || ''}` : '';
      step += 1;
    }
  } else if (FAM[name]) {
    r = await ghSearch(token, `is:pr is:public author:${login} created:>=${YEAR}-01-01 ${FAM[name]}`);
    if (r && typeof r.total_count === 'number') { d.fam.push({ name: AGENTS.find((x) => x[0] === name)[1], n: r.total_count }); step += 1; }
  } else if (name === 'langs') {
    d.langs = [];
    try {
      const x = await fetch(`https://api.github.com/users/${login}/repos?sort=pushed&per_page=30&type=owner`, { headers: { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json', 'user-agent': UA } });
      if (x.ok) {
        const cnt = {};
        for (const repo of await x.json()) if (repo && repo.language && !repo.fork) cnt[repo.language] = (cnt[repo.language] || 0) + 1;
        d.langs = Object.keys(cnt).sort((p, q) => cnt[q] - cnt[p]).slice(0, 3);
      }
    } catch { d.langs = []; }
    step += 1;
  }
  if (r && r.wait) return { done: false, wait: r.wait };
  if (r && r.failed) return { done: false, wait: 6, failed: r.failed };
  if (step >= STEPS.length) {
    await env.DB.batch([
      env.DB.prepare('UPDATE passes SET total = ?1, merged = ?2, abroad = ?3, top = ?4, first = ?5, fam = ?6, langs = ?7, verified_at = ?8 WHERE gh_id = ?9')
        .bind(d.total || 0, d.merged || 0, d.abroad || 0, d.top || '', d.first || '', JSON.stringify(d.fam || []), JSON.stringify(d.langs || []), nowSec(), job.gh_id),
      env.DB.prepare('DELETE FROM jobs WHERE gh_id = ?1').bind(job.gh_id),
    ]);
    memo.at = 0; boardMemo.at = 0;
    return { done: true };
  }
  await env.DB.prepare('UPDATE jobs SET step = ?1, data = ?2 WHERE gh_id = ?3').bind(step, JSON.stringify(d), job.gh_id).run();
  return { done: false, step, of: STEPS.length };
}

async function authRoutes(req, env, ctx, url, path) {
  if (!env.GH_CLIENT_ID || !env.SESSION_SECRET) return json({ error: 'sign_in_not_configured' }, 503);
  if (req.method !== 'POST') return json({ error: 'method' }, 405);
  if (!sameOrigin(req, url)) return json({ error: 'origin' }, 403);
  const ip = req.headers.get('cf-connecting-ip') || 'x';
  await init(env);

  if (path === '/auth/device/start') {
    if (throttled(`d:${ip}`, 6, 600000)) return json({ error: 'slow_down' }, 429);
    const r = await fetch('https://github.com/login/device/code', { method: 'POST', headers: { accept: 'application/json', 'content-type': 'application/json', 'user-agent': UA }, body: JSON.stringify({ client_id: env.GH_CLIENT_ID, scope: '' }) });
    const d = r.ok ? await r.json() : null;
    if (!d || !d.device_code) return json({ error: 'github_unavailable' }, 502);
    const id = b64u(crypto.getRandomValues(new Uint8Array(24)));
    await env.DB.batch([
      env.DB.prepare('DELETE FROM devices WHERE at < ?1').bind(nowSec() - 1800),
      env.DB.prepare('INSERT INTO devices (id, device_code, at) VALUES (?1, ?2, ?3)').bind(id, d.device_code, nowSec()),
    ]);
    return json({ user_code: d.user_code, verification_uri: d.verification_uri, interval: d.interval || 5, expires_in: d.expires_in || 900 }, 200,
      { 'set-cookie': `aa_d=${id}; Path=/auth; Max-Age=900; HttpOnly; Secure; SameSite=Lax` });
  }

  if (path === '/auth/device/poll') {
    const id = cookies(req).aa_d;
    const row = id ? await env.DB.prepare('SELECT device_code, at FROM devices WHERE id = ?1').bind(id).first() : null;
    if (!row || row.at < nowSec() - 900) return json({ error: 'expired' }, 410);
    const r = await fetch('https://github.com/login/oauth/access_token', { method: 'POST', headers: { accept: 'application/json', 'content-type': 'application/json', 'user-agent': UA }, body: JSON.stringify({ client_id: env.GH_CLIENT_ID, device_code: row.device_code, grant_type: 'urn:ietf:params:oauth:grant-type:device_code' }) });
    const d = r.ok ? await r.json() : {};
    if (d.error === 'authorization_pending') return json({ pending: true });
    if (d.error === 'slow_down') return json({ pending: true, slow: true });
    if (!d.access_token) return json({ error: d.error || 'failed' }, 400);
    const u = await fetch('https://api.github.com/user', { headers: { authorization: `Bearer ${d.access_token}`, accept: 'application/vnd.github+json', 'user-agent': UA } });
    const me = u.ok ? await u.json() : null;
    if (!me || !me.id || !LOGIN.test(me.login || '') || me.type !== 'User') return json({ error: 'not_a_user_account' }, 400);
    await env.DB.batch([
      env.DB.prepare('DELETE FROM passes WHERE login_lc = ?1 AND gh_id != ?2').bind(me.login.toLowerCase(), me.id),
      env.DB.prepare('INSERT INTO passes (gh_id, login, login_lc, claimed_at) VALUES (?1, ?2, ?3, ?4) ON CONFLICT(gh_id) DO UPDATE SET login = ?2, login_lc = ?3').bind(me.id, me.login, me.login.toLowerCase(), nowSec()),
      env.DB.prepare('DELETE FROM devices WHERE id = ?1').bind(id),
      env.DB.prepare('DELETE FROM jobs WHERE at < ?1').bind(nowSec() - 900),
      env.DB.prepare("INSERT INTO jobs (gh_id, login, token, step, data, at) VALUES (?1, ?2, ?3, 0, '{}', ?4) ON CONFLICT(gh_id) DO UPDATE SET login = ?2, token = ?3, step = 0, data = '{}', at = ?4").bind(me.id, me.login, d.access_token, nowSec()),
    ]);
    memo.at = 0;
    return new Response(JSON.stringify({ ok: true, login: me.login }), { headers: [['content-type', 'application/json; charset=utf-8'], ['set-cookie', await sessionCookie(env, me.id, me.login)], ['set-cookie', `aa_u=1; Path=/; Max-Age=${30 * 86400}; Secure; SameSite=Lax`], ['set-cookie', 'aa_d=; Path=/auth; Max-Age=0; HttpOnly; Secure; SameSite=Lax']] });
  }

  if (path === '/auth/logout') return new Response(JSON.stringify({ ok: true }), { headers: [['content-type', 'application/json; charset=utf-8'], ['set-cookie', 'aa_s=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax'], ['set-cookie', 'aa_u=; Path=/; Max-Age=0; Secure; SameSite=Lax']] });
  return json({ error: 'not_found' }, 404);
}

function cleanNote(s) {
  return String(s || '').replace(/[\u0000-\u001f\u007f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 140);
}

// ---------------------------------------------------------------- badge
function badge(p) {
  const mono = 'ui-monospace,SFMono-Regular,Menlo,Consolas,monospace';
  const wrap = (inner, label) => `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="72" viewBox="0 0 360 72" role="img" aria-label="${esc(label)}"><title>${esc(label)}</title><rect width="360" height="72" rx="10" fill="#f4f0e6"/><rect x=".5" y=".5" width="359" height="71" rx="9.5" fill="none" stroke="#d9d4c7"/>${inner}</svg>`;
  if (!p || p.total === null || p.total === undefined) {
    return wrap(`<text x="16" y="24" font-family="${mono}" font-size="9.5" font-weight="700" letter-spacing="1.6" fill="#6b665b">AGENT RECAP ${YEAR}</text><text x="16" y="50" font-family="${mono}" font-size="15" font-weight="700" fill="#141414">Claim your boarding pass</text><text x="16" y="64" font-family="${mono}" font-size="9" fill="#6b665b">agents.myclawn.com</text>`, `Agent Recap ${YEAR}: claim your boarding pass`);
  }
  const num = fmt(p.total);
  const landed = p.total ? Math.round((100 * (p.merged || 0)) / p.total) : 0;
  const words = tierOf(p.total).split(' ');
  const lines = [];
  for (const w of words) { if (lines.length && (lines[lines.length - 1] + ' ' + w).length <= 11) lines[lines.length - 1] += ' ' + w; else lines.push(w); }
  const cls = lines.map((l, i) => `<text x="276" y="${40 + i * 14}" font-family="${mono}" font-size="11.5" font-weight="700" fill="#141414">${esc(l)}</text>`).join('');
  const nx = 16 + num.length * 18.2 + 8;
  return wrap(`<line x1="264" y1="8" x2="264" y2="64" stroke="#b9b3a4" stroke-dasharray="4 4"/>`
    + `<text x="16" y="22" font-family="${mono}" font-size="9.5" font-weight="700" letter-spacing="1.6" fill="#6b665b">AGENT RECAP ${YEAR} · @${esc(p.login)}</text>`
    + `<text x="16" y="56" font-family="${mono}" font-size="30" font-weight="700" fill="#141414">${num}</text>`
    + `<text x="${nx}" y="45" font-family="${mono}" font-size="10" fill="#6b665b">agent pull requests</text><text x="${nx}" y="57" font-family="${mono}" font-size="10" fill="#6b665b">${landed}% merged</text>`
    + `<text x="276" y="22" font-family="${mono}" font-size="8.5" font-weight="700" letter-spacing="1.4" fill="#6b665b">CLASS</text>${cls}`,
  `Agent Recap ${YEAR}: @${p.login}'s AI agents opened ${num} pull requests, ${landed}% merged`);
}

// ---------------------------------------------------------------- html
function ago(sec) {
  if (sec < 90) return 'a minute';
  if (sec < 3600) return Math.round(sec / 60) + ' minutes';
  if (sec < 5400) return 'an hour';
  if (sec < 86400) return Math.round(sec / 3600) + ' hours';
  return Math.round(sec / 86400) + ' days';
}

function carriersTable(tide) {
  const d = tide && tide.d30;
  if (!d || !Object.keys(d).length) return '<p class="fine">Counting. The first numbers arrive within the hour.</p>';
  const pct = (a, b) => (b ? (Math.round((1000 * a) / b) / 10).toFixed(1) + '%' : '');
  let rows = '';
  for (const [k, name] of AGENTS) {
    const s = d[k];
    if (!s || s.opened === null) continue;
    const open = s.merged !== null && s.turned !== null ? Math.max(0, s.opened - s.merged - s.turned) : null;
    rows += `<tr><th scope="row"><i class="dot ${k}"></i><a href="/agent/${SLUG[k]}">${name}</a></th><td>${fmt(s.opened)}</td>`
      + `<td>${s.merged === null ? '' : fmt(s.merged)} <small>${s.merged === null ? '' : pct(s.merged, s.opened)}</small></td>`
      + `<td>${s.turned === null ? '' : fmt(s.turned)} <small>${s.turned === null ? '' : pct(s.turned, s.opened)}</small></td>`
      + `<td>${open === null ? '' : fmt(open)}</td></tr>`;
  }
  return `<table class="ct"><thead><tr><th scope="col">Agent</th><th scope="col">Opened</th><th scope="col">Landed <small>merged</small></th><th scope="col">Turned back <small>closed, not merged</small></th><th scope="col">Still open</th></tr></thead><tbody>${rows}</tbody></table>`;
}

const p1 = (x, y) => (y ? (Math.round((1000 * x) / y) / 10).toFixed(1) : '0');

function aboutAgent(k, tide) {
  const name = AGENTS.find((x) => x[0] === k)[1];
  const d = tide && tide.d30 && tide.d30[k];
  const h = (tide && tide.h24) || {};
  const others = AGENTS.filter((x) => x[0] !== k).map((x) => `<a href="/agent/${SLUG[x[0]]}">${x[1]}</a>`).join(', ');
  let facts = `<p>The 30-day figures for ${name} are being counted and appear here within the day.</p>`;
  let head = `${name} pull requests on public GitHub, counted from GitHub’s own search.`;
  if (d && d.opened) {
    const open = Math.max(0, d.opened - (d.merged || 0) - (d.turned || 0));
    head = `${name} opened ${fmt(d.opened)} pull requests on public GitHub in the last 30 days.`;
    facts = `<p>${fmt(d.merged || 0)} of them were merged (${p1(d.merged || 0, d.opened)}%), ${fmt(d.turned || 0)} were closed without a merge (${p1(d.turned || 0, d.opened)}%), and ${fmt(open)} are still open.`
      + (h[k] && h.all_agents && h.all_prs ? ` In the last 24 hours alone it opened ${fmt(h[k])}: ${p1(h[k], h.all_agents)}% of the agent pull requests counted on this site, and ${p1(h[k], h.all_prs)}% of every pull request opened on public GitHub in that time.` : '') + '</p>';
  }
  return `<section class="sec" id="about"><div class="sec-head"><h2>${name} on GitHub, in numbers</h2><p class="statement">${head}</p></div><div class="prose">${facts}`
    + `<p><b>What counts as a ${name} pull request.</b> A pull request counts when ${COUNTED[k][0]}. That is what ${name} leaves on its work by default, so the count needs no guessing about who wrote the code. It misses pull requests where the signature was removed and everything in private repositories, so the real number is higher.</p>`
    + `<p><b>How to read the merge rate.</b> Most agent pull requests are opened by people in their own repositories and merged by the same person minutes later. A high merge rate therefore says that people use ${name} for their own work, and little about how its pull requests fare with strangers. For that, look up a single repository on the <a href="/">front page</a>: its report shows how many agent pull requests it received in 30 days, how many came from outside the team, and how many were closed without a merge.</p>`
    + `<p><b>Where the numbers come from.</b> One search against GitHub’s public API, repeated every hour for the totals and every five minutes for the board above. The exact search is under “How it’s counted”. Nothing is estimated or extrapolated: the figure on this page is the count GitHub returned.</p>`
    + `<p>Compare with ${others}, or see <a href="/">all agents together</a>. If you run agents yourself, type your GitHub name on the front page to see what they shipped in ${YEAR}.</p></div></section>`;
}

const RULES_EXTRA = `<div class="prose">
<h3>Why write rules for agents at all</h3>
<p>AI coding agents now open a large share of the pull requests on public GitHub; the count on the <a href="/">front page</a> of this site is taken from GitHub’s own search. Most of that work happens in the author’s own repository. The part that reaches other people’s projects arrives without knowing the project’s habits, unless the project has written them down where an agent looks.</p>
<h3>Where agents look</h3>
<p>Codex, Cursor and Copilot read a file called <code>AGENTS.md</code> at the top of the repository before they start. Claude Code reads <code>CLAUDE.md</code>. A rule that lives only in CONTRIBUTING.md, or in a maintainer’s head, is easy for an agent to miss. Put the same block in both files: it costs nothing and covers the common agents.</p>
<h3>Three ways to set the door</h3>
<p><b>Welcome on labelled issues.</b> You pick the issues where agent help is fine and label them. Everything else needs a yes first. This keeps the queue small and still lets useful work in.</p>
<p><b>Ask first.</b> Nothing gets opened until a maintainer has agreed on the issue. Slower, and the safest choice for a project with little review time.</p>
<p><b>Not accepted.</b> A clear no saves everyone’s time, including the person whose agent would have spent an hour on a pull request nobody was going to read.</p>
<h3>What a rule file cannot do</h3>
<p>It is a request, not a lock. An agent that never reads the file, or a person who ignores it, can still open a pull request. Hard limits belong in the repository’s settings; the rule file tells well-behaved agents what you want before they spend your time.</p>
<p>To see how much of this your project already gets, type <code>owner/repo</code> into the box on the <a href="/">front page</a>. The report shows the agent pull requests of the last 30 days by agent, how many came from outside the team, and whether the repository has these files. The numbers for each agent are on their own pages: <a href="/agent/claude-code">Claude Code</a>, <a href="/agent/codex">Codex</a>, <a href="/agent/cursor">Cursor</a> and <a href="/agent/copilot">Copilot</a>.</p>
</div>`;

const METHOD_EXTRA = `<div class="prose">
<h3>The exact searches</h3>
<div class="tablewrap"><table class="ct qt"><thead><tr><th scope="col">Agent</th><th scope="col">A pull request counts when</th><th scope="col">Search term</th></tr></thead><tbody>${AGENTS.map(([k, name]) => `<tr><th scope="row"><a href="/agent/${SLUG[k]}">${name}</a></th><td>${COUNTED[k][0]}</td><td>${COUNTED[k][1]}</td></tr>`).join('')}</tbody></table></div>
<p>Each search goes to <code>api.github.com/search/issues</code> with <code>is:pr is:public</code> and a time window, and the number used is the <code>total_count</code> GitHub returns. When GitHub marks a result as incomplete, that number is thrown away and the last good one stays on the page.</p>
<h3>How often</h3>
<p>The 24-hour totals are counted once an hour and the 30-day table twice a day. The board of single pull requests is refreshed every five minutes with the newest ones opened, merged or closed. The front page says how old its count is.</p>
<h3>Recaps and repository reports</h3>
<p>A recap searches for pull requests with <code>author:NAME created:&gt;=${YEAR}-01-01</code> and the signatures above. “Abroad” adds <code>-user:NAME</code>, which leaves the pull requests in repositories outside that person’s own account. A repository report uses <code>repo:OWNER/NAME</code> over the last 30 days and compares it with all pull requests opened there. Both run in the visitor’s browser, against the same public API.</p>
<h3>Known gaps</h3>
<p>Pull requests that Copilot’s agent or other agents open under a bot’s own account cannot be tied to a person, so they are missing from recaps. Agents that leave no default signature, such as tools used through an editor without their footer, are not counted at all. And a person can name a branch <code>codex/…</code> by hand. The totals are a floor for signed agent work on public GitHub, not a census of all AI-written code.</p>
</div>`;

function cut(html, keep) {
  return html.replace(/<section\b[^>]*\bid="([a-z]+)"[\s\S]*?<\/section>\s*/g, (m, id) => (keep.includes(id) ? m : ''));
}

function render(kind, a, b, tide, pass, extra) {
  const now = nowSec();
  const h = (tide && tide.h24) || {};
  const total = h.all_agents;
  const allPrs = h.all_prs;
  let title = 'AI agent pull requests on GitHub, live · Agent Arrivals by MyClawn';
  let desc = total
    ? `AI coding agents opened ${fmt(total)} pull requests on public GitHub in the last 24 hours. A live board, counted from GitHub search, plus a recap of what your own agents shipped in ${YEAR}.`
    : `A live board of pull requests opened by AI coding agents on public GitHub, plus a recap of what your own agents shipped in ${YEAR}.`;
  let robots = 'index,follow';
  let canonical = ORIGIN + '/';
  let keep = KEEP.home, about = '', pagehead = '', h1pre = 'AI agents opened', boardline = 'Real pull requests, as agents open them.';
  let big = total, biglabel = total ? `AI agents opened ${fmt(total)} pull requests in the last 24 hours` : 'Pull requests opened by AI agents in the last 24 hours';
  const age = ago(Math.max(0, now - ((tide && tide.at) || now)));
  let lede = 'Counting from GitHub search. The first numbers arrive within the hour.';
  if (total) {
    const share = allPrs && allPrs > total ? ` That is ${p1(total, allPrs)}% of every pull request opened there in that time.` : '';
    lede = `On public GitHub repositories, signed by Claude Code, Codex, Cursor or Copilot.${share} Counted from GitHub search ${age} ago.`;
  }
  if (kind === 'user') {
    title = `What did @${a}'s AI agents ship in ${YEAR}? · Agent Arrivals`;
    desc = pass && pass.verified_at && pass.total
      ? `@${pass.login}'s AI agents opened ${fmt(pass.total)} pull requests on public GitHub in ${YEAR}, ${Math.round((100 * (pass.merged || 0)) / pass.total)}% merged. Class: ${tierOf(pass.total)}.`
      : `Pull requests opened on public GitHub in ${YEAR} by @${a}'s AI coding agents: how many, how many were merged, and where they went.`;
    robots = 'noindex,follow';
    canonical = `${ORIGIN}/${a}`;
  } else if (kind === 'repo') {
    title = `AI agent pull requests on ${a}/${b}, last 30 days · Agent Arrivals`;
    desc = `How many pull requests AI coding agents opened on ${a}/${b} in the last 30 days, and how many were merged or turned back.`;
    robots = 'noindex,follow';
    canonical = `${ORIGIN}/${a}/${b}`;
  } else if (kind === 'agent') {
    const name = AGENTS.find((x) => x[0] === a)[1];
    const d = tide && tide.d30 && tide.d30[a];
    keep = KEEP.agent;
    canonical = `${ORIGIN}/agent/${SLUG[a]}`;
    title = `${name} pull requests on GitHub: live count and merge rate · Agent Arrivals`;
    desc = h[a]
      ? `${name} opened ${fmt(h[a])} pull requests on public GitHub in the last 24 hours${d && d.opened ? ` and ${fmt(d.opened)} in the last 30 days, ${p1(d.merged || 0, d.opened)}% of them merged` : ''}. Live board, counted from GitHub search.`
      : `A live count of the pull requests ${name} opens on public GitHub, with its merge rate over 30 days.`;
    h1pre = `${name} opened`;
    big = h[a];
    biglabel = h[a] ? `${name} opened ${fmt(h[a])} pull requests in the last 24 hours` : `Pull requests opened by ${name} in the last 24 hours`;
    boardline = `Real ${name} pull requests, as they are opened, merged or closed.`;
    lede = h[a] ? `On public GitHub repositories, by its default signature or branch name.${allPrs ? ` That is ${p1(h[a], allPrs)}% of every pull request opened there in that time.` : ''} Counted from GitHub search ${age} ago.` : lede;
    about = aboutAgent(a, tide);
  } else if (kind === 'rules') {
    keep = KEEP.rules;
    canonical = `${ORIGIN}/rules`;
    title = 'AGENTS.md pull request rules for AI agents: a free generator · Agent Arrivals';
    desc = 'Write the pull request rules AI coding agents read before they touch your repository. Pick a policy and paste the block into AGENTS.md and CLAUDE.md.';
    pagehead = `<section class="pagehead" id="pagehead"><p class="trust">${TRUST}</p><h1>Pull request rules for AI agents, ready to paste</h1><p class="lede">${total ? `AI agents opened ${fmt(total)} pull requests on public GitHub in the last 24 hours. ` : ''}Tell the ones that reach your repository what you accept, in the file they read first.</p></section>`;
  } else if (kind === 'method') {
    keep = KEEP.method;
    canonical = `${ORIGIN}/method`;
    title = 'How Agent Arrivals counts AI agent pull requests on GitHub';
    desc = 'The exact GitHub searches behind the count of pull requests opened by Claude Code, Codex, Cursor and Copilot, how often they run, and what they miss.';
    pagehead = `<section class="pagehead" id="pagehead"><p class="trust">${TRUST}</p><h1>How the pull requests of AI agents are counted</h1><p class="lede">Every number on <a href="/">Agent Arrivals</a> is a count returned by GitHub’s public search. This page shows the searches, how often they run, and what they cannot see.</p></section>`;
  }
  if (kind === 'user' || kind === 'repo') keep = KEEP.home;
  let sampleNote = '';
  if (tide && tide.sample && tide.sample.n >= 50) {
    const x = tide.sample;
    const q = (v) => Math.round((100 * v) / x.n);
    sampleNote = `Most of this is people's own agents working in their own repositories. Of the latest ${x.n} pull requests on the board, ${q(x.owner)}% were opened by the repository's owner, ${q(x.team)}% by a member or collaborator, and ${q(x.outside)}% by someone outside the team.`;
  }
  const made = tide && tide.made && tide.made.recap >= 20 ? `${fmt(tide.made.recap)} recaps made so far.` : '';
  const boot = JSON.stringify({ kind, a: a || null, b: b || null, tide: tide || null, pass: pass || null, now, ...(extra || {}) }).replace(/</g, '\\u003c').replace(/[\u2028\u2029]/g, '');
  const map = {
    '{{TITLE}}': esc(title), '{{DESC}}': esc(desc), '{{ROBOTS}}': robots, '{{CANONICAL}}': esc(canonical),
    '{{BIGNUM}}': big ? fmt(big) : '000,000', '{{H1LABEL}}': esc(biglabel), '{{H1PRE}}': esc(h1pre), '{{BOARDLINE}}': esc(boardline),
    '{{LEDE}}': esc(lede), '{{CARRIERS}}': carriersTable(tide), '{{SAMPLE_NOTE}}': esc(sampleNote), '{{MADE}}': esc(made),
    '{{PAGEHEAD}}': pagehead, '{{ABOUT}}': about, '{{RULESEXTRA}}': kind === 'rules' ? RULES_EXTRA : '', '{{METHODEXTRA}}': kind === 'method' ? METHOD_EXTRA : '',
    '{{CSS}}': CSS, '{{JS}}': JS, '{{BOOT}}': boot,
  };
  const keepAll = keep.concat(['pagehead']);
  // Fill everything except the scripts first, cut the sections this page does not use, then add the scripts.
  let html = PAGE.replace(/\{\{[A-Z0-9_]+\}\}/g, (m) => (m === '{{JS}}' || m === '{{BOOT}}' || m === '{{CSS}}' ? m : (m in map ? map[m] : m)));
  html = cut(html, keepAll);
  return html.replace(/\{\{(JS|BOOT|CSS)\}\}/g, (m) => map[m]);
}

const FAVICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="6" fill="#0b0b0c"/><rect x="5" y="7" width="22" height="18" rx="2.5" fill="#1b1b1e" stroke="#2b2b30"/><rect x="5" y="15.5" width="22" height="1" fill="#000"/><text x="16" y="22" text-anchor="middle" font-family="monospace" font-size="15" font-weight="700" fill="#ffb300">A</text></svg>`;

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';
    const seg = path.split('/').filter(Boolean);

    if (seg[0] === 'auth') return authRoutes(req, env, ctx, url, path);

    // ---- api
    if (seg[0] === 'api') {
      if (path === '/api/tide' && req.method === 'GET') {
        const tide = await getTide(env);
        return json(tide || {}, 200, { 'cache-control': 'public, max-age=20' });
      }
      if (path === '/api/ingest' && req.method === 'POST') {
        const auth = req.headers.get('authorization') || '';
        if (!env.INGEST_KEY || auth !== `Bearer ${env.INGEST_KEY}`) return json({ error: 'unauthorized' }, 401);
        const text = await req.text();
        if (text.length > 400000) return json({ error: 'too_large' }, 413);
        let d;
        try { d = JSON.parse(text); } catch { return json({ error: 'bad_json' }, 400); }
        const clean = cleanTide(d);
        await init(env);
        await env.DB.prepare("INSERT INTO blobs (k, v, at) VALUES ('tide', ?1, ?2) ON CONFLICT(k) DO UPDATE SET v = ?1, at = ?2").bind(JSON.stringify(clean), clean.at).run();
        memo.at = 0;
        return json({ ok: true, tape: clean.tape.length, hours: clean.hours.length });
      }
      if (path === '/api/count' && req.method === 'POST') {
        let k = '';
        try { k = String((await req.json()).k || ''); } catch { /* ignore */ }
        if (k !== 'recap' && k !== 'repo') return json({ error: 'bad_kind' }, 400);
        const ip = req.headers.get('cf-connecting-ip') || 'x';
        if (throttled(`c:${ip}`, 8, 60000)) return json({ ok: false }, 429);
        await init(env);
        const day = new Date().toISOString().slice(0, 10);
        await env.DB.prepare('INSERT INTO counters (day, name, n) VALUES (?1, ?2, 1) ON CONFLICT(day, name) DO UPDATE SET n = n + 1').bind(day, k).run();
        return json({ ok: true });
      }
      if (path === '/api/departures' && req.method === 'GET') return json((await getFund()) || [], 200, { 'cache-control': 'public, max-age=300' });
      if (path === '/api/net' && req.method === 'GET') return json((await getNet()) || {}, 200, { 'cache-control': 'public, max-age=300' });
      if (path === '/api/me' && req.method === 'GET') {
        const s = await session(req, env);
        return json(s ? { login: s.login } : {}, 200, { 'cache-control': 'no-store' });
      }
      if (seg[1] === 'pass' && seg[2] && req.method === 'GET') {
        if (!LOGIN.test(seg[2])) return json({}, 404);
        return json((await getPass(env, seg[2])) || {}, 200, { 'cache-control': 'no-store' });
      }
      if (path === '/api/top' && req.method === 'GET') return json((await getBoards(env)).top, 200, { 'cache-control': 'public, max-age=30' });
      if (path === '/api/lounge' && req.method === 'GET') return json((await getBoards(env)).lounge, 200, { 'cache-control': 'public, max-age=30' });
      if (path === '/api/card' && req.method === 'POST') {
        if (!sameOrigin(req, url)) return json({ error: 'origin' }, 403);
        const s = await session(req, env);
        if (!s) return json({ error: 'sign_in' }, 401);
        let b;
        try { b = await req.json(); } catch { return json({ error: 'bad_json' }, 400); }
        const has = cleanNote(b.has), needs = cleanNote(b.needs);
        const handle = String(b.handle || '').trim().toLowerCase().replace(/^@/, '');
        if (BAD.test(has) || BAD.test(needs)) return json({ error: 'wording' }, 400);
        if (handle && !HANDLE.test(handle)) return json({ error: 'handle' }, 400);
        await init(env);
        await env.DB.prepare('UPDATE passes SET has = ?1, needs = ?2, handle = ?3, listed = ?4, card_at = ?5 WHERE gh_id = ?6').bind(has, needs, handle, b.listed === false ? 0 : 1, nowSec(), s.id).run();
        memo.at = 0; boardMemo.at = 0;
        return json({ ok: true, has, needs, handle });
      }
      if (path === '/api/verify' && req.method === 'POST') {
        if (!sameOrigin(req, url)) return json({ error: 'origin' }, 403);
        const s = await session(req, env);
        if (!s) return json({ error: 'sign_in' }, 401);
        await init(env);
        const job = await env.DB.prepare('SELECT * FROM jobs WHERE gh_id = ?1').bind(s.id).first();
        if (!job) return json({ done: true });
        if (job.at < nowSec() - 900) { await env.DB.prepare('DELETE FROM jobs WHERE gh_id = ?1').bind(s.id).run(); return json({ done: true, expired: true }); }
        return json(await verifyStep(env, job), 200, { 'cache-control': 'no-store' });
      }
      if (path === '/api/forget' && req.method === 'POST') {
        if (!sameOrigin(req, url)) return json({ error: 'origin' }, 403);
        const s = await session(req, env);
        if (!s) return json({ error: 'sign_in' }, 401);
        await init(env);
        await env.DB.batch([env.DB.prepare('DELETE FROM passes WHERE gh_id = ?1').bind(s.id), env.DB.prepare('DELETE FROM jobs WHERE gh_id = ?1').bind(s.id)]);
        memo.at = 0;
        boardMemo.at = 0;
        return new Response(JSON.stringify({ ok: true }), { headers: [['content-type', 'application/json; charset=utf-8'], ['set-cookie', 'aa_s=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax'], ['set-cookie', 'aa_u=; Path=/; Max-Age=0; Secure; SameSite=Lax']] });
      }
      return json({ error: 'not_found' }, 404);
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') return new Response('Method not allowed', { status: 405 });

    // ---- static
    if (path === '/og.png') return new Response(OG, { headers: { 'content-type': 'image/png', 'cache-control': 'public, max-age=86400' } });
    if (path === '/favicon.svg' || path === '/favicon.ico') return new Response(FAVICON, { headers: { 'content-type': 'image/svg+xml', 'cache-control': 'public, max-age=86400' } });
    if (path === '/robots.txt') return new Response(`User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /auth/\nSitemap: ${ORIGIN}/sitemap.xml\n`, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
    if (path === '/sitemap.xml') {
      const locs = ['/', '/agent/claude-code', '/agent/codex', '/agent/cursor', '/agent/copilot', '/rules', '/method'];
      return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${locs.map((l) => `<url><loc>${ORIGIN}${l}</loc><changefreq>hourly</changefreq></url>`).join('')}</urlset>`, { headers: { 'content-type': 'application/xml; charset=utf-8' } });
    }
    if (path === '/BingSiteAuth.xml') return new Response('<?xml version="1.0"?>\n<users>\n\t<user>DEA6AF4FED93F24775F8751C83954829</user>\n</users>', { headers: { 'content-type': 'text/xml' } });
    if (env.FLEET_KEY && path === `/${env.FLEET_KEY}.txt`) return new Response(env.FLEET_KEY, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
    if (path === '/llms.txt') {
      const t = await getTide(env);
      const n = t && t.h24 && t.h24.all_agents;
      return new Response(`# Agent Arrivals (agents.myclawn.com)\n\nA live count of pull requests opened by AI coding agents on public GitHub repositories, by MyClawn (20Vision GmbH, Vienna).\n\n${n ? `- Last 24 hours: ${fmt(n)} pull requests signed by Claude Code, Codex, Cursor or Copilot (counted ${new Date((t.at || 0) * 1000).toISOString()}).\n` : ''}- Method: GitHub search API. A pull request counts when its text says "Generated with Claude Code" or its branch starts with claude/, codex/, cursor/ or copilot/. Public repositories only, so the real total is higher.\n- Live JSON: ${ORIGIN}/api/tide\n- Per user (${YEAR}): ${ORIGIN}/<github-username>\n- Per repository (30 days): ${ORIGIN}/<owner>/<repo>\n`, { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=300' } });
    }
    const legal = legalResponse(LEGAL, path);
    if (legal) return legal;
    if (seg[0] === 'badge' && seg.length === 2 && /\.svg$/.test(seg[1])) {
      const login = seg[1].slice(0, -4);
      const p = LOGIN.test(login) ? await getPass(env, login) : null;
      return new Response(badge(p && p.verified_at ? p : null), { headers: { 'content-type': 'image/svg+xml; charset=utf-8', 'cache-control': 'public, max-age=600', 'x-content-type-options': 'nosniff' } });
    }

    // ---- pages
    let kind = null, a = null, b = null;
    if (seg.length === 0) kind = 'home';
    else if (seg.length === 2 && seg[0] === 'agent' && BYSLUG[seg[1]]) { kind = 'agent'; a = BYSLUG[seg[1]]; }
    else if (path === '/rules') kind = 'rules';
    else if (path === '/method') kind = 'method';
    else if (seg.length === 1 && !RESERVED.has(seg[0].toLowerCase()) && LOGIN.test(seg[0])) { kind = 'user'; a = seg[0]; }
    else if (seg.length === 2 && !RESERVED.has(seg[0].toLowerCase()) && LOGIN.test(seg[0]) && REPO.test(seg[1])) { kind = 'repo'; a = seg[0]; b = seg[1]; }
    if (!kind) return new Response('Not found. Try https://agents.myclawn.com/', { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8' } });
    const tide = await getTide(env);
    const pass = kind === 'user' ? await getPass(env, a) : null;
    let extra = null;
    if (kind === 'home' || kind === 'user' || kind === 'repo') {
      const [boards, dep, net] = await Promise.all([getBoards(env), getFund(), getNet()]);
      extra = { top: boards.top, lounge: boards.lounge, dep: dep || null, net: net || null };
    }
    return new Response(render(kind, a, b, tide, pass, extra), {
      headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=30', ...SECURITY },
    });
  },
};
