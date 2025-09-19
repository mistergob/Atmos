/* ====== ORIS — Auth & Google Calendar ====== */

/** ——— Config projet ——— **/
const PROJECT_REF = "jlfvbggzdkkwrmpsamvz";
const SUPABASE_URL = `https://${PROJECT_REF}.supabase.co`;
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpsZnZiZ2d6ZGtrd3JtcHNhbXZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcyNjUyNjMsImV4cCI6MjA3Mjg0MTI2M30.kDbtNVQfHEVxRbA8jsAfLu7-6kDioTCG-nWVQ91gJIs`;
const STORAGE_KEY = `sb-${PROJECT_REF}-auth-token`;
const ATMOS_URL = "https://mistergob.github.io/Atmos/";
const GOOGLE_CLIENT_ID = "514694919456-asuq6cm5rm048fum8tevs9cou7hq7dq0.apps.googleusercontent.com"; // ← remplace
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
const statusEl = $('status');
const googleBtn = $('googleBtn');
const logoutBtn = $('logoutBtn');

/** ——— Sécurité: ne JAMAIS crasher si #authBlock est absent ——— **/
function setAuthLocked(on){
  document.body.classList.toggle('auth-locked', !!on);
  if (statusEl) {
    if (on) statusEl.textContent = "Connexion à ATMOS requise.";
    else if (!statusEl.textContent || statusEl.textContent.includes("ATMOS")) {
      statusEl.textContent = "Connexion Google requise (ou auto via ATMOS).";
    }
  }
  const blk = document.getElementById('authBlock'); // peut être null
  if (blk) blk.style.display = on ? 'flex' : 'none';

  if (googleBtn) googleBtn.disabled = !!on;
  if (logoutBtn) logoutBtn.disabled = !!on;
}

/** ——— Initialisation GAPI (appelée par le script apis.google.com?onload=onGapiLoad) ——— **/
window.__gapiReady = false;
window.onGapiLoad = function(){
  gapi.load('client', async () => {
    try {
      await gapi.client.init({
        discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest"]
        // apiKey non requis pour OAuth pur
      });
      window.__gapiReady = true;
      console.log('[ORIS] gapi client prêt.');
    } catch (e) {
      console.error('[ORIS] Erreur init gapi:', e);
    }
  });
};

/** ——— GIS OAuth 2.0 ——— **/
let tokenClient = null;
let currentAccessToken = null;

function ensureTokenClient(){
  if (tokenClient) return tokenClient;
  if (!google?.accounts?.oauth2) {
    console.error('[ORIS] GIS non chargé.');
    return null;
  }
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_CLIENT_ID,
    scope: GOOGLE_SCOPES,
    callback: (resp) => {
      if (resp.error) {
        console.error('[ORIS] Erreur OAuth:', resp);
        if (statusEl) statusEl.textContent = 'Erreur OAuth Google.';
        return;
      }
      currentAccessToken = resp.access_token;
      gapi.client.setToken({ access_token: currentAccessToken });
      if (statusEl) statusEl.textContent = "Connecté à Google. Chargement…";
      // lance tes chargements ici
      loadCalendars().catch(console.error);
      logoutBtn && (logoutBtn.disabled = false);
    }
  });
  return tokenClient;
}

async function signInWithGoogle(){
  if (!window.__gapiReady) {
    if (statusEl) statusEl.textContent = "Chargement des APIs Google…";
  }
  const tc = ensureTokenClient();
  if (!tc) return;
  // prompt consenti: forcer le choix de compte la 1ère fois
  tc.requestAccessToken({ prompt: 'consent' });
}

function revoke(){
  if (!currentAccessToken) return;
  try {
    google.accounts.oauth2.revoke(currentAccessToken, () => {
      console.log('[ORIS] Jeton révoqué.');
      currentAccessToken = null;
      gapi.client.setToken(null);
      if (statusEl) statusEl.textContent = "Déconnecté de Google.";
      logoutBtn && (logoutBtn.disabled = true);
    });
  } catch(e) {
    console.warn('Révocation échouée:', e);
  }
}

/** ——— Try SSO via ATMOS (Supabase Google provider) ——— **/
async function tryGoogleFromAtmos(){
  try{
    const { data } = await supabase.auth.getSession();
    const session = data?.session;
    if(!session) return false;
    const provider = session.user?.app_metadata?.provider;
    const accessToken = session.provider_token;
    if (provider === 'google' && accessToken) {
      // Assure-toi que gapi est prêt
      await new Promise(r => (window.__gapiReady ? r() : setTimeout(r, 50)));
      if (!window.__gapiReady) return false;
      currentAccessToken = accessToken;
      gapi.client.setToken({ access_token: accessToken });
      if (statusEl) statusEl.textContent = "Connecté à Google via ATMOS. Chargement…";
      logoutBtn && (logoutBtn.disabled = false);
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
  setAuthLocked(!data?.session); // n’empêche plus l’UI (index.html neutralise), mais garde le statut
  if (data?.session) {
    const ok = await tryGoogleFromAtmos();
    if (!ok && statusEl) statusEl.textContent = "Session ATMOS détectée. Cliquez « Connecter Google » si besoin.";
  } else {
    if (statusEl) statusEl.textContent = "Non connecté à ATMOS. Cliquez « Connecter Google ».";
  }
}
supabase.auth.onAuthStateChange(async (_evt, session) => {
  setAuthLocked(!session);
  if (session) await tryGoogleFromAtmos();
});

/** ——— Calendars demo loader (à remplacer par ta logique) ——— **/
async function loadCalendars(){
  // Petit test: lister les 10 prochains events du calendrier primaire
  try{
    const r = await gapi.client.calendar.events.list({
      calendarId: 'primary',
      singleEvents: true,
      orderBy: 'startTime',
      timeMin: (new Date()).toISOString(),
      maxResults: 10
    });
    console.log('[ORIS] Events:', r.result.items || []);
    if (statusEl) statusEl.textContent = `Agenda chargé (${(r.result.items||[]).length} événements).`;
    // TODO: injecte dans ton grid
  }catch(e){
    console.error('[ORIS] Erreur chargement agenda:', e);
    if (statusEl) statusEl.textContent = 'Erreur chargement agenda.';
  }
}

/** ——— Listeners UI ——— **/
googleBtn && googleBtn.addEventListener('click', (e) => {
  e.preventDefault();
  signInWithGoogle();
});
logoutBtn && logoutBtn.addEventListener('click', (e) => {
  e.preventDefault();
  revoke();
});

// Démarrage
checkAuth();
