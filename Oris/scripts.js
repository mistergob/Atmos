/* =========================
   ORIS — App principale
   (extraction du JS depuis la page d’origine)
   ========================= */

// ------- État global GAPI (Google Calendar) -----
window.__gapiReady = false;
window.__gapiError = null;

window.onGapiLoad = async function onGapiLoad() {
  if (!window.gapi) { window.__gapiError = new Error('gapi non chargé'); return; }
  try {
    await new Promise(res => gapi.load('client', res));
    await gapi.client.init({
      discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest']
    });
    window.__gapiReady = true;
    console.log('[ORIS] GAPI prêt (Calendar)');
  } catch (err) {
    window.__gapiError = err;
    console.error('[ORIS] Erreur init GAPI:', err);
  }
};

function waitForGapiReady(timeoutMs = 7000) {
  return new Promise(resolve => {
    if (window.__gapiReady) return resolve();
    const t0 = Date.now();
    const id = setInterval(() => {
      if (window.__gapiReady || window.__gapiError || Date.now() - t0 > timeoutMs) {
        clearInterval(id); resolve();
      }
    }, 100);
  });
}

async function ensureGsiLoaded() {
  if (window.google && google.accounts) return;
  await new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true; s.defer = true;
    s.onload = resolve; s.onerror = reject;
    document.head.appendChild(s);
  });
}

/* =========================
   CONFIG
   ========================= */
const GOOGLE_CLIENT_ID = "514694919456-u0csh5so13bsb8u0cl5a7fl5lgmla4c4.apps.googleusercontent.com";
const CAL_SCOPES = 'https://www.googleapis.com/auth/calendar';

// Supabase (SSO partagé avec ATMOS)
const PROJECT_REF = "jlfvbggzdkkwrmpsamvz";
const SUPABASE_URL = `https://${PROJECT_REF}.supabase.co`;
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpsZnZiZ2d6ZGtrd3JtcHNhbXZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcyNjUyNjMsImV4cCI6MjA3Mjg0MTI2M30.kDbtNVQfHEVxRbA8jsAfLu7-6kDioTCG-nWVQ91gJIs";
const ATMOS_URL = "https://mistergob.github.io/Atmos/";
const STORAGE_KEY = `sb-${PROJECT_REF}-auth-token`;

// Heartbeat (pour intégration ATMOS)
const ORIS_BEAT_KEY = 'oris:beatAt';
const ORIS_BEAT_INTERVAL = 10000; // 10s

/* =========================
   SUPABASE (client)
   ========================= */
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storage: window.localStorage, storageKey: STORAGE_KEY }
});

/* =========================
   Raccourcis DOM
   ========================= */
const authGo = document.getElementById('authGoAtmos');
if (authGo) authGo.href = ATMOS_URL + "?r=" + encodeURIComponent(location.href);

const statusEl = document.getElementById('status');
const periodLabel = document.getElementById('periodLabel');
const gridEl = document.getElementById('grid');
const canvas = document.getElementById('canvas');

const viewBtns = Array.from(document.querySelectorAll('.viewBtn'));
const calendarSelect = document.getElementById('calendarSelect');

const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const todayBtn = document.getElementById('todayBtn');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const refreshBtn = document.getElementById('refreshBtn');

const googleBtn = document.getElementById('googleBtn');
const logoutBtn = document.getElementById('logoutBtn');

const calListEl = document.getElementById('calList');
const tasksSection = document.getElementById('tasksSection');
const taskListEl = document.getElementById('taskList');
const toggleTasksBtn = document.getElementById('toggleTasks');

const eventModal = document.getElementById('eventModal');
const evtTitle = document.getElementById('evtTitle');
const fTitle = document.getElementById('fTitle');
const fCalendar = document.getElementById('fCalendar');
const fStart = document.getElementById('fStart');
const fEnd = document.getElementById('fEnd');
const fLocation = document.getElementById('fLocation');
const fDesc = document.getElementById('fDesc');
const fMeet = document.getElementById('fMeet');
const saveEventBtn = document.getElementById('saveEventBtn');
const deleteEventBtn = document.getElementById('deleteEventBtn');
const closeEventBtn = document.getElementById('closeEventBtn');
const newEventBtn = document.getElementById('newEventBtn');

/* =========================
   État App
   ========================= */
