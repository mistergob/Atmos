/* ====== ORIS — Auth & Google Calendar ====== */

/** ——— Config projet ——— **/
const PROJECT_REF = "jlfvbggzdkkwrmpsamvz";
const SUPABASE_URL = `https://${PROJECT_REF}.supabase.co`;
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpsZnZiZ2d6ZGtrd3JtcHNhbXZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcyNjUyNjMsImV4cCI6MjA3Mjg0MTI2M30.kDbtNVQfHEVxRbA8jsAfLu7-6kDioTCG-nWVQ91gJIs`;
const STORAGE_KEY = `sb-${PROJECT_REF}-auth-token`;
const ATMOS_URL = "https://mistergob.github.io/Atmos/";
const GOOGLE_CLIENT_ID = "514694919456-asuq6cm5rm048fum8tevs9cou7hq7dq0.apps.googleusercontent.com";
const GOOGLE_SCOPES = "https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events";

/** ——— Supabase (SSO ATMOS) ——— **/
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
    storageKey: STORAGE_KEY
  }
});

// Lien vers ATMOS (si jamais tu réactives un bandeau plus tard)
const authGo = document.getElementById('authGoAtmos');
if (authGo) authGo.href = ATMOS_URL + "?r=" + encodeURIComponent(location.href);

/** ——— Sélecteurs UI ——— **/
const $ = (id) => document.getElementById(id);
const statusEl  = $('status');
const googleBtn = $('googleBtn');
const logoutBtn = $('logoutBtn');

/** ——— Helpers UI ——— **/
function setStatus(msg){ if (statusEl) statusEl.textContent = msg; }
function safe(el, fn){ if (el) try{ fn(el); }catch(_){} }

/** ——— Sécurité: ne JAMAIS crasher si #authBlock est absent ——— **/
function setAuthLocked(on){
  document.body.classList.toggle('auth-locked', !!on);
  if (on) setStatus("Connexion à ATMOS requise.");
  else if (!statusEl?.textContent || statusEl.textContent.includes("ATMOS")){
    setStatus("Connexion Google requise (ou auto via ATMOS).");
  }
  const blk = $('authBlock'); // peut être null
  safe(blk, el => el.style.display = on ? 'flex' : 'none');
  safe(googleBtn, el => el.disabled = !!on);
  safe(logoutBtn, el => el.disabled = !!on);
}

/** ——— GAPI init (apis.google.com/js/api.js?onload=onGapiLoad) ——— **/
window.__gapiReady = false;
window.onGapiLoad = function(){
  gapi.load('client', async () => {
    try {
      await gapi.client.init({
        discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest"]
      });
      window.__gapiReady = true;
      console.log('[ORIS] gapi client prêt.');
    } catch (e) {
      console.error('[ORIS] Erreur init gapi:', e);
      setStatus('Erreur init Google API.');
    }
  });
};

async function waitForGapiReady(timeoutMs = 8000){
  const start = Date.now();
  while (!window.__gapiReady) {
    if (Date.now() - start > timeoutMs) return false;
    await new Promise(r => setTimeout(r, 100));
  }
  return true;
}

/** ——— GIS OAuth 2.0 ——— **/
let tokenClient = null;
let currentAccessToken = null;

function ensureTokenClient(){
  if (tokenClient) return tokenClient;
  if (!(window.google && google.accounts && google.accounts.oauth2)) {
    console.error('[ORIS] Librairie GIS non chargée.');
    setStatus('Librairie Google non chargée.');
    return null;
  }
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_CLIENT_ID,
    scope: GOOGLE_SCOPES,
    callback: async (resp) => {
      if (resp.error) {
        console.error('[ORIS] Erreur OAuth:', resp);
        setStatus('Erreur OAuth Google.');
        return;
      }
      currentAccessToken = resp.access_token;
      // Assure-toi que gapi est prêt avant d’injecter le token et d’appeler Calendar
      const ok = await waitForGapiReady();
      if (!ok) {
        setStatus("Google API n'a pas fini de charger.");
        return;
      }
      gapi.client.setToken({ access_token: currentAccessToken });
      setStatus("Connecté à Google. Chargement…");
      try { await loadCalendars(); } catch(e){ console.error(e); }
      safe(logoutBtn, el => el.disabled = false);
    }
  });
  return tokenClient;
}

async function signInWithGoogle(){
  if (!window.__gapiReady) setStatus("Chargement des APIs Google…");
  const tc = ensureTokenClient();
  if (!tc) return;
  // Première fois → prompt de consentement
  tc.requestAccessToken({ prompt: 'consent' });
}

function revoke(){
  if (!currentAccessToken) return;
  try {
    google.accounts.oauth2.revoke(currentAccessToken, () => {
      console.log('[ORIS] Jeton révoqué.');
      currentAccessToken = null;
      if (window.__gapiReady) gapi.client.setToken(null);
      setStatus("Déconnecté de Google.");
      safe(logoutBtn, el => el.disabled = true);
    });
  } catch(e) {
    console.warn('Révocation échouée:', e);
  }
}

/** ——— SSO via ATMOS (Supabase Google provider) ——— **/
async function tryGoogleFromAtmos(){
  try{
    const { data } = await supabase.auth.getSession();
    const session = data?.session;
    if(!session) return false;
    const provider = session.user?.app_metadata?.provider;
    const accessToken = session.provider_token;
    if (provider === 'google' && accessToken) {
      const ok = await waitForGapiReady();
      if (!ok) return false;
      currentAccessToken = accessToken;
      gapi.client.setToken({ access_token: accessToken });
      setStatus("Connecté à Google via ATMOS. Chargement…");
      safe(logoutBtn, el => el.disabled = false);
      await loadCalendars();
      return true;
    }
    return false;
  }catch(e){
    console.warn('[ORIS] SSO ATMOS échoué:', e);
    return false;
  }
}

/** ——— Boot auth ——— **/
async function checkAuth(){
  const { data } = await supabase.auth.getSession();
  setAuthLocked(!data?.session);
  if (data?.session) {
    const ok = await tryGoogleFromAtmos();
    if (!ok) setStatus("Session ATMOS détectée. Cliquez « Connecter Google » si besoin.");
  } else {
    setStatus("Non connecté à ATMOS. Cliquez « Connecter Google ».");
  }
}
supabase.auth.onAuthStateChange(async (_evt, session) => {
  setAuthLocked(!session);
  if (session) await tryGoogleFromAtmos();
});

/** ——— Calendars demo loader (à remplacer par ta logique) ——— **/
async function loadCalendars(){
  try{
    const r = await gapi.client.calendar.events.list({
      calendarId: 'primary',
      singleEvents: true,
      orderBy: 'startTime',
      timeMin: (new Date()).toISOString(),
      maxResults: 10
    });
    console.log('[ORIS] Events:', r.result.items || []);
    setStatus(`Agenda chargé (${(r.result.items||[]).length} événements).`);
    // TODO: injecter dans ton UI
  }catch(e){
    console.error('[ORIS] Erreur chargement agenda:', e);
    setStatus('Erreur chargement agenda.');
  }
}

/** ——— Listeners UI ——— **/
safe(googleBtn, el => el.addEventListener('click', (e) => {
  e.preventDefault();
  signInWithGoogle();
}));
safe(logoutBtn, el => el.addEventListener('click', (e) => {
  e.preventDefault();
  revoke();
}));

// Démarrage
checkAuth();

// Filet de sécurité: log JS errors (évite bouton "mort" silencieux)
window.addEventListener('error', (e) => {
  console.error('[ORIS] JS Error:', e.message, e.error);
});
