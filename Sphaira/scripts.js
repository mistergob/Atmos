Voici **`scripts.js`** pour SPHAIRA (à placer dans `Sphaera/scripts.js`). Il correspond exactement au script inline que tu as fourni, prêt à fonctionner avec le `index.html` et le `styles.css` fournis.

```javascript
/* Elements */
const stage = document.getElementById('stage');
const world = document.getElementById('world');
const svg = document.getElementById('wires');
const menu = document.getElementById('menu');           // Menu 3
const menuHeart = document.getElementById('menuHeart'); // Menu 4
const mainNode = document.getElementById('main-node');
const exportBtn = document.getElementById('exportBtn');
const importBtn = document.getElementById('importBtn');
const resetBtn = document.getElementById('resetBtn');
const fileInput = document.getElementById('fileInput');
const homeBtn = document.getElementById('homeBtn');
const wireModeBtn = document.getElementById('wireModeBtn');
const tasksBtn = document.getElementById('tasksBtn');

/* Menu 3 controls */
const titleInput3 = document.getElementById('titleInput3');
const colorPicker = document.getElementById('colorPicker');
const fontSelect = document.getElementById('fontSelect');
const fontSizeMax = document.getElementById('fontSizeMax');
const boldBtn = document.getElementById('boldBtn');
const italicBtn = document.getElementById('italicBtn');
const underlineBtn = document.getElementById('underlineBtn');
const iconWireBtn = document.getElementById('iconWireBtn');
const iconCenterBtn = document.getElementById('iconCenterBtn');
const iconDeleteBtn = document.getElementById('iconDeleteBtn');
const iconTaskBtn = document.getElementById('iconTaskBtn');
const openUrlBtnMenu = document.getElementById('openUrlBtnMenu');

/* Menu 4 controls (coeur) */
const colorPickerH = document.getElementById('colorPickerH');
const fontSelectH = document.getElementById('fontSelectH');
const fontSizeMaxH = document.getElementById('fontSizeMaxH');
const boldBtnH = document.getElementById('boldBtnH');
const italicBtnH = document.getElementById('italicBtnH');
const underlineBtnH = document.getElementById('underlineBtnH');
const iconColorBtnH = document.getElementById('iconColorBtnH');
const iconCenterBtnH = document.getElementById('iconCenterBtnH');
const iconDeleteBtnH = document.getElementById('iconDeleteBtnH');

/* Menus 1/2 */
const principalList = document.getElementById('principalList');
const actionsPanel = document.getElementById('actions');
const selectedInfo = document.getElementById('selectedInfo');
const titleInput2 = document.getElementById('titleInput2');
const actAddPrincipal = document.getElementById('actAddPrincipal');
const actAddSecondary = document.getElementById('actAddSecondary');
const actWire = document.getElementById('actWire');
const actCenter = document.getElementById('actCenter');
const actDelete = document.getElementById('actDelete');
const colorPicker2 = document.getElementById('colorPicker2');
const fontSelect2 = document.getElementById('fontSelect2');
const fontSizeMax2 = document.getElementById('fontSizeMax2');
const boldBtn2 = document.getElementById('boldBtn2');
const italicBtn2 = document.getElementById('italicBtn2');
const underlineBtn2 = document.getElementById('underlineBtn2');
const closeMenu2Btn = document.getElementById('closeMenu2');

/* Modales Tâches */
const taskEditor = document.getElementById('taskEditor');
const taskTitle = document.getElementById('taskTitle');
const taskDesc = document.getElementById('taskDesc');
const taskStart = document.getElementById('taskStart');
const taskEnd = document.getElementById('taskEnd');
const taskSave = document.getElementById('taskSave');
const taskCancel = document.getElementById('taskCancel');
const nodeTasksList = document.getElementById('nodeTasksList');
const tasksModal = document.getElementById('tasksModal');
const tasksContainer = document.getElementById('tasksContainer');
const tasksClose = document.getElementById('tasksClose');

/* State */
let currentNode = null;
let idCounter = 1;
let menu2Locked = false;
const camera = { x: 0, y: 0, z: 1 };
const BIG_SIZE = 110, SMALL_SIZE = 55;
const SNAP_GAP = 12, SNAP_RANGE = 120;
let snapHint = null;

/* Câblage */
const wiring = { active:false, source:null, ghost:null };

/* Tâches (modale par nœud) */
let taskEditorNode = null;
let editingTaskId = null;

/* Utils */
const clamp = (v, a, b) => Math.min(Math.max(v, a), b);
const approxEq = (a,b,eps=0.5)=>Math.abs(a-b)<=eps;
const stageRect = () => stage.getBoundingClientRect();
const centerInWorld = (el) => ({ x: el.offsetLeft + el.offsetWidth/2, y: el.offsetTop + el.offsetHeight/2 });
function applyCamera(){ world.style.transform = `translate(${camera.x}px, ${camera.y}px) scale(${camera.z})`; }
function pointerToWorld(e){ const sr=stageRect(); return { wx:(e.clientX - sr.left - camera.x)/camera.z, wy:(e.clientY - sr.top - camera.y)/camera.z }; }
const isModalOpen = (m) => m && m.style.display === 'flex';

/* Couleur utils */
function normalizeHex(input){ if(!input) return null; let m=String(input).match(/^#?([0-9a-fA-F]{6})$/); if(m) return '#'+m[1].toUpperCase(); m=String(input).match(/^#?([0-9a-fA-F]{3})$/); if(m) return '#'+m[1].split('').map(c=>c+c).join('').toUpperCase(); return null; }
function toHex(input){ if(!input) return null; const hex=String(input).trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i); if(hex){ const h=hex[1]; return '#'+(h.length===3?h.split('').map(c=>c+c).join(''):h).toUpperCase(); } const m=String(input).match(/rgba?\(\s*([0-9.]+)[,\s]+([0-9.]+)[,\s]+([0-9.]+)/i); if(!m) return null; const [r,g,b]=[m[1],m[2],m[3]].map(v=>Math.max(0,Math.min(255,Math.round(parseFloat(v))))); return '#'+[r,g,b].map(v=>v.toString(16).padStart(2,'0')).join('').toUpperCase(); }

/* Lignes */
const qLines = ()=> svg.querySelectorAll('line');
function updateLineEnds(line){
  const from = world.querySelector(`[data-id="${line.dataset.from}"]`);
  const to   = world.querySelector(`[data-id="${line.dataset.to}"]`);
  if(!from||!to) return;
  const c1 = centerInWorld(from), c2 = centerInWorld(to);
  line.setAttribute('x1', c1.x); line.setAttribute('y1', c1.y);
  line.setAttribute('x2', c2.x); line.setAttribute('y2', c2.y);
}
function updateLinesFor(el){ const id=el.dataset.id; qLines().forEach(l=>{ if(l.dataset.from===id||l.dataset.to===id) updateLineEnds(l); }); }
function updateAllLines(){ qLines().forEach(updateLineEnds); }
function findLine(aId,bId){ for(const l of qLines()){ if((l.dataset.from===aId&&l.dataset.to===bId)||(l.dataset.from===bId&&l.dataset.to===aId)) return l; } return null; }
function attachLineEvents(line){
  line.addEventListener('click',(e)=>{
    e.stopPropagation();
    if(confirm('Supprimer cette connexion ?')){
      line.remove();
      saveState();
      refreshSidebar();
    }
  });
}
function isPrincipalNode(n){ const w=parseFloat(getComputedStyle(n).width)||0; return approxEq(w,BIG_SIZE); }
function isSecondaryNode(n){ const w=parseFloat(getComputedStyle(n).width)||0; return approxEq(w,SMALL_SIZE); }
function styleLineByNodes(line){
  const a = world.querySelector(`[data-id="${line.dataset.from}"]`);
  const b = world.querySelector(`[data-id="${line.dataset.to}"]`);
  if(a && b && isSecondaryNode(a) && isSecondaryNode(b)){
    line.setAttribute('stroke', 'rgba(234,255,255,.6)');
    line.setAttribute('stroke-dasharray', '6 6');
    line.style.filter = 'drop-shadow(0 0 6px rgba(234,255,255,.35))';
  }else{
    line.setAttribute('stroke', 'rgba(0,234,255,.55)');
    line.removeAttribute('stroke-dasharray');
    line.style.filter = 'drop-shadow(0 0 6px rgba(0,234,255,.35))';
  }
}
function createLine(fromEl,toEl){
  const line=document.createElementNS('http://www.w3.org/2000/svg','line');
  line.setAttribute('stroke','rgba(0,234,255,.55)'); line.setAttribute('stroke-width','2'); line.setAttribute('stroke-linecap','round');
  line.dataset.from=fromEl.dataset.id; line.dataset.to=toEl.dataset.id;
  svg.appendChild(line); styleLineByNodes(line); updateLineEnds(line); attachLineEvents(line); return line;
}

/* Labels */
function fitLabelToNode(node){
  const label=node.querySelector('.label'); if(!label) return;
  label.style.width='100%'; label.style.maxWidth='100%'; label.style.whiteSpace='normal'; label.style.overflow='hidden'; label.style.wordBreak='break-word';
  const cs=getComputedStyle(node);
  const padX=(parseFloat(cs.paddingLeft)||0)+(parseFloat(cs.paddingRight)||0);
  const padY=(parseFloat(cs.paddingTop)||0)+(parseFloat(cs.paddingBottom)||0);
  const contentW=Math.max(0,node.clientWidth-padX);
  const contentH=Math.max(0,node.clientHeight-padY);
  const cap=parseFloat(node.dataset.maxFont);
  let low=6, high=Math.max(6,Math.floor(Math.min(contentH, Number.isFinite(cap)?cap:contentH))), best=low;
  if(!label.textContent.trim()){ label.style.fontSize=Math.min(16,high)+'px'; return; }
  for(let i=0;i<12 && low<=high;i++){ const mid=Math.floor((low+high)/2); label.style.fontSize=mid+'px'; const fits=label.scrollWidth<=contentW && label.scrollHeight<=contentH; if(fits){ best=mid; low=mid+1; } else { high=mid-1; } }
  label.style.fontSize=best+'px';
}
const fitAllLabels=()=> world.querySelectorAll('.node').forEach(fitLabelToNode);

/* Menu 2 */
function showActionsPanel(show){ actionsPanel.style.display = show ? 'block' : 'none'; }
function enableActionPanel(enabled){
  const ctrls=actionsPanel.querySelectorAll('button,select,input');
  ctrls.forEach(el=>{ el.disabled=!enabled; if(!enabled && el.classList.contains('toggle')) el.setAttribute('aria-pressed','false'); });
  selectedInfo.textContent = enabled && currentNode ? (currentNode.querySelector('.label')?.textContent || currentNode.dataset.id) : 'Aucun cercle sélectionné';
  titleInput2.value = enabled && currentNode ? (currentNode.querySelector('.label')?.textContent || '') : '';
}
function syncActionPanel(){
  if(!currentNode){ enableActionPanel(false); return; }
  enableActionPanel(true);
  const hex = toHex(getComputedStyle(currentNode).backgroundColor) || '#00EAFF';
  colorPicker.value=hex; colorPicker2.value=hex; colorPickerH.value=hex;
  const label=currentNode.querySelector('.label');
  const fam = label.style.fontFamily && Array.from(fontSelect.options).some(o=>o.value===label.style.fontFamily) ? label.style.fontFamily : 'system-ui';
  fontSelect.value=fam; fontSelect2.value=fam; fontSelectH.value=fam;
  const cap=currentNode.dataset.maxFont || '32'; fontSizeMax.value=cap; fontSizeMax2.value=cap; fontSizeMaxH.value=cap;
  const cs=getComputedStyle(label);
  const fw=parseInt(cs.fontWeight,10); const isBold=(fw>=600)||cs.fontWeight==='bold';
  const isItalic=cs.fontStyle==='italic';
  const isUnderline=(cs.textDecorationLine||cs.textDecoration||'').includes('underline');
  [boldBtn,boldBtn2,boldBtnH].forEach(b=>b.setAttribute('aria-pressed', isBold?'true':'false'));
  [italicBtn,italicBtn2,italicBtnH].forEach(b=>b.setAttribute('aria-pressed', isItalic?'true':'false'));
  [underlineBtn,underlineBtn2,underlineBtnH].forEach(b=>b.setAttribute('aria-pressed', isUnderline?'true':'false'));
  titleInput3.value = label.textContent || '';
  syncOpenUrlIcon();
}
function setCurrentNode(node,{fromMenu1=false,preserveMenu2=false}={}){
  world.querySelectorAll('.node.selected').forEach(n=>n.classList.remove('selected'));
  currentNode=node||null;
  if(currentNode) currentNode.classList.add('selected');
  syncActionPanel();
  if(fromMenu1){ menu2Locked=true; showActionsPanel(true); }
  else if(!preserveMenu2 && !menu2Locked){ showActionsPanel(false); }
}

/* Caméra */
function centerOnNode(node){
  if(!node) return;
  const sr=stageRect();
  const c=centerInWorld(node);
  camera.x = sr.width/2  - c.x*camera.z;
  camera.y = sr.height/2 - c.y*camera.z;
  applyCamera();
  node.classList.add('pulse'); setTimeout(()=>node.classList.remove('pulse'),800);
}
function centerOnCurrent(){ if(currentNode) centerOnNode(currentNode); }
homeBtn.addEventListener('click',()=> centerOnNode(mainNode));
closeMenu2Btn.addEventListener('click', ()=>{ menu2Locked=false; showActionsPanel(false); });

/* Graphe & déplacement liés */
function neighborsOf(id){
  const res=[]; qLines().forEach(l=>{ if(l.dataset.from===id) res.push(l.dataset.to); else if(l.dataset.to===id) res.push(l.dataset.from); });
  return Array.from(new Set(res));
}
function principalNeighborsOf(nodeEl){
  const ids = neighborsOf(nodeEl.dataset.id);
  return ids.map(id=>world.querySelector(`[data-id="${id}"]`)).filter(Boolean).filter(isPrincipalNode);
}
function secondariesOfPrincipal(principalEl){
  const ids = neighborsOf(principalEl.dataset.id);
  return ids.map(id=>world.querySelector(`[data-id="${id}"]`)).filter(Boolean).filter(isSecondaryNode);
}
function secondariesUniqueToPrincipal(principalEl){
  return secondariesOfPrincipal(principalEl).filter(sec => principalNeighborsOf(sec).length === 1);
}
function nearestPrincipal(toNode){
  const sC=centerInWorld(toNode); let best=null,bestDist=Infinity;
  world.querySelectorAll('.node').forEach(n=>{ if(!isPrincipalNode(n)||n===toNode) return; const c=centerInWorld(n); const d=Math.hypot(sC.x-c.x,sC.y-c.y); if(d<bestDist){ best=n; bestDist=d; }});
  return {node:best, dist:bestDist};
}
function snapSecondaryToPrincipal(sec, principal){
  const pC=centerInWorld(principal); const sW=sec.offsetWidth, sH=sec.offsetHeight;
  const angle=Math.atan2( (sec.offsetTop + sH/2) - pC.y, (sec.offsetLeft + sW/2) - pC.x ) || 0;
  const radius = BIG_SIZE/2 + sW/2 + SNAP_GAP;
  const cx = pC.x + radius*Math.cos(angle);
  const cy = pC.y + radius*Math.sin(angle);
  sec.style.left = (cx - sW/2) + 'px';
  sec.style.top  = (cy - sH/2) + 'px';
  updateLinesFor(sec);
}
function ensureEdgeExists(a,b){
  if(!findLine(a.dataset.id,b.dataset.id)) createLine(a,b);
}

/* URL badge */
function updateUrlBadge(node){
  const old = node.querySelector('.url-badge');
  if(old) old.remove();
  const url = node.dataset.url;
  if(!url) return;
  const a = document.createElement('a');
  a.className = 'url-badge';
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  a.title = 'Ouvrir le lien';
  a.textContent = '🔗';
  a.addEventListener('pointerdown', e=>{ e.stopPropagation(); });
  a.addEventListener('click', e=>{ e.stopPropagation(); });
  node.appendChild(a);
}
function setNodeUrl(node, raw){
  const v = (raw||'').trim();
  if(!v){ delete node.dataset.url; updateUrlBadge(node); syncOpenUrlIcon(); saveState(); return; }
  let url = v;
  if(!/^https?:\/\//i.test(url)) url = 'https://' + url;
  try{ new URL(url); }catch{ alert('URL invalide.'); return; }
  node.dataset.url = url;
  updateUrlBadge(node);
  syncOpenUrlIcon();
  saveState();
}
function syncOpenUrlIcon(){
  if(!openUrlBtnMenu) return;
  const url = currentNode?.dataset?.url;
  if(url){
    openUrlBtnMenu.href = url;
    openUrlBtnMenu.style.opacity = '1';
    openUrlBtnMenu.style.pointerEvents = 'auto';
    openUrlBtnMenu.title = 'Ouvrir : ' + url;
  }else{
    openUrlBtnMenu.removeAttribute('href');
    openUrlBtnMenu.style.opacity = '.4';
    openUrlBtnMenu.style.pointerEvents = 'none';
    openUrlBtnMenu.title = 'Aucune URL';
  }
}

/* Tâches */
function updateTaskBadge(node){
  const old = node.querySelector('.task-badge');
  if(old) old.remove();
  const tasks = node._tasks || [];
  if(tasks.length===0) return;
  const b = document.createElement('div');
  b.className = 'task-badge';
  b.textContent = '⭐';
  b.addEventListener('pointerdown', e=> e.stopPropagation());
  b.addEventListener('click', e=> e.stopPropagation());
  node.appendChild(b);
}

function addTaskToNode(node, title, desc, start, end){
  node._tasks = node._tasks || [];
  if(node._tasks.length >= 10){
    alert('Limite de 10 tâches par cercle atteinte.');
    return false;
  }
  node._tasks.push({ id: 't'+Date.now()+Math.random().toString(36).slice(2,6), title, desc, start, end });
  updateTaskBadge(node);
  saveState();
  return true;
}

function updateTaskOnNode(node, taskId, patch){
  if(!node || !node._tasks) return;
  const t = node._tasks.find(x=>x.id===taskId);
  if(!t) return;
  Object.assign(t, patch);
  updateTaskBadge(node);
  saveState();
}

function deleteTaskFromNode(node, taskId){
  if(!node || !node._tasks) return;
  node._tasks = node._tasks.filter(t => t.id !== taskId);
  updateTaskBadge(node);
  saveState();
  if(taskEditorNode === node && isModalOpen(taskEditor)) renderNodeTasksList();
  if(isModalOpen(tasksModal)) renderGlobalTasksList();
}

function fmtRange(start, end){
  const s = start ? start : null;
  const e = end ? end : null;
  if(!s && !e) return '';
  if(s && e) return `Du ${s} au ${e}`;
  if(s && !e) return `À partir du ${s}`;
  if(!s && e) return `Jusqu'au ${e}`;
}

