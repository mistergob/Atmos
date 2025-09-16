/* =========================
   NEXUS — App (Gmail/Outlook) + SSO ATMOS
   ========================= */
'use strict';

/* ---------- Pré-init GAPI (Gmail) ---------- */
window.__gapiReady = false;
window.__gapiError = null;
window.onGapiLoad = async function onGapiLoad(){
  if (!window.gapi) { window.__gapiError = new Error('gapi non chargé'); return; }
  try{
    await new Promise(res => gapi.load('client', res));
    await gapi.client.init({ discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest'] });
    window.__gapiReady = true;
    console.log('[NEXUS] GAPI prêt');
  }catch(err){
    window.__gapiError = err;
    console.error('[NEXUS] Erreur init GAPI:', err);
  }
};
function waitForGapiReady(timeoutMs=6000){
  return new Promise(resolve=>{
    if(window.__gapiReady) return resolve();
    const t0 = Date.now();
    const id = setInterval(()=>{
      if(window.__gapiReady || window.__gapiError || Date.now()-t0>timeoutMs){
        clearInterval(id); resolve();
      }
    }, 100);
  });
}
async function ensureGsiLoaded(){
  if (window.google && google.accounts) return;
  await new Promise((resolve, reject)=>{
    const s = document.createElement('script');
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true; s.defer = true;
    s.onload = resolve; s.onerror = reject;
    document.head.appendChild(s);
  });
}

/* ---------- Config ---------- */
const GOOGLE_CLIENT_ID = "514694919456-u0csh5so13bsb8u0cl5a7fl5lgmla4c4.apps.googleusercontent.com";
const AZURE_CLIENT_ID  = "00000000-0000-0000-0000-000000000000"; // remplace si tu utilises Outlook

// Supabase / ATMOS
const PROJECT_REF = "jlfvbggzdkkwrmpsamvz";
const SUPABASE_URL = `https://${PROJECT_REF}.supabase.co`;
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpsZnZiZ2d6ZGtrd3JtcHNhbXZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcyNjUyNjMsImV4cCI6MjA3Mjg0MTI2M30.kDbtNVQfHEVxRbA8jsAfLu7-6kDioTCG-nWVQ91gJIs";
const ATMOS_URL = "https://mistergob.github.io/Atmos/";
const STORAGE_KEY = `sb-${PROJECT_REF}-auth-token`;

/* ---------- Helpers UI & format ---------- */
let currentProvider = null;
let nextPageToken = null;
let prevPageStack = []; // stack pour revenir (Gmail)

function $(id){ return document.getElementById(id); }
function setStatus(msg){ $('status').textContent = msg; }
function clearList(){ $('emails').innerHTML = ''; }
function escapeHtml(s){
  return String(s||'').replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
}
function fmtDate(d){ try{ return new Date(d).toLocaleString('fr-FR'); }catch{ return '' } }

/* ---------- MIME helpers (Gmail) ---------- */
function extractEmailAddress(h){ const v = String(h||'').trim(); const m = v.match(/<([^>]+)>/); return m ? m[1] : v; }
function toBase64Url(str){ const b64 = btoa(unescape(encodeURIComponent(str))); return b64.replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''); }
function randomBoundary(){ return '----=_Part_' + Math.random().toString(36).slice(2) + Date.now(); }

function buildMimeHtmlOnly({to, subject, html, inReplyTo, references}){
  const headers = [
    `To: ${to}`,
    `Subject: ${subject}`,
    inReplyTo ? `In-Reply-To: ${inReplyTo}` : '',
    references ? `References: ${references}` : '',
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    '', html || ''
  ].filter(Boolean).join('\r\n');
  return toBase64Url(headers);
}
async function filesToBase64Parts(files){
  const arr = [];
  for(const f of files){
    const buf = await f.arrayBuffer();
    let b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
    arr.push({ filename: f.name, mime: f.type || 'application/octet-stream', b64 });
  }
  return arr;
}
async function buildMimeMixedWithAttachments({to, subject, html, attachments=[], inReplyTo, references}){
  const boundary = randomBoundary();
  const lines = [];
  lines.push(`To: ${to}`);
  lines.push(`Subject: ${subject}`);
  if(inReplyTo) lines.push(`In-Reply-To: ${inReplyTo}`);
  if(references) lines.push(`References: ${references}`);
  lines.push('MIME-Version: 1.0');
  lines.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
  lines.push('', `--${boundary}`);
  lines.push('Content-Type: text/html; charset="UTF-8"','Content-Transfer-Encoding: 7bit','', html || '');
  for(const att of attachments){
    lines.push(`--${boundary}`);
    lines.push(`Content-Type: ${att.mime}; name="${att.filename}"`);
    lines.push('Content-Transfer-Encoding: base64');
    lines.push(`Content-Disposition: attachment; filename="${att.filename}"`,'', att.b64);
  }
  lines.push(`--${boundary}--`, '');
  const raw = lines.join('\r\n');
  return toBase64Url(raw);
}
async function gmailSend({to, subject, html, threadId=null, inReplyTo=null, references=null, files=[]}){
  let raw;
  if(files && files.length){
    const parts = await filesToBase64Parts(files);
    raw = await buildMimeMixedWithAttachments({to, subject, html, attachments:parts, inReplyTo, references});
  }else{
    raw = buildMimeHtmlOnly({to, subject, html, inReplyTo, references});
  }
  await gapi.client.gmail.users.messages.send({ userId:'me', resource: threadId ? { raw, threadId } : { raw } });
}

/* ---------- Décodage corps + pièces jointes ---------- */
function b64urlDecode(str){
  try{
    const normalized = (str||'').replace(/-/g,'+').replace(/_/g,'/');
    const pad = normalized.length % 4 ? '='.repeat(4 - (normalized.length % 4)) : '';
    return decodeURIComponent(escape(atob(normalized + pad)));
  }catch{ return ''; }
}
function findPart(payload, mime){
  if(!payload) return null;
  if(payload.mimeType === mime && payload.body && (payload.body.data || payload.body.attachmentId)) return payload;
  if(Array.isArray(payload.parts)){
    for(const p of payload.parts){
      const f = findPart(p, mime);
      if(f) return f;
    }
  }
  return null;
}
function extractBody(payload){
  const htmlPart = findPart(payload, 'text/html');
  if(htmlPart && htmlPart.body?.data) return { type:'html', content: b64urlDecode(htmlPart.body.data) };
  const textPart = findPart(payload, 'text/plain');
  if(textPart && textPart.body?.data) return { type:'text', content: `<pre style="white-space:pre-wrap;margin:0">${escapeHtml(b64urlDecode(textPart.body.data))}</pre>` };
  if(payload.body && payload.body.data){
    return { type:'raw', content: `<pre style="white-space:pre-wrap;margin:0">${escapeHtml(b64urlDecode(payload.body.data))}</pre>` };
  }
  return { type:'empty', content:'<div style="opacity:.7">— (aucun contenu) —</div>' };
}
function collectAttachments(payload, arr=[]){
  if(!payload) return arr;
  const filename = payload.filename || '';
  if(filename && payload.body && payload.body.attachmentId){
    arr.push({
      filename,
      mime: payload.mimeType || 'application/octet-stream',
      attId: payload.body.attachmentId,
      size: payload.body.size
    });
  }
  if(Array.isArray(payload.parts)){
    for(const p of payload.parts) collectAttachments(p, arr);
  }
  return arr;
}
async function downloadAttachment({msgId, attId, filename, mime}){
  const r = await gapi.client.gmail.users.messages.attachments.get({ userId:'me', messageId: msgId, id: attId });
  const data = r.result.data; // base64url
  const bin = atob((data||'').replace(/-/g,'+').replace(/_/g,'/'));
  const bytes = new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++) bytes[i] = bin.charCodeAt(i);
  const blob = new Blob([bytes], { type: mime || 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename || 'piece-jointe';
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

/* ---------- DOM refs ---------- */
const emailsEl = $('emails');
const logoutBtn = $('logoutBtn');
const refreshBtn = $('refreshBtn');
const googleBtn = $('googleBtn');
const msBtn = $('msBtn');
const pager = $('pager');
const prevPageBtn = $('prevPage');
const nextPageBtn = $('nextPage');

const searchInput = $('searchInput');
const labelSelect = $('labelSelect');
const pageSizeSel = $('pageSize');
const applyFilterBtn = $('applyFilter');

const authGo = $('authGoAtmos');
if (authGo) authGo.href = ATMOS_URL + "?r=" + encodeURIComponent(location.href);

/* ---------- Rendu cartes ---------- */
function addCard({id, from, subject, snippet, when, labelIds=[], onOpen, unread}){
  const div = document.createElement('div');
  div.className = 'card' + (unread ? ' unread' : '');
  div.setAttribute('role','button');
  div.setAttribute('tabindex','0');
  const labels = [];
  if(labelIds.includes('STARRED')) labels.push('<span class="label">★</span>');
  if(labelIds.includes('IMPORTANT')) labels.push('<span class="label">Important</span>');
  if(labelIds.includes('UNREAD')) labels.push('<span class="label">Non lu</span>');
  div.innerHTML = `
    <div class="row">
      <div class="from">${escapeHtml(from||'—')}</div>
      <div class="small">${when||''}</div>
    </div>
    <div class="row" style="gap:12px">
      <div class="subject">${escapeHtml(subject||'(Sans objet)')}</div>
      <span class="spacer"></span>
      <div class="labels">${labels.join('')}</div>
      <button class="btn small openBtn" type="button">Ouvrir</button>
    </div>
    ${snippet?`<div class="snippet">${escapeHtml(snippet)}</div>`:''}
  `;
  const open = ()=> onOpen && onOpen();
  div.addEventListener('click', open);
  div.addEventListener('keydown', (e)=>{ if(e.key==='Enter' || e.key===' '){ e.preventDefault(); open(); }});
  div.querySelector('.openBtn').addEventListener('click', (e)=>{ e.stopPropagation(); open(); });
  emailsEl.appendChild(div);
}

/* ---------- Gmail : liste + pagination ---------- */
let googleTokenClient = null;

async function loginGoogle(){
  if(document.body.classList.contains('auth-locked')){
    setStatus('Connexion à ATMOS requise avant Google.');
    return;
  }
  setStatus('Initialisation Google…');
  await ensureGsiLoaded();
  await waitForGapiReady();

  if (!window.__gapiReady){
    console.error('[NEXUS] GAPI pas prêt', window.__gapiError);
    setStatus('Erreur d’initialisation Google API (regarde la console).');
    return;
  }

  currentProvider = 'google';
  clearList();
  setStatus('Connexion à Google…');

  if(!googleTokenClient){
    googleTokenClient = google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.modify',
      callback: async (resp) => {
        if(resp && resp.access_token){
          gapi.client.setToken({ access_token: resp.access_token });
          setStatus('Lecture des messages Gmail…');
          prevPageStack = []; nextPageToken = null;
          await listGmail({ reset:true });
          logoutBtn.disabled = false;
        } else {
          setStatus('Échec de l’authentification Google.');
        }
      }
    });
  }
  googleTokenClient.requestAccessToken({ prompt:'' });
}

async function listGmail({ reset=false, pageToken=null } = {}){
  try{
    const maxResults = parseInt(pageSizeSel.value || '20', 10) || 20;
    const baseParams = { userId:'me', maxResults };
    const label = labelSelect.value;
    const q = searchInput.value.trim();

    if(label) baseParams.labelIds = [label];
    if(q) baseParams.q = q;
    if(pageToken) baseParams.pageToken = pageToken;

    const res = await gapi.client.gmail.users.messages.list(baseParams);
    const msgs = res.result.messages || [];
    nextPageToken = res.result.nextPageToken || null;

    clearList();
    if(msgs.length===0){ setStatus('Aucun message pour ce filtre.'); pager.style.display='none'; return; }

    for(const m of msgs){
      const detail = await gapi.client.gmail.users.messages.get({
        userId:'me', id:m.id, format:'metadata',
        metadataHeaders:['Subject','From','Date']
      });
      const headers = (detail.result.payload.headers||[]);
      const h = Object.fromEntries(headers.map(x=>[x.name.toLowerCase(), x.value]));
      const labelIds = detail.result.labelIds || [];
      addCard({
        id: m.id,
        from: h['from'],
        subject: h['subject'],
        when: fmtDate(h['date']),
        snippet: detail.result.snippet,
        labelIds,
        unread: labelIds.includes('UNREAD'),
        onOpen: ()=> openMail(m.id)
      });
    }

    pager.style.display = (nextPageToken || prevPageStack.length) ? 'flex' : 'none';
    prevPageBtn.disabled = prevPageStack.length===0;
    nextPageBtn.disabled = !nextPageToken;

    setStatus(`Affichage de ${msgs.length} messages (Gmail).`);
  }catch(e){
    console.error(e);
    if(e?.status === 401 || e?.result?.error?.code === 401){
      try{
        await ensureGsiLoaded();
        if(!googleTokenClient){
          googleTokenClient = google.accounts.oauth2.initTokenClient({
            client_id: GOOGLE_CLIENT_ID,
            scope: 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.modify',
            callback: (resp)=>{ if(resp?.access_token){ gapi.client.setToken({ access_token: resp.access_token }); listGmail({reset:true}); } }
          });
        }
        googleTokenClient.requestAccessToken({ prompt:'' });
        return;
      }catch{}
    }
    setStatus('Erreur Gmail (token invalide/origin/API). Utilisez « Google » pour vous reconnecter.');
  }
}

/* ---------- Modale lecture + actions ---------- */
const mailModal = $('mailModal');
const mmClose   = $('mmClose');
const mmSubject = $('mmSubject');
const mmMeta    = $('mmMeta');
const mmIframe  = $('mmIframe');
const mmSend    = $('mmSend');
const replyEditor = $('replyEditor');
const fontSelectReply = $('fontSelectReply');
const mmHeader  = $('mmHeader');
const mmAttWrap = $('mmAttachments');
const mmMarkRead= $('mmMarkRead');
const mmArchive = $('mmArchive');
const mmTrash   = $('mmTrash');

const replyFilesInput = $('replyFiles');
const addFilesBtn = $('addFilesBtn');
const replyFilesList = $('replyFilesList');

let currentMsgCtx = null; // { id, threadId, replyTo, subject, messageId, references, unread }

fontSelectReply.addEventListener('change', ()=>{ replyEditor.style.fontFamily = fontSelectReply.value; });

function openModal(){
  mailModal.style.display = 'flex';
  mailModal.setAttribute('aria-hidden','false');
}
function closeModal(){
  mailModal.style.display = 'none';
  mailModal.setAttribute('aria-hidden','true');
  currentMsgCtx = null;
  replyEditor.innerHTML = '';
  replyFilesInput.value = '';
  replyFilesList.innerHTML = '';
  replyFilesList.style.display = 'none';
  mmAttWrap.innerHTML = '';
  mmAttWrap.style.display = 'none';
  mmIframe.srcdoc = '';
}
mmClose.addEventListener('click', closeModal);
mailModal.addEventListener('click', (e)=>{ if(e.target===mailModal) closeModal(); });

addFilesBtn.addEventListener('click', ()=> replyFilesInput.click());
replyFilesInput.addEventListener('change', ()=>{
  const files = Array.from(replyFilesInput.files||[]);
  replyFilesList.innerHTML = '';
  if(files.length){
    files.forEach((f,i)=>{
      const el = document.createElement('div');
      el.className='att';
      el.innerHTML = `<span>📎</span><span>${escapeHtml(f.name)}</span><span class="small">(${Math.round(f.size/1024)} Ko)</span><span class="x" title="Retirer">✖</span>`;
      el.querySelector('.x').onclick = ()=>{
        const dt = new DataTransfer();
        Array.from(replyFilesInput.files).forEach((ff,idx)=>{ if(idx!==i) dt.items.add(ff); });
        replyFilesInput.files = dt.files;
        el.remove();
        if(!replyFilesInput.files.length) replyFilesList.style.display='none';
      };
      replyFilesList.appendChild(el);
    });
    replyFilesList.style.display='flex';
  }else{
    replyFilesList.style.display='none';
  }
});

async function toggleRead(id, unread){
  const resource = unread ? { removeLabelIds:['UNREAD'] } : { addLabelIds:['UNREAD'] };
  await gapi.client.gmail.users.messages.modify({ userId:'me', id, resource });
}
async function archiveMsg(id){
  await gapi.client.gmail.users.messages.modify({ userId:'me', id, resource:{ removeLabelIds:['INBOX'] }});
}
async function trashMsg(id){
  await gapi.client.gmail.users.messages.trash({ userId:'me', id });
}

async function openMail(id){
  try{
    setStatus('Ouverture du message…');
    const detail = await gapi.client.gmail.users.messages.get({ userId:'me', id, format:'full' });

    const payload = detail.result.payload;
    const headers = Object.fromEntries((payload.headers||[]).map(x=>[x.name.toLowerCase(), x.value]));
    const subj = headers['subject'] || '(Sans objet)';
    const from = headers['from'] || '—';
    const to = headers['to'] || '';
    const date = headers['date'] ? fmtDate(headers['date']) : '';
    const replyToAddr = extractEmailAddress(headers['reply-to'] || headers['from'] || '');
    const body = extractBody(payload);
    const labels = detail.result.labelIds || [];
    const isUnread = labels.includes('UNREAD');

    currentMsgCtx = {
      id,
      threadId: detail.result.threadId,
      replyTo: replyToAddr,
      subject: subj,
      messageId: headers['message-id'] || '',
      references: headers['references'] || (headers['message-id'] || ''),
      unread: isUnread
    };

    mmSubject.textContent = subj;
    mmMeta.textContent = `${from} — ${date}`;
    mmHeader.innerHTML = `
      <span class="pill">De&nbsp;: ${escapeHtml(from)}</span>
      <span class="pill">À&nbsp;: ${escapeHtml(to)}</span>
      ${isUnread?'<span class="pill" style="border-color:var(--warn)">Non lu</span>':'<span class="pill" style="border-color:var(--ok)">Lu</span>'}
    `;

    // pièces jointes
    const atts = collectAttachments(payload);
    mmAttWrap.innerHTML = '';
    if(atts.length){
      mmAttWrap.style.display='flex';
      for(const a of atts){
        const el = document.createElement('div');
        el.className='att';
        const size = a.size ? ` (${Math.round(a.size/1024)} Ko)` : '';
        el.innerHTML = `📎 <strong>${escapeHtml(a.filename)}</strong><span class="small">${size}</span> <button class="btn small dl">Télécharger</button>`;
        el.querySelector('.dl').onclick = ()=> downloadAttachment({msgId:id, attId:a.attId, filename:a.filename, mime:a.mime});
        mmAttWrap.appendChild(el);
      }
    }else{
      mmAttWrap.style.display='none';
    }

    // contenu
    mmIframe.srcdoc = `
      <!doctype html><html><head><meta charset="utf-8">
      <meta name="color-scheme" content="dark light">
      <style>body{margin:0;padding:12px;font:14px/1.5 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;color:#111}
      @media (prefers-color-scheme: dark){ body{color:#eaeef6;background:#0a0f20} a{color:#7dd3fc} }</style>
      </head><body>${body.content}</body></html>
    `;
    replyEditor.style.fontFamily = fontSelectReply.value;
    replyEditor.focus();
    openModal();
    setStatus('Message ouvert.');
  }catch(e){
    console.error(e);
    setStatus('Impossible d’ouvrir le message.');
  }
}

mmMarkRead.addEventListener('click', async ()=>{
  if(!currentMsgCtx) return;
  try{
    await toggleRead(currentMsgCtx.id, currentMsgCtx.unread);
    currentMsgCtx.unread = !currentMsgCtx.unread;
    mmHeader.querySelectorAll('.pill')[2].outerHTML =
      currentMsgCtx.unread
        ? '<span class="pill" style="border-color:var(--warn)">Non lu</span>'
        : '<span class="pill" style="border-color:var(--ok)">Lu</span>';
    setStatus('État de lecture mis à jour.');
    await listGmail(); // refresh
  }catch(e){ console.error(e); alert('Échec maj Lu/Non lu'); }
});
mmArchive.addEventListener('click', async ()=>{
  if(!currentMsgCtx) return;
  if(!confirm('Archiver ce message ?')) return;
  try{
    await archiveMsg(currentMsgCtx.id);
    setStatus('Message archivé.');
    closeModal();
    await listGmail({reset:true});
  }catch(e){ console.error(e); alert('Échec de l’archivage'); }
});
mmTrash.addEventListener('click', async ()=>{
  if(!currentMsgCtx) return;
  if(!confirm('Mettre ce message à la corbeille ?')) return;
  try{
    await trashMsg(currentMsgCtx.id);
    setStatus('Message déplacé dans la corbeille.');
    closeModal();
    await listGmail({reset:true});
  }catch(e){ console.error(e); alert('Échec du déplacement'); }
});
mmSend.addEventListener('click', async ()=>{
  if(!currentMsgCtx) return;
  const html = `<div style="font-family:${fontSelectReply.value}; white-space:pre-wrap">${replyEditor.innerHTML || ''}</div>`;
  const plain = html.replace(/<[^>]*>/g,'').trim();
  if(!plain){
    if(!confirm("Le message est vide. Envoyer quand même ?")) return;
  }
  try{
    const files = Array.from(replyFilesInput.files||[]);
    await gmailSend({
      to: currentMsgCtx.replyTo,
      subject: 'Re: ' + (currentMsgCtx.subject || ''),
      html,
      threadId: currentMsgCtx.threadId,
      inReplyTo: currentMsgCtx.messageId,
      references: currentMsgCtx.references,
      files
    });
    alert('Réponse envoyée ✅');
    closeModal();
    await listGmail();
  }catch(e){
    console.error(e);
    alert('Échec de l’envoi (scope gmail.send, API Gmail activée, origin autorisée).');
  }
});

/* ---------- Microsoft (Outlook) ---------- */
const msalInstance = new msal.PublicClientApplication({
  auth: { clientId: AZURE_CLIENT_ID, authority: 'https://login.microsoftonline.com/common', redirectUri: window.location.origin + window.location.pathname },
  cache: { cacheLocation:'sessionStorage' }
});
async function loginMicrosoft(){
  if(document.body.classList.contains('auth-locked')){ setStatus('Connexion à ATMOS requise avant Microsoft.'); return; }
  currentProvider = 'microsoft'; clearList(); setStatus('Connexion à Microsoft…');
  try{
    const loginResp = await msalInstance.loginPopup({ scopes:['Mail.Read'] });
    const acc = loginResp.account; msalInstance.setActiveAccount(acc);
    const tokenResp = await msalInstance.acquireTokenSilent({ scopes:['Mail.Read'], account:acc })
      .catch(()=> msalInstance.acquireTokenPopup({ scopes:['Mail.Read'] }));
    const token = tokenResp.accessToken;
    setStatus('Lecture des messages Outlook…');
    await listOutlook(token);
    logoutBtn.disabled = false;
  }catch(e){ console.error(e); setStatus('Échec de l’authentification Microsoft.'); }
}
async function listOutlook(token){
  try{
    const r = await fetch('https://graph.microsoft.com/v1.0/me/messages?$select=subject,from,receivedDateTime,bodyPreview,hasAttachments&$top=20', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if(!r.ok) throw new Error('Graph error '+r.status);
    const data = await r.json();
    const items = data.value||[];
    clearList();
    if(items.length===0){ setStatus('Aucun message dans la boîte de réception (Outlook).'); return; }
    for(const m of items){
      addCard({
        id: m.id,
        from: (m.from && (m.from.emailAddress.name||m.from.emailAddress.address)) || '—',
        subject: m.subject || '(Sans objet)',
        when: fmtDate(m.receivedDateTime),
        snippet: m.bodyPreview || '',
        onOpen: ()=> alert('Lecture détaillée Outlook non implémentée dans ce prototype.')
      });
    }
    setStatus(`Affichage de ${items.length} messages (Outlook).`);
  }catch(e){ console.error(e); setStatus('Erreur Outlook (Client ID/Redirect URI).'); }
}

/* ---------- Binding UI ---------- */
function bindButtons(){
  googleBtn.disabled = document.body.classList.contains('auth-locked');
  msBtn.disabled = document.body.classList.contains('auth-locked');

  googleBtn.onclick = (e)=>{ e.stopPropagation(); loginGoogle(); };
  msBtn.onclick = (e)=>{ e.stopPropagation(); loginMicrosoft(); };

  refreshBtn.onclick = async ()=>{
    if(currentProvider === 'google'){ await listGmail({reset:true}); }
    else if(currentProvider === 'microsoft'){ setStatus('Actualisation Outlook non implémentée.'); }
    else { setStatus('Connectez-vous d’abord.'); }
  };

  logoutBtn.onclick = ()=>{
    if(currentProvider==='google'){
      try{
        const tok = gapi.client.getToken();
        if(tok && tok.access_token){ google.accounts.oauth2.revoke(tok.access_token, ()=>{}); }
      }catch{}
      gapi.client.setToken('');
    }
    if(currentProvider==='microsoft'){
      msalInstance.logoutPopup({ postLogoutRedirectUri: window.location.href });
    }
    currentProvider=null; clearList(); setStatus('Déconnecté.'); logoutBtn.disabled = true;
  };

  applyFilterBtn.onclick = ()=>{ prevPageStack=[]; nextPageToken=null; if(currentProvider==='google'){ listGmail({reset:true}); } };
  prevPageBtn.onclick = async ()=>{
    if(currentProvider!=='google') return;
    const prev = prevPageStack.pop();
    if(prev){ await listGmail({ reset:true, pageToken: prev }); }
  };
  nextPageBtn.onclick = async ()=>{
    if(currentProvider!=='google' || !nextPageToken) return;
    prevPageStack.push(nextPageToken); // approximatif
    await listGmail({ reset:true, pageToken: nextPageToken });
  };
}
bindButtons();

/* ---------- Supabase / Garde ATMOS ---------- */
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession:true, autoRefreshToken:true, detectSessionInUrl:true,
    storage: window.localStorage, storageKey: STORAGE_KEY }
});
function setAuthLocked(on){
  document.body.classList.toggle('auth-locked', !!on);
  $('authBlock').style.display = on ? 'flex' : 'none';
  $('googleBtn').disabled = !!on;
  $('msBtn').disabled = !!on;
  $('refreshBtn').disabled = !!on;
  $('logoutBtn').disabled = true;
  const s = $('status');
  if(on){ s.textContent = "Connexion à ATMOS requise."; }
  else if(!s.textContent || s.textContent.includes("ATMOS")){ s.textContent = "Choisissez un fournisseur et connectez-vous."; }
  bindButtons();
}
async function tryGoogleFromAtmos(){
  try{
    const { data } = await supabase.auth.getSession();
    const session = data?.session;
    if(!session) return false;

    const provider = session.user?.app_metadata?.provider;
    const accessToken = session.provider_token; // dispo si login Google dans ATMOS
    if(provider === 'google' && accessToken){
      await waitForGapiReady();
      if(!window.__gapiReady){ return false; }
      gapi.client.setToken({ access_token: accessToken });
      currentProvider = 'google';
      logoutBtn.disabled = false;
      setStatus('Connecté à Gmail via ATMOS. Chargement des messages…');
      prevPageStack=[]; nextPageToken=null;
      await listGmail({reset:true});
      return true;
    }
    return false;
  }catch(err){
    console.warn('[NEXUS] Pas de provider_token Google depuis ATMOS', err);
    return false;
  }
}
async function checkAuth(){
  const { data } = await supabase.auth.getSession();
  const hasSession = !!data?.session;
  setAuthLocked(!hasSession);
  if(hasSession){
    const ok = await tryGoogleFromAtmos();
    if(!ok){ setStatus('Session ATMOS active. Cliquez sur Google pour connecter Gmail.'); }
  }
}
supabase.auth.onAuthStateChange(async (_evt, session) => {
  setAuthLocked(!session);
  if(session){ await tryGoogleFromAtmos(); }
});

/* ---------- Boot ---------- */
if ($('authGoAtmos')) $('authGoAtmos').href = ATMOS_URL + "?r=" + encodeURIComponent(location.href);
checkAuth();
if (location.protocol === "file:") {
  console.warn("⚠️ Ouvre via HTTPS (ou un serveur local) pour que l’auth fonctionne.");
}
