// ══════════════════════════════════════════
//   AlpineWatch — script.js
// ══════════════════════════════════════════

// ── STATE ──
let currentProfile = 'public';
let isLoading = false;
const conversationHistory = [];

const PUBLIC_AI_WEBHOOK =
  'https://n8n.srv1463324.hstgr.cloud/webhook/web-ai-alp-general';

const JOURNALIST_AI_WEBHOOK =
  'https://n8n.srv1463324.hstgr.cloud/webhook/web-ai-alp-periodistico';

const SESSION_STORAGE_KEY = 'alpinewatch_n8n_session_id';

/** Stable ID per browser so n8n can scope memory (one conversation thread per visitor). */
function getOrCreateSessionId() {
  try {
    let id = localStorage.getItem(SESSION_STORAGE_KEY);
    if (id && id.length > 8) return id;
    id =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `sess-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
    localStorage.setItem(SESSION_STORAGE_KEY, id);
    return id;
  } catch {
    return `sess-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
  }
}

function escapeHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

/** n8n / AI agent responses vary by workflow — try common shapes */
function parseAgentWebhookReply(data) {
  if (data == null) return null;
  if (typeof data === 'string' && data.trim()) return data;
  if (typeof data !== 'object') return null;
  const keys = ['output', 'text', 'response', 'reply', 'answer', 'message'];
  for (const k of keys) {
    const v = data[k];
    if (typeof v === 'string' && v.trim()) return v;
  }
  if (Array.isArray(data) && data.length) {
    const first = data[0];
    if (typeof first === 'string') return first;
    if (first && typeof first === 'object') return parseAgentWebhookReply(first);
  }
  if (data.data != null) return parseAgentWebhookReply(data.data);
  return null;
}

// ── STARS (landing animation) ──
(function generateStars() {
  const c = document.getElementById('stars');
  for (let i = 0; i < 80; i++) {
    const s = document.createElement('div');
    s.className = 'star';
    s.style.cssText = `left:${Math.random()*100}%;top:${Math.random()*100}%;--d:${2+Math.random()*3}s;--delay:${Math.random()*3}s;opacity:${0.2+Math.random()*0.6}`;
    c.appendChild(s);
  }
})();

// ── ENTER APP ──
function enterApp(profile) {
  currentProfile = profile;
  document.getElementById('landing').style.display = 'none';
  document.getElementById('app').style.display = 'block';
  applyProfile();
  buildCharts();
  buildLibrary();
  buildDashCharts();
}

// ── APPLY PROFILE ──
function applyProfile() {
  const isJ = currentProfile === 'journalist';

  document.getElementById('profile-badge').textContent = isJ ? '📡 Journalist' : '🏔 Public';
  document.getElementById('profile-badge').className = 'badge-pill ' + (isJ ? 'badge-journalist' : 'badge-public');

  document.querySelectorAll('.journalist-only').forEach(el => {
    el.style.display = isJ ? '' : 'none';
  });

  document.getElementById('journalist-banner').style.display = isJ ? 'block' : 'none';

  document.getElementById('hero-body-text').textContent = isJ
    ? 'Access Sentinel-2 multispectral data, WGMS glacier mass balance datasets, and verified scientific sources. The AI assistant provides technical, citation-backed responses for evidence-based reporting.'
    : 'The Alps have lost over 50% of their glacier volume since 1900. Satellite imagery shows accelerating retreat. AlpineWatch brings you verified data and evidence-based stories to counter climate disinformation.';

  document.getElementById('chat-page-title').textContent = isJ ? 'AI Research Assistant' : 'AI Assistant';
  document.getElementById('chat-page-sub').textContent = isJ
    ? 'Ask for technical data, satellite methodologies, primary sources, and scientific context for your reporting.'
    : "Ask anything about climate change in the Alps. I'll give you clear, verified answers.";

  document.getElementById('welcome-msg').textContent = isJ
    ? 'Welcome, researcher. I can provide technical satellite data, scientific citations, methodology details, and primary source references for your reporting on Alpine climate change. What do you need?'
    : "Hello! I'm the AlpineWatch AI assistant. I can help you understand climate change in the Alps — from glacier retreat to what satellite data reveals. What would you like to know?";

  const statusEl = document.getElementById('chat-status-line');
  if (statusEl) {
    statusEl.innerHTML =
      '<span class="status-dot"></span> ' +
      (isJ
        ? 'Online — AlpineWatch research assistant'
        : 'Online — AlpineWatch assistant');
  }

  buildSuggestions();
}

// ── SWITCH PROFILE ──
function switchProfile() {
  currentProfile = currentProfile === 'public' ? 'journalist' : 'public';
  applyProfile();
  showSection('home', document.querySelectorAll('.nav-tab')[0]);
  conversationHistory.length = 0;
  const msgs = document.getElementById('chat-messages');
  msgs.innerHTML = '';
  addBotMessage(document.getElementById('welcome-msg').textContent);
  buildSuggestions();
}