function openTaskEditor(forNode, taskIdToEdit=null){
  if(!forNode) return;
  setCurrentNode(forNode,{preserveMenu2:true});
  taskEditorNode = forNode;

  editingTaskId = null;
  taskTitle.value = '';
  taskDesc.value = '';
  taskStart.value = '';
  taskEnd.value = '';

  if(taskIdToEdit){
    const t = (forNode._tasks||[]).find(x=>x.id===taskIdToEdit);
    if(t){
      editingTaskId = t.id;
      taskTitle.value = t.title || '';
      taskDesc.value = t.desc || '';
      taskStart.value = t.start || '';
      taskEnd.value = t.end || '';
    }
  }
  renderNodeTasksList();
  taskEditor.style.display = 'flex';
  taskEditor.setAttribute('aria-hidden','false');
  (taskTitle.value ? taskDesc : taskTitle).focus();
}
function closeTaskEditor(){
  taskEditor.style.display = 'none';
  taskEditor.setAttribute('aria-hidden','true');
  taskEditorNode = null;
  editingTaskId = null;
}
function renderNodeTasksList(){
  const node = taskEditorNode;
  nodeTasksList.innerHTML = '';
  const tasks = (node && node._tasks) ? node._tasks : [];
  if(tasks.length === 0){
    const empty = document.createElement('div');
    empty.className = 'task-item';
    empty.textContent = 'Aucune tâche pour ce cercle.';
    nodeTasksList.appendChild(empty);
    return;
  }
  tasks.forEach(t=>{
    const div = document.createElement('div');
    div.className = 'task-item';
    div.innerHTML = `
      <div style="display:flex; align-items:flex-start; gap:10px; justify-content:space-between;">
        <div class="task-main" style="flex:1;">
          <div><strong>⭐ ${escapeHtml(t.title)}</strong></div>
          ${t.start || t.end ? `<div><small>${escapeHtml(fmtRange(t.start,t.end))}</small></div>` : ''}
          ${t.desc ? `<div style="margin-top:6px">${escapeHtml(t.desc)}</div>` : ''}
        </div>
        <div style="display:flex; gap:6px;">
          <button class="icon-btn small btn-edit" title="Modifier">✏️</button>
          <button class="icon-btn small btn-del" title="Supprimer">🗑️</button>
        </div>
      </div>
    `;
    div.querySelector('.btn-edit').addEventListener('click', ()=>{
      openTaskEditor(node, t.id);
    });
    div.querySelector('.btn-del').addEventListener('click', (ev)=>{
      ev.stopPropagation();
      if(confirm('Supprimer cette tâche ?')) deleteTaskFromNode(node, t.id);
    });
    nodeTasksList.appendChild(div);
  });
}

