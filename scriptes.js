/* ========= SSO ATMOS (Supabase) =========
   - Même storageKey partout -> même session sur le même origin
   - Retour automatique vers ?r=... après connexion
========================================= */

// Même REF/clé que dans NEXUS/ORIS/SPHAIRA
const PROJECT_REF = "jlfvbggzdkkwrmpsamvz";
const SUPABASE_URL = `https://${PROJECT_REF}.supabase.co`;
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpsZnZiZ2d6ZGtrd3JtcHNhbXZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcyNjUyNjMsImV4cCI6MjA3Mjg0MTI2M30.kDbtNVQfHEVxRbA8jsAfLu7-6kDioTCG-nWVQ91gJIs";

// IMPORTANT : storageKey identique dans tous les modules
const STORAGE_KEY = `sb-${PROJECT_REF}-auth-token`;

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
    storageKey: STORAGE_KEY
  }
});

// UI
const loginGoogleBtn = document.getElementById('loginGoogle');
const loginMsBtn     = document.getElementById('loginMicrosoft');
const logoutBtn      = document.getElementById('logout');
const whoSpan        = document.getElementById('who');

function setAuthBusy(busy){
  [loginGoogleBtn, loginMsBtn, logoutBtn].forEach(b=> b && (b.disabled = !!busy));
}

function show(session){
  const user = session?.user || null;
  if(user){
    const name = user.user_metadata?.full_name || user.user_metadata?.name || user.email || 'Connecté';
    if (whoSpan) whoSpan.textContent = `Connecté : ${name}`;
    if (loginGoogleBtn) loginGoogleBtn.style.display = 'none';
    if (loginMsBtn)     loginMsBtn.style.display     = 'none';
    if (logoutBtn)      logoutBtn.style.display      = '';
  }else{
    if (whoSpan) whoSpan.textContent = 'Non connecté';
    if (loginGoogleBtn) loginGoogleBtn.style.display = '';
    if (loginMsBtn)     loginMsBtn.style.display     = '';
    if (logoutBtn)      logoutBtn.style.display      = 'none';
  }
}

// URL de retour (si ATMOS appelé par un module avec ?r=...)
const SITE_URL = location.origin + location.pathname;
const RETURN_KEY = 'atmos:returnUrl';

// Capture ?r= au chargement (et garde la cible à travers la redirection OAuth)
(function storeReturnUrlFromQuery(){
  const q = new URLSearchParams(location.search);
  const r = q.get('r');
  if(r){
    try{ localStorage.setItem(RETURN_KEY, decodeURIComponent(r)); }catch{}
  }
})();

async function signIn(provider, scopes){
  try{
    setAuthBusy(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: SITE_URL,            // revient ici après OAuth
        scopes: scopes || 'openid email profile'
        // (facultatif) queryParams: { prompt:'consent' }
      }
    });
    if(error){
      alert('Connexion impossible : ' + error.message);
      setAuthBusy(false);
    }
  }catch(err){
    alert('Erreur inattendue : ' + (err?.message || err));
    setAuthBusy(false);
  }
}

if (loginGoogleBtn) loginGoogleBtn.onclick = ()=> signIn('google', 'openid email profile');
// Provider Microsoft côté Supabase = "azure"
if (loginMsBtn)     loginMsBtn.onclick     = ()=> signIn('azure',  'openid email profile');

if (logoutBtn) logoutBtn.onclick = async ()=>{
  await supabase.auth.signOut();
  show(null);
};

// Nettoie les paramètres OAuth (?code=...&state=...) une fois la session récupérée
function cleanOAuthParams(){
  const q = new URLSearchParams(location.search);
  if(q.has('code') || q.has('state') || q.has('error_description')){
    history.replaceState({}, document.title, SITE_URL);
  }
}

// Redirection automatique vers la cible demandée (?r=...) dès qu'on a une session
async function maybeRedirectToReturn(session){
  if(!session) return;
  const target = localStorage.getItem(RETURN_KEY);
  if(target){
    localStorage.removeItem(RETURN_KEY);
    location.href = target;
  }
}

// État initial + abonnement
supabase.auth.getSession().then(({ data }) => {
  show(data.session);
  cleanOAuthParams();
  maybeRedirectToReturn(data.session);
});

supabase.auth.onAuthStateChange((_event, session) => {
  show(session);
  setAuthBusy(false);
  cleanOAuthParams();
  maybeRedirectToReturn(session);
});

if(location.protocol === 'file:'){
  if (whoSpan) whoSpan.textContent = 'Ouvre via HTTPS (GitHub Pages, Netlify…) pour que la connexion fonctionne.';
}
