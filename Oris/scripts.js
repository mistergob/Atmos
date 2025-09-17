/* ===== SSO ATMOS (OBLIGATOIRE POUR MASQUER LE BANDEAU) ===== */
const PROJECT_REF = "jlfvbggzdkkwrmpsamvz";             // <= identique à ATMOS
const SUPABASE_URL = `https://${PROJECT_REF}.supabase.co`;
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpsZnZiZ2d6ZGtrd3JtcHNhbXZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcyNjUyNjMsImV4cCI6MjA3Mjg0MTI2M30.kDbtNVQfHEVxRbA8jsAfLu7-6kDioTCG-nWVQ91gJIs`;
const ATMOS_URL = "https://mistergob.github.io/Atmos/"; // casse correcte
const STORAGE_KEY = `sb-${PROJECT_REF}-auth-token`;      // <= IDENTIQUE PARTOUT

// SDK chargé via <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession:true, autoRefreshToken:true, detectSessionInUrl:true,
    storage: window.localStorage, storageKey: STORAGE_KEY }
});

// Lien “Se connecter sur ATMOS” -> retourne ensuite vers ORIS
const authGo = document.getElementById('authGoAtmos');
if (authGo) authGo.href = ATMOS_URL + "?r=" + encodeURIComponent(location.href);

// Affiche/masque le bandeau et (dé)active les boutons
function setAuthLocked(on){
  document.body.classList.toggle('auth-locked', !!on);
  const s = document.getElementById('status');
  if(on){ s && (s.textContent = "Connexion à ATMOS requise."); }
  else if(s && (!s.textContent || s.textContent.includes("ATMOS"))){
    s.textContent = "Connexion Google requise (ou auto via ATMOS).";
  }
  document.getElementById('authBlock').style.display = on ? 'flex' : 'none';
  // (dés)active quelques boutons si tu en as
  (document.getElementById('googleBtn')||{}).disabled = !!on;
  (document.getElementById('logoutBtn')||{}).disabled = !!on;
}

// Essaie de réutiliser le jeton Google issu d’ATMOS (optionnel mais pratique)
async function tryGoogleFromAtmos(){
  try{
    const { data } = await supabase.auth.getSession();
    const session = data?.session;
    if(!session) return false;
    const provider = session.user?.app_metadata?.provider;
    const accessToken = session.provider_token;
    if(provider === 'google' && accessToken && window.gapi){
      await new Promise(r => (window.__gapiReady ? r() : setTimeout(r, 0)));
      if(!window.__gapiReady) return false;
      gapi.client.setToken({ access_token: accessToken });
      document.getElementById('status').textContent =
        "Connecté à Google via ATMOS. Chargement…";
      // ici, déclenche tes chargements (calendriers, etc.)
      return true;
    }
    return false;
  }catch{ return false; }
}

// Boot : enlève le verrou si une session Supabase existe
async function checkAuth(){
  const { data } = await supabase.auth.getSession();
  setAuthLocked(!data?.session);
  if(data?.session){ await tryGoogleFromAtmos(); }
}
// mise à jour live (login/logout dans un autre onglet)
supabase.auth.onAuthStateChange(async (_evt, session) => {
  setAuthLocked(!session);
  if(session){ await tryGoogleFromAtmos(); }
});

// Démarrage
checkAuth();