taskSave.addEventListener('click', ()=>{
  if(!currentNode) return closeTaskEditor();
  const t = taskTitle.value.trim();
  const d = taskDesc.value.trim();
  const s = taskStart.value || '';
  const e = taskEnd.value || '';
  if(!t){ alert('Veuillez saisir un titre.'); return; }
  if(editingTaskId){
    updateTaskOnNode(currentNode, editingTaskId, { title:t, desc:d, start:s, end:e });
    editingTaskId = null;
  }else{
    const ok = addTaskToNode(currentNode, t, d, s, e);
    if(!ok) return;
  }
  renderNodeTasksList();
  if(isModalOpen(tasksModal)) renderGlobalTasksList();
  taskTitle.value = ''; taskDesc.value = ''; taskStart.value=''; taskEnd.value='';
  taskTitle.focus();
});
taskCancel.addEventListener('click', closeTaskEditor);
taskEditor.addEventListener('click', (e)=>{ if(e.target===taskEditor) closeTaskEditor(); });

// Liste globale des tâches
tasksBtn.addEventListener('click', openTasksListModal);
tasksClose.addEventListener('click', closeTasksListModal);
tasksModal.addEventListener('click', (e)=>{ if(e.target===tasksModal) closeTasksListModal(); });

function gatherAllTasks(){
  const items = [];
  world.querySelectorAll('.node').forEach(n=>{
    const tasks = n._tasks || [];
    if(tasks.length===0) return;
    const name = n.querySelector('.label')?.textContent || n.dataset.id;
    tasks.forEach(task=> items.push({ node:n, nodeName:name, task }));
  });
  return items;
}
function renderGlobalTasksList(){
  const items = gatherAllTasks();
  tasksContainer.innerHTML = '';
  if(items.length === 0){
    const empty = document.createElement('div');
    empty.className='task-item';
    empty.textContent = 'Aucune tâche.';
    tasksContainer.appendChild(empty);
    return;
  }
  items.forEach(({node,nodeName,task})=>{
    const col = toHex(getComputedStyle(node).backgroundColor) || '#00EAFF';
    const wrapper = document.createElement('div');
    wrapper.className = 'task-item';
    wrapper.innerHTML = `
      <div style="display:flex; align-items:flex-start; gap:10px; justify-content:space-between;">
        <div class="task-main" style="flex:1; cursor:pointer">
          <div><strong><span class="dot" style="background:${col}"></span>⭐ ${escapeHtml(task.title)}</strong></div>
          <div><small>Sur : ${escapeHtml(nodeName)}</small></div>
          ${task.start || task.end ? `<div><small>${escapeHtml(fmtRange(task.start,task.end))}</small></div>` : ''}
          ${task.desc ? `<div style="margin-top:6px">${escapeHtml(task.desc)}</div>` : ''}
        </div>
        <div style="display:flex; gap:6px;">
          <button class="icon-btn small btn-edit" title="Modifier">✏️</button>
          <button class="icon-btn small btn-del"  title="Supprimer">🗑️</button>
        </div>
      </div>
    `;
    const main = wrapper.querySelector('.task-main');
    const delBtn = wrapper.querySelector('.btn-del');
    const editBtn = wrapper.querySelector('.btn-edit');

    main.addEventListener('click', ()=>{
      closeTasksListModal();
      setCurrentNode(node,{preserveMenu2:true});
      centerOnNode(node);
    });
    delBtn.addEventListener('click', (ev)=>{
      ev.stopPropagation();
      if(confirm('Supprimer cette tâche ?')){
        deleteTaskFromNode(node, task.id);
      }
    });
    editBtn.addEventListener('click', (ev)=>{
      ev.stopPropagation();
      closeTasksListModal();
      openTaskEditor(node, task.id);
    });

    tasksContainer.appendChild(wrapper);
  });
}
function openTasksListModal(){ renderGlobalTasksList(); tasksModal.style.display='flex'; tasksModal.setAttribute('aria-hidden','false'); }
function closeTasksListModal(){ tasksModal.style.display='none'; tasksModal.setAttribute('aria-hidden','true'); }

