:root{
  --primary:#00eaff; --accent:#8a2be2; --text:#e6f7ff; --muted:#9fb3c8;
  --space-img:url("https://images.unsplash.com/photo-1444703686981-a3abbc4d4fe3?q=80&w=1920&auto=format&fit=crop");
  --bg-a:#05060d; --bg-b:#0b1430; --bg-c:#00182a;
  --glow: drop-shadow(0 0 8px rgba(0,234,255,.55)) drop-shadow(0 0 18px rgba(138,43,226,.35));
  --ring: 0 0 0 3px rgba(0,234,255,.35), 0 0 24px rgba(0,234,255,.25);
  --grid:rgba(255,255,255,.12);
  --glass: linear-gradient(180deg, rgba(255,255,255,.05), rgba(255,255,255,.02));
  --card: rgba(8,12,28,.55);
  --ok:#16a34a; --warn:#f59e0b; --danger:#ef4444;
  --sidebar-w: 340px;
  --toolbar-h: 64px;
}
*{box-sizing:border-box}
html,body{height:100%}
body{
  margin:0;color:var(--text);
  font-family: Outfit, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;
  background:
    radial-gradient(1200px 800px at 75% 10%, rgba(138,43,226,.18), transparent 60%),
    radial-gradient(900px 700px at 15% 85%, rgba(0,234,255,.12), transparent 55%),
    radial-gradient(700px 500px at 80% 80%, rgba(0,40,80,.35), transparent 60%),
    linear-gradient(120deg, var(--bg-a), var(--bg-b) 40%, var(--bg-c));
  overflow:hidden;
}
body::before{
  content:""; position:fixed; inset:0; pointer-events:none; mix-blend-mode:screen; opacity:.15; z-index:-1;
  background:
    var(--space-img) center/cover no-repeat,
    radial-gradient(1px 1px at 10% 20%, #fff 40%, transparent 41%),
    radial-gradient(1px 1px at 30% 80%, #fff 40%, transparent 41%),
    radial-gradient(1px 1px at 70% 30%, #fff 40%, transparent 41%),
    radial-gradient(1px 1px at 90% 60%, #fff 40%, transparent 41%);
  animation: twinkle 14s linear infinite;
}
@keyframes twinkle{0%,100%{opacity:.12}50%{opacity:.22}}
body::after{content:""; position:fixed; inset:-10%; pointer-events:none; z-index:-1; filter:blur(24px);
  background: radial-gradient(600px 320px at 50% 25%, rgba(0,234,255,.18), transparent 60%),
              radial-gradient(900px 420px at 50% 70%, rgba(138,43,226,.18), transparent 65%);
  animation: float 18s ease-in-out infinite alternate;
}
@keyframes float{from{transform:translateY(-1.5%)}to{transform:translateY(1.5%)}}

.shell{display:grid; grid-template-columns: 1fr var(--sidebar-w); gap:12px; height:100vh; padding:12px; max-width:1600px; margin:0 auto}
.main{display:flex; flex-direction:column; min-width:0}
.right{display:flex; flex-direction:column; min-width:0}

.topbar{
  height:var(--toolbar-h);
  display:flex; align-items:center; gap:10px;
  background:var(--glass); border:1px solid var(--grid); border-radius:16px; padding:10px 12px;
  box-shadow:0 12px 40px rgba(0,0,0,.35); backdrop-filter: blur(8px);
}
.topbar h1{margin:0 8px 0 4px; font:700 16px/1 Orbitron, sans-serif; letter-spacing:.06em}
.spacer{flex:1}
.btn{
  appearance:none; cursor:pointer; border:1px solid transparent; border-radius:12px; padding:10px 12px; color:var(--text);
  background: linear-gradient(#0c1327,#0b1120) padding-box,
              conic-gradient(from 180deg, rgba(0,234,255,.8), rgba(138,43,226,.8), rgba(0,234,255,.8)) border-box;
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.04), 0 8px 24px rgba(0,0,0,.45);
  transition: transform .2s ease, filter .2s ease, box-shadow .2s ease; font-weight:600; letter-spacing:.02em;
}
.btn:hover{ transform: translateY(-2px); filter: var(--glow); }
.btn:focus-visible{ outline:none; box-shadow: var(--ring); }
.btn.small{padding:6px 10px; border-radius:10px; font-size:12px}
.btn.ghost{ background:transparent; border:1px solid var(--grid) }

.input,.select{
  height:36px; border:1px solid var(--grid); border-radius:10px; background:rgba(8,12,28,.6); color:var(--text); padding:0 10px; outline:none;
}
.status{font-size:12px;color:var(--muted)}
.bar{display:flex; align-items:center; gap:8px}

/* Agenda container */
.calendar-wrap{
  flex:1; min-height:0; margin-top:12px;
  background:var(--glass); border:1px solid var(--grid); border-radius:16px; padding:8px;
  box-shadow:0 12px 40px rgba(0,0,0,.35); backdrop-filter: blur(8px);
  display:flex; flex-direction:column; overflow:hidden;
}
.calendar-toolbar{display:flex; align-items:center; gap:8px; padding:6px 8px}
.calendar-canvas{flex:1; min-height:0; border:1px solid var(--grid); border-radius:12px; background:var(--card); overflow:auto; position:relative}

/* Simple month/week/day header */
.seg{display:inline-flex; border:1px solid var(--grid); border-radius:10px; overflow:hidden}
.seg button{border:0;background:transparent;color:var(--text);padding:6px 10px;cursor:pointer}
.seg button.active{background:rgba(255,255,255,.08)}

/* Event list in day/week/month grid (homemade) */
.grid{display:grid; gap:6px; padding:8px}
.grid.month{grid-template-columns:repeat(7,1fr)}
.grid.week{grid-template-columns: 100px repeat(7,1fr)}
.grid.day{grid-template-columns: 1fr}
.cell{border:1px solid var(--grid); border-radius:10px; padding:8px; min-height:100px; background:rgba(255,255,255,.03)}
.cell.head{min-height:auto; text-align:center; font-size:12px; color:var(--muted)}
.event{margin:4px 0; padding:6px 8px; border:1px solid var(--grid); border-radius:8px; background:rgba(0,0,0,.25); font-size:12px; cursor:pointer}
.event:hover{filter:var(--glow)}
.when{opacity:.8; font-size:11px}

/* Right panel: calendars + tasks */
.panel{
  height:100%;
  display:grid; grid-template-rows: var(--toolbar-h) 1fr;
}
.panel-head{
  display:flex; align-items:center; gap:8px; background:var(--glass); border:1px solid var(--grid); border-radius:16px; padding:10px 12px;
  box-shadow:0 12px 40px rgba(0,0,0,.35); backdrop-filter: blur(8px);
}
.panel-body{
  margin-top:12px; background:var(--glass); border:1px solid var(--grid); border-radius:16px; padding:10px; overflow:auto;
  box-shadow:0 12px 40px rgba(0,0,0,.35); backdrop-filter: blur(8px);
}
.section{border:1px solid var(--grid); border-radius:12px; padding:10px; margin-bottom:10px; background:rgba(255,255,255,.03)}
.section h3{margin:0 0 8px; font-family:Orbitron,sans-serif; letter-spacing:.06em; font-size:14px}
.cal-item{display:flex; align-items:center; gap:8px; padding:6px 8px; border:1px solid var(--grid); border-radius:10px; margin:6px 0; background:rgba(0,0,0,.25)}
.dot{width:10px;height:10px;border-radius:9999px;border:1px solid var(--grid);flex:0 0 auto}
.task{display:flex; align-items:flex-start; gap:8px; border:1px solid var(--grid); border-radius:10px; padding:8px; margin:6px 0; background:rgba(0,0,0,.25)}
.task small{color:var(--muted)}

/* Modal event editor */
.modal{position:fixed; inset:0; display:none; align-items:center; justify-content:center; background:rgba(3,6,16,.55); z-index:50; backdrop-filter: blur(2px);}
.modal .card{width:min(720px,calc(100vw - 24px)); background:var(--glass); border:1px solid var(--grid); border-radius:16px; padding:12px; box-shadow:0 20px 40px rgba(0,0,0,.35)}
.row{display:flex; gap:8px}
.row > *{flex:1}
label{font-size:12px; color:var(--muted)}
input, textarea, select{width:100%; background:rgba(0,0,0,.25); color:var(--text); border:1px solid var(--grid); border-radius:10px; padding:8px}
textarea{min-height:96px; resize:vertical}

/* AUTH LOCK */
.auth-block{
  position:fixed; inset:0; display:none; align-items:center; justify-content:center;
  background:rgba(3,6,16,.65); backdrop-filter:blur(3px); z-index:9999;
}
.auth-card{
  width:min(520px,calc(100vw - 32px)); padding:16px; border-radius:16px;
  border:1px solid rgba(255,255,255,.06);
  background:var(--glass);
  box-shadow:0 20px 40px rgba(0,0,0,.45); color:var(--text);
}
.auth-card h3{ margin:0 0 8px; font-family:Orbitron,sans-serif; letter-spacing:.06em }

body.auth-locked .auth-block{ display:flex; }
body.auth-locked .shell{ pointer-events:none; filter:grayscale(1) opacity(.35) }

@media (prefers-reduced-motion: reduce){ *{animation:none!important; transition:none!important} }