let googleTokenClient = null;
let currentView = 'month';
let cursor = new Date();     // date ancre courante
let calendars = [];          // [{id, summary, backgroundColor, primary}]
let events = [];             // évènements chargés
let currentEvent = null;     // en cours d’édition

function setStatus(t) { statusEl.textContent = t; }
function setAuthLocked(on) { document.body.classList.toggle('auth-locked', !!on); }

/* =========================
   Heartbeat ORIS (ATMOS)
   ========================= */
(function startOrisHeartbeat() {
  let bc = null;
  try { bc = new BroadcastChannel('ORIS_HEARTBEAT'); } catch (_) {}
  function beat() {
    try { localStorage.setItem(ORIS_BEAT_KEY, Date.now().toString()); } catch {}
    try { bc && bc.postMessage('ping'); } catch {}
  }
  beat();
  setInterval(beat, ORIS_BEAT_INTERVAL);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) beat(); });
})();

/* =========================
   Utils dates (Europe/Paris)
   ========================= */
function startOfDay(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function endOfDay(d) { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; }
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function addMonths(d, n) { const x = new Date(d); x.setMonth(x.getMonth() + n); return x; }
function startOfWeek(d) { const x = new Date(d); const day = (x.getDay() + 6) % 7; x.setDate(x.getDate() - day); x.setHours(0, 0, 0, 0); return x; } // Lundi
function endOfWeek(d) { const s = startOfWeek(d); return addDays(s, 6); }
function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d) { return new Date(d.getFullYear(), d.getMonth() + 1, 0); }
function addMinutes(d, m) { const x = new Date(d); x.setMinutes(x.getMinutes() + m); return x; }
function toLocalInputValue(d, withTime) {
  const pad = n => String(n).padStart(2, '0');
  const yyyy = d.getFullYear(), mm = pad(d.getMonth() + 1), dd = pad(d.getDate());
  if (!withTime) return `${yyyy}-${mm}-${dd}T00:00`;
  const hh = pad(d.getHours()), mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}
function escapeHtml(s) { return String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

/* =========================
   AUTH
   ========================= */
async function tryGoogleFromAtmos() {
  try {
    const { data } = await supabase.auth.getSession();
    const session = data?.session;
    if (!session) return false;
    const provider = session.user?.app_metadata?.provider;
    const accessToken = session.provider_token;
    if (provider === 'google' && accessToken) {
      await waitForGapiReady();
      if (!window.__gapiReady) return false;
      gapi.client.setToken({ access_token: accessToken });
      logoutBtn.disabled = false;
      setStatus('Connecté à Google via ATMOS. Chargement des calendriers…');
      await bootCalendar();
      return true;
    }
    return false;
  } catch { return false; }
}

async function loginGoogle() {
  if (document.body.classList.contains('auth-locked')) {
    setStatus('Connexion à ATMOS requise.');
    return;
  }
  await ensureGsiLoaded();
  await waitForGapiReady();
  if (!window.__gapiReady) { setStatus('Google API non prête.'); return; }

  if (!googleTokenClient) {
    googleTokenClient = google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: CAL_SCOPES,
      callback: async (resp) => {
        if (resp && resp.access_token) {
          gapi.client.setToken({ access_token: resp.access_token });
          logoutBtn.disabled = false;
          setStatus('Authentifié. Récupération des calendriers…');
          await bootCalendar();
        } else {
          setStatus('Échec authentification Google.');
        }
      }
    });
  }
  googleTokenClient.requestAccessToken({ prompt: '' });
}

function logoutGoogle() {
  try {
    const tok = gapi.client.getToken();
    if (tok && tok.access_token) { google.accounts.oauth2.revoke(tok.access_token, () => {}); }
  } catch {}
  gapi.client.setToken('');
  calendars = []; events = []; render();
  logoutBtn.disabled = true;
  setStatus('Déconnecté.');
}

/* =========================
   GOOGLE CALENDAR
   ========================= */
async function bootCalendar() {
  await loadCalendars();
  await loadEvents();
  autoRefresh();
}