function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }

function enableDrag(node){
  if(node._dragEnabled) return;
  let offsetXw=0, offsetYw=0, dragging=false, prevLeft=0, prevTop=0;

  node.addEventListener('pointerdown',(e)=>{
    if(e.button!==0) return;
    if(wiring.active){
      e.preventDefault(); e.stopPropagation();
      if(!wiring.source){
        setCurrentNode(node,{preserveMenu2:true});
        startWiring(node);
      }else{
        attemptConnect(node);
      }
      return;
    }
    setCurrentNode(node,{preserveMenu2:true});
    closeMenu(menu); closeMenu(menuHeart);
    node.setPointerCapture(e.pointerId);
    const rect=node.getBoundingClientRect();
    offsetXw = (e.clientX - rect.left) / camera.z;
    offsetYw = (e.clientY - rect.top)  / camera.z;
    prevLeft = parseFloat(node.style.left)||0;
    prevTop  = parseFloat(node.style.top)||0;
    dragging=true;
  });

  node.addEventListener('pointermove',(ev)=>{
    if(!dragging) return;
    const sr=stageRect();
    const worldX = (ev.clientX - sr.left - camera.x)/camera.z;
    const worldY = (ev.clientY - sr.top  - camera.y)/camera.z;
    const newLeft = worldX - offsetXw;
    const newTop  = worldY - offsetYw;

    const dx = newLeft - prevLeft;
    const dy = newTop  - prevTop;

    node.style.left=newLeft+'px';
    node.style.top =newTop +'px';
    updateLinesFor(node);
    fitLabelToNode(node);

    if(isPrincipalNode(node) && (dx!==0 || dy!==0)){
      secondariesUniqueToPrincipal(node).forEach(sec=>{
        sec.style.left = ((parseFloat(sec.style.left)||0) + dx) + 'px';
        sec.style.top  = ((parseFloat(sec.style.top)||0) + dy) + 'px';
        updateLinesFor(sec);
      });
    }

    if(isSecondaryNode(node)){
      const {node:pri, dist} = nearestPrincipal(node);
      if(snapHint && snapHint!==pri) snapHint.classList.remove('snap-target');
      if(pri && dist <= SNAP_RANGE){ pri.classList.add('snap-target'); snapHint=pri; } else { if(snapHint){ snapHint.classList.remove('snap-target'); snapHint=null; } }
    }

    prevLeft = newLeft;
    prevTop  = newTop;
  });

  node.addEventListener('pointerup',(e)=>{
    if(!dragging) return;
    dragging=false; node.releasePointerCapture(e.pointerId);
    if(isSecondaryNode(node)){
      const {node:pri, dist} = nearestPrincipal(node);
      if(pri && dist <= SNAP_RANGE){
        snapSecondaryToPrincipal(node, pri);
        ensureEdgeExists(pri, node);
      }
      if(snapHint){ snapHint.classList.remove('snap-target'); snapHint=null; }
    }
    saveState();
  });

  node.addEventListener('contextmenu',(e)=>{
    e.preventDefault();
    setCurrentNode(node,{preserveMenu2:true});
    if(node.id === 'main-node') openMenuAt(menuHeart, e, node);
    else openMenuAt(menu, e, node);
  });

  node._dragEnabled=true;
  updateUrlBadge(node);
  updateTaskBadge(node);
}