// ── SECTIONS ──
function showSection(id, btn) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  document.getElementById('section-' + id).classList.add('active');
  if (btn) btn.classList.add('active');
}

// ── HOME CHART ──
function buildCharts() {
  const data = [0.1,0.15,0.2,0.18,0.3,0.35,0.4,0.5,0.6,0.55,0.7,0.8,0.85,0.9,1.0,1.1,1.15,1.2,1.35,1.5,1.6,1.7,1.75,1.9,2.1,2.3];
  const c = document.getElementById('temp-chart');
  c.innerHTML = '';
  const max = Math.max(...data);
  data.forEach(v => {
    const col = document.createElement('div');
    col.className = 'bar-col';
    const bar = document.createElement('div');
    bar.className = 'bar';
    bar.style.height = (v / max * 180) + 'px';
    bar.style.background = v > 1.0
      ? 'linear-gradient(to top,#B5332A,#E87A5A)'
      : 'linear-gradient(to top,#6BAED6,#B8D9F0)';
    bar.title = `+${v}°C`;
    col.appendChild(bar);
    c.appendChild(col);
  });
}

// ── DASHBOARD CHARTS ──
function buildDashCharts() {
  // Temperature anomaly bars
  const temps = [0.1,0.2,0.3,0.25,0.45,0.6,0.7,0.8,1.0,1.2,1.4,1.6,1.75,2.0,2.3];
  const dc = document.getElementById('dash-temp');
  if (!dc) return;
  dc.innerHTML = '';
  const mx = Math.max(...temps);
  temps.forEach(v => {
    const b = document.createElement('div');
    b.className = 'temp-bar' + (v > 1.0 ? ' hot' : '');
    b.style.height = (v / mx * 140) + 'px';
    dc.appendChild(b);
  });

  // Glacier volume bars
  const gl = [4200,4050,3900,3700,3500,3200,3000,2800,2600,2400,2200,1980,1800,1650,1500];
  const gc = document.getElementById('dash-glacier');
  if (!gc) return;
  gc.innerHTML = '';
  const gmx = Math.max(...gl);
  gl.forEach(v => {
    const b = document.createElement('div');
    b.className = 'gl-bar';
    b.style.height = (v / gmx * 75) + 'px';
    b.title = `${v} km³`;
    gc.appendChild(b);
  });
}

// ── LIBRARY ──
const articles = [
  {
    emoji: '🛰', color: 'rgba(107,174,214,0.12)', tag: 'satellite', tagLabel: 'Satellite Data',
    title: 'Sentinel-2 confirms 8% retreat of Aletsch Glacier in 2023',
    desc: 'ESA multispectral imagery processed with Google Earth Engine shows unprecedented summer melt. Full methodology included.',
    date: 'Jan 2024'
  },
  {
    emoji: '⚠️', color: 'rgba(181,51,42,0.08)', tag: 'myth', tagLabel: 'Myth Debunked',
    title: '"Alpine glaciers are recovering" — fact-checked FALSE',
    desc: 'Social media claim contradicted by 14 independent observational datasets from WGMS, MeteoSwiss, and NASA.',
    date: 'Feb 2024'
  },
  {
    emoji: '📊', color: 'rgba(62,107,74,0.08)', tag: 'verified', tagLabel: 'Verified',
    title: 'Permafrost thaw increases rockfall risk for mountain communities',
    desc: 'Peer-reviewed study maps high-risk zones across Switzerland, Austria, France, and Italy with satellite-based thermal data.',
    date: 'Mar 2024'
  },
  {
    emoji: '🌡', color: 'rgba(201,122,42,0.1)', tag: 'data', tagLabel: 'Data Report',
    title: 'Alpine temperatures rising 2× faster than global average',
    desc: 'Analysis of 150 years of meteorological station data combined with satellite land-surface temperature records.',
    date: 'Mar 2024'
  },
  {
    emoji: '💧', color: 'rgba(107,174,214,0.12)', tag: 'satellite', tagLabel: 'Satellite Data',
    title: 'Snow cover duration declining 3 weeks per decade since 1970',
    desc: 'MODIS daily snow cover product reveals systematic earlier snowmelt across Alpine watersheds.',
    date: 'Apr 2024'
  },
  {
    emoji: '🌿', color: 'rgba(62,107,74,0.08)', tag: 'verified', tagLabel: 'Verified',
    title: 'Treeline advancing upward: plant species shift tracked from orbit',
    desc: 'Vegetation index analysis from Landsat archive documents 40-year upslope migration of Alpine flora.',
    date: 'Apr 2024'
  },
];