async function loadCalendars() {
  const res = await gapi.client.calendar.calendarList.list({ showHidden: false, minAccessRole: 'reader' });
  calendars = (res.result.items || []).map(c => ({
    id: c.id, summary: c.summary, backgroundColor: c.backgroundColor || '#0ea5e9', primary: !!c.primary
  }));
  // UI select
  calendarSelect.innerHTML = `<option value="">Tous les calendriers</option>` +
    calendars.map(c => `<option value="${c.id}">${c.summary}${c.primary ? ' (principal)' : ''}</option>`).join('');
  // modal select
  fCalendar.innerHTML = calendars.map(c => `<option value="${c.id}">${c.summary}${c.primary ? ' (principal)' : ''}</option>`).join('');
  // liste latérale
  calListEl.innerHTML = '';
  calendars.forEach(c => {
    const div = document.createElement('div');
    div.className = 'cal-item';
    div.innerHTML = `<span class="dot" style="background:${c.backgroundColor}"></span> <span>${c.summary}${c.primary ? ' <small>(principal)</small>' : ''}</span>`;
    calListEl.appendChild(div);
  });
}

function currentRange() {
  let start, end, label;
  if (currentView === 'month') {
    start = startOfWeek(startOfMonth(cursor)); end = endOfWeek(endOfMonth(cursor));
    label = cursor.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  } else if (currentView === 'week') {
    start = startOfWeek(cursor); end = endOfWeek(cursor);
    const a = start.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
    const b = end.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
    label = `Semaine ${a} – ${b}`;
  } else {
    start = startOfDay(cursor); end = endOfDay(cursor);
    label = cursor.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }
  return { start, end, label };
}

async function loadEvents() {
  const { start, end, label } = currentRange();
  periodLabel.textContent = label;

  const params = {
    calendarId: 'primary',
    timeMin: start.toISOString(),
    timeMax: end.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: 2500
  };

  const sel = calendarSelect.value;
  let evts = [];

  const calendarsToQuery = sel ? calendars.filter(c => c.id === sel) : calendars;
  for (const cal of calendarsToQuery) {
    const r = await gapi.client.calendar.events.list({ ...params, calendarId: cal.id });
    const items = (r.result.items || []).map(e => ({
      id: e.id, calId: cal.id, calName: cal.summary, color: cal.backgroundColor,
      summary: e.summary || '(Sans titre)', location: e.location || '', description: e.description || '',
      start: e.start?.dateTime || e.start?.date, end: e.end?.dateTime || e.end?.date,
      allDay: !!e.start?.date && !e.start?.dateTime,
      hangoutLink: e.hangoutLink || '',
      recurring: !!e.recurrence?.length,
      raw: e
    }));
    evts.push(...items);
  }
  events = evts;
  render();
}

function composeEventResource(d) {
  const body = {
    summary: d.summary || '(Sans titre)',
    description: d.description || '',
    location: d.location || ''
  };
  if (d.allDay) {
    body.start = { date: d.startISO.slice(0, 10) };
    body.end = { date: d.endISO.slice(0, 10) };
  } else {
    body.start = { dateTime: d.startISO };
    body.end = { dateTime: d.endISO };
  }
  if (d.meet === 'create') {
    body.conferenceData = {
      createRequest: {
        requestId: 'meet-' + Math.random().toString(36).slice(2),
        conferenceSolutionKey: { type: 'hangoutsMeet' }
      }
    };
  }
  return body;
}

async function saveEvent(data) {
  const res = data.id
    ? await gapi.client.calendar.events.patch({
        calendarId: data.calId, eventId: data.id,
        resource: composeEventResource(data)
      })
    : await gapi.client.calendar.events.insert({
        calendarId: data.calId,
        conferenceDataVersion: data.meet === 'create' ? 1 : 0,
        resource: composeEventResource(data)
      });
  return res.result;
}

async function deleteEvent(calId, id) {
  await gapi.client.calendar.events.delete({ calendarId: calId, eventId: id });
}

/* =========================
   RENDER Agenda
   ========================= */