/* Ajout cercles */
function addNodeNear(target){
  const sr=stageRect();
  const tRect=target.getBoundingClientRect();
  const tW=target.offsetWidth, tH=target.offsetHeight;
  const left = ((tRect.left - sr.left - camera.x)/camera.z) + tW + 30;
  const top  = ((tRect.top  - sr.top  - camera.y)/camera.z) + tH + 30;
  const node=document.createElement('div'); node.className='node'; node.dataset.id=`node-${idCounter++}`;
  const base = toHex(getComputedStyle(target).backgroundColor) || '#00EAFF';
  Object.assign(node.style,{left:left+'px',top:top+'px',width:BIG_SIZE+'px',height:BIG_SIZE+'px',backgroundColor: base});
  node.style.setProperty('--node', base);
  node.innerHTML='<span class="label">Cercle principal</span>';
  node._tasks = [];
  world.appendChild(node); enableDrag(node); fitLabelToNode(node); createLine(target,node); setCurrentNode(node,{preserveMenu2:true}); saveState(); return node;
}
function addNodeNearScaled(target){
  const sr=stageRect();
  const tRect=target.getBoundingClientRect();
  const tW=target.offsetWidth, tH=target.offsetHeight;
  const left = ((tRect.left - sr.left - camera.x)/camera.z) + tW + 30;
  const top  = ((tRect.top  - sr.top  - camera.y)/camera.z) + tH + 30;
  const node=document.createElement('div'); node.className='node'; node.dataset.id=`node-${idCounter++}`;
  const base = toHex(getComputedStyle(target).backgroundColor) || '#00EAFF';
  Object.assign(node.style,{left:left+'px',top:top+'px',width:SMALL_SIZE+'px',height:SMALL_SIZE+'px',backgroundColor: base});
  node.style.setProperty('--node', base);
  node.innerHTML='<span class="label">Cercle secondaire</span>';
  node._tasks = [];
  world.appendChild(node); enableDrag(node); fitLabelToNode(node); createLine(target,node); setCurrentNode(node,{preserveMenu2:true}); saveState(); return node;
}

/* Menus contextuels (3 et 4) */
function openMenuAt(whichMenu, event, node){
  if(!event){ whichMenu.style.display='none'; whichMenu.setAttribute('aria-hidden','true'); return; }
  setCurrentNode(node,{preserveMenu2:true});
  const hex=toHex(getComputedStyle(currentNode).backgroundColor)||'#00EAFF';
  (whichMenu.querySelector('input[type="color"]')||{}).value = hex;
  const lbl=currentNode.querySelector('.label');
  whichMenu.querySelectorAll('select').forEach(sel=>{
    const fam = lbl.style.fontFamily && Array.from(sel.options).some(o=>o.value===lbl.style.fontFamily)? lbl.style.fontFamily : 'system-ui';
    sel.value=fam;
  });
  const sizeInput = whichMenu.querySelector('input[type="number"]'); if(sizeInput) sizeInput.value = currentNode.dataset.maxFont || '32';
  const cs=getComputedStyle(lbl); const fw=parseInt(cs.fontWeight,10); const isBold=(fw>=600)||cs.fontWeight==='bold'; const isIt=cs.fontStyle==='italic'; const isUl=(cs.textDecorationLine||cs.textDecoration||'').includes('underline');
  const setPressed=(id,on)=>{ const el=whichMenu.querySelector(id); if(el) el.setAttribute('aria-pressed', on?'true':'false'); };
  setPressed('#boldBtn', isBold); setPressed('#italicBtn', isIt); setPressed('#underlineBtn', isUl);
  setPressed('#boldBtnH', isBold); setPressed('#italicBtnH', isIt); setPressed('#underlineBtnH', isUl);
  if(whichMenu===menu){ titleInput3.value = lbl.textContent || ''; syncOpenUrlIcon(); }
  menu.style.display='none'; menuHeart.style.display='none';
  whichMenu.style.display='flex'; whichMenu.setAttribute('aria-hidden','false');
  const mRect=whichMenu.getBoundingClientRect(); const vw=innerWidth,vh=innerHeight; const x=Math.min(event.clientX,vw-mRect.width-8); const y=Math.min(event.clientY,vh-mRect.height-8); whichMenu.style.left=x+'px'; whichMenu.style.top=y+'px'; event.stopPropagation();
}
function closeMenu(whichMenu){ whichMenu.style.display='none'; whichMenu.setAttribute('aria-hidden','true'); }
document.addEventListener('click',(e)=>{ if(!menu.contains(e.target)) closeMenu(menu); if(!menuHeart.contains(e.target)) closeMenu(menuHeart); });
openUrlBtnMenu.addEventListener('pointerdown',e=>e.stopPropagation());
openUrlBtnMenu.addEventListener('click',e=>{ e.stopPropagation(); });

function applyColor(hex){
  if(!currentNode) return; const v=normalizeHex(hex); if(!v) return;
  currentNode.style.backgroundColor=v;
  currentNode.style.setProperty('--node', v);
  [colorPicker,colorPicker2,colorPickerH].forEach(el=>{ if(el) el.value=v; });
  saveState(); refreshSidebar();
}
function setFamily(val){ if(!currentNode) return; const l=currentNode.querySelector('.label'); l.style.fontFamily=val; [fontSelect,fontSelect2,fontSelectH].forEach(el=>{ if(el) el.value=val; }); fitLabelToNode(currentNode); saveState(); }
function setMax(v){ if(!currentNode) return; const min=6,max=72,val=Math.max(min,Math.min(max,parseFloat(v)||min)); currentNode.dataset.maxFont=String(val); [fontSizeMax,fontSizeMax2,fontSizeMaxH].forEach(el=>{ if(el) el.value=val; }); fitLabelToNode(currentNode); saveState(); }
function togglePressed(btn){ const newV = btn.getAttribute('aria-pressed')==='true'?'false':'true'; btn.setAttribute('aria-pressed',newV); return newV==='true'; }