function buildLibrary() {
  const grid = document.getElementById('lib-grid');
  grid.innerHTML = '';
  articles.forEach(a => {
    const card = document.createElement('div');
    card.className = 'lib-card';
    card.innerHTML = `
      <div class="lib-thumb" style="background:${a.color}">${a.emoji}</div>
      <div class="lib-body">
        <span class="article-tag tag-${a.tag}">${a.tagLabel}</span>
        <div class="lib-title">${a.title}</div>
        <div class="lib-desc">${a.desc}</div>
      </div>
      <div class="lib-foot">
        <span class="lib-date">${a.date}</span>
        <span style="font-size:0.78rem;color:var(--glacier);cursor:pointer">Read →</span>
      </div>
    `;
    grid.appendChild(card);
  });
}

// ── CHAT SUGGESTIONS ──
function buildSuggestions() {
  const isJ = currentProfile === 'journalist';
  const sugs = isJ
    ? ['Sentinel-2 glacier methodology', 'WGMS data access', 'Permafrost radar datasets', 'Attribution studies Alps']
    : ['Why are glaciers melting?', 'Is the data reliable?', 'What can communities do?', 'Show me the satellite evidence'];
  const c = document.getElementById('suggestions');
  c.innerHTML = '';
  sugs.forEach(s => {
    const btn = document.createElement('button');
    btn.className = 'suggestion';
    btn.textContent = s;
    btn.onclick = () => {
      document.getElementById('chat-input').value = s;
      sendMessage();
    };
    c.appendChild(btn);
  });
}

// ── CHAT HELPERS ──
function addBotMessage(text, source) {
  const msgs = document.getElementById('chat-messages');
  const div = document.createElement('div');
  div.className = 'msg bot';
  div.innerHTML = `
    <div class="msg-icon">🏔</div>
    <div>
      <div class="msg-bubble">${text}</div>
      ${source ? `<div class="msg-source">📡 ${source}</div>` : ''}
    </div>`;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

function addUserMessage(text) {
  const msgs = document.getElementById('chat-messages');
  const div = document.createElement('div');
  div.className = 'msg user';
  div.innerHTML = `<div class="msg-icon">👤</div><div><div class="msg-bubble">${text}</div></div>`;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

function showTyping() {
  const msgs = document.getElementById('chat-messages');
  const div = document.createElement('div');
  div.className = 'msg bot';
  div.id = 'typing-indicator';
  div.innerHTML = `<div class="msg-icon">🏔</div><div><div class="msg-bubble" style="padding:0.7rem 1rem"><div class="typing"><span></span><span></span><span></span></div></div></div>`;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

function removeTyping() {
  const t = document.getElementById('typing-indicator');
  if (t) t.remove();
}

function handleKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
}

// ── SEND MESSAGE (AI Agent) ──
async function sendMessage() {
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if (!text || isLoading) return;

  isLoading = true;
  input.value = '';
  document.getElementById('send-btn').disabled = true;
  document.getElementById('suggestions').innerHTML = '';

  addUserMessage(text);
  conversationHistory.push({ role: 'user', content: text });
  showTyping();

  const isJ = currentProfile === 'journalist';

  const source = isJ
    ? 'Verified sources: WGMS · Sentinel-2 · Copernicus · MeteoSwiss'
    : 'Satellite & scientific data · AlpineWatch';

  try {
    const webhookUrl = isJ ? JOURNALIST_AI_WEBHOOK : PUBLIC_AI_WEBHOOK;

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: text,
        sessionId: getOrCreateSessionId(),
        messages: conversationHistory.map(m => ({ role: m.role, content: m.content })),
      }),
    });

    const rawText = await response.text();
    let data;
    try {
      data = rawText ? JSON.parse(rawText) : null;
    } catch {
      data = null;
    }

    removeTyping();

    let reply;
    if (data && typeof data === 'object' && data.message && data.code >= 400) {
      reply =
        typeof data.hint === 'string'
          ? `${data.message} ${data.hint}`
          : String(data.message);
    } else {
      reply = parseAgentWebhookReply(data);
      if (!reply && response.ok && rawText.trim()) {
        reply = rawText.trim();
      }
    }

    if (!reply) {
      reply =
        'No fue posible obtener una respuesta del asistente. Si administras n8n, activa el flujo del webhook de producción y vuelve a intentarlo.';
    }

    conversationHistory.push({ role: 'assistant', content: reply });
    addBotMessage(escapeHtml(reply).replace(/\n/g, '<br>'), source);
  } catch (err) {
    removeTyping();
    addBotMessage(
      'Connection issue. Please check your setup and try again.',
      source,
    );
  }

  isLoading = false;
  document.getElementById('send-btn').disabled = false;
  buildSuggestions();
}