function render() {
  const { start, end } = currentRange();
  gridEl.className = 'grid ' + currentView;
  gridEl.innerHTML = '';

  if (currentView === 'month') {
    // headers
    ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].forEach(d => {
      const h = document.createElement('div'); h.className = 'cell head'; h.textContent = d; gridEl.appendChild(h);
    });
    const first = start; const days = Math.round((end - first) / 86400000) + 1;
    for (let i = 0; i < days; i++) {
      const day = addDays(first, i);
      const cell = document.createElement('div'); cell.className = 'cell'; cell.dataset.date = day.toISOString();
      const head = document.createElement('div'); head.style.display = 'flex'; head.style.justifyContent = 'space-between'; head.style.alignItems = 'center';
      head.innerHTML = `<strong>${day.getDate()}</strong>`;
      const plus = document.createElement('button'); plus.className = 'btn small'; plus.textContent = '+'; plus.title = 'Nouvel événement';
      plus.onclick = (e) => { e.stopPropagation(); openEventModal({ start: day, end: addDays(day, 1), allDay: true }); };
      head.appendChild(plus);
      cell.appendChild(head);

      const list = document.createElement('div');
      events.filter(ev => {
        const s = new Date(ev.start); const e = new Date(ev.end || ev.start);
        const d0 = startOfDay(day);
        return s <= endOfDay(day) && e >= d0; // chevauche
      }).slice(0, 5).forEach(ev => {
        const div = document.createElement('div'); div.className = 'event';
        const when = ev.allDay ? 'Journée' : `${new Date(ev.start).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
        div.innerHTML = `<div style="display:flex; gap:6px; align-items:center">
          <span class="dot" style="background:${ev.color}"></span><strong>${escapeHtml(ev.summary)}</strong></div>
          <div class="when">${when} — ${escapeHtml(ev.calName)}</div>`;
        div.onclick = () => openEventModal({ existing: ev });
        list.appendChild(div);
      });
      cell.appendChild(list);
      gridEl.appendChild(cell);
    }
  }

  if (currentView === 'week') {
    // entête
    const head0 = document.createElement('div'); head0.className = 'cell head'; head0.textContent = 'Heure'; gridEl.appendChild(head0);
    for (let i = 0; i < 7; i++) {
      const d = addDays(startOfWeek(cursor), i);
      const h = document.createElement('div'); h.className = 'cell head'; h.innerHTML = d.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: '2-digit' });
      gridEl.appendChild(h);
    }
    // corps
    for (let row = 0; row < 12; row++) {
      const hourLabel = document.createElement('div'); hourLabel.className = 'cell head'; hourLabel.textContent = (row * 2).toString().padStart(2, '0') + ':00';
      gridEl.appendChild(hourLabel);
      for (let i = 0; i < 7; i++) {
        const d = addDays(startOfWeek(cursor), i);
        const cell = document.createElement('div'); cell.className = 'cell'; cell.dataset.date = d.toISOString();
        const plus = document.createElement('button'); plus.className = 'btn small'; plus.textContent = '+'; plus.title = 'Nouvel événement';
        plus.onclick = (e) => { e.stopPropagation(); openEventModal({ start: new Date(d.getFullYear(), d.getMonth(), d.getDate(), row * 2), end: new Date(d.getFullYear(), d.getMonth(), d.getDate(), row * 2 + 1) }); };
        cell.appendChild(plus);
        events.filter(ev => {
          const s = new Date(ev.start); const e = new Date(ev.end || ev.start);
          return s <= endOfDay(d) && e >= startOfDay(d);
        }).slice(0, 4).forEach(ev => {
          const div = document.createElement('div'); div.className = 'event';
          const when = ev.allDay ? 'Journée' : `${new Date(ev.start).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
          div.innerHTML = `<div style="display:flex;gap:6px;align-items:center">
            <span class="dot" style="background:${ev.color}"></span><strong>${escapeHtml(ev.summary)}</strong></div>
            <div class="when">${when} — ${escapeHtml(ev.calName)}</div>`;
          div.onclick = () => openEventModal({ existing: ev });
          cell.appendChild(div);
        });
        gridEl.appendChild(cell);
      }
    }
  }

  if (currentView === 'day') {
    const d = cursor;
    const head = document.createElement('div'); head.className = 'cell head'; head.textContent = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    gridEl.appendChild(head);
    const cell = document.createElement('div'); cell.className = 'cell';
    const plus = document.createElement('button'); plus.className = 'btn small'; plus.textContent = '+'; plus.title = 'Nouvel événement';
    plus.onclick = () => openEventModal({ start: d, end: addDays(d, 0), allDay: false });
    cell.appendChild(plus);
    events.filter(ev => {
      const s = new Date(ev.start); const e = new Date(ev.end || ev.start);
      return s <= endOfDay(d) && e >= startOfDay(d);
    }).forEach(ev => {
      const div = document.createElement('div'); div.className = 'event';
      const when = ev.allDay
        ? 'Journée'
        : `${new Date(ev.start).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} → ${new Date(ev.end || ev.start).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
      div.innerHTML = `<div style="display:flex;gap:6px;align-items:center">
        <span class="dot" style="background:${ev.color}"></span><strong>${escapeHtml(ev.summary)}</strong></div>
        <div class="when">${when} — ${escapeHtml(ev.calName)}</div>
        ${ev.location ? `<div class="when">📍 ${escapeHtml(ev.location)}</div>` : ''}`;
      div.onclick = () => openEventModal({ existing: ev });
      cell.appendChild(div);
    });
    gridEl.appendChild(cell);
  }
}

/* =========================
   MODALE Événement
   ========================= */
function openEventModal({ existing = null, start = null, end = null, allDay = false }) {
  currentEvent = existing;
  evtTitle.textContent = existing ? 'Modifier l’événement' : 'Nouvel événement';
  deleteEventBtn.style.display = existing ? '' : 'none';

  // select calendriers
  fCalendar.innerHTML = calendars.map(c => `<option value="${c.id}">${c.summary}${c.primary ? ' (principal)' : ''}</option>`).join('');

  if (existing) {
    fTitle.value = existing.summary || '';
    fCalendar.value = existing.calId;
    const s = new Date(existing.start); const e = new Date(existing.end || existing.start);
    fStart.value = toLocalInputValue(s, !existing.allDay);
    fEnd.value = toLocalInputValue(e, !existing.allDay);
    fLocation.value = existing.location || '';
    fDesc.value = existing.description || '';
    fMeet.value = existing.raw.conferenceData?.entryPoints?.length ? '' : '';
  } else {
    fTitle.value = '';
    fCalendar.value = (calendars.find(c => c.primary)?.id) || calendars[0]?.id || '';
    const s = start || new Date();
    fStart.value = toLocalInputValue(s, !allDay);
    fEnd.value = toLocalInputValue(allDay ? addDays(s, 1) : addMinutes(s, 60), !allDay);
    fLocation.value = '';
    fDesc.value = '';
    fMeet.value = '';
  }

  eventModal.style.display = 'flex';
  eventModal.setAttribute('aria-hidden', 'false');
}

function closeEventModal() {
  eventModal.style.display = 'none';
  eventModal.setAttribute('aria-hidden', 'true');
  currentEvent = null;
}

saveEventBtn.onclick = async () => {
  try {
    const allDay = fStart.value.slice(11) === '00:00' && fEnd.value.slice(11) === '00:00';
    const data = {
      id: currentEvent?.id || null,
      calId: fCalendar.value,
      summary: fTitle.value.trim(),
      description: fDesc.value,
      location: fLocation.value,
      startISO: new Date(fStart.value).toISOString(),
      endISO: new Date(fEnd.value).toISOString(),
      allDay,
      meet: fMeet.value
    };
    await saveEvent(data);
    closeEventModal();
    setStatus('Événement enregistré.');
    await loadEvents();
  } catch (e) { console.error(e); alert('Échec enregistrement (permissions ?).'); }
};

deleteEventBtn.onclick = async () => {
  if (!currentEvent) return;
  if (!confirm('Supprimer cet événement ?')) return;
  try {
    await deleteEvent(currentEvent.calId, currentEvent.id);
    closeEventModal();
    setStatus('Événement supprimé.');
    await loadEvents();
  } catch (e) { console.error(e); alert('Échec suppression.'); }
};

closeEventBtn.onclick = closeEventModal;

/* =========================
   TÂCHES (SPHAIRA via localStorage)
   ========================= */
const STORAGE_KEYS = ['sphaira:workspaceState:v1', 'workspaceState'];

function loadWorkspaceFromStorage() {
  for (const key of STORAGE_KEYS) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) { const json = JSON.parse(raw); return { json, storageKey: key }; }
    } catch (e) {}
  }
  return { json: null, storageKey: null };
}

function extractTasks(ws) {
  if (!ws || !Array.isArray(ws.nodes)) return [];
  const nodes = Object.fromEntries(ws.nodes.map(n => [n.id, { name: n.text || n.id, color: n.color || '#00EAFF' }]));
  const tasks = [];
  ws.nodes.forEach(n => {
    (n.tasks || []).forEach(t => {
      tasks.push({
        id: t.id, title: t.title || '(Sans titre)', desc: t.desc || '',
        start: t.start || '', end: t.end || '',
        nodeName: nodes[n.id]?.name || n.id, color: nodes[n.id]?.color || '#00EAFF'
      });
    });
  });
  return tasks;
}

function renderTasks() {
  const { json } = loadWorkspaceFromStorage();
  const list = json ? extractTasks(json) : [];
  if (!list.length) { taskListEl.innerHTML = '<div class="status">Aucune tâche trouvée.</div>'; return; }
  taskListEl.innerHTML = '';
  list.sort((a, b) => (a.start || '').localeCompare(b.start || '') || a.title.localeCompare(b.title))
      .forEach(t => {
        const el = document.createElement('div');
        el.className = 'task';
        el.innerHTML = `<span class="dot" style="background:${t.color}"></span>
          <div>
            <div><strong>${escapeHtml(t.title)}</strong></div>
            ${t.start || t.end ? `<small>${t.start ? 'Du ' + t.start : ''}${t.end ? ' au ' + t.end : ''}</small><br/>` : ''}
            ${t.nodeName ? `<small>Sur : ${escapeHtml(t.nodeName)}</small>` : ''}
            ${t.desc ? `<div style="margin-top:6px">${escapeHtml(t.desc)}</div>` : ''}
          </div>`;
        taskListEl.appendChild(el);
      });
}

toggleTasksBtn.onclick = () => {
  const s = tasksSection.style;
  s.display = (s.display === 'none' ? '' : 'none') ? 'none' : '';
}; // petit toggle
window.addEventListener('storage', (e) => { if (STORAGE_KEYS.includes(e.key)) renderTasks(); });

/* =========================
   NAV + RECHERCHE
   ========================= */
prevBtn.onclick = async () => { cursor = currentView === 'month' ? addMonths(cursor, -1) : addDays(cursor, currentView === 'week' ? -7 : -1); await loadEvents(); };
nextBtn.onclick = async () => { cursor = currentView === 'month' ? addMonths(cursor, +1) : addDays(cursor, currentView === 'week' ? +7 : +1); await loadEvents(); };
todayBtn.onclick = async () => { cursor = new Date(); await loadEvents(); };

viewBtns.forEach(b => b.onclick = async () => {
  viewBtns.forEach(x => x.classList.remove('active'));
  b.classList.add('active'); currentView = b.dataset.view; await loadEvents();
});

searchBtn.onclick = () => {
  const q = searchInput.value.trim().toLowerCase();
  const filtered = q ? events.filter(e =>
    (e.summary || '').toLowerCase().includes(q) ||
    (e.location || '').toLowerCase().includes(q) ||
    (e.description || '').toLowerCase().includes(q)
  ) : events;
  const keep = events; events = filtered; render(); events = keep; // rendu filtré une fois
};

calendarSelect.onchange = loadEvents;
refreshBtn.onclick = loadEvents;

/* =========================
   AUTO-REFRESH
   ========================= */
let refreshTimer = null;
function autoRefresh() {
  if (refreshTimer) clearInterval(refreshTimer);
  refreshTimer = setInterval(() => { loadEvents().catch(() => {}); }, 60_000);
}

/* =========================
   BOOT
   ========================= */
function bindAuth() {
  googleBtn.onclick = loginGoogle;
  logoutBtn.onclick = logoutGoogle;
}
bindAuth();

async function checkAuth() {
  const { data } = await supabase.auth.getSession();
  setAuthLocked(!data?.session);
  if (data?.session) {
    const ok = await tryGoogleFromAtmos();
    if (!ok) { setStatus('Session ATMOS active : cliquez « Connecter Google ».'); }
  } else {
    setStatus('Connexion requise.');
  }
}
supabase.auth.onAuthStateChange(async (_evt, session) => {
  setAuthLocked(!session);
  if (session) { await tryGoogleFromAtmos(); }
});

// Initialisation
checkAuth();
renderTasks();
if (location.protocol === "file:") {
  console.warn("⚠️ Ouvre via HTTPS (ou un serveur local) pour l’auth Google.");
}

// Bouton « nouveau » (si on souhaite créer depuis la toolbar)
if (typeof newEventBtn !== 'undefined' && newEventBtn) {
  newEventBtn.onclick = () => openEventModal({ start: new Date(), end: addMinutes(new Date(), 60), allDay: false });
}