// Menu 3 handlers
titleInput3.addEventListener('change', ()=>{ if(!currentNode) return; const l=currentNode.querySelector('.label'); l.textContent=titleInput3.value.trim(); fitLabelToNode(currentNode); saveState(); refreshSidebar(); });
titleInput3.addEventListener('keydown',(e)=>{ if(e.key==='Enter'){ e.preventDefault(); titleInput3.blur(); }});
menu.addEventListener('click',(e)=>{
  const btn=e.target.closest('button'); if(!btn||!currentNode) return;
  const action=btn.dataset.action;
  if(action==='add'){ addNodeNear(currentNode); closeMenu(menu); return; }
  if(action==='addSmall'){ addNodeNearScaled(currentNode); closeMenu(menu); return; }
  if(action==='setUrl'){
    const curr=currentNode.dataset.url||'';
    const val=prompt("Entrez une URL (laisser vide pour supprimer) :", curr);
    if(val===null) return;
    setNodeUrl(currentNode, val);
    return;
  }
});
colorPicker.addEventListener('input',(e)=> applyColor(e.target.value));
fontSelect.addEventListener('change',(e)=> setFamily(e.target.value));
fontSizeMax.addEventListener('input',(e)=> setMax(e.target.value));
boldBtn.addEventListener('click',(e)=>{ e.stopPropagation(); const on=togglePressed(boldBtn); currentNode.querySelector('.label').style.fontWeight = on?'700':'400'; fitLabelToNode(currentNode); saveState(); });
italicBtn.addEventListener('click',(e)=>{ e.stopPropagation(); const on=togglePressed(italicBtn); currentNode.querySelector('.label').style.fontStyle = on?'italic':'normal'; fitLabelToNode(currentNode); saveState(); });
underlineBtn.addEventListener('click',(e)=>{ e.stopPropagation(); const on=togglePressed(underlineBtn); currentNode.querySelector('.label').style.textDecoration = on?'underline':'none'; fitLabelToNode(currentNode); saveState(); });

iconWireBtn.addEventListener('click',()=>{ if(!currentNode) return; startWiring(currentNode); closeMenu(menu); });
iconCenterBtn.addEventListener('click',()=>{ centerOnCurrent(); closeMenu(menu); });
iconDeleteBtn.addEventListener('click',()=>{ if(!currentNode) return; if(currentNode.id==='main-node'||currentNode.dataset.id==='node-0'){ alert('Le cercle principal ne peut pas être supprimé.'); return; } qLines().forEach(l=>{ if(l.dataset.from===currentNode.dataset.id||l.dataset.to===currentNode.dataset.id) l.remove(); }); currentNode.remove(); saveState(); refreshSidebar(); closeMenu(menu); });
iconTaskBtn.addEventListener('click',()=>{ if(!currentNode) return; openTaskEditor(currentNode); closeMenu(menu); });

// Menu 4 (cœur)
menuHeart.addEventListener('click',(e)=>{
  const btn=e.target.closest('button'); if(!btn||!currentNode) return;
  const action=btn.dataset.action;
  if(action==='add'){ addNodeNear(currentNode); closeMenu(menuHeart); return; }
  if(action==='addSmall'){ addNodeNearScaled(currentNode); closeMenu(menuHeart); return; }
  if(action==='wire'){ startWiring(currentNode); closeMenu(menuHeart); return; }
  if(action==='rename'){ const label=currentNode.querySelector('.label'); const name=prompt('Entrez un nouveau nom :', label.textContent.trim()); if(name){ label.textContent=name; fitLabelToNode(currentNode); saveState(); refreshSidebar(); } closeMenu(menuHeart); return; }
});
colorPickerH.addEventListener('input',(e)=> applyColor(e.target.value));
fontSelectH.addEventListener('change',(e)=> setFamily(e.target.value));
fontSizeMaxH.addEventListener('input',(e)=> setMax(e.target.value));
boldBtnH.addEventListener('click',(e)=>{ e.stopPropagation(); const on=togglePressed(boldBtnH); currentNode.querySelector('.label').style.fontWeight = on?'700':'400'; fitLabelToNode(currentNode); saveState(); });
italicBtnH.addEventListener('click',(e)=>{ e.stopPropagation(); const on=togglePressed(italicBtnH); currentNode.querySelector('.label').style.fontStyle = on?'italic':'normal'; fitLabelToNode(currentNode); saveState(); });
underlineBtnH.addEventListener('click',(e)=>{ e.stopPropagation(); const on=togglePressed(underlineBtnH); currentNode.querySelector('.label').style.textDecoration = on?'underline':'none'; fitLabelToNode(currentNode); saveState(); });
iconColorBtnH.addEventListener('click',()=>{ colorPickerH.focus(); colorPickerH.click(); });
iconCenterBtnH.addEventListener('click',()=>{ centerOnCurrent(); closeMenu(menuHeart); });
iconDeleteBtnH.addEventListener('click',()=>{ if(!currentNode) return; if(currentNode.id==='main-node'||currentNode.dataset.id==='node-0'){ alert('Le cercle principal ne peut pas être supprimé.'); return; } qLines().forEach(l=>{ if(l.dataset.from===currentNode.dataset.id||l.dataset.to===currentNode.dataset.id) l.remove(); }); currentNode.remove(); saveState(); refreshSidebar(); closeMenu(menuHeart); });

/* Menu 1 */
function stylePrincipalButtonFromNode(btn, node){
  const col = toHex(getComputedStyle(node).backgroundColor) || '#00EAFF';
  btn.style.borderTop = '4px solid ' + col;
  btn.style.color = 'var(--text)';
}

