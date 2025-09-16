/* ===========================
   ATMOS — scripts.js
   =========================== */
(() => {
  "use strict";

  // Helpers
  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  // Elements (tous optionnels pour éviter les erreurs si absents)
  const btnGoogle = $("#btn-google");
  const toast     = $("#toast");
  const yearEl    = $("#year");

  // --- Footer: année courante
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // --- Toast utilitaire (dialog)
  function showToast(message = "", timeout = 3000) {
    if (!toast) return alert(message); // fallback très simple
    try {
      toast.textContent = message;
      if (typeof toast.show === "function") {
        if (toast.open) toast.close();
        toast.show();
      } else {
        // navigateurs anciens : simulateur d'ouverture
        toast.setAttribute("open", "");
      }
      window.clearTimeout(showToast._t);
      showToast._t = window.setTimeout(() => {
        try { toast.close(); } catch { toast.removeAttribute("open"); }
      }, timeout);
    } catch {
      // dernier recours
      alert(message);
    }
  }

  // --- Navigation "Actions rapides"
  const actionMap = {
    "open-sphaera": "./Sphaera/",
    "open-nexus":   "./Nexus/",
    "open-oris":    "./Oris/",
  };

  $$(".actions-grid [data-action]").forEach(btn => {
    btn.addEventListener("click", () => {
      const action = btn.getAttribute("data-action");
      const target = actionMap[action];
      if (target) window.location.href = target;
    });
  });

  // --- Stockage de session (partagé sur les modules via localStorage)
  const SESSION_KEY = "atmos_session";
  function setSession(obj) {
    try { localStorage.setItem(SESSION_KEY, JSON.stringify(obj)); } catch {}
  }
  function getSession() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); } catch { return null; }
  }
  function clearSession() {
    try { localStorage.removeItem(SESSION_KEY); } catch {}
  }

  // --- Auth Google (progressive enhancement)
  async function loadGoogleIdentity() {
    if (window.google?.accounts?.id) return; // déjà chargé
    await new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://accounts.google.com/gsi/client";
      s.async = true;
      s.defer = true;
      s.onload = resolve;
      s.onerror = () => reject(new Error("Erreur de chargement Google Identity"));
      document.head.appendChild(s);
    });
  }

  async function startGoogleAuth(clientId) {
    if (!clientId) {
      // Mode dév : crée une session locale simulée (pas d’OAuth)
      setSession({
        provider: "local-dev",
        signed_in: true,
        at: Date.now()
      });
      showToast("Session locale créée (développement).");
      return;
    }

    try {
      await loadGoogleIdentity();

      // Initialisation Google Identity (One Tap ou bouton)
      if (window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (resp) => {
            // Ici on ne valide pas le token côté serveur (pas de backend).
            // On mémorise seulement que l’utilisateur est "signé" côté client.
            setSession({
              provider: "google",
              credential_preview: Boolean(resp?.credential), // indicatif
              signed_in: true,
              at: Date.now()
            });
            showToast("Connecté via Google (client-side).");
          }
        });

        // Afficher One Tap quand possible (optionnel)
        try { window.google.accounts.id.prompt(); } catch {}

        // Si tu ajoutes un bouton Google officiel, tu peux aussi le rendre ici:
        // window.google.accounts.id.renderButton(btnGoogle, { theme: "outline", size: "medium" });
      } else {
        throw new Error("Google Identity non disponible");
      }
    } catch (e) {
      console.error(e);
      showToast("Impossible de charger Google. Session locale utilisée.");
      setSession({
        provider: "local-fallback",
        signed_in: true,
        at: Date.now()
      });
    }
  }

  // --- Bouton "Se connecter avec Google"
  if (btnGoogle) {
    btnGoogle.addEventListener("click", () => {
      const clientId = btnGoogle.getAttribute("data-client-id") || "";
      startGoogleAuth(clientId);
    });
  }

  // --- Indication de session à l’arrivée sur la page
  const currentSession = getSession();
  if (currentSession?.signed_in) {
    showToast(`Session active (${currentSession.provider}).`);
  }

  // --- Expose minimal debug (optionnel)
  window.ATMOS = {
    getSession,
    setSession,
    clearSession,
    showToast
  };
})();