function populateChildren(principalId, ul){
  ul.innerHTML='';
  const seconds=neighborsOf(principalId).map(id=>world.querySelector(`[data-id="${id}"]`)).filter(Boolean).filter(isSecondaryNode);
  if(seconds.length===0){ const li=document.createElement('li'); li.textContent='Aucun cercle secondaire'; li.style.color='var(--muted)'; li.style.borderStyle='dashed'; ul.appendChild(li); return; }
  seconds.forEach(n=>{ const li=document.createElement('li'); li.textContent=n.querySelector('.label')?.textContent || n.dataset.id; li.addEventListener('click',()=>{ setCurrentNode(n,{fromMenu1:true}); n.classList.add('pulse'); setTimeout(()=>n.classList.remove('pulse'),800); }); ul.appendChild(li); });
}
function refreshSidebar(){
  principalList.innerHTML='';
  const principals=Array.from(world.querySelectorAll('.node')).filter(isPrincipalNode);
  principals.forEach(n=>{
    const wrap=document.createElement('div');
    const btn=document.createElement('button'); btn.className='side-item'; btn.type='button';
    btn.textContent=n.querySelector('.label')?.textContent||n.dataset.id;
    stylePrincipalButtonFromNode(btn, n);
    const ul=document.createElement('ul'); ul.className='child-list'; ul.style.display='none';
    btn.addEventListener('click',()=>{ setCurrentNode(n,{fromMenu1:true}); if(ul.style.display==='none'){ populateChildren(n.dataset.id,ul); ul.style.display='block'; } else { ul.style.display='none'; } });
    wrap.appendChild(btn); wrap.appendChild(ul); principalList.appendChild(wrap);
  });
}

/* Panneau d’actions */
actAddPrincipal.addEventListener('click',()=>{ if(!currentNode) return; addNodeNear(currentNode); });
actAddSecondary.addEventListener('click',()=>{ if(!currentNode) return; addNodeNearScaled(currentNode); });
actWire.addEventListener('click',()=>{ if(!currentNode) return; startWiring(currentNode); });
actCenter.addEventListener('click',()=> centerOnCurrent());
actDelete.addEventListener('click',()=>{
  if(!currentNode) return;
  if(currentNode.id==='main-node'||currentNode.dataset.id==='node-0'){ alert('Le cercle principal ne peut pas être supprimé.'); return; }
  qLines().forEach(l=>{ if(l.dataset.from===currentNode.dataset.id||l.dataset.to===currentNode.dataset.id) l.remove(); });
  currentNode.remove(); currentNode=null; enableActionPanel(false); saveState(); showActionsPanel(false); menu2Locked=false; refreshSidebar();
});

// Titre direct (Menu 2)
function applyTitleFromInput(){
  if(!currentNode) return;
  const v = (titleInput2.value||'').trim();
  const label=currentNode.querySelector('.label');
  label.textContent = v;
  fitLabelToNode(currentNode);
  saveState();
  selectedInfo.textContent = v || currentNode.dataset.id;
  refreshSidebar();
}
titleInput2.addEventListener('change', applyTitleFromInput);
titleInput2.addEventListener('keydown', (e)=>{ if(e.key==='Enter'){ e.preventDefault(); applyTitleFromInput(); titleInput2.blur(); } });

// Menu 2 style/color controls
colorPicker2.addEventListener('input',(e)=> applyColor(e.target.value));
fontSelect2.addEventListener('change',(e)=> setFamily(e.target.value));
fontSizeMax2.addEventListener('input',(e)=> setMax(e.target.value));
boldBtn2.addEventListener('click',(e)=>{ e.stopPropagation(); const on=togglePressed(boldBtn2); currentNode.querySelector('.label').style.fontWeight = on?'700':'400'; fitLabelToNode(currentNode); saveState(); });
italicBtn2.addEventListener('click',(e)=>{ e.stopPropagation(); const on=togglePressed(italicBtn2); currentNode.querySelector('.label').style.fontStyle = on?'italic':'normal'; fitLabelToNode(currentNode); saveState(); });
underlineBtn2.addEventListener('click',(e)=>{ e.stopPropagation(); const on=togglePressed(underlineBtn2); currentNode.querySelector('.label').style.textDecoration = on?'underline':'none'; fitLabelToNode(currentNode); saveState(); });

/* Export/Import/Reset */
exportBtn.addEventListener('click',()=>{ const data=buildState(); const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='workspace.json'; a.click(); URL.revokeObjectURL(url); });
importBtn.addEventListener('click',()=> fileInput.click());
fileInput.addEventListener('change', async (e)=>{ const f=e.target.files?.[0]; if(!f) return; try{ const text=await f.text(); restoreState(JSON.parse(text)); } catch{ alert('Fichier invalide.'); } finally { fileInput.value=''; } });
resetBtn.addEventListener('click',()=>{ if(!confirm("Réinitialiser l'espace de travail ?")) return; localStorage.removeItem('workspaceState'); localStorage.removeItem('sphaira:workspaceState:v1'); qLines().forEach(l=>l.remove()); world.querySelectorAll('.node').forEach(n=>{ if(n!==mainNode) n.remove(); }); mainNode.style.left='calc(50% - 55px)'; mainNode.style.top='calc(50% - 55px)'; mainNode.querySelector('.label').textContent='Cercle principal'; mainNode.style.backgroundColor='var(--primary)'; mainNode.style.setProperty('--node','var(--primary)'); idCounter=1; camera.x=camera.y=0; camera.z=1; applyCamera(); mainNode._tasks=[]; saveState(); updateAllLines(); fitLabelToNode(mainNode); showActionsPanel(false); menu2Locked=false; refreshSidebar(); });

/* Pan & sélection contrôlée */
(function setupStagePan(){
  let panActive=false, lastX=0,lastY=0;
  stage.addEventListener('pointerdown',(e)=>{
    if(e.button===1){
      e.preventDefault();
      panActive=true; stage.classList.add('panning');
      lastX=e.clientX; lastY=e.clientY;
      stage.setPointerCapture?.(e.pointerId);
      return;
    }
    if(e.button===0 && !wiring.active && !e.target.closest('.node') && !menu.contains(e.target) && !menuHeart.contains(e.target) && !actionsPanel.contains(e.target) && !document.getElementById('sidebar').contains(e.target)){
      if(menu2Locked){
        // on garde le panneau ouvert
      }else{
        world.querySelectorAll('.node.selected').forEach(n=>n.classList.remove('selected'));
        currentNode=null; enableActionPanel(false); showActionsPanel(false);
      }
    }
    if(e.button===0 && wiring.active && !e.target.closest('.node')) stopWiring();
  });
  stage.addEventListener('pointermove',(e)=>{
    if(panActive){
      const dx=e.clientX-lastX, dy=e.clientY-lastY; camera.x+=dx; camera.y+=dy; applyCamera(); lastX=e.clientX; lastY=e.clientY;
    }
    if(wiring.active && wiring.source && wiring.ghost){
      const {wx,wy} = pointerToWorld(e);
      wiring.ghost.setAttribute('x2', wx); wiring.ghost.setAttribute('y2', wy);
    }
  });
  function endPan(e){
    if(panActive){ panActive=false; stage.classList.remove('panning'); stage.releasePointerCapture?.(e.pointerId); }
  }
  stage.addEventListener('pointerup',endPan);
  stage.addEventListener('pointercancel',endPan);
})();

/* Zoom (Ctrl/⌘ + molette) */
stage.addEventListener('wheel',(e)=>{
  if(!(e.ctrlKey || e.metaKey)) return;
  e.preventDefault();
  const sr=stageRect();
  const mx = e.clientX - sr.left;
  const my = e.clientY - sr.top;
  const wx = (mx - camera.x)/camera.z;
  const wy = (my - camera.y)/camera.z;
  const factor = Math.exp(-e.deltaY * 0.001);
  const zNew = (Math.min(Math.max(camera.z * factor, 0.5), 2.0));
  camera.x = mx - wx * zNew;
  camera.y = my - wy * zNew;
  camera.z = zNew;
  applyCamera();
}, { passive:false });

/* ====== Mode CÂBLAGE ====== */
function startWiring(source){
  if(!wiring.active){ wiring.active=true; wireModeBtn.classList.add('active'); }
  wiring.source = source;
  if(wiring.ghost) wiring.ghost.remove();
  const c = centerInWorld(source);
  const line=document.createElementNS('http://www.w3.org/2000/svg','line');
  line.setAttribute('stroke','#7dd3fc'); line.setAttribute('stroke-width','2'); line.setAttribute('stroke-linecap','round'); line.setAttribute('stroke-dasharray','6 6');
  line.setAttribute('x1', c.x); line.setAttribute('y1', c.y); line.setAttribute('x2', c.x); line.setAttribute('y2', c.y);
  svg.appendChild(line); wiring.ghost=line;
  world.querySelectorAll('.node').forEach(n=>{ if(n===source){ n.classList.add('wire-source'); } else { n.classList.add('connectable'); } });
}
function stopWiring(){
  wiring.active=false; wireModeBtn.classList.remove('active');
  if(wiring.ghost){ wiring.ghost.remove(); wiring.ghost=null; }
  wiring.source=null;
  world.querySelectorAll('.node.wire-source').forEach(n=>n.classList.remove('wire-source'));
  world.querySelectorAll('.node.connectable').forEach(n=>n.classList.remove('connectable'));
}
function attemptConnect(target){
  if(!wiring.source || target===wiring.source){ stopWiring(); return; }
  const a=wiring.source, b=target;
  if(!findLine(a.dataset.id,b.dataset.id)) createLine(a,b);
  saveState(); refreshSidebar();
  stopWiring();
}

// Toolbar & clavier
wireModeBtn.addEventListener('click',()=>{
  if(wiring.active) stopWiring();
  else { wiring.active=true; wireModeBtn.classList.add('active'); }
});
document.addEventListener('keydown',(e)=>{
  if(e.key==='c' || e.key==='C'){
    if(wiring.active) stopWiring(); else { wiring.active=true; wireModeBtn.classList.add('active'); }
  }
  if(e.key==='Escape'){ if(wiring.active) stopWiring(); closeMenu(menu); closeMenu(menuHeart); }
});

/* Resize */
window.addEventListener('resize',()=>{ updateAllLines(); fitAllLabels(); });

/* Persistence */
function buildState(){
  const nodes=Array.from(world.querySelectorAll('.node')).map(n=>({
    id:n.dataset.id, left:n.style.left||'0px', top:n.style.top||'0px',
    w:parseFloat(getComputedStyle(n).width)||110, h:parseFloat(getComputedStyle(n).height)||110,
    text:n.querySelector('.label')?.textContent||'',
    color: toHex(n.style.backgroundColor || getComputedStyle(n).backgroundColor) || '#00EAFF',
    fontFamily:n.querySelector('.label')?.style.fontFamily||'',
    fontWeight:n.querySelector('.label')?.style.fontWeight||'',
    fontStyle:n.querySelector('.label')?.style.fontStyle||'',
    textDecoration:n.querySelector('.label')?.style.textDecoration||'',
    maxFont: n.dataset.maxFont ? parseFloat(n.dataset.maxFont) : null,
    url: n.dataset.url || '',
    tasks: (n._tasks||[]).map(t=>({id:t.id, title:t.title, desc:t.desc, start:t.start||'', end:t.end||''}))
  }));
  const edges=Array.from(qLines()).map(l=>({from:l.dataset.from,to:l.dataset.to}));
  return { idCounter, nodes, edges, camera };
}
function saveState(){
  const data=buildState();
  localStorage.setItem('workspaceState', JSON.stringify(data));
  /* Patch compatibilité ORIS : double clé */
  localStorage.setItem('sphaira:workspaceState:v1', JSON.stringify(data));
  refreshSidebar();
}
function restoreState(data){
  qLines().forEach(l=>l.remove());
  world.querySelectorAll('.node').forEach(n=>{ if(n!==mainNode) n.remove(); });
  idCounter=data?.idCounter ?? 1;
  if(data?.camera){ camera.x=data.camera.x||0; camera.y=data.camera.y||0; camera.z=data.camera.z||1; applyCamera(); }
  const byId={};
  (data?.nodes||[]).forEach(n=>{
    let node;
    if(n.id==='node-0'){ node=mainNode; }
    else{ node=document.createElement('div'); node.className='node'; node.dataset.id=n.id; world.appendChild(node); enableDrag(node); }
    node.style.left=n.left; node.style.top=n.top;
    if(n.w) node.style.width=n.w+'px';
    if(n.h) node.style.height=n.h+'px';
    const col=normalizeHex(n.color)||toHex(n.color)||'#00EAFF'; node.style.backgroundColor=col; node.style.setProperty('--node', col);
    node.innerHTML='<span class="label"></span>'; const labelEl=node.querySelector('.label');
    labelEl.textContent=n.text||''; if(n.fontFamily) labelEl.style.fontFamily=n.fontFamily; if(n.fontWeight) labelEl.style.fontWeight=n.fontWeight; if(n.fontStyle) labelEl.style.fontStyle=n.fontStyle; if(n.textDecoration) labelEl.style.textDecoration=n.textDecoration; if(n.maxFont) node.dataset.maxFont=String(n.maxFont);
    if(n.url){ node.dataset.url = n.url; }
    node._tasks = Array.isArray(n.tasks) ? n.tasks.map(t=>({ id:t.id, title:t.title, desc:t.desc, start:t.start||'', end:t.end||'' })) : [];
    fitLabelToNode(node); updateUrlBadge(node); updateTaskBadge(node); byId[n.id]=node;
  });
  if(!byId['node-0']){ mainNode.dataset.id='node-0'; mainNode.querySelector('.label').textContent = 'Cercle principal'; byId['node-0']=mainNode; }
  enableDrag(mainNode); fitLabelToNode(mainNode);
  (data?.edges||[]).forEach(e=>{ if(byId[e.from]&&byId[e.to]) { const l=createLine(byId[e.from],byId[e.to]); styleLineByNodes(l); } });
  updateAllLines(); refreshSidebar(); saveState(); showActionsPanel(false); menu2Locked=false;
}

/* Init */
enableDrag(mainNode); mainNode._tasks = mainNode._tasks || []; fitLabelToNode(mainNode); refreshSidebar(); enableActionPanel(false); showActionsPanel(false); applyCamera();
const saved = localStorage.getItem('sphaira:workspaceState:v1') || localStorage.getItem('workspaceState');
if(saved){ try{ restoreState(JSON.parse(saved)); }catch{} } else { saveState(); }
```
